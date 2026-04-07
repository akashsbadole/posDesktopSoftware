"use client";
import { useState, useEffect } from "react";
import {
  Globe,
  Mail,
  BookOpen,
  Sparkles,
  GraduationCap,
  Headphones,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Package,
  BarChart3,
  ChefHat,
  FileText,
  Settings,
  Users,
  LayoutGrid,
  Heart,
  Ticket,
  Receipt,
  Bell,
  RotateCcw,
  CheckCircle,
  LifeBuoy,
  RefreshCw,
  Download,
  Database,
  ExternalLink,
  ShieldCheck,
  Zap,
  Award,
  Monitor,
  Plug,
  Wrench,
  Save,
} from "lucide-react";
import {
  getAppVersion,
  checkAppUpdates,
  AppUpdateMetadata,
  exportBackup,
} from "@/lib/db";
import { useSettingsStore } from "@/lib/stores";

interface MenuGuide {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: { title: string; description: string }[];
  tips: string[];
}

type SupportTab = "training" | "updates" | "about";

export default function SupportScreen() {
  const [activeTab, setActiveTab] = useState<SupportTab>("training");
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>("Loading...");
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateMetadata | null>(null);
  const { activeStoreId } = useSettingsStore();

  useEffect(() => {
    loadVersion();
  }, []);

  const loadVersion = async () => {
    try {
      const v = await getAppVersion();
      setCurrentVersion(v);
    } catch (err) {
      setCurrentVersion("Unknown");
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateInfo(null);
    try {
      const info = await checkAppUpdates();
      setUpdateInfo(info);
    } catch (err) {
      console.error("Update check failed:", err);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleQuickBackup = async () => {
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
      a.download = `quick-backup-${new Date().toISOString().split("T")[0]}.gz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Quick backup failed: " + err);
    }
  };

  const menuGuides: MenuGuide[] = [
    {
      id: "pos",
      title: "POS (Point of Sale)",
      icon: <ShoppingCart size={18} />,
      description: "Main screen for creating and processing orders",
      steps: [
        {
          title: "Select Customer",
          description:
            "Click on the customer name at the top to select an existing customer or add a new one.",
        },
        {
          title: "Browse Products",
          description:
            "Products are displayed in categories on the left panel.",
        },
        {
          title: "Add Items to Order",
          description:
            "Click on any product to add it to the order. Use +/- to adjust quantity.",
        },
        {
          title: "Complete Order",
          description:
            "Click 'Pay', select payment method, and complete the transaction.",
        },
      ],
      tips: [
        "Press F1 to quickly access POS from any screen",
        "Enable 'Auto-print KOT' in Settings for automatic kitchen tickets",
      ],
    },
    {
      id: "products",
      title: "Products",
      icon: <Package size={18} />,
      description: "Manage your product catalog and inventory",
      steps: [
        {
          title: "Add Product",
          description:
            "Click '+ Add Product', fill in: Name, Price, Category, Tax rate.",
        },
        {
          title: "Set Variants",
          description:
            "Add variants like Size or Add-ons with different prices.",
        },
        {
          title: "Set Stock Alert",
          description:
            "Enable stock tracking and set minimum quantity for low-stock alerts.",
        },
      ],
      tips: [
        "Products with stock tracking show current quantity in the product card",
      ],
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings size={18} />,
      description: "Configure application settings and preferences",
      steps: [
        {
          title: "Business Info",
          description: "Set business name, address, phone, and Tax ID.",
        },
        {
          title: "Printer Setup",
          description: "Configure receipt printer and kitchen ticket printer.",
        },
        {
          title: "Backup",
          description: "Export database backup for safekeeping.",
        },
      ],
      tips: [
        "Regularly backup your data to prevent loss",
        "Complete all settings before going live",
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col bg-bg">
      <header className="p-6 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5C842]/10 flex items-center justify-center text-[#F5C842]">
            <LifeBuoy size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-muted-foreground text-sm">
              Help, Updates, and Support
            </p>
          </div>
        </div>

        <div className="flex bg-muted p-1 rounded-xl">
          {(["training", "updates", "about"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-surface text-[#F5C842] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "about" ? "About & Support" : tab.replace("_", " ")}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === "training" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-3">
              {menuGuides.map((menu) => (
                <div key={menu.id} className="card overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedMenu(expandedMenu === menu.id ? null : menu.id)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-[rgba(245,200,66,0.05)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted text-[#F5C842]">
                        {menu.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{menu.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {menu.description}
                        </p>
                      </div>
                    </div>
                    {expandedMenu === menu.id ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>

                  {expandedMenu === menu.id && (
                    <div className="p-4 border-t border-border bg-muted/20">
                      <h4 className="font-semibold mb-3 text-sm flex items-center gap-2 text-[#F5C842]">
                        <CheckCircle size={16} /> Step-by-Step Guide
                      </h4>
                      <div className="space-y-3 mb-6">
                        {menu.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-[#F5C842] text-[#0D0D0F]">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {step.title}
                              </p>
                              <p className="text-xs mt-0.5 text-muted-foreground">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <h4 className="font-semibold mb-3 text-sm flex items-center gap-2 text-green-500">
                        <Sparkles size={16} /> Pro Tips
                      </h4>
                      <div className="space-y-2">
                        {menu.tips.map((tip, idx) => (
                          <div
                            key={idx}
                            className="flex gap-2 text-xs text-muted-foreground"
                          >
                            <span className="text-green-500">•</span>{" "}
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="card p-6 mt-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#F5C842] flex items-center justify-center text-[#0D0D0F]">
                <Sparkles size={40} fill="currentColor" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold">Need Personal Training?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  We offer on-site and remote POS system training tailored to
                  your restaurant or retail business needs.
                </p>
                <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                  <a
                    href="mailto:info@appixen.com"
                    className="flex items-center gap-2 text-sm font-bold text-[#F5C842] hover:underline"
                  >
                    <Mail size={16} /> info@appixen.com
                  </a>
                  <a
                    href="https://www.appixen.com"
                    target="_blank"
                    className="flex items-center gap-2 text-sm font-bold text-[#F5C842] hover:underline"
                  >
                    <Globe size={16} /> www.appixen.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "updates" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Download size={20} className="text-[#F5C842]" />
                    Software Updates
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current Version:{" "}
                    <span className="font-mono font-bold text-foreground">
                      {currentVersion}
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdates}
                  className="btn-accent px-6 flex items-center gap-2"
                >
                  {checkingUpdates ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Check for Updates
                </button>
              </div>

              {updateInfo ? (
                <div className="p-5 rounded-2xl bg-muted/30 border border-border space-y-4 fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                        <Zap size={20} />
                      </div>
                      <div>
                        <div className="font-bold">New Version Available!</div>
                        <div className="text-xs text-muted-foreground">
                          Version {updateInfo.latest_version}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        window.open(updateInfo.download_url, "_blank")
                      }
                      className="bg-[#F5C842] text-[#0D0D0F] px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
                    >
                      <Download size={16} /> Download Update
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-bold flex items-center gap-2">
                      <FileText size={14} /> What's New:
                    </div>
                    <ul className="space-y-1">
                      {updateInfo.changelog.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-muted-foreground flex gap-2"
                        >
                          <span className="text-[#F5C842]">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                !checkingUpdates && (
                  <div className="text-center py-8">
                    <ShieldCheck
                      size={48}
                      className="mx-auto text-green-500 mb-3 opacity-50"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your system is currently up to date.
                    </p>
                  </div>
                )
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database size={18} className="text-blue-500" />
                <h2 className="font-bold">Database Health & Updates</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Our update process includes automatic database migrations. Your
                data is safely preserved and upgraded whenever you install a new
                version.
              </p>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Save size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm">
                    Recommended Action: Quick Backup
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Before performing any software updates, it is always a best
                    practice to create a fresh backup of your database.
                  </p>
                  <button
                    onClick={handleQuickBackup}
                    className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline"
                  >
                    <Download size={14} /> Download Quick Backup (.gz)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <Heart className="w-16 h-16 mx-auto mb-6 text-red-500" />
              <h1 className="text-3xl font-bold mb-4">Support Our Work</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Our POS application is designed to help small businesses thrive.
                Consider supporting us with a donation to help maintain and
                improve the project.
              </p>
              <button
                onClick={() =>
                  window.open(
                    "https://www.buymeacoffee.com/akashbadole",
                    "_blank",
                  )
                }
                className="mt-6 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105"
              >
                <Heart className="w-5 h-5" />
                Buy Me a Coffee
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Premium Services",
                  icon: Wrench,
                  color: "text-blue-500",
                  items: [
                    "Custom integrations",
                    "On-site training",
                    "Priority support",
                    "System setup",
                  ],
                },
                {
                  title: "Hardware Bundles",
                  icon: Monitor,
                  color: "text-green-500",
                  items: [
                    "Optimized POS computers",
                    "Thermal printers",
                    "Barcode scanners",
                    "Cash drawers",
                  ],
                },
                {
                  title: "SaaS Add-ons",
                  icon: Zap,
                  color: "text-yellow-500",
                  items: [
                    "Advanced analytics",
                    "Automated cloud backups",
                    "Multi-device sync",
                    "Customer insights",
                  ],
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="card p-6 border-t-4"
                  style={{
                    borderColor:
                      idx === 0 ? "#3498DB" : idx === 1 ? "#2ECC71" : "#F5C842",
                  }}
                >
                  <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
                  <h3 className="font-bold text-lg mb-3">{item.title}</h3>
                  <ul className="space-y-2">
                    {item.items.map((li, lidx) => (
                      <li
                        key={lidx}
                        className="text-xs text-muted-foreground flex gap-2"
                      >
                        <span className={item.color}>•</span> {li}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="card p-8 text-center bg-[#F5C842] text-[#0D0D0F]">
              <Award className="w-12 h-12 mx-auto mb-4 text-white" />
              <h2 className="text-2xl font-bold mb-2 text-white">
                White-label Solutions
              </h2>
              <p className="font-medium opacity-80 mb-6 text-white">
                Interested in a custom branded version for your agency or
                franchise? We offer professional white-label deployments.
              </p>
              <a
                href="mailto:info@appixen.com"
                className="bg-[#0D0D0F] text-white px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Contact for Pricing <ChevronRight size={18} />
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
