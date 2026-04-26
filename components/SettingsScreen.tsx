"use client";
import { useState, useEffect, useRef } from "react";
import {
  Check,
  Store,
  Database,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Info,
  Moon,
  Sun,
  Download,
  Upload,
  Save,
  Palette,
  Mail,
  AlertCircle,
  Key,
  Receipt,
  Lock,
  Monitor,
  LayoutGrid,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/tauri";
import {
  syncToNeon,
  syncFromNeon,
  sendSmsNotification,
  sendWhatsAppMessage,
  changePin,
  Settings,
  exportBackup,
  importBackup,
  seedDatabase,
  resetDatabase,
  resetAndSeedDatabase,
} from "@/lib/db";
import { useSettingsStore, useAuthStore } from "@/lib/stores";
import pako from "pako";
import { countryPresets, taxSystems } from "@/lib/countries";

const validatePhone = (phone: string): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (!/^\+?[\d]{7,15}$/.test(cleaned)) {
    return "Invalid phone number format";
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email format";
  }
  return null;
};

const validateUrl = (url: string): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format";
  }
};

const validateTaxRate = (rate: number): string | null => {
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return "Tax rate must be between 0 and 100";
  }
  return null;
};

const validatePort = (port: number): string | null => {
  if (isNaN(port) || port < 1 || port > 65535) {
    return "Port must be between 1 and 65535";
  }
  return null;
};

