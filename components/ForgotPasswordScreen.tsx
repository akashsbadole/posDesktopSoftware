"use client";
import { useState } from "react";
import { useAuthStore } from "@/lib/stores";

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset" | "forgot_user">("request");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { forgotPassword, resetPassword, forgotUser } = useAuthStore();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const success = await forgotPassword(email);
      if (success) {
        setStep("reset");
        setMessage("Recovery code sent to your email.");
      } else {
        setError("Email not found.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const success = await resetPassword(email, code, newPassword);
      if (success) {
        setMessage("Password reset successfully. You can now login.");
        setTimeout(onBack, 2000);
      } else {
        setError("Invalid code or reset failed.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const success = await forgotUser(email);
      if (success) {
        setMessage("Username information sent to your email.");
      } else {
        setError("Email not found.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {step === "forgot_user" ? "Forgot Username" : "Forgot Password"}
          </h1>
          <p className="text-muted-foreground">
            {step === "reset" ? "Enter the code and your new password" : "We'll help you get back into your account"}
          </p>
        </div>

        {message && (
          <div className="p-3 mb-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded-xl">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
            {error}
          </div>
        )}

        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label htmlFor="reqEmail" className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <input
                id="reqEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                placeholder="name@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Recovery Code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label htmlFor="recoveryCode" className="block text-sm font-medium text-muted-foreground mb-1">Recovery Code</label>
              <input
                id="recoveryCode"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                placeholder="Enter 6-digit code"
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        {step === "forgot_user" && (
          <form onSubmit={handleForgotUser} className="space-y-4">
            <div>
              <label htmlFor="userEmail" className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <input
                id="userEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#F5C842]/50"
                placeholder="name@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Sending..." : "Find My Username"}
            </button>
          </form>
        )}

        <div className="mt-8 flex flex-col items-center gap-4">
          {step === "request" && (
            <button
              onClick={() => setStep("forgot_user")}
              className="text-sm text-muted-foreground hover:text-[#F5C842] transition-colors"
            >
              Forgot your username?
            </button>
          )}
          {step === "forgot_user" && (
            <button
              onClick={() => setStep("request")}
              className="text-sm text-muted-foreground hover:text-[#F5C842] transition-colors"
            >
              Need to reset password?
            </button>
          )}
          <button
            onClick={onBack}
            className="text-sm text-[#F5C842] font-medium hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
