"use client";
import { useState } from "react";
import { Settings, dbSaveSettings, resetAdminPin } from "@/lib/db";
import { STORE_TYPES, StoreTypeId, StoreTypeConfig, getStoreTypeConfig } from "@/lib/storeTypes";
import { ChefHat, ShoppingBag, Gift, Package, Pill, Monitor } from "lucide-react";

const STORE_TYPE_ICONS: Record<string, any> = {
  food: ChefHat,
  garment: ShoppingBag,
  gift: Gift,
  retail: Package,
  pharmacy: Pill,
  electronics: Monitor,
};

interface SetupWizardProps {
  settings: Settings;
  onComplete: () => void;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "CN", name: "China" },
  { code: "SG", name: "Singapore" },
];

export default function SetupWizard({ settings, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    store_name: settings.store_name || "",
    store_type: (settings.store_type as StoreTypeId) || "food",
    business_name: settings.business_name || "",
    phone: settings.phone || "",
    address: settings.address || "",
    currency: settings.currency || "USD",
    currency_symbol: settings.currency_symbol || "$",
    country: settings.country || "US",
    tax_rate: settings.tax_rate || 0,
    tax_name: settings.tax_name || "Tax",
    tax_system: settings.tax_system || "none",
    admin_pin: "1234",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const currencyObj = CURRENCIES.find(c => c.code === formData.currency);
      
      await dbSaveSettings({
        ...settings,
        store_name: formData.store_name,
        store_type: formData.store_type,
        business_name: formData.business_name,
        phone: formData.phone,
        address: formData.address,
        currency: formData.currency,
        currency_symbol: currencyObj?.symbol || "$",
        country: formData.country,
        tax_rate: formData.tax_rate,
        tax_name: formData.tax_name,
        tax_system: formData.tax_system,
        first_run: false,
      });
      
      await resetAdminPin();
      
      onComplete();
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "#0D0D0F" }}>
      <div className="rounded-2xl p-8 w-full max-w-lg" style={{ background: "#1E1E26" }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#F5C842" }}>
            Welcome to POS Billing
          </h1>
          <span className="text-sm" style={{ color: "#4A4A5A" }}>Step {step} of 3</span>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-2 flex-1 rounded-full transition-all"
              style={{ background: s <= step ? "#F5C842" : "#2A2A35" }}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Store Information</h2>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Store Name *</label>
              <input
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full p-3 rounded-lg"
                style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                placeholder="My POS Store"
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Store Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.values(STORE_TYPES) as StoreTypeConfig[]).map((st) => {
                  const Icon = STORE_TYPE_ICONS[st.id] || Package;
                  const selected = formData.store_type === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, store_type: st.id })}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-all"
                      style={{
                        background: selected ? "rgba(245,200,66,0.1)" : "#141418",
                        border: `1px solid ${selected ? "#F5C842" : "#2A2A35"}`,
                        color: selected ? "#F5C842" : "#9090A8",
                      }}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium leading-tight">{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Business Name</label>
              <input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full p-3 rounded-lg"
                style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                placeholder="Your Business Name"
              />
            </div>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Phone Number</label>
              <input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 rounded-lg"
                style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                placeholder="+1 234 567 890"
              />
            </div>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 rounded-lg"
                style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                placeholder="123 Main Street, City"
                rows={2}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Regional Settings</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full p-3 rounded-lg"
                  style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    const c = CURRENCIES.find(x => x.code === e.target.value);
                    setFormData({ ...formData, currency: e.target.value, currency_symbol: c?.symbol || "$" });
                  }}
                  className="w-full p-3 rounded-lg"
                  style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Tax System</label>
              <select
                value={formData.tax_system}
                onChange={(e) => setFormData({ ...formData, tax_system: e.target.value })}
                className="w-full p-3 rounded-lg"
                style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
              >
                <option value="none">No Tax</option>
                <option value="single">Single Tax</option>
                <option value="multiple">Multiple Taxes (GST/VAT)</option>
              </select>
            </div>
            
            {formData.tax_system !== "none" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Tax Name</label>
                  <input
                    value={formData.tax_name}
                    onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
                    className="w-full p-3 rounded-lg"
                    style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                    placeholder="GST"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "#9090A8" }}>Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 rounded-lg"
                    style={{ background: "#141418", border: "1px solid #2A2A35", color: "#fff" }}
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Admin Account</h2>
            
            <div className="p-4 rounded-lg" style={{ background: "#141418" }}>
              <p className="text-sm mb-2" style={{ color: "#9090A8" }}>Default Admin PIN:</p>
              <p className="text-xl font-bold" style={{ color: "#F5C842" }}>1234</p>
            </div>
            
            <div className="p-4 rounded-lg" style={{ background: "#2A2A35" }}>
              <p className="text-sm" style={{ color: "#9090A8" }}>
                You can change the PIN later in Settings → Staff Management
              </p>
            </div>
            
            <div className="p-4 rounded-lg" style={{ background: "#2ECC71", opacity: 0.2 }}>
              <p className="text-sm" style={{ color: "#fff" }}>
                ✓ Store: {formData.store_name || "Not set"}
                <br />
                ✓ Type: {getStoreTypeConfig(formData.store_type).label}
                <br />
                ✓ Currency: {formData.currency_symbol} {formData.currency}
                <br />
                ✓ Country: {COUNTRIES.find(c => c.code === formData.country)?.name}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(231,76,60,0.1)", color: "#E74C3C" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-lg font-semibold transition-all"
              style={{ background: "#2A2A35", color: "#fff" }}
            >
              Back
            </button>
          )}
          
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={step === 1 && !formData.store_name}
              className="flex-1 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#F5C842", color: "#0D0D0F" }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#2ECC71", color: "#fff" }}
            >
              {saving ? "Setting up..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}