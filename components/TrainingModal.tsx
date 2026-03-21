"use client";
import { useState } from "react";
import { X, BookOpen, ChevronRight, ShoppingCart, Package, ClipboardList, BarChart2, Settings, Users, DollarSign, Tag, Wallet, ChefHat, Database, Calendar, Truck, Headphones, FileText, Calculator, CreditCard, Smartphone, Banknote, Search, Plus, Minus, RotateCcw, Printer, MessageCircle, Lock, Zap } from "lucide-react";

interface TrainingModalProps {
  onClose: () => void;
}

interface Guide {
  id: string;
  title: string;
  icon: any;
  color: string;
  steps: string[];
}

const guides: Guide[] = [
  {
    id: "pos",
    title: "Taking an Order",
    icon: ShoppingCart,
    color: "#F5C842",
    steps: [
      "Click a product card or use arrow keys to navigate the grid",
      "Press Enter or click to add items to the cart",
      "Adjust quantity with + / - buttons or type directly",
      "Apply per-item discount using the % button on each cart item",
      "Choose order type: Dine In (1), Takeaway (2), or Delivery (3)",
      "Enter customer name and phone for delivery orders",
      "Enter a coupon code and click Apply (if available)",
      "Select payment method: Cash, Card, UPI, or Wallet",
      "For cash: enter amount tendered or click Copy Total",
      "Click the Pay button (or press P) to complete the order",
      "Print, share via WhatsApp/Email, or save the receipt",
    ],
  },
  {
    id: "products",
    title: "Managing Products",
    icon: Package,
    color: "#3498DB",
    steps: [
      "Go to Products screen (F4 or sidebar)",
      "Click Add Product to create a new item",
      "Fill in: Name, Price, Category, Stock, Barcode, Tax rate",
      "Use the search bar to find products quickly",
      "Click Edit on any product to update its details",
      "Click Delete to remove a product (with confirmation)",
      "Set stock levels — low stock items show a red alert",
      "Use barcode field for scanner-based POS entry",
    ],
  },
  {
    id: "orders",
    title: "Managing Orders",
    icon: ClipboardList,
    color: "#2ECC71",
    steps: [
      "Go to Orders screen (F3 or sidebar)",
      "Use the search bar to find orders by ID or customer",
      "Filter by status: All, Completed, Refunded, Hold, Cancelled",
      "Click Show items to expand order details",
      "Click Edit to modify order items post-completion",
      "Click Refund to refund an order (stock restored automatically)",
      "Click Cancel to cancel with a reason (hold/completed orders)",
      "Click Notes to add internal notes to any order",
      "For delivery orders: update status from Pending → Out for Delivery → Delivered",
      "Use pagination (Show More) to load older orders",
    ],
  },
  {
    id: "coupons",
    title: "Coupons & Discounts",
    icon: Tag,
    color: "#E67E22",
    steps: [
      "Go to Coupons screen to create/manage coupons",
      "Create a coupon: set code, type (% or flat), value, min order",
      "Set validity dates (from/to) and max usage count",
      "Copy the coupon code to share with customers",
      "At POS checkout: enter the code in the coupon field",
      "Click Apply — discount shows in the order summary",
      "Coupon is marked as used after successful checkout",
    ],
  },
  {
    id: "wallet",
    title: "Customer Wallet",
    icon: Wallet,
    color: "#9B59B6",
    steps: [
      "Go to Wallet screen to manage customer balances",
      "Select a customer from the list",
      "Click Load Money to add balance (cash/card payment)",
      "View transaction history for the selected customer",
      "At POS checkout: select Wallet as payment method",
      "Order total is deducted from customer's wallet balance",
    ],
  },
  {
    id: "tables",
    title: "Table Management",
    icon: Users,
    color: "#1ABC9C",
    steps: [
      "Go to Tables screen to manage restaurant tables",
      "Add tables with name, capacity, and grid position",
      "Change table status: Available, Occupied, Reserved",
      "Edit or delete tables as needed",
      "Go to Reservations to book tables in advance",
      "Mark reservations as Seated when guests arrive",
    ],
  },
  {
    id: "inventory",
    title: "Ingredients & Recipes",
    icon: Package,
    color: "#E74C3C",
    steps: [
      "Go to Ingredients screen to manage raw materials",
      "Add ingredients with name, stock quantity, unit (g/ml/pcs)",
      "Set reorder level — alerts when stock drops below threshold",
      "Switch to Recipes tab to link products to ingredients",
      "Select a product and an ingredient, set quantity needed",
      "This enables ingredient-based inventory tracking",
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    icon: BarChart2,
    color: "#3498DB",
    steps: [
      "Dashboard: view today's revenue, transactions, avg order",
      "Reports: generate sales reports by date range",
      "Analytics: hourly sales, staff performance, item-wise sales",
      "GST: GSTR-1 and GSTR-3B reports for tax filing",
      "Day End: daily cash reconciliation (opening vs actual)",
      "Logs: full audit trail of all system activities",
      "Export data as CSV from Reports or Backup screen",
    ],
  },
  {
    id: "backup",
    title: "Backup & Restore",
    icon: Database,
    color: "#F5C842",
    steps: [
      "Go to Backup screen (admin only)",
      "Click Export Full Backup to download all 25 tables",
      "File is saved as .gz.b64 (compressed + base64 encoded)",
      "To restore: click Select Backup File, choose the file",
      "Review the backup preview (counts per table)",
      "Choose Merge (add/update) or Wipe & Restore (clear all first)",
      "A safety backup is auto-created before every import",
      "Export Products/Orders as CSV for spreadsheet use",
      "Import Products from CSV with the Import button",
    ],
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    icon: Zap,
    color: "#F5C842",
    steps: [
      "F1 — POS screen",
      "F2 — Dashboard",
      "F3 — Orders",
      "F4 — Products",
      "F5 — Kitchen Display",
      "F6 — Reports",
      "F7 — Activity Logs",
      "F8 — Settings",
      "C — Clear cart (on POS)",
      "P — Process checkout (on POS)",
      "1/2/3 — Dine In / Takeaway / Delivery",
      "? — Show all shortcuts",
      "Arrow keys — Navigate sidebar and product grid",
      "Escape — Close modals, clear search, clear PIN",
      "Enter — Submit forms, add to cart from grid",
    ],
  },
];

export default function TrainingModal({ onClose }: TrainingModalProps) {
  const [activeGuide, setActiveGuide] = useState<string | null>(null);

  const selectedGuide = guides.find((g) => g.id === activeGuide);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Training Guide"
    >
      <div
        className="rounded-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        style={{ background: "#1E1E26", border: "1px solid #2A2A35" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: "#2A2A35" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={20} style={{ color: "#F5C842" }} />
            <h2 className="text-lg font-bold" style={{ color: "#fff" }}>
              {selectedGuide ? selectedGuide.title : "Training Guide"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2A2A35] transition-colors"
            style={{ color: "#9090A8" }}
            aria-label="Close training"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedGuide ? (
            <div>
              <button
                onClick={() => setActiveGuide(null)}
                className="text-xs flex items-center gap-1 mb-4 px-2 py-1 rounded hover:bg-[#2A2A35]"
                style={{ color: "#9090A8" }}
              >
                ← Back to all guides
              </button>
              <div className="space-y-3">
                {selectedGuide.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: selectedGuide.color, color: "#0D0D0F" }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm pt-0.5" style={{ color: "#E8E8F0" }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {guides.map((guide) => {
                const Icon = guide.icon;
                return (
                  <button
                    key={guide.id}
                    onClick={() => setActiveGuide(guide.id)}
                    className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:bg-[#2A2A35]"
                    style={{ background: "#16161A", border: "1px solid #2A2A35" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${guide.color}20` }}
                    >
                      <Icon size={20} style={{ color: guide.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "#fff" }}>
                        {guide.title}
                      </div>
                      <div className="text-xs" style={{ color: "#9090A8" }}>
                        {guide.steps.length} steps
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: "#4A4A5A" }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t shrink-0 text-center" style={{ borderColor: "#2A2A35" }}>
          <p className="text-xs" style={{ color: "#4A4A5A" }}>
            Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#2A2A35", color: "#F5C842" }}>?</kbd> anytime for keyboard shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
