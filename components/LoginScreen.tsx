"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores";
import { isOfflineMode, getAvailableOrganizations } from "@/lib/utils/offline";
import RegistrationScreen from "./RegistrationScreen";
import { useTranslation } from "@/lib/i18n";
import ForgotPasswordScreen from "./ForgotPasswordScreen";

type AuthMethod = "credentials" | "pin";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60000; // 1 minute

export default function LoginScreen() {
  const t = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [offlineOrgs, setOfflineOrgs] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [view, setView] = useState<
    | "credentials"
    | "pin"
    | "register"
    | "forgot"
    | "offline-org"
    | "offline-pin"
  >("credentials");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("credentials");
  const [rememberMe, setRememberMe] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const {
    login,
    loginWithCredentials,
    loginWithPinOnly,
    loginWithPinOffline,
    organization,
    logout,
  } = useAuthStore();

  // Initialize offline mode and load saved credentials
  useEffect(() => {
    if (isOfflineMode()) {
      const orgs = getAvailableOrganizations();
      if (orgs.length > 0) {
        setOfflineOrgs(orgs);
        setView("offline-org");
      }
    }

    // Load saved email if available
    const savedEmail = localStorage.getItem("pos_saved_email");
    const savedRememberMe = localStorage.getItem("pos_remember_me") === "true";

    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // When organization is set (after successful credentials login), switch to PIN view
  useEffect(() => {
    if (organization) {
      setError("");
      setEmail("");
      setPassword("");
      setPin("");
      setView("pin");
    }
  }, [organization]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutEnd) {
      const updateCountdown = () => {
        const remaining = Math.max(
          0,
          Math.ceil((lockoutEnd - Date.now()) / 1000),
        );
        setCountdown(remaining);
        if (remaining <= 0) {
          setLockoutEnd(null);
          setAttempts(0);
          setPin("");
        }
      };

      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [lockoutEnd]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim and validate inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError(t("login.errors.emailAndPasswordRequired"));
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError(t("login.errors.validEmail"));
      return;
    }

    if (trimmedPassword.length < 6) {
      setError(t("login.errors.passwordMinLength"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await loginWithCredentials(trimmedEmail, trimmedPassword);

      if (!success) {
        setError(t("login.errors.invalidEmailOrPassword"));
        setPassword("");
      } else {
        // Save email if remember me is checked
        if (rememberMe) {
          localStorage.setItem("pos_saved_email", trimmedEmail);
          localStorage.setItem("pos_remember_me", "true");
        } else {
          // Clear saved credentials if remember me is unchecked
          localStorage.removeItem("pos_saved_email");
          localStorage.removeItem("pos_remember_me");
        }
      }
      // If success, the useEffect hook will handle switching to PIN view
    } catch (e) {
      console.error("[LoginScreen] Login error:", e);
      setError(t("login.errors.loginFailed"));
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handlePinOnlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPin = pin.trim();

    if (!trimmedEmail) {
      setError(t("login.errors.emailRequired"));
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError(t("login.errors.validEmail"));
      return;
    }

    if (lockoutEnd) {
      setError(t("login.errors.tooManyAttempts", { count: countdown }));
      return;
    }

    if (trimmedPin.length < 4) {
      setError(t("login.errors.pinMinDigits"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await loginWithPinOnly(trimmedEmail, trimmedPin);

      if (!success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION_MS);
          setError(
            t("login.errors.tooManyAttemptsWait", { seconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) }),
          );
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            t("login.errors.invalidEmailOrPin", { remaining }),
          );
        }
      }
    } catch (e) {
      console.error("[LoginScreen] PIN-only login error:", e);
      setError(t("login.errors.loginFailed"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) {
      setError(t("login.errors.orgContextNotFound"));
      return;
    }

    if (lockoutEnd) {
      setError(t("login.errors.tooManyAttempts", { count: countdown }));
      return;
    }

    const trimmedPin = pin.trim();
    if (trimmedPin.length < 4) {
      setError(t("login.errors.pinMinDigits"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await login(trimmedPin);

      if (!success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION_MS);
          setError(
            t("login.errors.tooManyAttemptsWait", { seconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) }),
          );
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            t("login.errors.invalidPin", { remaining }),
          );
        }
      } else {
        // Successful PIN login
        setAttempts(0);
        setLockoutEnd(null);
        setPin("");
      }
    } catch (e) {
      console.error("[LoginScreen] PIN verification error:", e);
      setError(t("login.errors.pinVerificationFailed"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleOfflinePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrgId) {
      setError(t("login.errors.selectOrg"));
      return;
    }

    if (lockoutEnd) {
      setError(t("login.errors.tooManyAttempts", { count: countdown }));
      return;
    }

    const trimmedPin = pin.trim();
    if (trimmedPin.length < 4) {
      setError(t("login.errors.pinMinDigits"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const success = await loginWithPinOffline(trimmedPin, selectedOrgId);

      if (!success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION_MS);
          setError(
            t("login.errors.tooManyAttemptsWait", { seconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) }),
          );
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            t("login.errors.invalidPin", { remaining }),
          );
        }
      } else {
        // Successful offline PIN login
        setAttempts(0);
        setLockoutEnd(null);
        setPin("");
      }
    } catch (e) {
      console.error("[LoginScreen] Offline PIN verification error:", e);
      setError(t("login.errors.pinVerificationFailed"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchOrganization = () => {
    logout();
    setPin("");
    setAttempts(0);
    setLockoutEnd(null);
    setError("");
    setSelectedOrgId("");
    // Clear saved credentials when switching organizations
    localStorage.removeItem("pos_saved_email");
    localStorage.removeItem("pos_remember_me");
    setEmail("");
    setRememberMe(false);
    if (isOfflineMode()) {
      setView("offline-org");
    } else {
      setView("credentials");
    }
  };

  if (view === "register") {
    return <RegistrationScreen onBack={() => setView("credentials")} />;
  }

  if (view === "forgot") {
    return <ForgotPasswordScreen onBack={() => setView("credentials")} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
      role="main"
      aria-label="Login page"
    >
      <div
        style={{
          padding: 40,
          background: "var(--surface)",
          borderRadius: 24,
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#F5C842",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
          role="img"
          aria-label={t("login.posApp")}
        >
          <span style={{ fontSize: 28, fontWeight: "bold", color: "#0D0D0F" }}>
            POS
          </span>
        </div>

        <div style={{
          background: "rgba(46, 204, 113, 0.1)",
          border: "1px solid rgba(46, 204, 113, 0.3)",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)"
        }}>
          {t("login.freeForever")}
        </div>

        <h1
          id="login-title"
          style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
            color: "var(--text)",
          }}
        >
          {view === "pin"
            ? t("login.welcomeBack")
            : view === "offline-org"
              ? t("login.selectOrg")
              : view === "offline-pin"
                ? t("login.enterPin")
                : t("login.title")}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          {view === "pin"
            ? t("login.enterPinFor", { name: organization?.name || "your organization" })
            : view === "offline-org"
              ? t("login.chooseOrg")
              : view === "offline-pin"
                ? t("login.enterPinFor", { name: offlineOrgs.find((o) => o.id === selectedOrgId)?.name || "your organization" })
                : t("login.enterCredentials")}
        </p>

        {view === "credentials" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 24,
              background: "var(--bg)",
              borderRadius: 12,
              padding: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMethod("credentials");
                setError("");
                setPin("");
                setPassword("");
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                background: authMethod === "credentials" ? "#F5C842" : "transparent",
                color: authMethod === "credentials" ? "#0D0D0F" : "var(--text-muted)",
                border: "none",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {t("login.emailPassword")}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("pin");
                setError("");
                setPassword("");
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                background: authMethod === "pin" ? "#F5C842" : "transparent",
                color: authMethod === "pin" ? "#0D0D0F" : "var(--text-muted)",
                border: "none",
                borderRadius: 10,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {t("login.emailPin")}
            </button>
          </div>
        )}

        {view === "offline-org" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {offlineOrgs.length > 0 ? (
              offlineOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setSelectedOrgId(org.id);
                    setPin("");
                    setAttempts(0);
                    setLockoutEnd(null);
                    setError("");
                    setView("offline-pin");
                  }}
                  disabled={loading}
                  style={{
                    padding: 16,
                    background: "var(--bg)",
                    border: "2px solid var(--border)",
                    borderRadius: 12,
                    cursor: loading ? "not-allowed" : "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      (e.target as HTMLButtonElement).style.borderColor =
                        "#F5C842";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor =
                      "var(--border)";
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {org.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {org.email}
                  </div>
                </button>
              ))
            ) : (
              <div style={{ color: "var(--text-muted)", padding: 20 }}>
                {t("login.noOrgs")}
              </div>
            )}
            {offlineOrgs.length === 0 && (
              <button
                onClick={() => setView("register")}
                style={{
                  width: "100%",
                  padding: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  background: "#F5C842",
                  color: "#0D0D0F",
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                {t("login.registerOrg")}
              </button>
            )}
          </div>
        ) : view === "offline-pin" ? (
          <form onSubmit={handleOfflinePinSubmit}>
            <input
              id="pin-input-offline"
              type="password"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyPress={(e) => {
                if (
                  e.key === "Enter" &&
                  pin.length >= 4 &&
                  !loading &&
                  !lockoutEnd
                ) {
                  handleOfflinePinSubmit(e as any);
                }
              }}
              placeholder={
                lockoutEnd ? t("login.waitSeconds", { count: countdown }) : t("login.enterPinPlaceholder")
              }
              maxLength={6}
              autoFocus
              disabled={loading || !!lockoutEnd}
              inputMode="numeric"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 24,
                textAlign: "center",
                letterSpacing: 12,
                border: `2px solid ${error ? "#f44336" : "var(--border)"}`,
                borderRadius: 12,
                background: "var(--bg)",
                color: "var(--text)",
                marginBottom: 24,
                outline: "none",
                opacity: loading || lockoutEnd ? 0.6 : 1,
              }}
            />
             {error && (
               <div
                 style={{
                   color: "#f44336",
                   marginBottom: 16,
                   fontSize: 14,
                   padding: "8px 12px",
                   background: "rgba(244, 67, 54, 0.1)",
                   borderRadius: 8,
                 }}
               >
                 {error}
               </div>
             )}
             {/* Default PIN hint */}
             <details style={{ marginTop: 8, textAlign: "left" }}>
               <summary
                 style={{
                   fontSize: 12,
                   color: "var(--text-muted)",
                   cursor: "pointer",
                   userSelect: "none",
                 }}
               >
                 {t("login.defaultPin")}
               </summary>
               <div
                 style={{
                   marginTop: 8,
                   padding: 12,
                   background: "rgba(46,204,113,0.08)",
                   borderRadius: 8,
                   fontSize: 12,
                   color: "var(--text-muted)",
                 }}
               >
                 <p style={{ marginBottom: 4 }}>
                   {t("login.defaultPinHint")}
                 </p>
                 <p>{t("login.pinHint")}</p>
               </div>
             </details>

             <button
               type="submit"
               disabled={loading || pin.length < 4 || !!lockoutEnd}
               style={{
                 width: "100%",
                 padding: 14,
                 fontSize: 16,
                 fontWeight: 600,
                 background: pin.length >= 4 && !lockoutEnd ? "#F5C842" : "#999",
                 color: "#0D0D0F",
                 border: "none",
                 borderRadius: 12,
                 cursor:
                   pin.length >= 4 && !lockoutEnd ? "pointer" : "not-allowed",
                 transition: "all 0.2s",
               }}
             >
               {loading ? t("login.verifying") : t("login.enterPos")}
             </button>
            <button
              type="button"
              onClick={() => {
                setSelectedOrgId("");
                setPin("");
                setAttempts(0);
                setLockoutEnd(null);
                setError("");
                setView("offline-org");
              }}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 14,
                marginTop: 16,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {t("login.chooseDiffOrg")}
            </button>
          </form>
        ) : view === "credentials" ? (
          <form
            onSubmit={authMethod === "pin" ? handlePinOnlySubmit : handleCredentialSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ textAlign: "left" }}>
              <label
                htmlFor="email"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                {t("login.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  outline: "none",
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>
            {authMethod === "pin" ? (
              <div style={{ textAlign: "left" }}>
                <label
                  htmlFor="pin"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  {t("login.pinLabel")}
                </label>
                <input
                  id="pin"
                  type="password"
                  required
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !loading && pin.length >= 4) {
                      handlePinOnlySubmit(e as any);
                    }
                  }}
                  placeholder={t("login.pinPlaceholder")}
                  maxLength={6}
                  inputMode="numeric"
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    outline: "none",
                    opacity: loading ? 0.6 : 1,
                    letterSpacing: 8,
                    textAlign: "center",
                    fontSize: 18,
                  }}
                 />
                 {/* Default PIN hint */}
                 <details style={{ marginTop: 8 }}>
                   <summary
                     style={{
                       fontSize: 11,
                       color: "var(--text-muted)",
                       cursor: "pointer",
                       userSelect: "none",
                     }}
                   >
                      {t("login.defaultPin")}
                    </summary>
                    <div
                      style={{
                        marginTop: 6,
                        padding: 10,
                        background: "rgba(46,204,113,0.08)",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        {t("login.defaultPinHint")} {t("login.pinHint")}
                      </p>
                    </div>
                 </details>
               </div>
             ) : (
              <div style={{ textAlign: "left" }}>
                <label
                  htmlFor="password"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  {t("login.passwordLabel")}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !loading) {
                      handleCredentialSubmit(e as any);
                    }
                  }}
                  placeholder={t("login.passwordPlaceholder")}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    outline: "none",
                    opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>
            )}
            {error && (
              <div
                style={{
                  color: "#f44336",
                  fontSize: 14,
                  padding: "8px 12px",
                  background: "rgba(244, 67, 54, 0.1)",
                  borderRadius: 8,
                }}
              >
                {error}
              </div>
            )}
            {authMethod === "credentials" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: "#F5C842",
                  }}
                />
                <label
                  htmlFor="remember-me"
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {t("login.rememberMe")}
                </label>
              </div>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (authMethod === "pin" ? pin.length < 4 : false)
              }
              style={{
                width: "100%",
                padding: 14,
                fontSize: 16,
                fontWeight: 600,
                background:
                  authMethod === "pin"
                    ? pin.length >= 4 && !lockoutEnd
                      ? "#F5C842"
                      : "#999"
                    : "#F5C842",
                color: "#0D0D0F",
                border: "none",
                borderRadius: 12,
                cursor:
                  loading || (authMethod === "pin" && pin.length < 4)
                    ? "not-allowed"
                    : "pointer",
                marginTop: authMethod === "pin" ? 0 : 8,
                opacity: loading ? 0.8 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? t("login.signingIn") : t("login.enterPos")}
            </button>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* First-time user help */}
              <details style={{ marginTop: 8 }}>
                <summary
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    textAlign: "center",
                    userSelect: "none",
                  }}
                >
                  {t("login.firstTimeUser")}
                </summary>
                <div
                  style={{
                    marginTop: 12,
                    padding: 16,
                    background: "rgba(245,200,66,0.08)",
                    border: "1px solid rgba(245,200,66,0.2)",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                >
                  <p style={{ fontWeight: 600, marginBottom: 8, color: "#F5C842" }}>
                    {t("login.defaultCredentials")}
                  </p>
                  <p style={{ marginBottom: 4 }}>
                    {t("login.defaultEmail")}
                  </p>
                  <p style={{ marginBottom: 4 }}>
                    {t("login.defaultPassword")}
                  </p>
                  <p style={{ marginBottom: 4 }}>
                    {t("login.defaultPinValue")}
                  </p>
                  <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    {t("login.defaultCredHint")}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {t("login.defaultCredTrouble")}
                  </p>
                </div>
              </details>

              <button
                type="button"
                onClick={() => setView("forgot")}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#F5C842",
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {t("login.forgotPassword")}
              </button>
              <button
                type="button"
                onClick={() => setView("register")}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {t("login.noAccount")}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit}>
            <input
              id="pin-input"
              type="password"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyPress={(e) => {
                if (
                  e.key === "Enter" &&
                  pin.length >= 4 &&
                  !loading &&
                  !lockoutEnd
                ) {
                  handlePinSubmit(e as any);
                }
              }}
              placeholder={
                lockoutEnd ? t("login.waitSeconds", { count: countdown }) : t("login.enterPinPlaceholder")
              }
              maxLength={6}
              autoFocus
              disabled={loading || !!lockoutEnd}
              inputMode="numeric"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: 24,
                textAlign: "center",
                letterSpacing: 12,
                border: `2px solid ${error ? "#f44336" : "var(--border)"}`,
                borderRadius: 12,
                background: "var(--bg)",
                color: "var(--text)",
                marginBottom: 24,
                outline: "none",
                opacity: loading || lockoutEnd ? 0.6 : 1,
              }}
            />
            {error && (
              <div
                style={{
                  color: "#f44336",
                  marginBottom: 16,
                  fontSize: 14,
                  padding: "8px 12px",
                  background: "rgba(244, 67, 54, 0.1)",
                  borderRadius: 8,
                }}
              >
                {error}
              </div>
            )}
            {/* Default PIN hint for fresh installs */}
            <details style={{ marginTop: 8, textAlign: "left" }}>
              <summary
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {t("login.defaultPin")}
              </summary>
              <div
                style={{
                  marginTop: 8,
                  padding: 12,
                  background: "rgba(46,204,113,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <p style={{ marginBottom: 4 }}>
                  {t("login.defaultPinHint")}
                </p>
                <p>
                  {t("login.firstLoginHint")}
                </p>
              </div>
            </details>

            <button
              type="submit"
              disabled={loading || pin.length < 4 || !!lockoutEnd}
              style={{
                width: "100%",
                padding: 14,
                fontSize: 16,
                fontWeight: 600,
                background: pin.length >= 4 && !lockoutEnd ? "#F5C842" : "#999",
                color: "#0D0D0F",
                border: "none",
                borderRadius: 12,
                cursor:
                  pin.length >= 4 && !lockoutEnd ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {loading ? t("login.verifying") : t("login.enterPos")}
            </button>
            <button
              type="button"
              onClick={handleSwitchOrganization}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 14,
                marginTop: 16,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {t("login.switchOrg")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
