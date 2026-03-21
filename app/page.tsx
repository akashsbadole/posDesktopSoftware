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
import ErrorBoundary from "@/components/ErrorBoundary";
import KDSScreen from "@/components/KDSScreen";
import ExpenseScreen from "@/components/ExpenseScreen";
import StaffAttendance from "@/components/StaffAttendance";
import CustomerCRM from "@/components/CustomerCRM";
import TableManager from "@/components/TableManager";
import CouponsScreen from "@/components/CouponsScreen";
import WalletScreen from "@/components/WalletScreen";
import BackupRestoreScreen from "@/components/BackupRestoreScreen";
import EnhancedReports from "@/components/EnhancedReports";
import StaffScheduling from "@/components/StaffScheduling";
import DayEndReconciliation from "@/components/DayEndReconciliation";
import RefundApprovalScreen from "@/components/RefundApprovalScreen";
import IngredientsScreen from "@/components/IngredientsScreen";
import SuppliersScreen from "@/components/SuppliersScreen";
import ReservationsScreen from "@/components/ReservationsScreen";
import SupportScreen from "@/components/SupportScreen";
import TrainingModal from "@/components/TrainingModal";
import ToastContainer from "@/components/ToastContainer";
import OfflineIndicator from "@/components/OfflineIndicator";
import CashDrawerScreen from "@/components/CashDrawerScreen";
import BulkOperationsScreen from "@/components/BulkOperationsScreen";
import AuditDashboard from "@/components/AuditDashboard";
import ReceiptBuilder from "@/components/ReceiptBuilder";
import GstReportsScreen from "@/components/GstReportsScreen";
import ChangePinModal from "@/components/ChangePinModal";
import SetupWizard from "@/components/SetupWizard";
import UpgradeScreen from "@/components/UpgradeScreen";
import PaywallModal from "@/components/PaywallModal";
import { Lock, BookOpen } from "lucide-react";
import { dbGetPendingOrdersCount, dbGetSettings, Settings } from "@/lib/db";
import { useAuthStore } from "@/lib/stores";

export type Screen = "pos" | "orders" | "products" | "dashboard" | "settings" | "reports" | "logs" | "kds" | "expenses" | "staff" | "customers" | "tables" | "coupons" | "wallet" | "gst" | "backup" | "enhanced-reports" | "scheduling" | "day-end" | "refunds" | "ingredients" | "suppliers" | "reservations" | "support" | "cash-drawer" | "bulk-ops" | "audit" | "receipt-builder" | "upgrade";

const adminScreens: Screen[] = ["settings", "reports", "logs", "expenses", "staff", "coupons", "wallet", "gst", "backup", "enhanced-reports", "scheduling", "day-end", "refunds", "ingredients", "suppliers", "reservations", "support", "cash-drawer", "bulk-ops", "audit", "receipt-builder"];

