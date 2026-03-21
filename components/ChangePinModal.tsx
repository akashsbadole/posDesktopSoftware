"use client";
import { useState, useRef, useEffect } from "react";
import { changePin, verifyPin } from "@/lib/db";

interface ChangePinModalProps {
  userId: string;
  onClose: () => void;
}

export default function ChangePinModal({ userId, onClose }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    currentRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async () => {
    setError("");
    
    if (!currentPin) {
      setError("Please enter current PIN");
      currentRef.current?.focus();
      return;
    }
    
    if (newPin.length < 4) {
      setError("New PIN must be at least 4 digits");
      newRef.current?.focus();
      return;
    }
    
    if (newPin !== confirmPin) {
      setError("New PINs do not match");
      confirmRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const verified = await verifyPin(currentPin);
      if (!verified) {
        setError("Current PIN is incorrect");
        setCurrentPin("");
        currentRef.current?.focus();
        setLoading(false);
        return;
      }
      
      await changePin(userId, newPin);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to change PIN");
    }
    setLoading(false);
  };

  // Auto-advance: when current PIN reaches 4 digits, focus new PIN
  const handleCurrentChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setCurrentPin(clean);
    if (error) setError("");
    if (clean.length >= 4) {
      newRef.current?.focus();
    }
  };

  // Auto-advance: when new PIN reaches 4 digits, focus confirm PIN
  const handleNewChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setNewPin(clean);
    if (error) setError("");
    if (clean.length >= 4) {
      confirmRef.current?.focus();
    }
  };

  // Auto-submit: when confirm PIN matches new PIN length and they match
  const handleConfirmChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setConfirmPin(clean);
    if (error) setError("");
  };

  // Handle Enter key to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="rounded-xl p-6 max-w-sm w-full text-center" style={{ background: "#1E1E26" }} onClick={e => e.stopPropagation()}>
          <div className="text-green-500 text-4xl mb-4">✓</div>
          <h2 className="text-lg font-semibold text-white mb-2">PIN Changed!</h2>
          <p style={{ color: "#9090A8" }}>Your PIN has been updated successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Change PIN">
      <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#1E1E26" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "#F5C842" }}>Change PIN</h2>
          <button onClick={onClose} className="text-[#4A4A5A] hover:text-white" aria-label="Close">✕</button>
        </div>
        
        <div className="space-y-4" onKeyDown={handleKeyDown}>
          <div>
            <label htmlFor="current-pin" className="text-xs block mb-1" style={{ color: "#9090A8" }}>Current PIN</label>
            <input
              ref={currentRef}
              id="current-pin"
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={e => handleCurrentChange(e.target.value)}
              className="w-full p-2 rounded"
              style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff", letterSpacing: 4 }}
              placeholder="Enter current PIN"
              autoComplete="off"
            />
          </div>
          
          <div>
            <label htmlFor="new-pin" className="text-xs block mb-1" style={{ color: "#9090A8" }}>New PIN</label>
            <input
              ref={newRef}
              id="new-pin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={e => handleNewChange(e.target.value)}
              className="w-full p-2 rounded"
              style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff", letterSpacing: 4 }}
              placeholder="Enter new PIN (4+ digits)"
              maxLength={6}
              autoComplete="off"
            />
          </div>
          
          <div>
            <label htmlFor="confirm-pin" className="text-xs block mb-1" style={{ color: "#9090A8" }}>Confirm New PIN</label>
            <input
              ref={confirmRef}
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={e => handleConfirmChange(e.target.value)}
              className="w-full p-2 rounded"
              style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff", letterSpacing: 4 }}
              placeholder="Confirm new PIN"
              maxLength={6}
              autoComplete="off"
            />
          </div>

          {/* PIN match indicator */}
          {confirmPin.length > 0 && (
            <div className="text-xs flex items-center gap-1" style={{ color: newPin === confirmPin ? "#2ECC71" : "#E74C3C" }}>
              {newPin === confirmPin ? "✓ PINs match" : "✗ PINs do not match"}
            </div>
          )}
          
          {error && (
            <div className="text-sm p-2 rounded" role="alert" style={{ background: "rgba(231,76,60,0.1)", color: "#E74C3C" }}>
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 rounded font-semibold transition-all disabled:opacity-50"
            style={{ background: "#F5C842", color: "#0D0D0F" }}
          >
            {loading ? "Changing..." : "Change PIN"}
          </button>

          <p className="text-xs text-center" style={{ color: "#4A4A5A" }}>
            Press Enter to submit · Escape to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
