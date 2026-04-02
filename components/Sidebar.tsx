"use client";
import { useState, useEffect } from "react";
import {
  ShoppingCart,
  ClipboardList,
  Package,
  BarChart2,
  Settings,
  Zap,
  FileText,
  LogOut,
  History,
  ChefHat,
  DollarSign,
  Users,
  UsersRound,
  Tag,
  Wallet,
  Truck,
  CalendarDays,
  Wheat,
  Shield,
  Bell,
  Calculator,
  GraduationCap,
  Lock,
  ChevronDown,
  LayoutGrid,
  Heart
} from "lucide-react";
import { Screen } from "@/app/page";
import { User } from "@/lib/db";
import { useAuthStore, useSettingsStore, useStoresStore } from "@/lib/stores";
import { getIndustryLabels } from "@/lib/industry";

const allNavItems = [
  { id: "pos" as Screen, label: "POS", icon: ShoppingCart, adminOnly: false },
  {
    id: "dashboard" as Screen,
    label: "Dashboard",
    icon: BarChart2,
    adminOnly: false,
  },
  {
    id: "orders" as Screen,
    label: "Orders",
    icon: ClipboardList,
    adminOnly: false,
  },
  {
    id: "products" as Screen,
    label: "Products",
    icon: Package,
    adminOnly: false,
  },
  {
    id: "tables" as Screen,
    label: "Tables",
    icon: UsersRound,
    adminOnly: false,
  },
  {
    id: "reservations" as Screen,
    label: "Bookings",
    icon: CalendarDays,
    adminOnly: false,
  },
  { id: "kds" as Screen, label: "Kitchen", icon: ChefHat, adminOnly: false },
  {
    id: "customers" as Screen,
    label: "Customers",
    icon: Users,
    adminOnly: false,
  },
  {
    id: "expenses" as Screen,
    label: "Expenses",
    icon: DollarSign,
    adminOnly: true,
  },
  {
    id: "ingredients" as Screen,
    label: "Ingredients",
    icon: Wheat,
    adminOnly: true,
  },
  {
    id: "suppliers" as Screen,
    label: "Suppliers",
    icon: Truck,
    adminOnly: true,
  },
  {
    id: "purchase_orders" as Screen,
    label: "PO",
    icon: ClipboardList,
    adminOnly: true,
  },
  { id: "wallet" as Screen, label: "Wallet", icon: Wallet, adminOnly: true },
  { id: "coupons" as Screen, label: "Coupons", icon: Tag, adminOnly: true },
  {
    id: "inventory_alerts" as Screen,
    label: "Alerts",
    icon: Bell,
    adminOnly: true,
  },
  {
    id: "inventory" as Screen,
    label: "Inventory",
    icon: ClipboardList,
    adminOnly: true,
  },
  {
    id: "refund_requests" as Screen,
    label: "Refunds",
    icon: Shield,
    adminOnly: true,
  },
  { id: "staff" as Screen, label: "Staff", icon: Users, adminOnly: true },
  {
    id: "scheduling" as Screen,
    label: "Schedule",
    icon: CalendarDays,
    adminOnly: true,
  },
  {
    id: "reconciliation" as Screen,
    label: "Day End",
    icon: Calculator,
    adminOnly: true,
  },
  {
    id: "reports" as Screen,
    label: "Reports",
    icon: FileText,
    adminOnly: true,
  },
  { id: "gst" as Screen, label: "GST", icon: FileText, adminOnly: true },
  { id: "logs" as Screen, label: "Logs", icon: History, adminOnly: true },
  {
    id: "stores" as Screen,
    label: "Stores",
    icon: LayoutGrid,
    adminOnly: true,
  },
  {
    id: "settings" as Screen,
    label: "Settings",
    icon: Settings,
    adminOnly: true,
  },
  {
    id: "contact_training" as Screen,
    label: "Training",
    icon: GraduationCap,
    adminOnly: false,
  },
  {
    id: "donate" as Screen,
    label: "Support Us",
    icon: Heart,
    adminOnly: false,
  },
];

