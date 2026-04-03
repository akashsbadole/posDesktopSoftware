"use client";
import { Lock, Keyboard, User, LogOut, Building2, ChevronDown } from "lucide-react";
import { User as UserType, Store } from "@/lib/db";
import { useAuthStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import { useState } from "react";

interface HeaderBarProps {
  user?: UserType | null;
  onShowShortcuts: () => void;
  onLock: () => void;
  currentScreen: string;
}

export default function HeaderBar({ user, onShowShortcuts, onLock, currentScreen }: HeaderBarProps) {
  const { logout } = useAuthStore();
  const { activeStoreId, setActiveStore, settings } = useSettingsStore();
  const { stores, fetchStores } = useStoresStore();
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

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
    { key: "F1", label: "POS" },
    { key: "F2", label: "Dashboard" },
    { key: "F3", label: "Orders" },
    { key: "F4", label: "Products" },
    { key: "F5", label: "Kitchen" },
    { key: "F6", label: "Reports" },
    { key: "F7", label: "Logs" },
    { key: "F8", label: "Settings" },
  ];

  return (
    <header 
      className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] bg-surface shrink-0 relative z-[60]"
      role="banner"
    >
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium" style={{ color: "#9090A8" }}>
          {getScreenLabel(currentScreen, settings?.tax_name)}
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
                title={`${s.key}: ${s.label}`}
              >
                {s.key}
              </kbd>
            ))}
            <kbd 
              className="inline-flex items-center justify-center w-6 h-5 rounded mx-0.5 font-mono text-[10px]"
              style={{ background: "#141418", color: "#F5C842" }}
              title="Show Help: ?"
            >
              ?
            </kbd>
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => { fetchStores(); setShowStoreDropdown(!showStoreDropdown); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-[#F5C842] transition-colors"
          >
            <Building2 size={14} className="text-[#F5C842]" />
            <span className="text-xs font-medium">{activeStore?.name || 'Select Store'}</span>
            <ChevronDown size={12} />
          </button>
          
          {showStoreDropdown && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreChange(store)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${
                    store.id === activeStoreId ? 'bg-[#F5C842]/10 text-[#F5C842]' : ''
                  }`}
                >
                  <span>{store.name}</span>
                  {store.id === activeStoreId && <span className="text-xs">✓</span>}
                </button>
              ))}
              {stores.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">No stores</div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onShowShortcuts}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
          style={{ background: "#1E1E26", color: "#9090A8" }}
          aria-label="Show keyboard shortcuts"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard size={14} aria-hidden="true" />
          <span>Shortcuts</span>
        </button>

        <button
          onClick={onLock}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[rgba(245,200,66,0.1)]"
          style={{ background: "#1E1E26", color: "#9090A8" }}
          aria-label="Lock screen"
          title="Lock Screen (Ctrl+L)"
        >
          <Lock size={14} aria-hidden="true" />
          <span>Lock</span>
        </button>

        {user && (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "#1E1E26" }}
            role="status"
            aria-label={`Logged in as ${user.name}`}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "#F5C842", color: "#0D0D0F" }}
              aria-hidden="true"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium" style={{ color: "#E8E8F0" }}>
              {user.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#2A2A32", color: "#9090A8" }}>
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function getScreenLabel(screen: string, taxName: string = "GST"): string {
  const labels: Record<string, string> = {
    pos: "Point of Sale",
    dashboard: "Dashboard",
    orders: "Orders",
    products: "Products",
    tables: "Table Management",
    reservations: "Reservations",
    kds: "Kitchen Display",
    customers: "Customer CRM",
    wallet: "Customer Wallet",
    coupons: "Coupons & Offers",
    inventory_alerts: "Inventory Alerts",
    refund_requests: "Refund Requests",
    ingredients: "Ingredients & Stock",
    suppliers: "Suppliers",
    purchase_orders: "Purchase Orders",
    scheduling: "Staff Scheduling",
    reconciliation: "Day-End Reconciliation",
    expenses: "Expenses",
    staff: "Staff Attendance",
    reports: "Reports",
    gst: `${taxName} Reports`,
    logs: "Activity Logs",
    settings: "Settings",
    contact_training: "Training Guide",
  };
  return labels[screen] || screen;
}
