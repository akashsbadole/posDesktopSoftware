"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/stores";
import { Lock } from "lucide-react";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60000; // 1 minute
const AUTO_SUBMIT_DELAY_MS = 400; // brief delay so user sees the last digit

interface LoginScreenProps {
  onUnlock?: () => void;
  isLocked?: boolean;
}

export default function LoginScreen({ onUnlock, isLocked }: LoginScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { login } = useAuthStore();

  useEffect(() => {
    if (lockoutEnd) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          setLockoutEnd(null);
          setAttempts(0);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      };
      
      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);
      
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [lockoutEnd]);

  // Auto-submit when PIN reaches 4 digits
  useEffect(() => {
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }

    if (pin.length >= 4 && !loading && !lockoutEnd) {
      autoSubmitTimer.current = setTimeout(() => {
        doLogin(pin);
      }, AUTO_SUBMIT_DELAY_MS);
    }

    return () => {
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
      }
    };
  }, [pin, loading, lockoutEnd]);

  const doLogin = useCallback(async (currentPin: string) => {
    if (currentPin.length < 4 || lockoutEnd) return;
    
    setLoading(true);
    setError("");
    try {
      const success = await login(currentPin);
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
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setAttempts(0);
        setLockoutEnd(null);
        if (isLocked && onUnlock) {
          onUnlock();
        }
      }
    } catch (e) {
      setError("Login failed");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setLoading(false);
  }, [login, attempts, lockoutEnd, isLocked, onUnlock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoSubmitTimer.current) {
      clearTimeout(autoSubmitTimer.current);
      autoSubmitTimer.current = null;
    }
    await doLogin(pin);
  };

  // Keyboard: allow Escape to clear PIN
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setPin("");
      setError("");
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "var(--bg)" 
    }} role="main" aria-label="Login page">
      <div style={{ 
        padding: 40, 
        background: "var(--surface)", 
        borderRadius: 16, 
        border: "1px solid var(--border)",
        width: 320,
        textAlign: "center"
      }} role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div style={{ 
          width: 60, 
          height: 60, 
          borderRadius: 12, 
          background: "#F5C842", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          margin: "0 auto 20px"
        }} role="img" aria-label="POS Application">
          <span style={{ fontSize: 24, fontWeight: "bold", color: "#0D0D0F" }}>POS</span>
        </div>
        <h1 id="login-title" style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>Enter your PIN to continue</p>
        
        <form onSubmit={handleSubmit} aria-describedby={error ? "login-error" : undefined}>
          <label htmlFor="pin-input" className="sr-only">PIN</label>
          <input
            ref={inputRef}
            id="pin-input"
            type="password"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setPin(val);
              if (error) setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder={lockoutEnd ? `Wait ${countdown}s` : "Enter PIN"}
            maxLength={6}
            autoFocus
            disabled={loading || !!lockoutEnd}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : "pin-hint"}
            aria-disabled={!!lockoutEnd}
            aria-label="Enter your PIN"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: 20,
              textAlign: "center",
              letterSpacing: 8,
              border: `2px solid ${error ? "#f44336" : lockoutEnd ? "#f44336" : "var(--border)"}`,
              borderRadius: 10,
              background: lockoutEnd ? "#1a1a1a" : "var(--bg)",
              color: lockoutEnd ? "#888" : "var(--text)",
              marginBottom: 16,
              outline: "none",
              cursor: lockoutEnd ? "not-allowed" : "default"
            }}
          />
          <span id="pin-hint" className="sr-only">Enter 4 to 6 digit PIN. Auto-submits after 4 digits. Press Escape to clear.</span>
          
          {/* PIN digit indicators */}
          <div className="flex justify-center gap-3 mb-4" aria-hidden="true">
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: pin.length > i ? "#F5C842" : "#2A2A35",
                border: `1px solid ${pin.length > i ? "#F5C842" : "#3A3A45"}`,
                transition: "all 0.15s ease",
                transform: pin.length > i ? "scale(1.1)" : "scale(1)",
              }} />
            ))}
          </div>

          {/* Auto-submit indicator */}
          {pin.length >= 4 && loading && (
            <div className="text-xs mb-2 flex items-center justify-center gap-2" style={{ color: "#F5C842" }} role="status" aria-live="polite">
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#F5C842", borderTopColor: "transparent" }} />
              Verifying...
            </div>
          )}
          {pin.length >= 4 && !loading && !lockoutEnd && (
            <div className="text-xs mb-2" style={{ color: "#9090A8" }} aria-hidden="true">
              Auto-submitting...
            </div>
          )}
          
          {error && (
            <div id="login-error" role="alert" aria-live="assertive" style={{ color: "#f44336", marginBottom: 16, fontSize: 14 }}>{error}</div>
          )}
          
          <button
            type="submit"
            disabled={loading || pin.length < 4 || !!lockoutEnd}
            aria-describedby="pin-hint"
            style={{
              width: "100%",
              padding: 14,
              fontSize: 16,
              fontWeight: 600,
              background: pin.length >= 4 && !lockoutEnd ? "#F5C842" : "#ccc",
              color: "#0D0D0F",
              border: "none",
              borderRadius: 10,
              cursor: pin.length >= 4 && !lockoutEnd ? "pointer" : "not-allowed",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Logging in..." : lockoutEnd ? `Locked (${countdown}s)` : "Login"}
          </button>
        </form>
        
        <p style={{ marginTop: 20, fontSize: 12, color: "#888" }} aria-label="Default PIN information">
          Default PINs: Admin: 1234 | Cashier: 0000
        </p>
      </div>
    </div>
  );
}
