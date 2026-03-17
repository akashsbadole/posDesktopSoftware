"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import POSScreen from "@/components/POSScreen";
import OrdersScreen from "@/components/OrdersScreen";
import ProductsScreen from "@/components/ProductsScreen";
import DashboardScreen from "@/components/DashboardScreen";
import SettingsScreen from "@/components/SettingsScreen";
import ReportsScreen from "@/components/ReportsScreen";
import LoginScreen from "@/components/LoginScreen";
import ActivityLogsScreen from "@/components/ActivityLogsScreen";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import CrashRecovery from "@/components/CrashRecovery";
import { dbGetPendingOrdersCount } from "@/lib/db";
import { useAuthStore } from "@/lib/stores";

export type Screen = "pos" | "orders" | "products" | "dashboard" | "settings" | "reports" | "logs";

const adminScreens: Screen[] = ["settings", "reports", "logs"];

const screenShortcuts: Record<string, Screen> = {
  "F1": "pos",
  "F2": "dashboard",
  "F3": "orders",
  "F4": "products",
  "F5": "reports",
  "F6": "logs",
  "F7": "settings",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("pos");
  const [mounted, setMounted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    checkPendingOrders();
  }, []);

  const checkPendingOrders = async () => {
    try {
      const count = await dbGetPendingOrdersCount();
      setPendingOrdersCount(count);
      if (count > 0) {
        setShowRecovery(true);
      }
    } catch (err) {
      console.error("Failed to check pending orders:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      if (showShortcuts && e.key === "Escape") {
        setShowShortcuts(false);
        return;
      }
      
      const screen = screenShortcuts[e.key];
      if (screen) {
        e.preventDefault();
        if (!adminScreens.includes(screen) || user?.role === "admin") {
          setScreen(screen);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, showShortcuts, user]);

  if (!mounted) return null;

  const isAdmin = user?.role === "admin";
  const isAdminScreen = adminScreens.includes(screen);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isAdminScreen && !isAdmin) {
    return (
      <div className="flex h-screen overflow-hidden bg-bg" role="application" aria-label="POS Application">
        <Sidebar activeScreen={screen} setScreen={setScreen} user={user!} />
        <main id="main-content" className="flex-1 overflow-hidden flex items-center justify-center" role="main" aria-label="Access denied">
          <div className="text-center" style={{ color: "#4A4A5A" }} role="alert">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p>You need admin privileges to access this section.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg" role="application" aria-label="POS Application">
      {showRecovery && <CrashRecovery onComplete={() => setShowRecovery(false)} />}
      <Sidebar activeScreen={screen} setScreen={setScreen} user={user!} />
      <main id="main-content" className="flex-1 overflow-hidden" role="main" aria-label="Main content">
        {screen === "pos" && <POSScreen />}
        {screen === "orders" && <OrdersScreen />}
        {screen === "products" && <ProductsScreen />}
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "reports" && <ReportsScreen />}
        {screen === "logs" && <ActivityLogsScreen />}
      </main>
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)}
        showPOS={screen === "pos"}
      />
    </div>
  );
}
