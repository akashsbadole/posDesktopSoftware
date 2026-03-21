"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ShoppingCart, ClipboardList, Package, BarChart2, Settings, Zap, FileText, LogOut, History, ChefHat, DollarSign, Users, UsersRound, Tag, Wallet, User as UserIcon, Key, ChevronDown, Database, CalendarClock, Calculator, RotateCcw, Beaker, Truck, Headphones, Lock, Layers, Shield, Printer, Crown } from "lucide-react";
import { Screen } from "@/app/page";
import { User } from "@/lib/db";
import { useAuthStore, useSettingsStore } from "@/lib/stores";
import { useLicenseStore } from "@/lib/stores/licenseStore";
import { getStoreTypeConfig, StoreTypeFeatures } from "@/lib/storeTypes";
import { getRequiredTier, hasAccess, LicenseTier } from "@/lib/premium";

const allNavItems: {
  id: Screen;
  label: string;
  icon: any;
  adminOnly: boolean;
  feature: keyof StoreTypeFeatures | null;
}[] = [
  { id: "pos", label: "POS", icon: ShoppingCart, adminOnly: false, feature: null },
  { id: "dashboard", label: "Dashboard", icon: BarChart2, adminOnly: false, feature: null },
  { id: "orders", label: "Orders", icon: ClipboardList, adminOnly: false, feature: null },
  { id: "products", label: "Products", icon: Package, adminOnly: false, feature: null },
  { id: "tables", label: "Tables", icon: UsersRound, adminOnly: false, feature: "tables" },
  { id: "kds", label: "Kitchen", icon: ChefHat, adminOnly: false, feature: "kds" },
  { id: "customers", label: "Customers", icon: Users, adminOnly: false, feature: null },
  { id: "wallet", label: "Wallet", icon: Wallet, adminOnly: false, feature: "wallet" },
  { id: "coupons", label: "Coupons", icon: Tag, adminOnly: false, feature: null },
  { id: "expenses", label: "Expenses", icon: DollarSign, adminOnly: true, feature: null },
  { id: "staff", label: "Staff", icon: Users, adminOnly: true, feature: null },
  { id: "scheduling", label: "Schedule", icon: CalendarClock, adminOnly: true, feature: null },
  { id: "reports", label: "Reports", icon: FileText, adminOnly: true, feature: null },
  { id: "enhanced-reports", label: "Analytics", icon: BarChart2, adminOnly: true, feature: null },
  { id: "day-end", label: "Day End", icon: Calculator, adminOnly: true, feature: null },
  { id: "gst", label: "GST", icon: FileText, adminOnly: true, feature: null },
  { id: "refunds", label: "Refunds", icon: RotateCcw, adminOnly: true, feature: null },
  { id: "ingredients", label: "Ingredients", icon: Beaker, adminOnly: true, feature: null },
  { id: "suppliers", label: "Suppliers", icon: Truck, adminOnly: true, feature: null },
  { id: "reservations", label: "Reservations", icon: CalendarClock, adminOnly: false, feature: "tables" },
  { id: "logs", label: "Logs", icon: History, adminOnly: true, feature: null },
  { id: "backup", label: "Backup", icon: Database, adminOnly: true, feature: null },
  { id: "cash-drawer", label: "Cash", icon: Lock, adminOnly: true, feature: null },
  { id: "bulk-ops", label: "Bulk", icon: Layers, adminOnly: true, feature: null },
  { id: "audit", label: "Audit", icon: Shield, adminOnly: true, feature: null },
  { id: "receipt-builder", label: "Receipts", icon: Printer, adminOnly: true, feature: null },
  { id: "support", label: "Support", icon: Headphones, adminOnly: false, feature: null },
  { id: "settings", label: "Settings", icon: Settings, adminOnly: true, feature: null },
];

