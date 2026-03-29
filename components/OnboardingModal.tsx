"use client";
import { useState, useEffect } from "react";
import {
  Check,
  Store,
  ChevronRight,
  ChevronLeft,
  ChefHat,
  ShoppingBag,
  Pill,
  Gift,
  Scissors,
  Wrench,
  Globe,
  Coins,
  ShieldCheck,
  Palette,
  Image as ImageIcon,
  Building2,
  Phone,
  MapPin,
} from "lucide-react";
import { useSettingsStore, useStoresStore } from "@/lib/stores";
import { Settings, Store as StoreType } from "@/lib/db";

const industries = [
  { id: "food", label: "Food & Beverage", icon: ChefHat, description: "Restaurants, cafes, bakeries" },
  { id: "retail", label: "Retail", icon: ShoppingBag, description: "Clothing, grocery, general retail" },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, description: "Medical stores, healthcare" },
  { id: "gift_shop", label: "Gift Shop", icon: Gift, description: "Gifts, toys, souvenirs" },
  { id: "salon_spa", label: "Salon & Spa", icon: Scissors, description: "Hair salon, beauty spa" },
  { id: "repair_shop", label: "Repair Shop", icon: Wrench, description: "Auto repair, electronics repair" },
];

const countryPresets: Record<string, any> = {
  US: { currency: "USD", symbol: "$", timezone: "America/New_York", taxSystem: "sales", taxRate: 8, taxName: "Sales Tax" },
  CA: { currency: "CAD", symbol: "C$", timezone: "America/Toronto", taxSystem: "hst", taxRate: 13, taxName: "HST" },
  GB: { currency: "GBP", symbol: "£", timezone: "Europe/London", taxSystem: "vat", taxRate: 20, taxName: "VAT" },
  IN: { currency: "INR", symbol: "₹", timezone: "Asia/Kolkata", taxSystem: "gst", taxRate: 18, taxName: "GST" },
  AU: { currency: "AUD", symbol: "A$", timezone: "Australia/Sydney", taxSystem: "gst", taxRate: 10, taxName: "GST" },
  DE: { currency: "EUR", symbol: "€", timezone: "Europe/Berlin", taxSystem: "vat", taxRate: 19, taxName: "VAT" },
  FR: { currency: "EUR", symbol: "€", timezone: "Europe/Paris", taxSystem: "vat", taxRate: 20, taxName: "TVA" },
  JP: { currency: "JPY", symbol: "¥", timezone: "Asia/Tokyo", taxSystem: "none", taxRate: 10, taxName: "Tax" },
  SG: { currency: "SGD", symbol: "S$", timezone: "Asia/Singapore", taxSystem: "gst", taxRate: 9, taxName: "GST" },
};