const screenShortcuts: Record<string, Screen> = {
  "F1": "pos",
  "F2": "dashboard",
  "F3": "orders",
  "F4": "products",
  "F5": "kds",
  "F6": "reports",
  "F7": "logs",
  "F8": "settings",
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("pos");
  const [mounted, setMounted] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const [lockedFeatureScreen, setLockedFeatureScreen] = useState<Screen | null>(null);

  // Escape to close profile, change pin, and training modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showProfile) setShowProfile(false);
        if (showChangePin) setShowChangePin(false);
        if (showTraining) setShowTraining(false);
      }
    };
    if (showProfile || showChangePin || showTraining) {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [showProfile, showChangePin, showTraining]);
  const [showSetup, setShowSetup] = useState(false);
  const [setupSettings, setSetupSettings] = useState<Settings | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    checkPendingOrders();
    checkFirstRun();
  }, []);

  const checkFirstRun = async () => {
    try {
      const settings = await dbGetSettings();
      if (settings.first_run) {
        setSetupSettings(settings);
        setShowSetup(true);
      }
    } catch (err) {
      console.error("Failed to check first run:", err);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setSetupSettings(null);
  };

  const handleLock = () => {
    logout();
    setIsLocked(true);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleUpgradeClick = () => {
    setScreen("upgrade");
  };

  const handleLockedFeature = (featureScreen: Screen) => {
    setLockedFeatureScreen(featureScreen);
  };

  const handleClosePaywall = () => {
    setLockedFeatureScreen(null);
  };

  const handleUpgradeSuccess = () => {
    setLockedFeatureScreen(null);
  };

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

  if (isLocked) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "#0D0D0F" }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "#F5C842" }}>
            <Lock size={40} color="#0D0D0F" />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>App Locked</h1>
          <p className="mb-6" style={{ color: "#9090A8" }}>Enter PIN to unlock</p>
          <LoginScreen onUnlock={handleUnlock} isLocked />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isAdminScreen && !isAdmin) {
    return (
      <div className="flex h-screen overflow-hidden bg-bg" role="application" aria-label="POS Application">
        <Sidebar activeScreen={screen} setScreen={setScreen} user={user!} onProfileClick={() => setShowProfile(true)} onChangePinClick={() => setShowChangePin(true)} onUpgradeClick={handleUpgradeClick} onLockedFeature={handleLockedFeature} />
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
    <ErrorBoundary>
      <div className="flex flex-col h-screen overflow-hidden bg-bg" role="application" aria-label="POS Application">
        {showRecovery && <CrashRecovery onComplete={() => setShowRecovery(false)} />}
        
        <div className="flex h-full">
          <Sidebar activeScreen={screen} setScreen={setScreen} user={user!} onProfileClick={() => setShowProfile(true)} onChangePinClick={() => setShowChangePin(true)} onUpgradeClick={handleUpgradeClick} onLockedFeature={handleLockedFeature} />
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-14 shrink-0 flex items-center justify-between px-4 gap-3 border-b" style={{ background: "#1E1E26", borderColor: "#2A2A35" }}>
              {screen !== "pos" && (
                <button
                  onClick={() => setScreen("pos")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[#2A2A35]"
                  style={{ color: "#9090A8" }}
                >
                  ← Back
                </button>
              )}
              <div className="flex items-center gap-2" style={{ color: "#9090A8" }}>
                <span style={{ fontSize: 12 }}>{user?.name}</span>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: user?.role === "admin" ? "#F5C842" : "#2A2A35", color: user?.role === "admin" ? "#0D0D0F" : "#9090A8" }}>
                  {user?.role}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTraining(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[#2A2A35]"
                  style={{ color: "#F5C842" }}
                  title="Training Guide"
                  aria-label="Open training guide"
                >
                  <BookOpen size={16} />
                  <span style={{ fontSize: 12 }}>Training</span>
                </button>
                <button
                  onClick={handleLock}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-[#2A2A35]"
                  style={{ color: "#F39C12" }}
                  title="Lock App"
                >
                  <Lock size={16} />
                  <span style={{ fontSize: 12 }}>Lock</span>
                </button>
              </div>
            </header>
            
            <main id="main-content" className="flex-1 overflow-hidden" role="main" aria-label="Main content">
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
                {screen === "staff" && <StaffAttendance onClose={() => setScreen("pos")} />}
                {screen === "customers" && <CustomerCRM onClose={() => setScreen("pos")} />}
                {screen === "tables" && <TableManager onClose={() => setScreen("pos")} />}
                {screen === "coupons" && <CouponsScreen />}
                {screen === "wallet" && <WalletScreen />}
                {screen === "gst" && <GstReportsScreen />}
                {screen === "backup" && <BackupRestoreScreen />}
                {screen === "enhanced-reports" && <EnhancedReports onClose={() => setScreen("reports")} />}
                {screen === "scheduling" && <StaffScheduling />}
                {screen === "day-end" && <DayEndReconciliation />}
                {screen === "refunds" && <RefundApprovalScreen />}
                {screen === "ingredients" && <IngredientsScreen />}
                {screen === "suppliers" && <SuppliersScreen />}
                {screen === "reservations" && <ReservationsScreen />}
                {screen === "support" && <SupportScreen />}
                {screen === "cash-drawer" && <CashDrawerScreen />}
                {screen === "bulk-ops" && <BulkOperationsScreen />}
                {screen === "audit" && <AuditDashboard />}
                {screen === "receipt-builder" && <ReceiptBuilder />}
                {screen === "upgrade" && <UpgradeScreen onClose={() => setScreen("pos")} onSuccess={() => {}} />}
              </ErrorBoundary>
            </main>
          </div>
        </div>
        
        {showSetup && setupSettings && (
          <SetupWizard settings={setupSettings} onComplete={handleSetupComplete} />
        )}
        
        <KeyboardShortcutsModal 
          isOpen={showShortcuts} 
          onClose={() => setShowShortcuts(false)}
          showPOS={screen === "pos"}
        />
        
        {showProfile && user && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowProfile(false)}>
            <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#1E1E26" }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold" style={{ color: "#F5C842" }}>Profile</h2>
                <button onClick={() => setShowProfile(false)} className="text-[#4A4A5A] hover:text-white">
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: "#9090A8" }}>Name:</span>
                  <span style={{ color: "#fff" }}>{user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#9090A8" }}>Role:</span>
                  <span style={{ color: "#fff" }}>{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "#9090A8" }}>ID:</span>
                  <span style={{ color: "#fff" }}>{user.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showChangePin && user && (
          <ChangePinModal userId={user.id} onClose={() => setShowChangePin(false)} />
        )}
        
        {showTraining && (
          <TrainingModal onClose={() => setShowTraining(false)} />
        )}

        {/* Paywall Modal for locked features */}
        {lockedFeatureScreen && (
          <PaywallModal
            screen={lockedFeatureScreen}
            onClose={handleClosePaywall}
            onUpgrade={() => {
              setLockedFeatureScreen(null);
              setScreen("upgrade");
            }}
          />
        )}
        
        <ToastContainer />
        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