export default function Sidebar({
  activeScreen,
  setScreen,
  user,
  onLock,
}: {
  activeScreen: Screen;
  setScreen: (s: Screen) => void;
  user?: User | null;
  onLock?: () => void;
}) {
  const { logout } = useAuthStore();
  const { activeStoreId, setActiveStore } = useSettingsStore();
  const { stores, fetchStores } = useStoresStore();
  const isAdmin = user?.role === "admin";
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);

  useEffect(() => {
    fetchStores();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeStore = stores.find(s => s.id === activeStoreId);
  const labels = getIndustryLabels(activeStore?.industry || 'food');

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const nav = allNavItems.filter((item) => !item.adminOnly || isAdmin).map(item => {
    if (item.id === 'tables') return { ...item, label: labels.tables };
    if (item.id === 'kds') return { ...item, label: (labels.kitchen || "Kitchen").split('/')[0] };
    return item;
  });

  const handleLogout = () => {
    logout();
  };

  const handleLock = () => {
    onLock?.();
  };

  return (
    <aside
      style={{ width: 72, zIndex: 60 }}
      className="flex flex-col items-center py-4 bg-surface border-r border-border h-full shrink-0 relative"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mb-4 relative group">
        <button
          onClick={() => setShowStoreSwitcher(!showStoreSwitcher)}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "#F5C842" }}
          title={activeStore?.name || "Main Store"}
        >
          <Zap size={20} color="#0D0D0F" fill="#0D0D0F" />
        </button>
        {showStoreSwitcher && (
          <div className="absolute left-14 top-0 w-48 bg-[#141418] border border-[#1E1E26] rounded-xl shadow-2xl z-50 p-2 fade-in">
             <div className="text-[10px] font-bold text-[#4A4A5A] px-2 mb-1 uppercase tracking-wider">Switch Store</div>
             {stores.length > 0 ? (
                stores.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStore(s.id); setShowStoreSwitcher(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[#1E1E26]"
                    style={{ color: s.id === activeStoreId ? "#F5C842" : "#9090A8" }}
                  >
                    {s.name}
                  </button>
                ))
             ) : (
                <div className="px-3 py-2 text-xs text-[#4A4A5A]">No stores found</div>
             )}
             {isAdmin && (
                <button
                  onClick={() => { setScreen("stores"); setShowStoreSwitcher(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors border-t border-[#1E1E26] mt-1 pt-2 hover:text-[#F5C842]"
                  style={{ color: "#4A4A5A" }}
                >
                  + Add/Manage Stores
                </button>
             )}
          </div>
        )}
      </div>
      <div className="mb-4 text-center px-1">
        <div style={{ fontSize: 9, fontWeight: 600, color: "#F5C842" }}>
          {formatDate(currentTime)}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#4A4A5A",
            fontFamily: "monospace",
          }}
        >
          {formatTime(currentTime)}
        </div>
      </div>
      <nav
        className="flex flex-col gap-1 flex-1 w-full px-2 overflow-y-auto"
        role="menubar"
        aria-label="Navigation menu"
      >
        {nav.map(({ id, label, icon: Icon }) => {
          const active = activeScreen === id;
          return (
            <button
              key={id}
              onClick={() => setScreen(id)}
              title={label}
              role="menuitem"
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className="relative flex flex-col items-center justify-center rounded-xl py-3 gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C842] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141418]"
              style={{
                background: active ? "rgba(245,200,66,0.1)" : "transparent",
                color: active ? "#F5C842" : "#4A4A5A",
              }}
            >
              {active && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                  style={{ background: "#F5C842" }}
                />
              )}
              <Icon size={18} aria-hidden="true" />
              <span style={{ fontSize: 9, fontWeight: 600 }}>{label}</span>
            </button>
          );
        })}
      </nav>
      <div className="w-full px-2">
        <button
          onClick={handleLock}
          title="Lock Screen (Ctrl+L)"
          className="w-full flex flex-col items-center justify-center rounded-xl py-2 gap-1 transition-all hover:bg-[rgba(245,200,66,0.1)] mb-1"
          style={{ color: "#9090A8" }}
          aria-label="Lock Screen"
        >
          <Lock size={16} aria-hidden="true" />
          <span style={{ fontSize: 8, fontWeight: 600 }}>Lock</span>
        </button>
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-full flex flex-col items-center justify-center rounded-xl py-2 gap-1 transition-all hover:bg-red-500/10"
          style={{ color: "#E74C3C" }}
          aria-label="Logout"
        >
          <LogOut size={16} aria-hidden="true" />
          <span style={{ fontSize: 8, fontWeight: 600 }}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