export default function Sidebar({ activeScreen, setScreen, user, onProfileClick, onChangePinClick, onUpgradeClick, onLockedFeature }: { activeScreen: Screen; setScreen: (s: Screen) => void; user?: User | null; onProfileClick?: () => void; onChangePinClick?: () => void; onUpgradeClick?: () => void; onLockedFeature?: (screen: Screen) => void }) {
  const { logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const { tier } = useLicenseStore();
  const storeConfig = getStoreTypeConfig(settings?.store_type || "food");
  const isAdmin = user?.role === "admin";
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const formatTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const nav = allNavItems
    .filter(item => !item.adminOnly || isAdmin)
    .filter(item => {
      if (!item.feature) return true;
      return storeConfig.features[item.feature];
    });

  // Arrow key navigation for sidebar
  const handleNavKeyDown = useCallback((e: React.KeyboardEvent) => {
    const buttons = navRef.current?.querySelectorAll("button[role='menuitem']");
    if (!buttons || buttons.length === 0) return;

    let newIndex = focusedIndex;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (focusedIndex + 1) % buttons.length;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = focusedIndex <= 0 ? buttons.length - 1 : focusedIndex - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = buttons.length - 1;
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < buttons.length) {
        (buttons[focusedIndex] as HTMLButtonElement).click();
      }
      return;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      (buttons[newIndex] as HTMLButtonElement).focus();
    }
  }, [focusedIndex]);

  // Close user menu on Escape
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUserMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
  };

  return (
    <aside style={{ width: 72 }} className="flex flex-col items-center py-4 bg-surface border-r border-border h-full shrink-0" role="navigation" aria-label="Main navigation">
      <div className="mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F5C842" }} role="img" aria-label="POS Application Logo">
          <Zap size={20} color="#0D0D0F" fill="#0D0D0F" aria-hidden="true" />
        </div>
      </div>
      <div className="mb-4 text-center px-1">
        <div style={{ fontSize: 9, fontWeight: 600, color: "#F5C842" }}>{formatDate(currentTime)}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#4A4A5A", fontFamily: "monospace" }}>{formatTime(currentTime)}</div>
      </div>
      <nav ref={navRef} className="flex flex-col gap-1 flex-1 min-h-0 w-full px-2 overflow-y-auto" role="menubar" aria-label="Navigation menu" onKeyDown={handleNavKeyDown}>
        {nav.map(({ id, label, icon: Icon }, index) => {
          const active = activeScreen === id;
          const requiredTier = getRequiredTier(id);
          const isLocked = requiredTier !== "free" && !hasAccess(tier, id);
          
          const handleClick = () => {
            if (isLocked) {
              onLockedFeature?.(id);
            } else {
              setScreen(id);
            }
          };

          return (
            <button
              key={id}
              onClick={handleClick}
              onFocus={() => setFocusedIndex(index)}
              title={isLocked ? `${label} (${requiredTier === "pro" ? "Pro" : "Business"} feature)` : label}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              aria-label={isLocked ? `${label} - locked` : label}
              tabIndex={focusedIndex === index || (focusedIndex === -1 && active) ? 0 : -1}
              className="relative flex flex-col items-center justify-center rounded-xl py-3 gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141418]"
              style={{ background: active && !isLocked ? "rgba(245,200,66,0.1)" : "transparent", color: isLocked ? "#3A3A4A" : active ? "#F5C842" : "#4A4A5A", opacity: isLocked ? 0.7 : 1 }}
            >
              {active && !isLocked && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r" style={{ background: "#F5C842" }} />}
              {isLocked ? (
                <div className="relative">
                  <Lock size={14} aria-hidden="true" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center" style={{ background: requiredTier === "pro" ? "#F5C842" : "#8B5CF6" }}>
                    <Crown size={6} color="#0D0D0F" fill="#0D0D0F" />
                  </div>
                </div>
              ) : (
                <Icon size={18} aria-hidden="true" />
              )}
              <span style={{ fontSize: 9, fontWeight: 600 }}>{label}</span>
            </button>
          );
        })}
        
        {/* Upgrade button */}
        {tier === "free" && (
          <button
            onClick={() => onUpgradeClick?.()}
            className="mt-2 flex flex-col items-center justify-center rounded-xl py-3 gap-1 transition-all hover:opacity-90"
            style={{ background: "rgba(245,200,66,0.15)", border: "1px solid rgba(245,200,66,0.3)", color: "#F5C842" }}
            title="Upgrade to Premium"
          >
            <Crown size={16} aria-hidden="true" />
            <span style={{ fontSize: 9, fontWeight: 700 }}>UPGRADE</span>
          </button>
        )}
      </nav>
      <div className="w-full px-2 shrink-0">
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center justify-between p-2 rounded-lg transition-all hover:bg-[#2A2A35]"
              style={{ background: "#1E1E26" }}
              aria-label="User menu"
            >
              <div className="text-left">
                <div style={{ fontSize: 9, color: "#9090A8" }}>{user.name}</div>
                <div style={{ fontSize: 8, color: "#4A4A5A" }}>{user.role}</div>
              </div>
              <ChevronDown size={12} style={{ color: "#4A4A5A" }} />
            </button>

            {showUserMenu && (
              <div ref={menuRef} className="absolute bottom-full left-0 right-0 mb-1 rounded-lg shadow-lg overflow-hidden" style={{ background: "#1E1E26", border: "1px solid #2A2A35" }} role="menu" aria-label="User actions">
                <button
                  onClick={() => { setShowUserMenu(false); onProfileClick?.(); }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-[#2A2A35] transition-colors"
                  style={{ color: "#9090A8" }}
                  role="menuitem"
                  autoFocus
                >
                  <UserIcon size={14} aria-hidden="true" />
                  <span style={{ fontSize: 11 }}>Profile</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onChangePinClick?.(); }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-[#2A2A35] transition-colors"
                  style={{ color: "#9090A8" }}
                  role="menuitem"
                >
                  <Key size={14} aria-hidden="true" />
                  <span style={{ fontSize: 11 }}>Change PIN</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); setScreen("support"); }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-[#2A2A35] transition-colors"
                  style={{ color: "#9090A8" }}
                  role="menuitem"
                >
                  <Headphones size={14} aria-hidden="true" />
                  <span style={{ fontSize: 11 }}>Support</span>
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); handleLogout(); }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-red-500/20 transition-colors"
                  style={{ color: "#E74C3C" }}
                  role="menuitem"
                >
                  <LogOut size={14} aria-hidden="true" />
                  <span style={{ fontSize: 11 }}>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
