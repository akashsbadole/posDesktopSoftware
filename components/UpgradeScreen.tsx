// components/UpgradeScreen.tsx
// Premium pricing page with license key activation

"use client";
import { useState } from "react";
import { Check, Crown, Zap, Lock, Key, X, Sparkles, Shield, ArrowRight, ExternalLink, Mail } from "lucide-react";
import { LICENSE_TIERS, PREMIUM_FEATURES, LicenseTier } from "@/lib/premium";
import { useLicenseStore, generateDemoLicenseKey } from "@/lib/stores/licenseStore";

export default function UpgradeScreen({ onClose, onSuccess }: { onClose?: () => void; onSuccess?: () => void }) {
  const { tier, licenseKey, activateLicense, deactivateLicense, isLoading, error } = useLicenseStore();
  const [keyInput, setKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedTier, setSelectedTier] = useState<LicenseTier>("pro");

  const handleActivate = async () => {
    if (!keyInput.trim()) return;
    setSuccessMsg("");
    const ok = await activateLicense(keyInput);
    if (ok) {
      setSuccessMsg("License activated successfully!");
      setKeyInput("");
      setShowKeyInput(false);
      onSuccess?.();
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const handleDeactivate = () => {
    deactivateLicense();
    setSuccessMsg("License deactivated.");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // For testing: generate demo keys via Rust backend
  const handleDemoKey = async (t: "pro" | "business") => {
    try {
      const key = await generateDemoLicenseKey(t);
      setKeyInput(key);
      setShowKeyInput(true);
    } catch (err) {
      console.error("Failed to generate demo key:", err);
    }
  };

  const tierIcons: Record<string, any> = {
    free: Zap,
    pro: Crown,
    business: Shield,
  };

  const tierColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    free: { bg: "#1E1E26", border: "#2A2A35", text: "#9090A8", accent: "#4A4A5A" },
    pro: { bg: "#1E1E26", border: "#F5C842", text: "#F5C842", accent: "#F5C842" },
    business: { bg: "#1E1E26", border: "#8B5CF6", text: "#8B5CF6", accent: "#8B5CF6" },
  };

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: "#0D0D0F" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: "rgba(245,200,66,0.1)", border: "1px solid rgba(245,200,66,0.2)" }}>
            <Sparkles size={14} style={{ color: "#F5C842" }} />
            <span style={{ fontSize: 12, color: "#F5C842", fontWeight: 600 }}>PREMIUM FEATURES</span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>Unlock Your Full Potential</h1>
          <p style={{ color: "#9090A8", fontSize: 14 }}>Choose the plan that fits your business. Billed every 6 months.</p>
        </div>

        {/* Current License Status */}
        {tier !== "free" && (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-between" style={{ background: tier === "pro" ? "rgba(245,200,66,0.1)" : "rgba(139,92,246,0.1)", border: `1px solid ${tier === "pro" ? "rgba(245,200,66,0.3)" : "rgba(139,92,246,0.3)"}` }}>
            <div className="flex items-center gap-3">
              {tier === "pro" ? <Crown size={20} style={{ color: "#F5C842" }} /> : <Shield size={20} style={{ color: "#8B5CF6" }} />}
              <div>
                <div className="font-semibold" style={{ color: "#fff", fontSize: 14 }}>{tier === "pro" ? "Pro" : "Business"} License Active</div>
                <div style={{ color: "#9090A8", fontSize: 12 }}>Key: {licenseKey.slice(0, 12)}...{licenseKey.slice(-4)}</div>
              </div>
            </div>
            <button onClick={handleDeactivate} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/20" style={{ color: "#E74C3C", border: "1px solid rgba(231,76,60,0.3)" }}>
              Deactivate
            </button>
          </div>
        )}

        {/* Success/Error Messages */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg text-center" style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.3)", color: "#2ECC71", fontSize: 13 }}>
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-center" style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", color: "#E74C3C", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {LICENSE_TIERS.map((t) => {
            const colors = tierColors[t.id];
            const Icon = tierIcons[t.id];
            const isActive = tier === t.id;
            const isCurrentPlan = isActive;

            return (
              <div
                key={t.id}
                className="rounded-xl p-5 relative transition-all"
                style={{
                  background: colors.bg,
                  border: `1px solid ${t.highlight ? colors.border : colors.border}`,
                  boxShadow: t.highlight ? `0 0 30px ${colors.border}15` : "none",
                }}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#F5C842", color: "#0D0D0F" }}>
                    MOST POPULAR
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${colors.accent}15` }}>
                    <Icon size={16} style={{ color: colors.accent }} />
                  </div>
                  <div>
                    <div className="font-bold" style={{ color: "#fff", fontSize: 16 }}>{t.label}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold" style={{ color: "#fff" }}>{t.price}</span>
                  <span style={{ color: "#9090A8", fontSize: 13 }}>{t.period}</span>
                </div>

                <div className="space-y-2 mb-5">
                  {t.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check size={14} style={{ color: colors.accent, marginTop: 2, flexShrink: 0 }} />
                      <span style={{ color: "#9090A8", fontSize: 12 }}>{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrentPlan ? (
                  <div className="w-full py-2 rounded-lg text-center text-xs font-semibold" style={{ background: `${colors.accent}20`, color: colors.accent }}>
                    ✓ Current Plan
                  </div>
                ) : t.id === "free" ? (
                  <div className="w-full py-2 rounded-lg text-center text-xs font-semibold" style={{ background: "#2A2A35", color: "#9090A8" }}>
                    Always Free
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a
                      href="https://appixen.com/buy-pos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                      style={{ background: colors.accent, color: "#0D0D0F", textDecoration: "none" }}
                    >
                      Buy Now
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => {
                        setSelectedTier(t.id);
                        setShowKeyInput(true);
                      }}
                      className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:bg-[#2A2A35]"
                      style={{ background: "#2A2A35", color: "#9090A8" }}
                    >
                      Have a key? Activate
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* License Key Input */}
        {showKeyInput && (
          <div className="mb-8 p-5 rounded-xl" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={16} style={{ color: "#F5C842" }} />
                <span className="font-semibold" style={{ color: "#fff", fontSize: 14 }}>Enter License Key</span>
              </div>
              <button onClick={() => { setShowKeyInput(false); setKeyInput(""); }} className="text-[#4A4A5A] hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                placeholder="POS-PRO-20260321-XXXXXXXX"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-mono outline-none transition-colors"
                style={{ background: "#0D0D0F", border: "1px solid #2A2A35", color: "#fff" }}
                onFocus={(e) => e.target.style.borderColor = "#F5C842"}
                onBlur={(e) => e.target.style.borderColor = "#2A2A35"}
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                autoFocus
              />
              <button
                onClick={handleActivate}
                disabled={isLoading || !keyInput.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                style={{ background: "#F5C842", color: "#0D0D0F" }}
              >
                {isLoading ? "Validating..." : "Activate"}
                <ArrowRight size={14} />
              </button>
            </div>

            <p style={{ color: "#4A4A5A", fontSize: 11, marginTop: 8 }}>
              License keys are provided after purchase. Format: POS-PRO-XXXXXXXX-XXXXXXXX or POS-BIZ-XXXXXXXX-XXXXXXXX
            </p>

            {/* Demo key buttons for testing */}
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #2A2A35" }}>
              <p style={{ color: "#4A4A5A", fontSize: 10, marginBottom: 6 }}>Generate demo key for testing:</p>
              <div className="flex gap-2">
                <button onClick={() => handleDemoKey("pro")} className="px-3 py-1 rounded text-xs" style={{ background: "#2A2A35", color: "#F5C842" }}>
                  Demo Pro Key
                </button>
                <button onClick={() => handleDemoKey("business")} className="px-3 py-1 rounded text-xs" style={{ background: "#2A2A35", color: "#8B5CF6" }}>
                  Demo Business Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: "#fff" }}>All Premium Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PREMIUM_FEATURES.map((f) => {
              const isUnlocked = tier === "business" || (tier === "pro" && f.tier === "pro");
              return (
                <div
                  key={f.id}
                  className="p-3 rounded-lg flex items-start gap-3"
                  style={{
                    background: isUnlocked ? "rgba(46,204,113,0.05)" : "#1E1E26",
                    border: `1px solid ${isUnlocked ? "rgba(46,204,113,0.2)" : "#2A2A35"}`,
                    opacity: isUnlocked ? 1 : 0.7,
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isUnlocked ? "rgba(46,204,113,0.1)" : "#2A2A35" }}>
                    {isUnlocked ? (
                      <Check size={14} style={{ color: "#2ECC71" }} />
                    ) : (
                      <Lock size={14} style={{ color: "#4A4A5A" }} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs" style={{ color: isUnlocked ? "#fff" : "#9090A8" }}>
                      {f.label}
                    </div>
                    <div style={{ color: "#4A4A5A", fontSize: 11, marginTop: 2 }}>{f.description}</div>
                    <div className="mt-1">
                      <span className="px-1.5 py-0.5 rounded text-xs" style={{
                        background: f.tier === "pro" ? "rgba(245,200,66,0.1)" : "rgba(139,92,246,0.1)",
                        color: f.tier === "pro" ? "#F5C842" : "#8B5CF6",
                        fontSize: 10,
                      }}>
                        {f.tier === "pro" ? "Pro" : "Business"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact / Purchase CTA */}
        <div className="mb-6 p-5 rounded-xl text-center" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}>
          <h3 className="font-bold mb-2" style={{ color: "#fff", fontSize: 15 }}>Ready to upgrade?</h3>
          <p className="mb-4" style={{ color: "#9090A8", fontSize: 13 }}>
            Subscribe online or reach out to us for bulk licenses, custom plans, or any questions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://appixen.com/buy-pos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: "#F5C842", color: "#0D0D0F", textDecoration: "none" }}
            >
              <ExternalLink size={14} />
              appixen.com/buy-pos
            </a>
            <a
              href="mailto:info@appixen.com"
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-[#2A2A35] flex items-center gap-2"
              style={{ color: "#9090A8", border: "1px solid #2A2A35", textDecoration: "none" }}
            >
              <Mail size={14} />
              info@appixen.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