export default function SettingsScreen() {
  const {
    activeStoreId,
    settings,
    isLoading,
    fetchSettings,
    saveSettings,
    isDarkMode,
    setDarkMode,
    lastSyncTime,
    setLastSyncTime,
    isSyncing,
    setIsSyncing,
  } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const syncing = isSyncing;
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [resetting, setResetting] = useState(false);
  const [resetAndSeeding, setResetAndSeeding] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsMsg, setSmsMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestMessage, setWaTestMessage] = useState("");

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [changingPin, setChangingPin] = useState(false);
  const [shortcutMsg, setShortcutMsg] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [creatingShortcut, setCreatingShortcut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  const [localSettings, setLocalSettings] = useState<Settings>(
    settings || {
      store_name: "My POS Store",
      currency: "USD",
      currency_symbol: "$",
      country: "US",
      timezone: "America/New_York",
      tax_system: "sales",
      tax_rate: 8,
      tax_name: "Sales Tax",
      tax_id: "",
      address: "123 Main Street, City",
      phone: "+1 234 567 890",
      neon_url: "",
      business_name: "",
      receipt_save_path: "",
      language: "en",
      dark_mode: false,
      offline_mode: true,
      whatsapp_enabled: false,
      whatsapp_api_url: "",
      twilio_sid: "",
      twilio_token: "",
      twilio_phone: "",

      logo_url: "",
      primary_color: "#F5C842",
      secondary_color: "#1E1E26",
      accent_color: "#2ECC71",
      footer_text: "Powered by Appixen POS Billing",
      contact_email: "",
      contact_website: "",
      upi_id: "",
      show_logo_on_receipt: true,
      receipt_header_text: "",
      merchant_id: "",
      show_tax_breakdown: true,
      enable_round_off: true,
      license_agreed: false,
      tax_inclusive: false,
      tax_breakdown: "[]",
      auto_print_kot: false,
      auto_reminders_enabled: false,
      auto_reminder_days: 30,
      hidden_menus: "",
    },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, [activeStoreId]);

  useEffect(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute(
      "data-theme",
      newMode ? "dark" : "light",
    );
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    const phoneError = validatePhone(localSettings.phone);
    if (phoneError) newErrors.phone = phoneError;

    const emailError = validateEmail(localSettings.contact_email);
    if (emailError) newErrors.contact_email = emailError;

    const websiteError = validateUrl(localSettings.contact_website);
    if (websiteError) newErrors.contact_website = websiteError;

    const taxRateError = validateTaxRate(localSettings.tax_rate);
    if (taxRateError) newErrors.tax_rate = taxRateError;

    const whatsappUrlError = validateUrl(localSettings.whatsapp_api_url);
    if (whatsappUrlError) newErrors.whatsapp_api_url = whatsappUrlError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      await saveSettings(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings. Please try again.");
    }
  };

  const updateLocal = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSyncUp = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncToNeon(activeStoreId);
      setSyncMsg(
        r.error
          ? { text: r.error, ok: false }
          : { text: `✓ Cloud Sync: Pushed local changes to Neon`, ok: true },
      );
      if (!r.error) setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      setSyncMsg({ text: `Sync failed: ${err}`, ok: false });
    }
    setIsSyncing(false);
  };

  const handleSyncDown = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncFromNeon(activeStoreId);
      setSyncMsg(
        r.error
          ? { text: r.error, ok: false }
          : { text: `✓ Cloud Sync: Pulled changes from Neon`, ok: true },
      );
      if (!r.error) setLastSyncTime(new Date().toLocaleTimeString());
    } catch (err) {
      setSyncMsg({ text: `Sync failed: ${err}`, ok: false });
    }
    setIsSyncing(false);
  };

  const handleExportBackup = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const backupData = await exportBackup(activeStoreId);
      const binaryString = atob(backupData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/gzip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().split("T")[0]}.gz`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({
        text: "✓ Backup exported successfully! (compressed)",
        ok: true,
      });
    } catch (err) {
      setBackupMsg({ text: `Error: ${err}`, ok: false });
    }
    setBackingUp(false);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let jsonString: string;

      try {
        // Try to decompress as gzip
        jsonString = pako.ungzip(bytes, { to: "string" });
      } catch {
        // If not gzipped, decode as UTF-8 text
        jsonString = new TextDecoder().decode(bytes);
      }

      // Validate JSON
      JSON.parse(jsonString);

      const result = await importBackup(jsonString, activeStoreId);
      setBackupMsg({
        text: `✓ Imported ${result.products_imported} products and ${result.orders_imported} orders`,
        ok: true,
      });
    } catch (err) {
      setBackupMsg({
        text: `Error: Invalid backup file or import failed`,
        ok: false,
      });
    }
    setBackingUp(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRestoreBackup = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let jsonString: string;

      try {
        // Try to decompress as gzip
        jsonString = pako.ungzip(bytes, { to: "string" });
      } catch {
        // If not gzipped, decode as UTF-8 text
        jsonString = new TextDecoder().decode(bytes);
      }

      // Validate JSON
      JSON.parse(jsonString);

      const result = await importBackup(jsonString, activeStoreId);
      setRestoreMsg({
        text: `✓ Restored ${result.products_imported} products and ${result.orders_imported} orders`,
        ok: true,
      });
    } catch (err) {
      setRestoreMsg({
        text: `Error: Invalid backup file or restore failed`,
        ok: false,
      });
    }
    setRestoring(false);
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = "";
  };

  const handleSendTestSms = async () => {
    if (!testPhone || !testMessage) {
      setSmsMsg({ text: "Please enter phone number and message", ok: false });
      return;
    }
    setSendingSms(true);
    setSmsMsg(null);
    try {
      await sendSmsNotification(testPhone, testMessage, activeStoreId);
      setSmsMsg({ text: "✓ SMS sent successfully!", ok: true });
      setTestPhone("");
      setTestMessage("");
    } catch (err) {
      setSmsMsg({ text: `Error: ${err}`, ok: false });
    }
    setSendingSms(false);
  };

  const handleSendTestWhatsApp = async () => {
    if (!waTestPhone || !waTestMessage) {
      setWhatsappMsg({
        text: "Please enter phone number and message",
        ok: false,
      });
      return;
    }
    setSendingWhatsapp(true);
    setWhatsappMsg(null);
    try {
      await sendWhatsAppMessage(waTestPhone, waTestMessage, activeStoreId);
      setWhatsappMsg({
        text: "✓ WhatsApp message sent successfully!",
        ok: true,
      });
      setWaTestPhone("");
      setWaTestMessage("");
    } catch (err) {
      setWhatsappMsg({ text: `Error: ${err}`, ok: false });
    }
    setSendingWhatsapp(false);
  };

  const handleSeedData = async () => {
    const confirmed = window.confirm(
      "This will populate your database with sample data. Are you sure you want to proceed?",
    );
    if (!confirmed) return;

    setSeeding(true);
    setSeedMsg(null);
    try {
      await seedDatabase();
      setSeedMsg({ text: "✓ Sample data seeded successfully!", ok: true });
    } catch (err) {
      setSeedMsg({ text: `Error: ${err}`, ok: false });
    }
    setSeeding(false);
  };

  const handleResetDatabase = async () => {
    const confirmed = window.confirm(
      "WARNING: This will permanently delete ALL data and reset the database to empty state. This action cannot be undone. Are you absolutely sure?",
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "FINAL WARNING: All products, orders, customers, and settings will be lost forever. Confirm to proceed.",
    );
    if (!doubleConfirm) return;

    setResetting(true);
    setSeedMsg(null);
    try {
      await resetDatabase();
      setSeedMsg({
        text: "✓ Database reset successfully! All data has been cleared.",
        ok: true,
      });
    } catch (err) {
      setSeedMsg({ text: `Error: ${err}`, ok: false });
    }
    setResetting(false);
  };

  const handleResetAndSeed = async () => {
    const confirmed = window.confirm(
      "This will reset the database and populate it with sample data. All existing data will be lost. Continue?",
    );
    if (!confirmed) return;

    setResetAndSeeding(true);
    setSeedMsg(null);
    try {
      await resetAndSeedDatabase();
      setSeedMsg({
        text: "✓ Database reset and seeded successfully! Sample data is now available.",
        ok: true,
      });
    } catch (err) {
      setSeedMsg({ text: `Error: ${err}`, ok: false });
    }
    setResetAndSeeding(false);
  };

  const { user } = useAuthStore();

  const handleChangePin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMsg({ text: "PIN must be exactly 4 digits", ok: false });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ text: "PINs do not match", ok: false });
      return;
    }
    setChangingPin(true);
    setPinMsg(null);
    try {
      await changePin(user?.id || "", newPin);
      setPinMsg({ text: "✓ PIN changed successfully!", ok: true });
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setPinMsg({ text: `Error: ${err}`, ok: false });
    }
    setChangingPin(false);
  };

  const handleCreateShortcut = async () => {
    setCreatingShortcut(true);
    setShortcutMsg(null);
    try {
      const result = await invoke<string>("create_desktop_shortcut");
      setShortcutMsg({ text: `✓ ${result}`, ok: true });
    } catch (err) {
      setShortcutMsg({ text: `Error: ${err}`, ok: false });
    }
    setCreatingShortcut(false);
  };

  if (isLoading || !localSettings)
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: "#4A4A5A" }}
      >
        <RefreshCw className="spin" />
      </div>
    );

  return (
    <div className="h-full overflow-y-auto p-5">
      <h1 className="font-display text-xl font-bold mb-6">Settings</h1>
      <div className="grid grid-cols-2 gap-4">
        {/* Premium Plan Highlight */}
        <div
          className="card p-6 border-2 transition-all"
          style={{
            borderColor: "#2ECC71",
            background: "rgba(46,204,113,0.05)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "#2ECC71" }}
              >
                <Key size={24} color="#0D0D0F" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Completely Free Forever</h2>
                <p className="text-xs" style={{ color: "#4A4A5A" }}>
                  All features included - no subscriptions, no hidden fees!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            {[
              {
                label: "Cloud Sync (Neon)",
                desc: "Real-time backup & multi-device sync",
              },
              {
                label: "Multi-Store",
                desc: "Manage all branches from one app",
              },
              {
                label: "Advanced Inventory",
                desc: "Ingredients, POs & Suppliers",
              },
              {
                label: "Loyalty & CRM",
                desc: "Customer Wallet & Points system",
              },
              {
                label: "Staff Payroll",
                desc: "Salary calculations & scheduling",
              },
              {
                label: "SMS & WhatsApp",
                desc: "Automated digital receipts",
              },
            ].map((f, i) => (
              <div key={i} className="flex gap-2">
                <div className="mt-1">
                  <Check size={14} className="text-[#2ECC71]" />
                </div>
                <div>
                  <div className="text-[11px] font-bold">{f.label}</div>
                  <div className="text-[9px]" style={{ color: "#4A4A5A" }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Store Info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Store Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Store Name
              </label>
              <input
                value={localSettings.store_name}
                onChange={(e) => updateLocal("store_name", e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Address
              </label>
              <input
                value={localSettings.address}
                onChange={(e) => updateLocal("address", e.target.value)}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Phone
              </label>
              <input
                value={localSettings.phone}
                onChange={(e) => {
                  updateLocal("phone", e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    phone: validatePhone(e.target.value) || "",
                  }));
                }}
                className={errors.phone ? "error" : ""}
              />
              {errors.phone && (
                <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  {errors.phone}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location & Currency */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: "#F5C842" }}>🌍</span>
            <h2 className="font-semibold">Location & Currency</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Country
              </label>
              <select
                value={localSettings.country}
                onChange={(e) => {
                  const country = e.target.value;
                  console.log("Country selected:", country);
                  const presets =
                    countryPresets[country] || countryPresets["US"];
                  updateLocal("country", country);
                  updateLocal("currency", presets.currency);
                  updateLocal("currency_symbol", presets.symbol);
                  updateLocal("timezone", presets.timezones[0]);
                  updateLocal("tax_system", presets.taxSystem);
                  updateLocal("tax_rate", presets.taxRate);
                  updateLocal("tax_name", presets.taxName);
                }}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {Object.entries(countryPresets).map(([code, preset]) => (
                  <option key={code} value={code}>
                    {code} - {preset.currency}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Currency
              </label>
              <select
                value={localSettings.currency}
                onChange={(e) => {
                  const currency = e.target.value;
                  updateLocal("currency", currency);
                  // Find symbol for selected currency
                  const preset = Object.values(countryPresets).find(
                    (p) => p.currency === currency,
                  );
                  if (preset) {
                    updateLocal("currency_symbol", preset.symbol);
                  }
                }}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {Array.from(
                  new Set(Object.values(countryPresets).map((p) => p.currency)),
                ).map((curr) => {
                  const preset = Object.values(countryPresets).find(
                    (p) => p.currency === curr,
                  );
                  return (
                    <option key={curr} value={curr}>
                      {curr} - {preset?.symbol}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Currency Symbol
              </label>
              <input
                value={localSettings.currency_symbol}
                onChange={(e) => updateLocal("currency_symbol", e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
        </div>

        {/* Tax Configuration */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: "#F5C842" }}>💰</span>
            <h2 className="font-semibold">Tax Configuration</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Tax System
              </label>
              <select
                value={localSettings.tax_system}
                onChange={(e) => {
                  const system = e.target.value;
                  updateLocal("tax_system", system);
                  const systemLabel =
                    taxSystems.find((s) => s.id === system)?.label || "Tax";
                  updateLocal("tax_name", systemLabel);
                }}
                style={{ padding: "10px" }}
              >
                {taxSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                {taxSystems.find((s) => s.id === localSettings.tax_system)
                  ?.label || "Tax"}{" "}
                Rate (%)
              </label>
              <input
                type="number"
                value={localSettings.tax_rate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  updateLocal("tax_rate", val);
                  setErrors((prev) => ({
                    ...prev,
                    tax_rate: validateTaxRate(val) || "",
                  }));
                }}
                min={0}
                max={100}
                className={errors.tax_rate ? "error" : ""}
              />
              {errors.tax_rate && (
                <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  {errors.tax_rate}
                </div>
              )}
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Tax Name
              </label>
              <input
                value={localSettings.tax_name}
                onChange={(e) => updateLocal("tax_name", e.target.value)}
                placeholder={localSettings.tax_system === "gst" ? "GST" : "Tax"}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Tax ID / GSTIN
              </label>
              <input
                value={localSettings.tax_id}
                onChange={(e) => updateLocal("tax_id", e.target.value)}
                placeholder={
                  localSettings.tax_system === "gst"
                    ? "29AAAAA0000A1Z5"
                    : "Tax ID"
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: "#4A4A5A" }}>
                Tax Inclusive Pricing
              </label>
              <div
                className="toggle"
                onClick={() =>
                  updateLocal("tax_inclusive", !localSettings.tax_inclusive)
                }
              >
                <div
                  className="toggle-slider"
                  style={{
                    background: localSettings.tax_inclusive
                      ? "#2ECC71"
                      : "#1E1E26",
                  }}
                >
                  <div
                    className="toggle-knob"
                    style={{
                      background: "#fff",
                      left: localSettings.tax_inclusive ? 22 : 2,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>
              Business Name (for receipts)
            </label>
            <input
              value={localSettings.business_name}
              onChange={(e) => updateLocal("business_name", e.target.value)}
              placeholder="Your Business Name"
            />
          </div>
          {localSettings.country === "IN" && (
            <div className="mt-3">
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                UPI ID (for receipts)
              </label>
              <input
                value={localSettings.upi_id || ""}
                onChange={(e) => updateLocal("upi_id", e.target.value)}
                placeholder="merchant@upi"
              />
            </div>
          )}
          {localSettings.country === "IN" && (
            <div className="mt-3">
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Merchant ID (for UPI payments)
              </label>
              <input
                value={localSettings.merchant_id || ""}
                onChange={(e) => updateLocal("merchant_id", e.target.value)}
                placeholder="Merchant ID"
              />
            </div>
          )}
        </div>

        {/* Language & Region */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: "#F5C842" }}>🌐</span>
            <h2 className="font-semibold">Language</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Choose your preferred language for the POS interface.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { code: "en", name: "English" },
              { code: "hi", name: "हिंदी (Hindi)" },
              { code: "mr", name: "मराठी (Marathi)" },
              { code: "te", name: "తెలుగు (Telugu)" },
              { code: "ta", name: "தமிழ் (Tamil)" },
              { code: "gu", name: "ગુજરાતી (Gujarati)" },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  updateLocal("language", lang.code);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("pos_language", lang.code);
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-all text-left"
                style={{
                  background:
                    localSettings.language === lang.code
                      ? "rgba(245,200,66,0.15)"
                      : "transparent",
                  borderColor:
                    localSettings.language === lang.code
                      ? "#F5C842"
                      : "#1E1E26",
                  color:
                    localSettings.language === lang.code
                      ? "#F5C842"
                      : "#9090A8",
                }}
              >
                <span className="text-sm">
                  {lang.code === "en" ? "🇺🇸" : "🇮🇳"}
                </span>
                <span className="text-xs font-medium">{lang.name}</span>
                {localSettings.language === lang.code && (
                  <Check
                    size={14}
                    className="ml-auto"
                    style={{ color: "#F5C842" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Customization */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Receipt Customization</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Customize your receipt content and appearance.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: "#4A4A5A" }}>
                Show Logo on Receipt
              </label>
              <button
                onClick={() =>
                  updateLocal(
                    "show_logo_on_receipt",
                    !localSettings.show_logo_on_receipt,
                  )
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.show_logo_on_receipt
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.show_logo_on_receipt ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Header Text (optional)
              </label>
              <input
                value={localSettings.receipt_header_text || ""}
                onChange={(e) =>
                  updateLocal("receipt_header_text", e.target.value)
                }
                placeholder="e.g., Welcome to our store!"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: "#4A4A5A" }}>
                Show Tax Breakdown
              </label>
              <button
                onClick={() =>
                  updateLocal(
                    "show_tax_breakdown",
                    !localSettings.show_tax_breakdown,
                  )
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.show_tax_breakdown
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.show_tax_breakdown ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs" style={{ color: "#4A4A5A" }}>
                Enable Round Off
              </label>
              <button
                onClick={() =>
                  updateLocal(
                    "enable_round_off",
                    !localSettings.enable_round_off,
                  )
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.enable_round_off
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.enable_round_off ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Footer Text
              </label>
              <input
                value={localSettings.footer_text || ""}
                onChange={(e) => updateLocal("footer_text", e.target.value)}
                placeholder="Thank you! Visit again"
              />
            </div>
          </div>
        </div>

        {/* Hardware & Printing */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Hardware & Printing</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium block">
                  Auto-print KOT
                </label>
                <p className="text-[10px]" style={{ color: "#4A4A5A" }}>
                  Automatically trigger kitchen ticket on checkout/hold
                </p>
              </div>
              <button
                onClick={() =>
                  updateLocal("auto_print_kot", !localSettings.auto_print_kot)
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.auto_print_kot
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.auto_print_kot ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium block">
                  Auto-print Receipt
                </label>
                <p className="text-[10px]" style={{ color: "#4A4A5A" }}>
                  Automatically trigger customer receipt on checkout
                </p>
              </div>
              <button
                onClick={() =>
                  updateLocal(
                    "auto_print_receipt",
                    !localSettings.auto_print_receipt,
                  )
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.auto_print_receipt
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.auto_print_receipt ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-[#1E1E26]">
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Receipt Printer Name (System)
              </label>
              <input
                value={localSettings.receipt_printer_name || ""}
                onChange={(e) =>
                  updateLocal("receipt_printer_name", e.target.value)
                }
                placeholder="Default Printer"
              />
            </div>
          </div>
        </div>

        {/* Cloud Sync Section */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} style={{ color: "#F5C842" }} />
              <h2 className="font-semibold">Cloud Sync (Neon PostgreSQL)</h2>
            </div>
            {lastSyncTime && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                style={{ color: "#2ECC71", background: "rgba(46,204,113,0.1)" }}
              >
                {syncing && <RefreshCw size={10} className="spin" />}
                Last Sync: {lastSyncTime}
              </span>
            )}
          </div>

          {/* Setup guide for users who haven't configured Neon */}
          {!localSettings.neon_url && (
            <div
              className="mb-6 p-4 rounded-lg border"
              style={{
                background: "rgba(245,200,66,0.08)",
                borderColor: "rgba(245,200,66,0.3)",
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Database size={16} style={{ color: "#F5C842" }} />
                </div>
                <div className="flex-1">
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{ color: "#F5C842" }}
                  >
                    Set Up Cloud Sync
                  </h3>
                  <div
                    className="text-xs space-y-2"
                    style={{ color: "#4A4A5A" }}
                  >
                    <p>To enable cloud sync across your devices:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>
                        Create a free Neon database at{" "}
                        <a
                          href="https://neon.tech"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#F5C842",
                            textDecoration: "underline",
                          }}
                        >
                          neon.tech
                        </a>
                      </li>
                      <li>
                        Copy your database connection string (starts with{" "}
                        <code className="px-1 rounded bg-[#1E1E26]">
                          postgres://
                        </code>
                        )
                      </li>
                      <li>Paste it in the Neon Database URL field below</li>
                      <li>Click "Push to Cloud" to upload your data</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Neon Database URL
              </label>
              <input
                value={localSettings.neon_url}
                onChange={(e) => updateLocal("neon_url", e.target.value)}
                placeholder="postgres://user:pass@host/db"
                type="password"
                style={{
                  borderColor: !localSettings.neon_url ? "#F5C842" : undefined,
                }}
              />
              <p className="text-[10px] mt-1" style={{ color: "#9090A8" }}>
                Your Neon PostgreSQL connection string. Found in your Neon
                dashboard.
              </p>
              {!localSettings.neon_url && (
                <div
                  className="text-xs mt-2 flex items-start gap-1"
                  style={{ color: "#F5C842" }}
                >
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Neon URL is required for cloud sync. Get your connection
                    string from{" "}
                    <a
                      href="https://neon.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "underline" }}
                    >
                      neon.tech
                    </a>{" "}
                    dashboard.
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSyncUp}
                disabled={syncing || !localSettings.neon_url}
                className="btn-success flex items-center gap-2 text-sm flex-1 justify-center"
                title={
                  !localSettings.neon_url
                    ? "Configure Neon URL first"
                    : "Push local data to cloud"
                }
              >
                {syncing ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <CloudUpload size={14} />
                )}
                Push to Cloud
              </button>
              <button
                onClick={handleSyncDown}
                disabled={syncing || !localSettings.neon_url}
                className="btn-ghost flex items-center gap-2 text-sm flex-1 justify-center"
                title={
                  !localSettings.neon_url
                    ? "Configure Neon URL first"
                    : "Pull data from cloud"
                }
              >
                {syncing ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <CloudDownload size={14} />
                )}
                Pull from Cloud
              </button>
            </div>

            {syncMsg && (
              <div
                className="rounded-lg p-3 text-sm fade-in"
                style={{
                  background: syncMsg.ok
                    ? "rgba(46,204,113,0.08)"
                    : "rgba(231,76,60,0.08)",
                  border: `1px solid ${syncMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                  color: syncMsg.ok ? "#2ECC71" : "#E74C3C",
                }}
              >
                {syncMsg.text}
                {!syncMsg.ok && syncMsg.text.includes("Neon database URL") && (
                  <div className="mt-2 text-xs" style={{ color: "#F5C842" }}>
                    <strong>How to fix:</strong> Get your Neon URL from{" "}
                    <a
                      href="https://neon.tech"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#F5C842", textDecoration: "underline" }}
                    >
                      neon.tech
                    </a>{" "}
                    → Project → Connection Details → "Connection String"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SQLite Info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Local Database</h2>
          </div>
          <p className="text-xs" style={{ color: "#4A4A5A" }}>
            All data is stored in a SQLite file at{" "}
            <code className="font-mono" style={{ color: "#9090A8" }}>
              %APPDATA%/com.pos.billing/pos.db
            </code>{" "}
            (Windows) or{" "}
            <code className="font-mono" style={{ color: "#9090A8" }}>
              ~/Library/Application Support/com.pos.billing/pos.db
            </code>{" "}
            (macOS). Back up this file to keep your data safe.
          </p>
        </div>

        {/* Backup Section */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Save size={16} style={{ color: "#2ECC71" }} />
            <h2 className="font-semibold">Backup & Restore</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Export your data to a JSON file for backup, or import from a
            previous backup.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleExportBackup}
              disabled={backingUp}
              className="btn-success flex items-center gap-2 text-sm flex-1 justify-center"
            >
              {backingUp ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Download size={14} />
              )}
              Export Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={backingUp}
              className="btn-ghost flex items-center gap-2 text-sm flex-1 justify-center"
            >
              {backingUp ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Upload size={14} />
              )}
              Import Backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.gz"
              onChange={handleImportBackup}
              style={{ display: "none" }}
            />
          </div>

          {backupMsg && (
            <div
              className="mt-3 rounded-lg p-3 text-sm fade-in"
              style={{
                background: backupMsg.ok
                  ? "rgba(46,204,113,0.08)"
                  : "rgba(231,76,60,0.08)",
                border: `1px solid ${backupMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                color: backupMsg.ok ? "#2ECC71" : "#E74C3C",
              }}
            >
              {backupMsg.text}
            </div>
          )}
        </div>

        {/* Backup Restoration */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CloudDownload size={16} style={{ color: "#2ECC71" }} />
            <h2 className="font-semibold">Backup Restoration</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Restore your data from a JSON backup file.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => restoreFileInputRef.current?.click()}
              disabled={restoring}
              className="btn-success flex items-center gap-2 text-sm flex-1 justify-center"
            >
              {restoring ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Upload size={14} />
              )}
              Restore Backup
            </button>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json,.gz"
              onChange={handleRestoreBackup}
              style={{ display: "none" }}
            />
          </div>

          {restoreMsg && (
            <div
              className="mt-3 rounded-lg p-3 text-sm fade-in"
              style={{
                background: restoreMsg.ok
                  ? "rgba(46,204,113,0.08)"
                  : "rgba(231,76,60,0.08)",
                border: `1px solid ${restoreMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                color: restoreMsg.ok ? "#2ECC71" : "#E74C3C",
              }}
            >
              {restoreMsg.text}
            </div>
          )}
        </div>

        {/* Seed Data */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} style={{ color: "#9B59B6" }} />
            <h2 className="font-semibold">Seed Data & Reset</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Populate the database with sample data for testing, or reset
            everything to start fresh.
          </p>

          <div className="space-y-2 mb-4">
            <button
              onClick={handleResetAndSeed}
              disabled={resetAndSeeding}
              className="btn-success flex items-center gap-2 text-sm w-full justify-center"
            >
              {resetAndSeeding ? (
                <RefreshCw size={14} className="spin" />
              ) : (
                <Database size={14} />
              )}
              Reset & Seed Database
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="btn-warning flex items-center gap-2 text-sm flex-1 justify-center"
              >
                {seeding ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <Database size={14} />
                )}
                Apply Seed Data
              </button>
              <button
                onClick={handleResetDatabase}
                disabled={resetting}
                className="btn-danger flex items-center gap-2 text-sm flex-1 justify-center"
              >
                {resetting ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <AlertCircle size={14} />
                )}
                Reset Database
              </button>
            </div>
          </div>

          {seedMsg && (
            <div
              className="rounded-lg p-3 text-sm fade-in"
              style={{
                background: seedMsg.ok
                  ? "rgba(46,204,113,0.08)"
                  : "rgba(231,76,60,0.08)",
                border: `1px solid ${seedMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                color: seedMsg.ok ? "#2ECC71" : "#E74C3C",
              }}
            >
              {seedMsg.text}
            </div>
          )}
        </div>

        {/* Menu Visibility */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Menu Visibility</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Hide menus you don't need. Hidden menus won't appear in the sidebar.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "orders", label: "Orders" },
              { key: "products", label: "Products" },
              { key: "tables", label: "Tables" },
              { key: "reservations", label: "Reservations" },
              { key: "kds", label: "Kitchen (KDS)" },
              { key: "customers", label: "Customers" },
              { key: "expenses", label: "Expenses" },
              { key: "ingredients", label: "Ingredients" },
              { key: "suppliers", label: "Suppliers" },
              { key: "purchase_orders", label: "Purchase Orders" },
              { key: "wallet", label: "Wallet" },
              { key: "coupons", label: "Coupons" },
              { key: "inventory_alerts", label: "Inventory Alerts" },
              { key: "inventory", label: "Inventory" },
              { key: "refund_requests", label: "Refunds" },
              { key: "staff", label: "Staff" },
              { key: "scheduling", label: "Scheduling" },
              { key: "reconciliation", label: "Reconciliation" },
              { key: "reports", label: "Reports" },
              { key: "gst", label: "GST" },
              { key: "logs", label: "Activity Logs" },
              { key: "stores", label: "Stores" },
              { key: "support", label: "Support" },
            ].map((menu) => {
              const isHidden = localSettings.hidden_menus
                ?.split(",")
                .includes(menu.key);
              return (
                <button
                  key={menu.key}
                  onClick={() => {
                    const current =
                      localSettings.hidden_menus?.split(",").filter(Boolean) ||
                      [];
                    if (isHidden) {
                      updateLocal(
                        "hidden_menus",
                        current.filter((k) => k !== menu.key).join(","),
                      );
                    } else {
                      updateLocal(
                        "hidden_menus",
                        [...current, menu.key].join(","),
                      );
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border transition-all text-left"
                  style={{
                    background: isHidden
                      ? "rgba(231,76,60,0.1)"
                      : "transparent",
                    borderColor: isHidden ? "#E74C3C" : "#1E1E26",
                    color: isHidden ? "#E74C3C" : "#9090A8",
                  }}
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center"
                    style={{
                      borderColor: isHidden ? "#E74C3C" : "#4A4A5A",
                      background: isHidden ? "#E74C3C" : "transparent",
                    }}
                  >
                    {isHidden && <Check size={10} color="#fff" />}
                  </div>
                  <span className="text-xs font-medium">{menu.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Khata / Ledger Reminders */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Udhar / Khata Reminders</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Automated Reminders</div>
                <div className="text-xs" style={{ color: "#4A4A5A" }}>
                  Visually flag overdue bills in Digital Ledger
                </div>
              </div>
              <button
                onClick={() =>
                  updateLocal(
                    "auto_reminders_enabled",
                    !localSettings.auto_reminders_enabled,
                  )
                }
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.auto_reminders_enabled
                    ? "#2ECC71"
                    : "#1E1E26",
                  border: "none",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: localSettings.auto_reminders_enabled ? 22 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
            {localSettings.auto_reminders_enabled && (
              <div>
                <label
                  className="text-xs mb-1 block"
                  style={{ color: "#4A4A5A" }}
                >
                  Mark as Overdue after (Days)
                </label>
                <input
                  type="number"
                  value={localSettings.auto_reminder_days}
                  onChange={(e) =>
                    updateLocal(
                      "auto_reminder_days",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  min={1}
                />
              </div>
            )}
          </div>
        </div>

        {/* SMS & WhatsApp */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#25D366" }}>💬</span>
            <h2 className="font-semibold">SMS & WhatsApp Notifications</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Configure SMS and WhatsApp for sending order updates to customers.
          </p>

          <div className="space-y-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Twilio SID
              </label>
              <input
                value={localSettings.twilio_sid}
                onChange={(e) => updateLocal("twilio_sid", e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Twilio Token
              </label>
              <input
                value={localSettings.twilio_token}
                onChange={(e) => updateLocal("twilio_token", e.target.value)}
                placeholder="Your Twilio Auth Token"
                type="password"
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Twilio Phone Number
              </label>
              <input
                value={localSettings.twilio_phone}
                onChange={(e) => updateLocal("twilio_phone", e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">WhatsApp Business API</div>
                <div className="text-xs" style={{ color: "#4A4A5A" }}>
                  Enable WhatsApp notifications
                </div>
              </div>
              <button
                onClick={() =>
                  updateLocal(
                    "whatsapp_enabled",
                    !localSettings.whatsapp_enabled,
                  )
                }
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.whatsapp_enabled
                    ? "#25D366"
                    : "#1E1E26",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    position: "relative",
                    left: localSettings.whatsapp_enabled ? 26 : 2,
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
            {localSettings.whatsapp_enabled && (
              <div>
                <label
                  className="text-xs mb-1 block"
                  style={{ color: "#4A4A5A" }}
                >
                  WhatsApp API URL
                </label>
                <input
                  value={localSettings.whatsapp_api_url}
                  onChange={(e) => {
                    updateLocal("whatsapp_api_url", e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      whatsapp_api_url: validateUrl(e.target.value) || "",
                    }));
                  }}
                  placeholder="https://api.your-whatsapp-gateway.com"
                  className={errors.whatsapp_api_url ? "error" : ""}
                />
                {errors.whatsapp_api_url && (
                  <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>
                    <AlertCircle size={12} className="inline mr-1" />
                    {errors.whatsapp_api_url}
                  </div>
                )}
              </div>
            )}
          </div>

          {localSettings.twilio_sid &&
            localSettings.twilio_token &&
            localSettings.twilio_phone && (
              <div
                className="mt-4 pt-4 border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="font-medium mb-3">Test SMS</div>
                <div className="space-y-2">
                  <input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Phone number (e.g., +1234567890)"
                    className={
                      smsMsg && !smsMsg.ok && !testPhone ? "error" : ""
                    }
                  />
                  <input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Test message"
                  />
                  <button
                    onClick={handleSendTestSms}
                    disabled={sendingSms || !testPhone || !testMessage}
                    className="btn-success w-full flex items-center justify-center gap-2 text-sm"
                  >
                    {sendingSms ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      "Send Test SMS"
                    )}
                  </button>
                  {smsMsg && (
                    <div
                      className="text-xs mt-2"
                      style={{ color: smsMsg.ok ? "#2ECC71" : "#E74C3C" }}
                    >
                      {smsMsg.text}
                    </div>
                  )}
                </div>
              </div>
            )}

          {localSettings.whatsapp_enabled && localSettings.whatsapp_api_url && (
            <div
              className="mt-4 pt-4 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="font-medium mb-3">Test WhatsApp</div>
              <div className="space-y-2">
                <input
                  value={waTestPhone}
                  onChange={(e) => setWaTestPhone(e.target.value)}
                  placeholder="Phone number (e.g., +1234567890)"
                />
                <input
                  value={waTestMessage}
                  onChange={(e) => setWaTestMessage(e.target.value)}
                  placeholder="Test message"
                />
                <button
                  onClick={handleSendTestWhatsApp}
                  disabled={sendingWhatsapp || !waTestPhone || !waTestMessage}
                  className="btn-success w-full flex items-center justify-center gap-2 text-sm"
                >
                  {sendingWhatsapp ? (
                    <RefreshCw size={14} className="spin" />
                  ) : (
                    "Send Test WhatsApp"
                  )}
                </button>
                {whatsappMsg && (
                  <div
                    className="text-xs mt-2"
                    style={{ color: whatsappMsg.ok ? "#2ECC71" : "#E74C3C" }}
                  >
                    {whatsappMsg.text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact Us */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} style={{ color: "#3498DB" }} />
            <h2 className="font-semibold">Contact Information</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Customer contact details shown on receipts and notifications.
          </p>

          <div className="space-y-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Contact Email
              </label>
              <input
                value={localSettings.contact_email}
                onChange={(e) => {
                  updateLocal("contact_email", e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    contact_email: validateEmail(e.target.value) || "",
                  }));
                }}
                placeholder="contact@yourbusiness.com"
                type="email"
                className={errors.contact_email ? "error" : ""}
              />
              {errors.contact_email && (
                <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  {errors.contact_email}
                </div>
              )}
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Website
              </label>
              <input
                value={localSettings.contact_website}
                onChange={(e) => {
                  updateLocal("contact_website", e.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    contact_website: validateUrl(e.target.value) || "",
                  }));
                }}
                placeholder="https://www.yourbusiness.com"
                type="url"
                className={errors.contact_website ? "error" : ""}
              />
              {errors.contact_website && (
                <div className="text-xs mt-1" style={{ color: "#E74C3C" }}>
                  <AlertCircle size={12} className="inline mr-1" />
                  {errors.contact_website}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Change PIN */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Change PIN</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Change your 4-digit login PIN. Current user: {user?.name} (
            {user?.role})
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                New PIN (4 digits)
              </label>
              <input
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="****"
                type="password"
                maxLength={4}
              />
            </div>
            <div>
              <label
                className="text-xs mb-1 block"
                style={{ color: "#4A4A5A" }}
              >
                Confirm PIN
              </label>
              <input
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="****"
                type="password"
                maxLength={4}
              />
            </div>
          </div>
          <button
            onClick={handleChangePin}
            disabled={
              changingPin || newPin.length !== 4 || confirmPin.length !== 4
            }
            className="btn-accent w-full mt-3 flex items-center justify-center gap-2 text-sm"
          >
            {changingPin ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              "Change PIN"
            )}
          </button>
          {pinMsg && (
            <div
              className="text-xs mt-2"
              style={{ color: pinMsg.ok ? "#2ECC71" : "#E74C3C" }}
            >
              {pinMsg.text}
            </div>
          )}
        </div>

        {/* Desktop Shortcut */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Desktop Shortcut</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Create a desktop shortcut to quickly launch Appixen POS Billing.
          </p>
          <button
            onClick={handleCreateShortcut}
            disabled={creatingShortcut}
            className="btn-accent w-full flex items-center justify-center gap-2 text-sm"
          >
            {creatingShortcut ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <>
                <Monitor size={14} /> Create Desktop Shortcut
              </>
            )}
          </button>
          {shortcutMsg && (
            <div
              className="text-xs mt-2"
              style={{ color: shortcutMsg.ok ? "#2ECC71" : "#E74C3C" }}
            >
              {shortcutMsg.text}
            </div>
          )}
        </div>

        <button
          className="btn-accent flex items-center gap-2 py-3 px-6 text-sm w-[140px] h-[40px] "
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check size={16} /> Saved!
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>
    </div>
  );
}
