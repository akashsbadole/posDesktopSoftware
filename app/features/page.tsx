"use client";
import {
  ShoppingCart, Package, ClipboardList, BarChart2, Settings, Users, DollarSign,
  Tag, Wallet, ChefHat, Database, Calendar, Truck, Headphones, FileText,
  Calculator, Printer, Shield, Zap, Globe, Smartphone, Monitor, Wifi, WifiOff,
  Clock, Star, Gift, Layers, Bell, Search, Lock, Check, ArrowRight, ChevronDown,
  CreditCard, Banknote, TrendingUp, RefreshCw, Copy, MessageCircle, Mail
} from "lucide-react";
import { useState } from "react";

interface Feature {
  title: string;
  description: string;
  icon: any;
  color: string;
  items: string[];
}

const features: Feature[] = [
  {
    title: "Point of Sale",
    description: "Fast, intuitive checkout with multiple payment methods",
    icon: ShoppingCart,
    color: "#F5C842",
    items: [
      "Product grid with category filtering & search",
      "Barcode scanner support (auto-detect)",
      "Cash, Card, UPI, and Wallet payments",
      "Per-item and order-level discounts",
      "Coupon code validation at checkout",
      "Hold & restore orders",
      "Receipt print, WhatsApp, email, file save",
      "Cash change calculator",
    ],
  },
  {
    title: "Product Management",
    description: "Complete product catalog with variants and stock tracking",
    icon: Package,
    color: "#3498DB",
    items: [
      "Add, edit, delete products",
      "Category-based organization",
      "Barcode and SKU support",
      "Per-product tax rates",
      "Variant support (size, flavor)",
      "Stock level tracking",
      "Low stock alerts",
      "CSV import/export",
    ],
  },
  {
    title: "Order Management",
    description: "Full order lifecycle with delivery tracking and refunds",
    icon: ClipboardList,
    color: "#2ECC71",
    items: [
      "Dine-in, Takeaway, Delivery types",
      "Order search and filtering",
      "Expand to view item details",
      "Post-completion order editing",
      "Refund with automatic stock restore",
      "Cancel order with reason",
      "Internal order notes",
      "Delivery status tracking",
    ],
  },
  {
    title: "Table Management",
    description: "Restaurant table grid with reservation system",
    icon: Users,
    color: "#1ABC9C",
    items: [
      "Visual table grid layout",
      "Add/edit/delete tables with capacity",
      "Status: Available, Occupied, Reserved",
      "Table reservation system",
      "Date-based reservation view",
      "Mark reservations as seated",
      "VIP table support",
    ],
  },
  {
    title: "Kitchen Display",
    description: "Real-time kitchen order display with item tracking",
    icon: ChefHat,
    color: "#E67E22",
    items: [
      "Auto-refresh every 10 seconds",
      "Mark individual items as done",
      "Mark entire order as done",
      "Order type indicators",
      "Time-based priority display",
      "Pop-out window for second screen",
    ],
  },
  {
    title: "Customer CRM",
    description: "Customer database with loyalty points and order history",
    icon: Users,
    color: "#9B59B6",
    items: [
      "Customer database with contact info",
      "Loyalty points system",
      "Total spent and visit tracking",
      "Customer order history",
      "Search by name or phone",
      "Wallet balance management",
    ],
  },
  {
    title: "Wallet & Payments",
    description: "Customer wallet with load and pay functionality",
    icon: Wallet,
    color: "#8E44AD",
    items: [
      "Load money to customer wallet",
      "Pay from wallet at checkout",
      "Transaction history per customer",
      "Balance tracking",
      "Multiple payment methods",
    ],
  },
  {
    title: "Coupons & Discounts",
    description: "Flexible coupon system with validation and tracking",
    icon: Tag,
    color: "#E67E22",
    items: [
      "Percentage or flat discount",
      "Minimum order amount",
      "Validity date range",
      "Maximum usage limits",
      "Usage count tracking",
      "Apply at POS checkout",
      "Active/inactive toggle",
    ],
  },
  {
    title: "Staff Management",
    description: "Staff attendance, scheduling, and performance tracking",
    icon: Users,
    color: "#3498DB",
    items: [
      "PIN-based authentication",
      "Admin and Cashier roles",
      "Clock in/out attendance",
      "Shift scheduling",
      "Staff performance reports",
      "Role-based screen access",
    ],
  },
  {
    title: "Ingredients & Recipes",
    description: "Ingredient-based inventory with recipe management",
    icon: Package,
    color: "#E74C3C",
    items: [
      "Ingredient stock tracking",
      "Units: grams, ml, pieces",
      "Reorder level alerts",
      "Product-to-ingredient recipes",
      "Auto-deduct on order",
    ],
  },
  {
    title: "Suppliers & POs",
    description: "Supplier management with purchase order workflow",
    icon: Truck,
    color: "#1ABC9C",
    items: [
      "Supplier database with contact info",
      "Create purchase orders",
      "Multi-item PO with costs",
      "Status: Draft → Sent → Received",
      "Stock auto-update on receive",
    ],
  },
  {
    title: "Reservations",
    description: "Table booking with date and party size management",
    icon: Calendar,
    color: "#F5C842",
    items: [
      "Book tables by date and time",
      "Set party size and notes",
      "Status: Confirmed, Seated, Cancelled",
      "Date-based view",
      "Table availability awareness",
    ],
  },
  {
    title: "Expenses",
    description: "Business expense tracking with categories",
    icon: DollarSign,
    color: "#E74C3C",
    items: [
      "Add expenses with categories",
      "Date range filtering",
      "Expense categories (Rent, Utilities, etc.)",
      "CSV export",
      "Daily summary totals",
    ],
  },
  {
    title: "Reports & Analytics",
    description: "Comprehensive reporting for business insights",
    icon: BarChart2,
    color: "#3498DB",
    items: [
      "Dashboard with today's stats",
      "Revenue trend charts (7/14/30 days)",
      "Top products by revenue",
      "Low stock alerts",
      "Hourly sales breakdown",
      "Staff performance reports",
      "Sales by item analysis",
      "GSTR-1 and GSTR-3B reports",
    ],
  },
  {
    title: "Backup & Restore",
    description: "Full database backup with merge and wipe modes",
    icon: Database,
    color: "#F5C842",
    items: [
      "Export all 25 tables as .gz.b64",
      "Preview backup before import",
      "Merge mode: add/update data",
      "Wipe & Restore mode",
      "Auto safety backup before import",
      "CSV export for Products and Orders",
      "CSV import for Products",
      "Live database table counts",
    ],
  },
  {
    title: "Day-End Reconciliation",
    description: "Daily cash drawer balancing and reconciliation",
    icon: Calculator,
    color: "#2ECC71",
    items: [
      "Opening cash entry",
      "Auto-calculated expected cash",
      "Actual cash count entry",
      "Cash/UPI/Card sales breakdown",
      "Expense integration",
      "Difference calculation",
    ],
  },
  {
    title: "Refund Approvals",
    description: "Two-step refund workflow for admin oversight",
    icon: RefreshCw,
    color: "#E74C3C",
    items: [
      "Request refund from Orders screen",
      "Admin approval queue",
      "Approve or reject with reason",
      "Status tracking: Pending, Approved, Rejected",
      "Full audit trail",
    ],
  },
  {
    title: "GST Compliance",
    description: "Tax reports for Indian GST filing",
    icon: FileText,
    color: "#F5C842",
    items: [
      "GSTR-1 sales register",
      "GSTR-3B summary",
      "Taxable value, CGST, SGST, IGST",
      "Date range filtering",
      "Per-product tax rates",
    ],
  },
  {
    title: "Activity Logs",
    description: "Immutable audit trail of all system actions",
    icon: Shield,
    color: "#9B59B6",
    items: [
      "Every action logged with timestamp",
      "User, action, entity, reason",
      "Before/after value snapshots",
      "Date range filtering",
      "Pagination for large datasets",
      "Cannot be deleted (immutable)",
    ],
  },
  {
    title: "Security",
    description: "Role-based access with PIN authentication",
    icon: Lock,
    color: "#E74C3C",
    items: [
      "PIN-based login with bcrypt hashing",
      "Admin and Cashier roles",
      "Rate limiting (5 attempts/min lockout)",
      "Session timeout (30 min)",
      "Lock screen with PIN unlock",
      "Encrypted sensitive settings",
    ],
  },
];

