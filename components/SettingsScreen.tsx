"use client";
import { useState, useEffect, useRef } from "react";
import { Check, Store, Database, Trash2, CloudUpload, CloudDownload, RefreshCw, Info, Moon, Sun, Download, Upload, Save, Palette, Mail, Globe } from "lucide-react";
import { syncToNeon, syncFromNeon, Settings } from "@/lib/db";
import { invoke } from "@tauri-apps/api/tauri";
import { useSettingsStore } from "@/lib/stores";

interface CountryPreset {
  currency: string;
  symbol: string;
  timezones: string[];
  taxSystem: string;
  taxRate: number;
  taxName: string;
}

const countryPresets: Record<string, CountryPreset> = {
  US: { currency: "USD", symbol: "$", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Anchorage", "Pacific/Honolulu"], taxSystem: "sales", taxRate: 8, taxName: "Sales Tax" },
  CA: { currency: "CAD", symbol: "C$", timezones: ["America/Toronto", "America/Vancouver", "America/Montreal", "America/Calgary", "America/Winnipeg"], taxSystem: "hst", taxRate: 13, taxName: "HST" },
  GB: { currency: "GBP", symbol: "£", timezones: ["Europe/London"], taxSystem: "vat", taxRate: 20, taxName: "VAT" },
  IN: { currency: "INR", symbol: "₹", timezones: ["Asia/Kolkata", "Asia/Mumbai", "Asia/Delhi", "Asia/Chennai", "Asia/Bangalore", "Asia/Hyderabad", "Asia/Kolkata"], taxSystem: "gst", taxRate: 18, taxName: "GST" },
  AU: { currency: "AUD", symbol: "A$", timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide"], taxSystem: "gst", taxRate: 10, taxName: "GST" },
  DE: { currency: "EUR", symbol: "€", timezones: ["Europe/Berlin", "Europe/Hamburg", "Europe/Munich", "Europe/Frankfurt"], taxSystem: "vat", taxRate: 19, taxName: "VAT" },
  FR: { currency: "EUR", symbol: "€", timezones: ["Europe/Paris", "Europe/Marseille", "Europe/Lyon"], taxSystem: "vat", taxRate: 20, taxName: "TVA" },
  JP: { currency: "JPY", symbol: "¥", timezones: ["Asia/Tokyo", "Asia/Osaka", "Asia/Sapporo", "Asia/Fukuoka"], taxSystem: "none", taxRate: 10, taxName: "Consumption Tax" },
  SG: { currency: "SGD", symbol: "S$", timezones: ["Asia/Singapore"], taxSystem: "gst", taxRate: 9, taxName: "GST" },
  AE: { currency: "AED", symbol: "د.إ", timezones: ["Asia/Dubai", "Asia/Abu_Dhabi"], taxSystem: "vat", taxRate: 5, taxName: "VAT" },
  NZ: { currency: "NZD", symbol: "NZ$", timezones: ["Pacific/Auckland", "Pacific/Wellington", "Pacific/Christchurch"], taxSystem: "gst", taxRate: 15, taxName: "GST" },
  MX: { currency: "MXN", symbol: "$", timezones: ["America/Mexico_City", "America/Guadalajara", "America/Monterrey", "America/Cancun"], taxSystem: "vat", taxRate: 16, taxName: "IVA" },
  BR: { currency: "BRL", symbol: "R$", timezones: ["America/Sao_Paulo", "America/Rio_de_Janeiro", "America/Brasilia"], taxSystem: "icms", taxRate: 18, taxName: "ICMS" },
  ZA: { currency: "ZAR", symbol: "R", timezones: ["Africa/Johannesburg", "Africa/Cape_Town", "Africa/Durban"], taxSystem: "vat", taxRate: 15, taxName: "VAT" },
  IT: { currency: "EUR", symbol: "€", timezones: ["Europe/Rome", "Europe/Milan", "Europe/Naples"], taxSystem: "vat", taxRate: 22, taxName: "IVA" },
  ES: { currency: "EUR", symbol: "€", timezones: ["Europe/Madrid", "Europe/Barcelona", "Europe/Seville"], taxSystem: "vat", taxRate: 21, taxName: "IVA" },
  NL: { currency: "EUR", symbol: "€", timezones: ["Europe/Amsterdam", "Europe/Rotterdam", "Europe/The_Hague"], taxSystem: "vat", taxRate: 21, taxName: "BTW" },
  SE: { currency: "SEK", symbol: "kr", timezones: ["Europe/Stockholm"], taxSystem: "vat", taxRate: 25, taxName: "MOMS" },
  CH: { currency: "CHF", symbol: "Fr", timezones: ["Europe/Zurich", "Europe/Geneva", "Europe/Bern"], taxSystem: "vat", taxRate: 7.7, taxName: "MWST" },
  HK: { currency: "HKD", symbol: "HK$", timezones: ["Asia/Hong_Kong"], taxSystem: "none", taxRate: 0, taxName: "GST" },
  MY: { currency: "MYR", symbol: "RM", timezones: ["Asia/Kuala_Lumpur"], taxSystem: "sst", taxRate: 6, taxName: "SST" },
  TH: { currency: "THB", symbol: "฿", timezones: ["Asia/Bangkok"], taxSystem: "vat", taxRate: 7, taxName: "VAT" },
  PH: { currency: "PHP", symbol: "₱", timezones: ["Asia/Manila"], taxSystem: "vat", taxRate: 12, taxName: "VAT" },
  ID: { currency: "IDR", symbol: "Rp", timezones: ["Asia/Jakarta", "Asia/Surabaya", "Asia/Bali"], taxSystem: "vat", taxRate: 11, taxName: "PPN" },
  VN: { currency: "VND", symbol: "₫", timezones: ["Asia/Ho_Chi_Minh", "Asia/Hanoi"], taxSystem: "vat", taxRate: 10, taxName: "VAT" },
  KR: { currency: "KRW", symbol: "₩", timezones: ["Asia/Seoul", "Asia/Busan"], taxSystem: "vat", taxRate: 10, taxName: "VAT" },
  CN: { currency: "CNY", symbol: "¥", timezones: ["Asia/Shanghai", "Asia/Beijing", "Asia/Guangzhou", "Asia/Shenzhen"], taxSystem: "vat", taxRate: 13, taxName: "VAT" },
  RU: { currency: "RUB", symbol: "₽", timezones: ["Europe/Moscow", "Europe/St_Petersburg"], taxSystem: "vat", taxRate: 20, taxName: "VAT" },
  PL: { currency: "PLN", symbol: "zł", timezones: ["Europe/Warsaw", "Europe/Krakow"], taxSystem: "vat", taxRate: 23, taxName: "VAT" },
  TR: { currency: "TRY", symbol: "₺", timezones: ["Europe/Istanbul", "Europe/Ankara"], taxSystem: "kdv", taxRate: 18, taxName: "KDV" },
};

export default function SettingsScreen() {
  const { settings, isLoading, fetchSettings, saveSettings, isDarkMode, setDarkMode, updateCurrency } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localSettings, setLocalSettings] = useState<Settings>(settings || {
    store_name: 'My POS Store',
    currency: 'USD',
    currency_symbol: '$',
    country: 'US',
    timezone: 'America/New_York',
    tax_system: 'sales',
    tax_rate: 8,
    tax_name: 'Sales Tax',
    tax_id: '',
    address: '123 Main Street, City',
    phone: '+1 234 567 890',
    neon_url: '',
    business_name: '',
    receipt_save_path: '',
    language: 'en',
    dark_mode: false,
    offline_mode: true,
    whatsapp_enabled: false,
    whatsapp_api_url: '',
    twilio_sid: '',
    twilio_token: '',
    twilio_phone: '',
    lan_sync_enabled: false,
    lan_server_port: 8765,
    logo_url: '',
    primary_color: '#F5C842',
    secondary_color: '#1E1E26',
    accent_color: '#2ECC71',
    footer_text: 'Powered by POS Billing',
    contact_email: '',
    contact_website: '',
  });

  useEffect(() => { 
    fetchSettings();
  }, []);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setDarkMode(newMode);
    document.documentElement.setAttribute("data-theme", newMode ? "dark" : "light");
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const handleSave = async () => {
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
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleSyncUp = async () => {
    setSyncing(true); setSyncMsg(null);
    const r = await syncToNeon();
    setSyncMsg(r.error ? { text: r.error, ok: false } : { text: `✓ Synced ${r.synced} orders to Neon`, ok: true });
    setSyncing(false);
  };

  const handleSyncDown = async () => {
    setSyncing(true); setSyncMsg(null);
    const r = await syncFromNeon();
    setSyncMsg(r.error ? { text: r.error, ok: false } : { text: `✓ Imported ${r.imported} orders from Neon`, ok: true });
    setSyncing(false);
  };

  const handleExportBackup = async () => {
    setBackingUp(true); setBackupMsg(null);
    try {
      const backupJson = await invoke<string>("export_backup");
      const blob = new Blob([backupJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({ text: "✓ Backup exported successfully!", ok: true });
    } catch (err) {
      setBackupMsg({ text: `Error: ${err}`, ok: false });
    }
    setBackingUp(false);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackingUp(true); setBackupMsg(null);
    try {
      const text = await file.text();
      const result = await invoke<{ products_imported: number; orders_imported: number }>("import_backup", { backupJson: text });
      setBackupMsg({ text: `✓ Imported ${result.products_imported} products and ${result.orders_imported} orders`, ok: true });
    } catch (err) {
      setBackupMsg({ text: `Error: ${err}`, ok: false });
    }
    setBackingUp(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading || !localSettings) return <div className="flex items-center justify-center h-full" style={{ color: "#4A4A5A" }}><RefreshCw className="spin" /></div>;

  return (
    <div className="h-full overflow-y-auto p-5 max-w-2xl">
      <h1 className="font-display text-xl font-bold mb-6">Settings</h1>
      <div className="space-y-4">

        {/* Store Info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Store Information</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Store Name</label>
              <input value={localSettings.store_name} onChange={(e) => updateLocal("store_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Address</label>
              <input value={localSettings.address} onChange={(e) => updateLocal("address", e.target.value)} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Phone</label>
              <input value={localSettings.phone} onChange={(e) => updateLocal("phone", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            {isDarkMode ? <Moon size={16} style={{ color: "#9B59B6" }} /> : <Sun size={16} style={{ color: "#F39C12" }} />}
            <h2 className="font-semibold">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{isDarkMode ? "Dark Mode" : "Light Mode"}</div>
              <div className="text-xs" style={{ color: "#4A4A5A" }}>Toggle between dark and light theme</div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: 56,
                height: 32,
                borderRadius: 16,
                background: isDarkMode ? "#1E1E26" : "#E0E0E5",
                border: "none",
                position: "relative",
                transition: "background 0.2s"
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: isDarkMode ? "#F5C842" : "#FFFFFF",
                position: "absolute",
                top: 4,
                left: isDarkMode ? 28 : 4,
                transition: "left 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
              }}>
                {isDarkMode ? <Moon size={12} color="#0D0D0F" /> : <Sun size={12} color="#F39C12" />}
              </div>
            </button>
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
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Country</label>
              <select 
                value={localSettings.country} 
                onChange={(e) => {
                  const country = e.target.value;
                  const presets = countryPresets[country] || countryPresets["US"];
                  updateLocal("country", country);
                  updateLocal("currency", presets.currency);
                  updateLocal("currency_symbol", presets.symbol);
                  updateLocal("timezone", presets.timezones[0]);
                  updateLocal("tax_system", presets.taxSystem);
                  updateLocal("tax_rate", presets.taxRate);
                  updateLocal("tax_name", presets.taxName);
                }}
                style={{ padding: "10px", cursor: "pointer", position: "relative", zIndex: 1 }}
              >
                {Object.entries(countryPresets).map(([code, preset]) => (
                  <option key={code} value={code}>{code} - {preset.currency}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Currency</label>
              <select 
                value={localSettings.currency} 
                onChange={(e) => {
                  const currency = e.target.value;
                  updateLocal("currency", currency);
                  // Find symbol for selected currency
                  const preset = Object.values(countryPresets).find(p => p.currency === currency);
                  if (preset) {
                    updateLocal("currency_symbol", preset.symbol);
                  }
                }}
                style={{ padding: "10px", cursor: "pointer", position: "relative", zIndex: 1 }}
              >
                {Array.from(new Set(Object.values(countryPresets).map(p => p.currency))).map(curr => {
                  const preset = Object.values(countryPresets).find(p => p.currency === curr);
                  return (
                    <option key={curr} value={curr}>{curr} - {preset?.symbol}</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Currency Symbol</label>
              <input value={localSettings.currency_symbol} onChange={(e) => updateLocal("currency_symbol", e.target.value)} maxLength={3} />
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
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax System</label>
              <select 
                value={localSettings.tax_system} 
                onChange={(e) => updateLocal("tax_system", e.target.value)}
                style={{ padding: "10px" }}
              >
                <option value="none">No Tax</option>
                <option value="gst">GST (India)</option>
                <option value="vat">VAT (Europe)</option>
                <option value="sales">Sales Tax (US)</option>
                <option value="hst">HST (Canada)</option>
                <option value="pst">PST (Canada)</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>{localSettings.tax_system === "gst" ? "GST" : localSettings.tax_system === "vat" ? "VAT" : "Tax"} Rate (%)</label>
              <input type="number" value={localSettings.tax_rate} onChange={(e) => updateLocal("tax_rate", parseFloat(e.target.value) || 0)} min={0} max={100} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax Name</label>
              <input value={localSettings.tax_name} onChange={(e) => updateLocal("tax_name", e.target.value)} placeholder={localSettings.tax_system === "gst" ? "GST" : "Tax"} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Tax ID / GSTIN</label>
              <input 
                value={localSettings.tax_id} 
                onChange={(e) => updateLocal("tax_id", e.target.value)} 
                placeholder={localSettings.tax_system === "gst" ? "29AAAAA0000A1Z5" : "Tax ID"}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Business Name (for receipts)</label>
            <input 
              value={localSettings.business_name} 
              onChange={(e) => updateLocal("business_name", e.target.value)} 
              placeholder="Your Business Name"
            />
          </div>
        </div>

        {/* Neon Sync */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Database size={16} style={{ color: "#3498DB" }} />
            <h2 className="font-semibold">Neon PostgreSQL Sync</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Sync orders to Neon cloud DB for multi-device access and backup. Paste your Neon connection string below.
          </p>

          <div className="mb-3">
            <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Neon Connection String</label>
            <input
              value={localSettings.neon_url}
              onChange={(e) => updateLocal("neon_url", e.target.value)}
              placeholder="postgres://user:password@ep-xxx.region.neon.tech/dbname"
              type="password"
            />
          </div>

          <div className="rounded-lg p-3 mb-4 flex gap-2" style={{ background: "rgba(52,152,219,0.06)", border: "1px solid rgba(52,152,219,0.15)" }}>
            <Info size={14} style={{ color: "#3498DB", flexShrink: 0, marginTop: 2 }} />
            <div className="text-xs" style={{ color: "#4A4A5A" }}>
              Get a free Neon database at <strong style={{ color: "#3498DB" }}>neon.tech</strong>.
              Create a project → copy the connection string → paste above.
              Sync pushes unsynced orders to Neon. Pull imports orders from other devices.
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSyncUp} disabled={syncing || !localSettings.neon_url}
              className="btn-success flex items-center gap-2 text-sm flex-1 justify-center">
              {syncing ? <RefreshCw size={14} className="spin" /> : <CloudUpload size={14} />}
              Push to Neon
            </button>
            <button onClick={handleSyncDown} disabled={syncing || !localSettings.neon_url}
              className="btn-ghost flex items-center gap-2 text-sm flex-1 justify-center">
              {syncing ? <RefreshCw size={14} className="spin" /> : <CloudDownload size={14} />}
              Pull from Neon
            </button>
          </div>

          {syncMsg && (
            <div className="mt-3 rounded-lg p-3 text-sm fade-in"
              style={{
                background: syncMsg.ok ? "rgba(46,204,113,0.08)" : "rgba(231,76,60,0.08)",
                border: `1px solid ${syncMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                color: syncMsg.ok ? "#2ECC71" : "#E74C3C",
              }}>
              {syncMsg.text}
            </div>
          )}
        </div>

        {/* SQLite Info */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database size={16} style={{ color: "#F5C842" }} />
            <h2 className="font-semibold">Local Database</h2>
          </div>
          <p className="text-xs" style={{ color: "#4A4A5A" }}>
            All data is stored in a SQLite file at <code className="font-mono" style={{ color: "#9090A8" }}>%APPDATA%/com.pos.billing/pos.db</code> (Windows)
            or <code className="font-mono" style={{ color: "#9090A8" }}>~/Library/Application Support/com.pos.billing/pos.db</code> (macOS).
            Back up this file to keep your data safe.
          </p>
        </div>

        {/* Backup Section */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Save size={16} style={{ color: "#2ECC71" }} />
            <h2 className="font-semibold">Backup & Restore</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Export your data to a JSON file for backup, or import from a previous backup.
          </p>

          <div className="flex gap-2">
            <button 
              onClick={handleExportBackup} 
              disabled={backingUp}
              className="btn-success flex items-center gap-2 text-sm flex-1 justify-center"
            >
              {backingUp ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
              Export Backup
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={backingUp}
              className="btn-ghost flex items-center gap-2 text-sm flex-1 justify-center"
            >
              {backingUp ? <RefreshCw size={14} className="spin" /> : <Upload size={14} />}
              Import Backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              style={{ display: "none" }}
            />
          </div>

          {backupMsg && (
            <div className="mt-3 rounded-lg p-3 text-sm fade-in"
              style={{
                background: backupMsg.ok ? "rgba(46,204,113,0.08)" : "rgba(231,76,60,0.08)",
                border: `1px solid ${backupMsg.ok ? "rgba(46,204,113,0.2)" : "rgba(231,76,60,0.2)"}`,
                color: backupMsg.ok ? "#2ECC71" : "#E74C3C",
              }}>
              {backupMsg.text}
            </div>
          )}
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
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Twilio SID</label>
              <input
                value={localSettings.twilio_sid}
                onChange={(e) => updateLocal("twilio_sid", e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Twilio Token</label>
              <input
                value={localSettings.twilio_token}
                onChange={(e) => updateLocal("twilio_token", e.target.value)}
                placeholder="Your Twilio Auth Token"
                type="password"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Twilio Phone Number</label>
              <input
                value={localSettings.twilio_phone}
                onChange={(e) => updateLocal("twilio_phone", e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">WhatsApp Business API</div>
                <div className="text-xs" style={{ color: "#4A4A5A" }}>Enable WhatsApp notifications</div>
              </div>
              <button
                onClick={() => updateLocal("whatsapp_enabled", !localSettings.whatsapp_enabled)}
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.whatsapp_enabled ? "#25D366" : "#1E1E26",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  position: "relative",
                  left: localSettings.whatsapp_enabled ? 26 : 2,
                  transition: "left 0.2s"
                }} />
              </button>
            </div>
            {localSettings.whatsapp_enabled && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>WhatsApp API URL</label>
                <input
                  value={localSettings.whatsapp_api_url}
                  onChange={(e) => updateLocal("whatsapp_api_url", e.target.value)}
                  placeholder="https://api.your-whatsapp-gateway.com"
                />
              </div>
            )}
          </div>
        </div>

        {/* LAN Sync */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#9B59B6" }}>🔗</span>
            <h2 className="font-semibold">LAN Sync</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Enable LAN sync to share orders between devices on the same network.
          </p>
          
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-medium">Enable LAN Sync</div>
              <div className="text-xs" style={{ color: "#4A4A5A" }}>Run as server for other devices</div>
            </div>
            <button
              onClick={() => updateLocal("lan_sync_enabled", !localSettings.lan_sync_enabled)}
              style={{
                width: 48,
                height: 24,
                borderRadius: 12,
                background: localSettings.lan_sync_enabled ? "#9B59B6" : "#1E1E26",
                border: "none",
                cursor: "pointer"
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                background: "#fff",
                position: "relative",
                left: localSettings.lan_sync_enabled ? 26 : 2,
                transition: "left 0.2s"
              }} />
            </button>
          </div>
          
          {localSettings.lan_sync_enabled && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Server Port</label>
              <input
                type="number"
                value={localSettings.lan_server_port}
                onChange={(e) => updateLocal("lan_server_port", parseInt(e.target.value) || 8765)}
                placeholder="8765"
              />
            </div>
          )}
        </div>

        {/* Language & Offline */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: "#3498DB" }}>🌐</span>
            <h2 className="font-semibold">Language & Offline Mode</h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Language</label>
              <select
                value={localSettings.language}
                onChange={(e) => updateLocal("language", e.target.value)}
                style={{ padding: "10px" }}
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="ml">Malayalam (മലയാളം)</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="font-medium">Offline Mode</div>
                <div className="text-xs" style={{ color: "#4A4A5A" }}>Work without internet</div>
              </div>
              <button
                onClick={() => updateLocal("offline_mode", !localSettings.offline_mode)}
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  background: localSettings.offline_mode ? "#E74C3C" : "#1E1E26",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  background: "#fff",
                  position: "relative",
                  left: localSettings.offline_mode ? 26 : 2,
                  transition: "left 0.2s"
                }} />
              </button>
            </div>
          </div>
        </div>

        {/* Whitelabel Settings */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} style={{ color: "#9B59B6" }} />
            <h2 className="font-semibold">Whitelabel & Branding</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#4A4A5A" }}>
            Customize your POS branding with your logo and colors.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Logo URL</label>
              <input
                value={localSettings.logo_url}
                onChange={(e) => updateLocal("logo_url", e.target.value)}
                placeholder="https://your-logo-url.com/logo.png"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localSettings.primary_color}
                    onChange={(e) => updateLocal("primary_color", e.target.value)}
                    style={{ width: 40, height: 38, padding: 2, cursor: "pointer" }}
                  />
                  <input
                    value={localSettings.primary_color}
                    onChange={(e) => updateLocal("primary_color", e.target.value)}
                    placeholder="#F5C842"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Secondary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localSettings.secondary_color}
                    onChange={(e) => updateLocal("secondary_color", e.target.value)}
                    style={{ width: 40, height: 38, padding: 2, cursor: "pointer" }}
                  />
                  <input
                    value={localSettings.secondary_color}
                    onChange={(e) => updateLocal("secondary_color", e.target.value)}
                    placeholder="#1E1E26"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Accent Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localSettings.accent_color}
                    onChange={(e) => updateLocal("accent_color", e.target.value)}
                    style={{ width: 40, height: 38, padding: 2, cursor: "pointer" }}
                  />
                  <input
                    value={localSettings.accent_color}
                    onChange={(e) => updateLocal("accent_color", e.target.value)}
                    placeholder="#2ECC71"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Footer Text (Receipt)</label>
              <input
                value={localSettings.footer_text}
                onChange={(e) => updateLocal("footer_text", e.target.value)}
                placeholder="Powered by POS Billing"
              />
            </div>
          </div>
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
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Contact Email</label>
              <input
                value={localSettings.contact_email}
                onChange={(e) => updateLocal("contact_email", e.target.value)}
                placeholder="contact@yourbusiness.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: "#4A4A5A" }}>Website</label>
              <input
                value={localSettings.contact_website}
                onChange={(e) => updateLocal("contact_website", e.target.value)}
                placeholder="https://www.yourbusiness.com"
                type="url"
              />
            </div>
          </div>
        </div>

        <button className="btn-accent flex items-center gap-2 py-3 px-6 text-sm" onClick={handleSave}>
          {saved ? <><Check size={16} /> Saved!</> : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
