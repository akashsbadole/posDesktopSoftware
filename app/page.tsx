"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import HeaderBar from "@/components/HeaderBar";
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
import ErrorBoundary from "@/components/ErrorBoundary";
import KDSScreen from "@/components/KDSScreen";
import ExpenseScreen from "@/components/ExpenseScreen";
import StaffAttendance from "@/components/StaffAttendance";
import StaffManagementScreen from "@/components/StaffManagementScreen";
import CustomerCRM from "@/components/CustomerCRM";
import TableManager from "@/components/TableManager";
import CouponsScreen from "@/components/CouponsScreen";
import WalletScreen from "@/components/WalletScreen";
import GstReportsScreen from "@/components/GstReportsScreen";
import SuppliersScreen from "@/components/SuppliersScreen";
import PurchaseOrdersScreen from "@/components/PurchaseOrdersScreen";
import ReservationsScreen from "@/components/ReservationsScreen";
import IngredientsScreen from "@/components/IngredientsScreen";
import StaffScheduling from "@/components/StaffScheduling";
import DayEndReconciliation from "@/components/DayEndReconciliation";
import RefundRequestsScreen from "@/components/RefundRequestsScreen";
import InventoryAlertsScreen from "@/components/InventoryAlertsScreen";
import InventoryManagementScreen from "@/components/InventoryManagementScreen";
import SupportScreen from "@/components/SupportScreen";
import StoresScreen from "@/components/StoresScreen";
import OnboardingModal from "@/components/OnboardingModal";
import { dbGetPendingOrdersCount } from "@/lib/db";
import { useAuthStore, useSettingsStore } from "@/lib/stores";
import { PREMIUM_SCREENS } from "@/lib/constants";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

export type Screen =
  | "pos"
  | "orders"
  | "products"
  | "dashboard"
  | "settings"
  | "reports"
  | "logs"
  | "kds"
  | "expenses"
  | "staff"
  | "customers"
  | "tables"
  | "coupons"
  | "wallet"
  | "gst"
  | "suppliers"
  | "purchase_orders"
  | "reservations"
  | "ingredients"
  | "scheduling"
  | "reconciliation"
  | "refund_requests"
  | "inventory_alerts"
  | "inventory"
  | "support"
  | "stores";

const adminScreens: Screen[] = [
  "settings",
  "reports",
  "logs",
  "expenses",
  "staff",
  "coupons",
  "wallet",
  "gst",
  "suppliers",
  "purchase_orders",
  "ingredients",
  "scheduling",
  "reconciliation",
  "refund_requests",
  "inventory_alerts",
  "inventory",
  "stores",
];

const screenShortcuts: Record<string, Screen> = {
  F1: "pos",
  F2: "dashboard",
  F3: "orders",
  F4: "products",
  F5: "kds",
  F6: "reports",
  F7: "logs",
  F8: "settings",
  F9: "stores",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("pos");
  const [mounted, setMounted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { activeStoreId, settings, fetchSettings, premiumEnabled } = useSettingsStore();

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (mounted) {
      checkPendingOrders();
    }
  }, [mounted, activeStoreId]);

  useEffect(() => {
    if (isLocked) {
      // `handleLock` only flips the lock flag; this effect performs the single sign-out
      // and resets the lock state. This prevents double-logout during a fast unlock.
      logout();
      setIsLocked(false);
    }
  }, [isLocked, logout]);

  const checkPendingOrders = async () => {
    try {
      if (!activeStoreId) return;
      const count = await dbGetPendingOrdersCount(activeStoreId);
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
    const handleNavigation = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const targetScreen = customEvent.detail as Screen;

      if (PREMIUM_SCREENS.includes(targetScreen) && !premiumEnabled) {
        setShowUpgradeModal(true);
        return;
      }

      setScreen(targetScreen);
    };
    window.addEventListener("navigate", handleNavigation);
    return () => window.removeEventListener("navigate", handleNavigation);
  }, [isAuthenticated, premiumEnabled]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        setIsLocked(true);
        return;
      }

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

        if (PREMIUM_SCREENS.includes(screen) && !premiumEnabled) {
          setShowUpgradeModal(true);
          return;
        }

        if (!adminScreens.includes(screen) || user?.role === "admin") {
          setScreen(screen);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, showShortcuts, user, premiumEnabled]);

  const handleLock = () => {
    setIsLocked(true);
  };

  if (!mounted) return null;

  const isAdmin = user?.role === "admin";
  const isAdminScreen = adminScreens.includes(screen);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (settings && !settings.onboarding_completed && user?.role === "admin") {
    return <OnboardingModal />;
  }

  if (isAdminScreen && !isAdmin) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden bg-bg"
        role="application"
        aria-label="POS Application"
      >
        <HeaderBar
          user={user}
          onShowShortcuts={() => setShowShortcuts(true)}
          onLock={handleLock}
          currentScreen={screen}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            activeScreen={screen}
            setScreen={setScreen}
            user={user!}
            onLock={handleLock}
          />
          <main
            id="main-content"
            className="flex-1 overflow-hidden flex items-center justify-center"
            role="main"
            aria-label="Access denied"
          >
            <div
              className="text-center"
              style={{ color: "#4A4A5A" }}
              role="alert"
            >
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p>You need admin privileges to access this section.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className="flex flex-col h-screen overflow-hidden bg-bg"
        role="application"
        aria-label="POS Application"
      >
        <HeaderBar
          user={user}
          onShowShortcuts={() => setShowShortcuts(true)}
          onLock={handleLock}
          currentScreen={screen}
        />
        <div className="flex flex-1 overflow-hidden">
          {showRecovery && (
            <CrashRecovery onComplete={() => setShowRecovery(false)} />
          )}
          <Sidebar
            activeScreen={screen}
            setScreen={setScreen}
            user={user!}
            onLock={handleLock}
          />
          <main
            id="main-content"
            className="flex-1 overflow-hidden"
            role="main"
            aria-label="Main content"
          >
            <ErrorBoundary>
              {screen === "pos" && <POSScreen />}
              {screen === "orders" && <OrdersScreen />}
              {screen === "products" && <ProductsScreen />}
              {screen === "dashboard" && <DashboardScreen />}
              {screen === "settings" && <SettingsScreen />}
              {screen === "reports" && <ReportsScreen />}
              {screen === "logs" && <ActivityLogsScreen />}
              {screen === "kds" && <KDSScreen />}
              {screen === "expenses" && <ExpenseScreen />}
              {screen === "staff" && <StaffManagementScreen />}
              {screen === "customers" && <CustomerCRM />}
              {screen === "tables" && <TableManager />}
              {screen === "coupons" && <CouponsScreen />}
              {screen === "wallet" && <WalletScreen />}
              {screen === "gst" && <GstReportsScreen />}
              {screen === "suppliers" && <SuppliersScreen />}
              {screen === "purchase_orders" && <PurchaseOrdersScreen />}
              {screen === "reservations" && <ReservationsScreen />}
              {screen === "ingredients" && <IngredientsScreen />}
              {screen === "scheduling" && <StaffScheduling />}
              {screen === "reconciliation" && <DayEndReconciliation />}
              {screen === "refund_requests" && <RefundRequestsScreen />}
              {screen === "inventory_alerts" && <InventoryAlertsScreen />}
              {screen === "inventory" && <InventoryManagementScreen />}
              {screen === "support" && <SupportScreen />}
              {screen === "stores" && <StoresScreen />}
            </ErrorBoundary>
          </main>
        </div>
        <KeyboardShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          showPOS={screen === "pos"}
        />
        <PremiumUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
