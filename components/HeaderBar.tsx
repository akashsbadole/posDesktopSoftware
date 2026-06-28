"use client";
import { Lock, Keyboard, User, LogOut, Building2, ChevronDown } from "lucide-react";
import { User as UserType, Store } from "@/lib/db";
import { useAuthStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";

interface HeaderBarProps {
  user?: UserType | null;
  onShowShortcuts: () => void;
  onLock: () => void;
  currentScreen: string;
}

export default function HeaderBar({ user, onShowShortcuts, onLock, currentScreen }: HeaderBarProps) {
  const { logout } = useAuthStore();
  const { activeStoreId, setActiveStore, settings, fontScale, setFontScale } = useSettingsStore();
  const { stores, fetchStores } = useStoresStore();
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const t = useTranslation();

  const activeStore = stores.find(s => s.id === activeStoreId);

  const handleStoreChange = async (store: Store) => {
    setActiveStore(store.id);
    setShowStoreDropdown(false);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
  };

  const shortcuts = [
    { key: "F1", label: t("header.kbdPos") },
    { key: "F2", label: t("header.kbdDashboard") },
    { key: "F3", label: t("header.kbdOrders") },
    { key: "F4", label: t("header.kbdProducts") },
    { key: "F5", label: t("header.kbdKitchen") },
    { key: "F6", label: t("header.kbdReports") },
    { key: "F7", label: t("header.kbdLogs") },
    { key: "F8", label: t("header.kbdSettings") },
  ];

  return (
    <header 
      className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-surface shrink-0 relative z-[60]"
      role="banner"
    >
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium" style={{ color: "#9090A8" }}>
          {currentScreen === "gst"
            ? t("header.screenGst", { taxName: settings?.tax_name || "GST" })
            : t(`header.screen${currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1)}` as any, {}) || currentScreen}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ background: "#1E1E26" }}
          role="region"
          aria-label="Keyboard shortcuts reference"
        >
          <Keyboard size={12} style={{ color: "#9090A8" }} aria-hidden="true" />
          <span className="text-xs" style={{ color: "#4A4A5A" }}>
            {shortcuts.map((s) => (
              <kbd 
                key={s.key}
                className="inline-flex items-center justify-center w-6 h-5 rounded mx-0.5 font-mono text-[10px]"
                style={{ background: "#141418", color: "#F5C842" }}
                title={s.label}
              >
                {s.key}
              </kbd>
            ))}
            <kbd 
              className="inline-flex items-center justify-center w-6 h-5 rounded mx-0.5 font-mono text-[10px]"
              style={{ background: "#141418", color: "#F5C842" }}
              title={t("header.showHelp")}
            >
              ?
            </kbd>
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => { fetchStores(); setShowStoreDropdown(!showStoreDropdown); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-[#F5C842] transition-colors"
            aria-haspopup="listbox"
            aria-expanded={showStoreDropdown}
            aria-label={t("header.currentStore", { name: activeStore?.name || t("header.selectStore") })}
          >
            <Building2 size={14} className="text-[#F5C842]" aria-hidden="true" />
            <span className="text-xs font-medium">{activeStore?.name || t("header.selectStore")}</span>
            <ChevronDown size={12} aria-hidden="true" />
          </button>
          
          {showStoreDropdown && (
            <div
              className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 py-1"
              role="listbox"
              aria-label={t("header.stores")}
            >
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreChange(store)}
                  role="option"
                  aria-selected={store.id === activeStoreId}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${
                    store.id === activeStoreId ? 'bg-[#F5C842]/10 text-[#F5C842]' : ''
                  }`}
                >
                  <span>{store.name}</span>
                  {store.id === activeStoreId && <span className="text-xs" aria-hidden="true">✓</span>}
                </button>
              ))}
              {stores.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">{t("header.noStores")}</div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onShowShortcuts}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
          style={{ background: "#1E1E26", color: "#9090A8" }}
          aria-label="Show keyboard shortcuts"
          title={t("header.keyboardShortcuts")}
        >
          <Keyboard size={14} aria-hidden="true" />
          <span>{t("header.shortcuts")}</span>
        </button>

        <button
          onClick={onLock}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
          style={{ background: "#1E1E26", color: "#9090A8" }}
          aria-label={t("header.lockScreen")}
          title={t("header.lockScreen")}
        >
          <Lock size={14} aria-hidden="true" />
          <span>{t("header.lock")}</span>
        </button>

        <div className="flex items-center gap-1" role="group" aria-label={t("header.fontSize")}>
          <button
            onClick={() => {
              const newVal = Math.max(0.75, +(fontScale - 0.125).toFixed(3));
              setFontScale(newVal);
            }}
            className="flex items-center justify-center w-7 h-7 rounded text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
            style={{ background: "#1E1E26", color: "#9090A8" }}
            title={t("header.decreaseFont")}
            aria-label={t("header.decreaseFont")}
          >
            A-
          </button>
          <span
            className="text-[10px] font-mono w-7 text-center"
            style={{ color: "#4A4A5A" }}
          >
            {Math.round(fontScale * 100)}%
          </span>
          <button
            onClick={() => {
              const newVal = Math.min(1.5, +(fontScale + 0.125).toFixed(3));
              setFontScale(newVal);
            }}
            className="flex items-center justify-center w-7 h-7 rounded text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
            style={{ background: "#1E1E26", color: "#9090A8" }}
            title={t("header.increaseFont")}
            aria-label={t("header.increaseFont")}
          >
            A+
          </button>
        </div>

        <button
          onClick={() => useAuthStore.getState().logout()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-red-500/10 text-[#9090A8] hover:text-red-400"
          style={{ background: "#1E1E26" }}
          title={t("header.signOut")}
        >
          <LogOut size={14} />
          <span>{t("header.signOut")}</span>
        </button>

        {user && (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "#1E1E26" }}
            role="status"
            aria-label={t("header.loggedInAs", { name: user.name })}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#F5C842", color: "#0D0D0F" }}
              aria-hidden="true"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs font-medium" style={{ color: "#E8E8F0" }}>
                {user.name}
              </span>
              <span className="text-[10px] text-[#9090A8] mt-0.5">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}