export default function OnboardingModal() {
  const { settings, saveSettings, activeStoreId } = useSettingsStore();
  const { updateStore, stores, fetchStores } = useStoresStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agreedToLicense, setAgreedToLicense] = useState(false);

  const [formData, setFormData] = useState({
    industry: "food" as StoreType["industry"],
    storeName: "",
    address: "",
    phone: "",
    country: "US",
    currency: "USD",
    currencySymbol: "$",
    timezone: "UTC",
    taxSystem: "none",
    taxRate: 0,
    taxName: "Tax",
    logoUrl: "",
    primaryColor: "#F5C842",
  });

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleCountryChange = (country: string) => {
    const preset = countryPresets[country] || countryPresets["US"];
    setFormData((prev) => ({
      ...prev,
      country,
      currency: preset.currency,
      currencySymbol: preset.symbol,
      timezone: preset.timezone,
      taxSystem: preset.taxSystem,
      taxRate: preset.taxRate,
      taxName: preset.taxName,
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // 1. Update current store info
      const currentStore = stores.find(s => s.id === activeStoreId);
      if (currentStore) {
        await updateStore({
          ...currentStore,
          name: formData.storeName || currentStore.name,
          industry: formData.industry,
        });
      }

      // 2. Update settings
      await saveSettings({
        store_name: formData.storeName,
        address: formData.address,
        phone: formData.phone,
        country: formData.country,
        currency: formData.currency,
        currency_symbol: formData.currencySymbol,
        timezone: formData.timezone,
        tax_system: formData.taxSystem,
        tax_rate: formData.taxRate,
        tax_name: formData.taxName,
        logo_url: formData.logoUrl,
        primary_color: formData.primaryColor,
        onboarding_completed: true,
      });

      // 3. Force reload to apply all changes
      window.location.reload();
    } catch (err) {
      console.error("Onboarding failed:", err);
      alert("Failed to save onboarding information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-muted flex">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className={`h-full transition-all duration-500 ${
                s <= step ? "bg-[#F5C842]" : "bg-transparent"
              }`}
              style={{ width: "16.66%" }}
            />
          ))}
        </div>

        <div className="p-8 md:p-12">
          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">License Agreement</h1>
                <p className="text-muted-foreground">Please review and accept the MIT License</p>
              </div>

              <div className="bg-muted/50 border border-border rounded-xl p-6 h-64 overflow-y-auto text-xs font-mono space-y-4 leading-relaxed">
                <p className="font-bold">MIT License</p>
                <p>Copyright (c) 2025 akash badole</p>
                <p>
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the "Software"), to deal
                  in the Software without restriction, including without limitation the rights
                  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                  copies of the Software, and to permit persons to whom the Software is
                  furnished to do so, subject to the following conditions:
                </p>
                <p>
                  The above copyright notice and this permission notice shall be included in all
                  copies or substantial portions of the Software.
                </p>
                <p>
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                  SOFTWARE.
                </p>
              </div>

              <label
                onClick={() => setAgreedToLicense(!agreedToLicense)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    agreedToLicense ? "bg-[#F5C842] border-[#F5C842]" : "border-muted-foreground group-hover:border-[#F5C842]"
                  }`}
                >
                  {agreedToLicense && <Check size={16} className="text-[#0D0D0F]" />}
                </div>
                <span className="text-sm font-medium">I have read and agree to the license terms</span>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <Store size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Welcome to POS Billing</h1>
                <p className="text-muted-foreground">Select your industry to get started</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {industries.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setFormData({ ...formData, industry: ind.id as any })}
                    className={`p-4 rounded-2xl border-2 transition-all text-left group ${
                      formData.industry === ind.id
                        ? "border-[#F5C842] bg-[#F5C842]/5 shadow-lg shadow-[#F5C842]/10"
                        : "border-border hover:border-border/80 bg-muted/30"
                    }`}
                  >
                    <ind.icon
                      size={24}
                      className={`mb-3 transition-colors ${
                        formData.industry === ind.id ? "text-[#F5C842]" : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <h3 className="font-bold text-sm mb-1">{ind.label}</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">{ind.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <Building2 size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Store Identity</h1>
                <p className="text-muted-foreground">Tell us about your business</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Store size={14} /> Store Name
                  </label>
                  <input
                    autoFocus
                    placeholder="e.g. Downtown Cafe"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <MapPin size={14} /> Address
                  </label>
                  <input
                    placeholder="123 Main St, City"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Phone size={14} /> Phone Number
                  </label>
                  <input
                    placeholder="+1 234 567 890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <Globe size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Regional Settings</h1>
                <p className="text-muted-foreground">Currency and location preferences</p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none"
                  >
                    {Object.keys(countryPresets).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Currency</label>
                  <div className="p-4 bg-muted/50 border border-border rounded-xl flex items-center justify-between">
                    <span className="font-bold">{formData.currency}</span>
                    <span className="text-[#F5C842]">{formData.currencySymbol}</span>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Timezone</label>
                  <input
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <ShieldCheck size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Tax Configuration</h1>
                <p className="text-muted-foreground">How should we handle taxes?</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Tax System</label>
                  <select
                    value={formData.taxSystem}
                    onChange={(e) => setFormData({ ...formData, taxSystem: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50 outline-none"
                  >
                    <option value="none">No Tax</option>
                    <option value="gst">GST (India)</option>
                    <option value="vat">VAT (Europe)</option>
                    <option value="sales">Sales Tax (US)</option>
                    <option value="hst">HST (Canada)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Tax Name</label>
                    <input
                      placeholder="e.g. VAT"
                      value={formData.taxName}
                      onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                      className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Rate (%)</label>
                    <input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F5C842]/10 rounded-2xl flex items-center justify-center text-[#F5C842] mx-auto mb-4">
                  <Palette size={32} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Branding</h1>
                <p className="text-muted-foreground">Make it your own</p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <ImageIcon size={14} /> Logo URL
                  </label>
                  <input
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full p-4 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-[#F5C842]/50"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Palette size={14} /> Brand Color
                  </label>
                  <div className="flex gap-3">
                    {["#F5C842", "#3498DB", "#2ECC71", "#E74C3C", "#9B59B6", "#FF9F43"].map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, primaryColor: color })}
                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${
                          formData.primaryColor === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-10 h-10 bg-transparent p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-border mt-8 text-center">
                  <h3 className="font-bold mb-2">Ready to launch?</h3>
                  <p className="text-xs text-muted-foreground mb-6">You can always change these settings later in the Settings panel.</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex gap-4 mt-12 pt-8 border-t border-border">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border border-border font-bold hover:bg-muted transition-colors"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            {step < 6 ? (
              <button
                onClick={nextStep}
                disabled={
                  (step === 1 && !agreedToLicense) ||
                  (step === 2 && !formData.industry) ||
                  (step === 3 && !formData.storeName)
                }
                className="flex-[2] flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#F5C842] text-[#0D0D0F] font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-[2] flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#F5C842] text-[#0D0D0F] font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#F5C842]/20"
              >
                {loading ? <div className="w-5 h-5 border-2 border-[#0D0D0F]/30 border-t-[#0D0D0F] rounded-full animate-spin" /> : <Check size={20} />}
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