const techStack = [
  { name: "Tauri", desc: "Desktop shell", icon: Monitor },
  { name: "Next.js", desc: "React frontend", icon: Globe },
  { name: "SQLite", desc: "Local database", icon: Database },
  { name: "Rust", desc: "Backend logic", icon: Zap },
  { name: "Zustand", desc: "State management", icon: Layers },
  { name: "Tailwind CSS", desc: "Styling", icon: Star },
];

export default function FeaturesPage() {
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D0F", color: "#E8E8F0", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <header style={{ textAlign: "center", padding: "80px 20px 60px", background: "linear-gradient(180deg, #1E1E26 0%, #0D0D0F 100%)" }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Zap size={40} color="#0D0D0F" fill="#0D0D0F" />
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, fontFamily: "'Syne', sans-serif", marginBottom: 16, color: "#fff" }}>
          POS Billing
        </h1>
        <p style={{ fontSize: 20, color: "#9090A8", maxWidth: 600, margin: "0 auto 24px" }}>
          A fully offline-capable, restaurant-grade Point of Sale desktop application
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          {["Offline First", "Cross Platform", "25 Tables", "20+ Features", "Free & Open"].map((tag) => (
            <span key={tag} style={{ padding: "6px 16px", borderRadius: 20, background: "rgba(245,200,66,0.1)", color: "#F5C842", fontSize: 13, fontWeight: 600 }}>
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Stats */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: -30 }}>
        {[
          { label: "Features", value: "20+" },
          { label: "DB Tables", value: "25" },
          { label: "Commands", value: "120+" },
          { label: "Screens", value: "24" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center", padding: 24, borderRadius: 16, background: "#1E1E26", border: "1px solid #2A2A35" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#F5C842", fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#9090A8", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Tech Stack */}
      <section style={{ maxWidth: 900, margin: "60px auto 0", padding: "0 20px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#F5C842", textAlign: "center", marginBottom: 24 }}>
          Built With
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <div key={tech.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, background: "#1E1E26", border: "1px solid #2A2A35" }}>
                <Icon size={16} style={{ color: "#F5C842" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{tech.name}</div>
                  <div style={{ fontSize: 11, color: "#4A4A5A" }}>{tech.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: 1100, margin: "60px auto", padding: "0 20px" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: "center", marginBottom: 8, color: "#fff", fontFamily: "'Syne', sans-serif" }}>
          All Features
        </h2>
        <p style={{ textAlign: "center", color: "#9090A8", marginBottom: 40, fontSize: 15 }}>
          Click any feature to see the full details
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {features.map((feature) => {
            const Icon = feature.icon;
            const isExpanded = expandedFeature === feature.title;
            return (
              <div
                key={feature.title}
                style={{
                  borderRadius: 16,
                  background: "#1E1E26",
                  border: `1px solid ${isExpanded ? feature.color : "#2A2A35"}`,
                  padding: 24,
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onClick={() => setExpandedFeature(isExpanded ? null : feature.title)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${feature.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={22} style={{ color: feature.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{feature.title}</h3>
                      <ChevronDown size={16} style={{ color: "#4A4A5A", transform: isExpanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
                    </div>
                    <p style={{ fontSize: 13, color: "#9090A8", margin: "6px 0 0" }}>{feature.description}</p>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #2A2A35" }}>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                      {feature.items.map((item, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#E8E8F0" }}>
                          <Check size={14} style={{ color: feature.color, flexShrink: 0, marginTop: 2 }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Offline Capability */}
      <section style={{ maxWidth: 900, margin: "0 auto 60px", padding: "0 20px" }}>
        <div style={{ borderRadius: 16, background: "linear-gradient(135deg, #1E1E26 0%, #16161A 100%)", border: "1px solid #2A2A35", padding: 40, textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(46,204,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <WifiOff size={28} style={{ color: "#2ECC71" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>
            100% Offline Capable
          </h2>
          <p style={{ color: "#9090A8", maxWidth: 500, margin: "0 auto", fontSize: 15 }}>
            No internet required. All data is stored locally in SQLite. Cloud sync via Neon PostgreSQL is optional for multi-device setups.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
            {[
              { icon: Database, label: "Local SQLite DB" },
              { icon: Shield, label: "AES-256 Encryption" },
              { icon: Wifi, label: "Optional Cloud Sync" },
              { icon: Printer, label: "Native Printing" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9090A8" }}>
                  <Icon size={16} style={{ color: "#2ECC71" }} />
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "40px 20px", borderTop: "1px solid #1E1E26" }}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Zap size={20} color="#F5C842" fill="#F5C842" />
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: "#F5C842" }}>POS Billing</span>
        </div>
        <p style={{ fontSize: 13, color: "#4A4A5A", marginBottom: 8 }}>
          Restaurant-grade Point of Sale — Tauri + Next.js + SQLite
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: "#4A4A5A" }}>
          <span>Version 1.0.0</span>
          <span>•</span>
          <span>MIT License</span>
          <span>•</span>
          <span>Made with Rust + React</span>
        </div>
      </footer>
    </div>
  );
}
