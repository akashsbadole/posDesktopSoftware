"use client";
import { useState, useRef, useEffect } from "react";
import { X, ShieldCheck, RefreshCw } from "lucide-react";
import { verifyPin } from "@/lib/db";

interface PinModalProps {
  title: string;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
  requiredRole?: "admin" | "cashier";
}

export default function PinModal({ title, description, onSuccess, onCancel, requiredRole = "admin" }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Tab") {
        const focusableElements = modalRef.current?.querySelectorAll('button, input');
        if (focusableElements) {
          const first = focusableElements[0] as HTMLElement;
          const last = focusableElements[focusableElements.length - 1] as HTMLElement;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length < 4) return;

    setLoading(true);
    setError("");
    try {
      const user = await verifyPin(pin);
      if (user && (requiredRole === "cashier" || user.role === requiredRole)) {
        onSuccess();
      } else {
        setError("Invalid PIN or insufficient permissions");
        setPin("");
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto submit
        setTimeout(() => handleSubmit(), 100);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={modalRef}
        className="bg-[#0F0F12] border border-[#1E1E26] w-full max-w-sm rounded-2xl shadow-2xl p-6 fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-modal-title"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 id="pin-modal-title" className="font-bold text-white">{title}</h3>
              <p className="text-xs text-[#9090A8]">{description}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-[#4A4A5A] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > i ? "bg-yellow-400 border-yellow-400 scale-110" : "border-[#1E1E26]"
              }`}
            />
          ))}
        </div>

        {error && <div className="text-center text-red-500 text-sm mb-6 animate-shake">{error}</div>}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === "C") setPin("");
                else if (key === "OK") handleSubmit();
                else handleKeyClick(key);
              }}
              disabled={loading}
              className={`h-14 rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center
                ${key === "OK" ? "bg-yellow-400 text-black hover:bg-yellow-500" :
                  key === "C" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" :
                  "bg-[#141418] text-white hover:bg-[#1E1E26] border border-[#1E1E26]"}
              `}
            >
              {loading && key === "OK" ? <RefreshCw size={20} className="spin" /> : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
