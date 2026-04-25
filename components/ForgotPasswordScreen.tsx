"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores";
import { FileText, Copy, Check, AlertCircle, User, Mail } from "lucide-react";

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset" | "forgot_user">("request");
  const [message, setMessage] = useState("");
  const [recoveryData, setRecoveryData] = useState<{
    type: "code" | "username";
    value: string;
    savedToFile: boolean;
    emailSent: boolean;
    username?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { forgotPassword, resetPassword, forgotUser } = useAuthStore();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRecoveryData(null);
    try {
      const result = await forgotPassword(email);
      if (typeof result === 'string') {
        setRecoveryData({
          type: "code",
          value: result,
          savedToFile: true,
          emailSent: true,
          username: email,
        });
        setStep("reset");
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
    setRecoveryData(null);
    try {
      const success = await resetPassword(email, code, newPassword);
      if (success) {
        setMessage("✓ Password reset successfully. You can now login.");
        setTimeout(onBack, 3000);
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
    setRecoveryData(null);
    try {
      const result = await forgotUser(email);
      if (typeof result === 'string') {
        setRecoveryData({
          type: "username",
          value: result,
          savedToFile: true,
          emailSent: true,
          username: result,
        });
        setStep("forgot_user");
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
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0F] p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#F5C842]/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#2ECC71]/5 blur-[120px]" />
      
      <div className="w-full max-w-md bg-surface/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-2xl relative z-10">
         <div className="text-center mb-10">
           <div className="w-16 h-16 bg-[#F5C842]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <AlertCircle size={32} className="text-[#F5C842]" />
           </div>
           <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
             {step === "forgot_user" ? "Recover Account" : "Access Recovery"}
           </h1>
           <p className="text-muted-foreground text-sm">
             {step === "reset" ? "Enter the secure code and your new password" : "We'll help you regain access to your POS terminal"}
           </p>
           
           {/* Help note - Premium styled */}
           <details className="mt-6 text-left group">
             <summary className="text-xs font-semibold text-[#F5C842] cursor-pointer select-none py-2 px-1 hover:opacity-80 transition-opacity flex items-center gap-2 list-none">
               <span className="w-1 h-1 rounded-full bg-[#F5C842] animate-pulse" />
               Security Distinction: Password vs PIN
             </summary>
             <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-white uppercase tracking-wider">Account Password</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Set during registration. Required for high-security actions and first-time terminal activation.
                 </p>
               </div>
               <div className="space-y-1">
                 <p className="text-[11px] font-bold text-white uppercase tracking-wider">Station PIN</p>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   A 4-6 digit quick-access code for daily sales operations. Can be reset in Profile Settings once logged in.
                 </p>
               </div>
             </div>
           </details>
         </div>

        {/* Success message */}
        {message && !error && (
          <div className="p-4 mb-6 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
            <Check size={18} />
            {message}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-3 animate-in shake duration-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Prominent Credential Notification Card */}
        {recoveryData && (
          <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="border border-white/20 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md shadow-inner"
                 style={{
                   background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
                 }}>
              {/* Decorative side accent */}
              <div className="absolute top-0 left-0 w-1 h-full" 
                   style={{ background: recoveryData.type === "code" ? "#F5C842" : "#2ECC71" }} />
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                     style={{
                       background: recoveryData.type === "code"
                         ? "rgba(245,200,66,0.15)"
                         : "rgba(46,204,113,0.15)"
                     }}>
                  {recoveryData.type === "code" ? (
                    <FileText size={24} className="text-[#F5C842]" />
                  ) : (
                    <User size={24} className="text-[#2ECC71]" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white mb-1">
                    {recoveryData.type === "code" ? "Reset Token" : "Account ID"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                    {recoveryData.type === "code" ? "Secure Authorization" : "Username Retrieval"}
                  </p>
                </div>
              </div>

              {/* Credential value */}
              <div className="bg-white/5 border border-white/10 rounded-[1.25rem] p-5 mb-5 group hover:bg-white/10 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <code className="text-2xl font-mono font-bold tracking-wider text-white break-all">
                    {recoveryData.value}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(recoveryData.value)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    <span>{copied ? "Saved" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/60 text-xs font-medium hover:bg-white/5 transition-all"
                >
                  <FileText size={14} />
                  {showDetails ? "Collapse Details" : "Expansion Log"}
                </button>

                {showDetails && (
                  <div className="pt-4 border-t border-white/10 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center mt-0.5 shrink-0">
                        <FileText size={12} className="text-[#F5C842]" />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        A local backup has been exported to your <strong>Documents</strong> folder: <span className="text-white/80 italic">pos_{recoveryData.type === 'code' ? 'reset_code' : 'username'}.txt</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-white/5 flex items-center justify-center mt-0.5 shrink-0">
                        <Mail size={12} className="text-[#2ECC71]" />
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        An email template has been prepared for manual dispatch via your default client.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="reqEmail" className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">Email Terminal ID</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#F5C842] transition-colors" size={18} />
                <input
                  id="reqEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#F5C842]/30 focus:bg-white/10 transition-all placeholder:text-white/20"
                  placeholder="admin@terminal.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(245,200,66,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
            >
              {loading ? "Authenticating Request..." : "Initialize Recovery"}
            </button>
          </form>
        )}

        {step === "reset" && !message && (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="recoveryCode" className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">6-Digit Secure Code</label>
              <input
                id="recoveryCode"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-mono tracking-[0.5em] text-center text-xl outline-none focus:ring-2 focus:ring-[#F5C842]/30 focus:bg-white/10 transition-all placeholder:text-white/10"
                placeholder="000000"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">Establish New Password</label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#F5C842]/30 focus:bg-white/10 transition-all placeholder:text-white/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(245,200,66,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Committing Changes..." : "Finalize Password Reset"}
            </button>
          </form>
        )}

        {step === "forgot_user" && !recoveryData && (
          <form onSubmit={handleForgotUser} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="userEmail" className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">Registered Email</label>
              <input
                id="userEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-[#F5C842]/30 focus:bg-white/10 transition-all placeholder:text-white/20"
                placeholder="admin@terminal.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#F5C842] text-[#0D0D0F] font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(245,200,66,0.3)] transition-all disabled:opacity-50"
            >
              {loading ? "Searching..." : "Retrieve Username"}
            </button>
          </form>
        )}

        <div className="mt-10 flex flex-col items-center gap-5">
          {step === "request" && (
            <button
              onClick={() => setStep("forgot_user")}
              className="text-xs text-white/40 hover:text-[#F5C842] font-semibold tracking-wider transition-colors inline-flex items-center gap-2"
            >
              Identiy Misplaced? <span className="text-[#F5C842]">Recover Username</span>
            </button>
          )}
          {step === "forgot_user" && (
            <button
              onClick={() => setStep("request")}
              className="text-xs text-white/40 hover:text-[#F5C842] font-semibold tracking-wider transition-colors"
            >
              Need to initialize password reset?
            </button>
          )}
          <button
            onClick={onBack}
            className="text-sm text-[#F5C842]/80 font-bold hover:text-[#F5C842] transition-colors border-b border-[#F5C842]/30 pb-0.5"
          >
            Terminal Return
          </button>
        </div>
      </div>
    </div>
  );
}
