"use client";
import React, { useState } from "react";
import {
  X,
  Check,
  Key,
  Zap,
  ShieldCheck,
  Database,
  LayoutGrid,
  Users,
  MessageSquare,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useSettingsStore } from "@/lib/stores";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  featureName,
}: PremiumUpgradeModalProps) {
  const { saveSettings, checkPremium, premiumStatus } = useSettingsStore();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [showLicenseEntry, setShowLicenseEntry] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!licenseKey.startsWith("PREM-")) {
      alert("Invalid license key. Keys must start with 'PREM-'");
      return;
    }

    setActivating(true);
    try {
      await saveSettings({ license_key: licenseKey });
      await checkPremium();

      // We need to check if it actually enabled premium after saving
      const { premiumEnabled: nowEnabled } = useSettingsStore.getState();

      if (nowEnabled) {
        alert("Success! Premium features activated.");
        onClose();
        window.location.reload();
      } else {
        alert("Invalid license key. Check for typos or contact support.");
      }
    } catch (err) {
      alert("Failed to activate license. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const benefits = [
    {
      icon: Database,
      label: "Cloud Sync (Neon)",
      desc: "Real-time backup & multi-device sync",
    },
    {
      icon: LayoutGrid,
      label: "Multi-Store Management",
      desc: "Manage all branches from one app",
    },
    {
      icon: ShieldCheck,
      label: "Advanced Inventory",
      desc: "Ingredients, POs & Recipe tracking",
    },
    {
      icon: Users,
      label: "CRM & Loyalty",
      desc: "Customer Wallet & Points system",
    },
    {
      icon: Zap,
      label: "Staff Payroll",
      desc: "Salary calculations & scheduling",
    },
    {
      icon: MessageSquare,
      label: "SMS & WhatsApp",
      desc: "Automated digital receipts",
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0F0F12] border border-[#F5C842]/30 w-full max-w-2xl rounded-3xl shadow-[0_0_50px_rgba(245,200,66,0.15)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="relative p-8 md:p-12 text-center overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#F5C842]/10 blur-[100px] -z-10" />

          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 transition-colors text-gray-500 hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="w-20 h-20 bg-[#F5C842] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(245,200,66,0.3)]">
            <Key size={36} color="#0D0D0F" />
          </div>

          <h2 className="text-3xl font-bold mb-2">
            All Features Are Free!
          </h2>
          {featureName && (
            <p className="text-[#F5C842] font-semibold mb-4 uppercase tracking-widest text-xs">
              {featureName} Included
            </p>
          )}
          <p className="text-gray-400 max-w-md mx-auto mb-10">
            Appixen POS Billing is 100% free - no subscription, no trial, no hidden fees. All professional features are unlocked from day one!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#F5C842]/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#F5C842]/10 transition-colors">
                  <benefit.icon
                    size={20}
                    className="text-gray-400 group-hover:text-[#F5C842]"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {benefit.label}
                  </h4>
                  <p className="text-[11px] text-gray-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {!showLicenseEntry ? (
            <div className="flex flex-col items-center">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6 w-full">
                <button
                  onClick={() => window.open("http://appixen.com/", "_blank")}
                  className="w-full sm:w-auto px-10 py-4 bg-[#F5C842] text-[#0D0D0F] font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(245,200,66,0.2)]"
                >
                  UPGRADE NOW
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-10 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Maybe Later
                </button>
              </div>
              <button
                onClick={() => setShowLicenseEntry(true)}
                className="text-xs text-gray-500 hover:text-[#F5C842] transition-colors underline underline-offset-4"
              >
                Already have a license key? Click here to activate
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
              <div className="relative w-full mb-4">
                <Key
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  autoFocus
                  placeholder="Enter License Key (PREM-XXXX)"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-[#F5C842] transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                />
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLicenseEntry(false)}
                  className="flex-1 py-3 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleActivate}
                  disabled={activating || !licenseKey}
                  className="flex-[2] py-3 bg-[#F5C842] text-[#0D0D0F] font-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {activating ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  ACTIVATE LICENSE
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-[10px] text-gray-600 uppercase tracking-tighter">
            Instant Activation • No Hidden Fees • Priority Support
          </p>
        </div>
      </div>
    </div>
  );
}
