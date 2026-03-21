// components/PaywallModal.tsx
// Shows when a user tries to access a locked premium feature

"use client";
import { Crown, Lock, ArrowRight, Shield, X, ExternalLink, Mail } from "lucide-react";
import { Screen } from "@/app/page";
import { getRequiredTier, PREMIUM_FEATURES } from "@/lib/premium";

const tierInfo: Record<string, { label: string; color: string; icon: any }> = {
  pro: { label: "Pro", color: "#F5C842", icon: Crown },
  business: { label: "Business", color: "#8B5CF6", icon: Shield },
};

export default function PaywallModal({ screen, onClose, onUpgrade }: { screen: Screen; onClose: () => void; onUpgrade: () => void }) {
  const requiredTier = getRequiredTier(screen);
  const info = tierInfo[requiredTier];
  
  // Find feature details
  const feature = PREMIUM_FEATURES.find(f => f.id === screen);
  const featureLabel = feature?.label || screen;
  const featureDesc = feature?.description || "This feature requires a premium license.";

  if (!info) return null;
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="rounded-2xl max-w-md w-full mx-4 overflow-hidden" style={{ background: "#1E1E26", border: `1px solid ${info.color}30` }} onClick={e => e.stopPropagation()}>
        {/* Top gradient bar */}
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${info.color}, ${info.color}80)` }} />
        
        <div className="p-6">
          {/* Close button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-[#4A4A5A] hover:text-white">
            <X size={18} />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}>
            <Lock size={24} style={{ color: info.color }} />
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold text-center mb-1" style={{ color: "#fff" }}>
            {featureLabel}
          </h2>
          <p className="text-center mb-5" style={{ color: "#9090A8", fontSize: 13 }}>
            {featureDesc}
          </p>

          {/* Tier badge */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: `${info.color}15`, border: `1px solid ${info.color}30` }}>
              <Icon size={12} style={{ color: info.color }} />
              <span className="text-xs font-semibold" style={{ color: info.color }}>{info.label} Plan Required</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="space-y-2">
            <a
              href="https://appixen.com/buy-pos"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: info.color, color: "#0D0D0F", textDecoration: "none" }}
            >
              Buy Now
              <ExternalLink size={14} />
            </a>
            <button
              onClick={onUpgrade}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:bg-[#2A2A35]"
              style={{ background: "#2A2A35", color: "#9090A8" }}
            >
              Have a key? Activate
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="text-center mt-3">
            <p style={{ color: "#4A4A5A", fontSize: 11 }}>
              Billed every 6 months. Cancel anytime.
            </p>
            <a
              href="mailto:info@appixen.com"
              className="inline-flex items-center gap-1 mt-1 transition-colors hover:text-[#F5C842]"
              style={{ color: "#4A4A5A", fontSize: 11, textDecoration: "none" }}
            >
              <Mail size={10} />
              info@appixen.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
