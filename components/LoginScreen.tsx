"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores";
import RegistrationScreen from "./RegistrationScreen";
import ForgotPasswordScreen from "./ForgotPasswordScreen";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60000; // 1 minute

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [view, setView] = useState<"credentials" | "pin" | "register" | "forgot">("credentials");
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const { login, loginWithCredentials, organization } = useAuthStore();

  useEffect(() => {
    if (organization) {
      setView("pin");
    }
  }, [organization]);

  useEffect(() => {
    if (lockoutEnd) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          setLockoutEnd(null);
          setAttempts(0);
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
    setLoading(true);
    setError("");
    try {
      const success = await loginWithCredentials(email, password);
      if (!success) {
        setError("Invalid email or password");
      }
    } catch (e) {
      setError("Login failed");
    }
    setLoading(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutEnd) {
      setError(`Too many failed attempts. Try again in ${countdown} seconds.`);
      return;
    }
    
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      const success = await login(pin);
      if (!success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_DURATION_MS);
          setError(`Too many failed attempts. Please wait 1 minute.`);
        } else {
          setError(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
        setPin("");
      } else {
        setAttempts(0);
        setLockoutEnd(null);
      }
    } catch (e) {
      setError("Login failed");
    }
    setLoading(false);
  };

  if (view === "register") {
    return <RegistrationScreen onBack={() => setView("credentials")} />;
  }

  if (view === "forgot") {
    return <ForgotPasswordScreen onBack={() => setView("credentials")} />;
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "var(--bg)",
      padding: 20
    }} role="main" aria-label="Login page">
      <div style={{ 
        padding: 40, 
        background: "var(--surface)", 
        borderRadius: 24,
        border: "1px solid var(--border)",
        width: "100%",
        maxWidth: 400,
        textAlign: "center",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
      }} role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div style={{ 
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#F5C842", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          margin: "0 auto 24px"
        }} role="img" aria-label="POS Application">
          <span style={{ fontSize: 28, fontWeight: "bold", color: "#0D0D0F" }}>POS</span>
        </div>
        
        <h1 id="login-title" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "var(--text)" }}>
          {view === "pin" ? `Welcome back!` : "Sign In"}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
          {view === "pin" ? `Enter PIN for ${organization?.name}` : "Enter your credentials to continue"}
        </p>

        {view === "credentials" ? (
          <form onSubmit={handleCredentialSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "left" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  outline: "none"
                }}
              />
            </div>
            {error && <div style={{ color: "#f44336", fontSize: 14 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
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
                marginTop: 8
              }}
            >
              {loading ? "Signing in..." : "Continue"}
            </button>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={() => setView("forgot")}
                style={{ background: "none", border: "none", color: "#F5C842", fontSize: 14, cursor: "pointer" }}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => setView("register")}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}
              >
                Don't have an account? <span style={{ color: "#F5C842", fontWeight: 600 }}>Register</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePinSubmit}>
            <input
              id="pin-input"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={lockoutEnd ? `Wait ${countdown}s` : "Enter PIN"}
              maxLength={6}
              autoFocus
              disabled={loading || !!lockoutEnd}
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
                outline: "none"
              }}
            />
            {error && <div style={{ color: "#f44336", marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading || pin.length < 4 || !!lockoutEnd}
              style={{
                width: "100%",
                padding: 14,
                fontSize: 16,
                fontWeight: 600,
                background: pin.length >= 4 && !lockoutEnd ? "#F5C842" : "#ccc",
                color: "#0D0D0F",
                border: "none",
                borderRadius: 12,
                cursor: pin.length >= 4 && !lockoutEnd ? "pointer" : "not-allowed"
              }}
            >
              {loading ? "Verifying..." : "Enter POS"}
            </button>
            <button
              type="button"
              onClick={() => {
                useAuthStore.getState().logout();
                setView("credentials");
              }}
              style={{
                width: "100%",
                padding: 12,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: 14,
                marginTop: 16,
                cursor: "pointer"
              }}
            >
              Switch Organization
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
