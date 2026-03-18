"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores";

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60000; // 1 minute

export default function LoginScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const { login } = useAuthStore();

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Reset on successful login
        setAttempts(0);
        setLockoutEnd(null);
      }
    } catch (e) {
      setError("Login failed");
    }
    setLoading(false);
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
            id="pin-input"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={lockoutEnd ? `Wait ${countdown}s` : "Enter PIN"}
            maxLength={6}
            autoFocus
            disabled={loading || !!lockoutEnd}
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : "pin-hint"}
            aria-disabled={!!lockoutEnd}
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
          <span id="pin-hint" className="sr-only">Enter 4 to 6 digit PIN</span>
          
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
