// lib/premium.ts
// Premium feature definitions and license tier configuration

import { Screen } from "@/app/page";

export type LicenseTier = "free" | "pro" | "business";

export interface PremiumFeature {
  id: string;
  label: string;
  description: string;
  tier: LicenseTier;
  icon: string;
}

export interface LicenseTierInfo {
  id: LicenseTier;
  label: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
}

// Map screens to their required tier
export const SCREEN_TIER: Partial<Record<Screen, LicenseTier>> = {
  // Free screens (not listed = free)
  // "pos": undefined (free)
  // "dashboard": undefined (free)
  // "orders": undefined (free)
  // "products": undefined (free)
  // "settings": undefined (free)
  // "support": undefined (free)

  // Pro tier
  "kds": "pro",
  "customers": "pro",
  "coupons": "pro",
  "wallet": "pro",
  "reports": "pro",
  "enhanced-reports": "pro",
  "gst": "pro",
  "day-end": "pro",
  "receipt-builder": "pro",

  // Business tier
  "scheduling": "business",
  "bulk-ops": "business",
  "reservations": "business",
  "ingredients": "business",
  "suppliers": "business",
  "audit": "business",
  "cash-drawer": "business",
  "expenses": "business",
  "refunds": "business",
  "staff": "business",
  "logs": "business",
  "backup": "business", // backup with cloud is business
};

// Premium features list for the upgrade screen
export const PREMIUM_FEATURES: PremiumFeature[] = [
  // Pro features
  { id: "kds", label: "Kitchen Display System", description: "Real-time order display for kitchen staff. Eliminate paper tickets.", tier: "pro", icon: "ChefHat" },
  { id: "customers", label: "Customer CRM & Loyalty", description: "Track customers, loyalty points, visit history, and spending.", tier: "pro", icon: "Users" },
  { id: "coupons", label: "Discount Coupons", description: "Create and manage promotional coupons and campaigns.", tier: "pro", icon: "Tag" },
  { id: "wallet", label: "Customer Wallet", description: "Prepaid balance system to drive repeat purchases.", tier: "pro", icon: "Wallet" },
  { id: "enhanced-reports", label: "Advanced Analytics", description: "Hourly breakdowns, staff performance, item-wise reports.", tier: "pro", icon: "BarChart2" },
  { id: "gst", label: "GST / Tax Reports", description: "GSTR-3B compliant tax reports. Save on accountant fees.", tier: "pro", icon: "FileText" },
  { id: "day-end", label: "Day End Reconciliation", description: "End-of-day cash counting and discrepancy detection.", tier: "pro", icon: "Calculator" },
  { id: "receipt-builder", label: "Custom Receipt Builder", description: "Design branded receipts with logo and custom fields.", tier: "pro", icon: "Printer" },

  // Business features
  { id: "scheduling", label: "Staff Scheduling", description: "Shift planning with calendar view. Replace spreadsheets.", tier: "business", icon: "CalendarClock" },
  { id: "reservations", label: "Table Reservations", description: "Online booking system. Replace Dineout/Zomato dependency.", tier: "business", icon: "CalendarClock" },
  { id: "ingredients", label: "Ingredient Inventory", description: "Recipe-based stock tracking. Essential for bakeries & cloud kitchens.", tier: "business", icon: "Beaker" },
  { id: "suppliers", label: "Suppliers & Purchase Orders", description: "Manage suppliers, create POs, track deliveries.", tier: "business", icon: "Truck" },
  { id: "audit", label: "Audit Dashboard", description: "Compliance-ready audit trail with tamper-proof logs.", tier: "business", icon: "Shield" },
  { id: "cash-drawer", label: "Cash Drawer Management", description: "Petty cash tracking with approval workflows.", tier: "business", icon: "Lock" },
  { id: "bulk-ops", label: "Bulk Operations", description: "Import/export products in bulk. Handle 1000+ items easily.", tier: "business", icon: "Layers" },
  { id: "expenses", label: "Expense Tracking", description: "Log and categorize business expenses.", tier: "business", icon: "DollarSign" },
  { id: "refunds", label: "Refund Approval System", description: "Two-step refund approval with audit trail.", tier: "business", icon: "RotateCcw" },
  { id: "staff", label: "Staff Management", description: "Clock in/out, attendance tracking, role management.", tier: "business", icon: "Users" },
  { id: "logs", label: "Activity Logs", description: "Full activity history with immutable audit trail.", tier: "business", icon: "History" },
];

// Tier pricing info
export const LICENSE_TIERS: LicenseTierInfo[] = [
  {
    id: "free",
    label: "Free",
    price: "₹0",
    period: "forever",
    features: [
      "POS Billing",
      "Product Management",
      "Order History",
      "Basic Dashboard",
      "Basic Reports",
      "Settings & Configuration",
      "Backup & Restore",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    price: "₹149",
    period: "/6 months",
    highlight: true,
    features: [
      "Everything in Free",
      "Kitchen Display System",
      "Customer CRM & Loyalty Points",
      "Discount Coupons & Wallet",
      "Advanced Analytics & Reports",
      "GST / Tax Reports",
      "Day End Reconciliation",
      "Custom Receipt Builder",
    ],
  },
  {
    id: "business",
    label: "Business",
    price: "₹299",
    period: "/6 months",
    features: [
      "Everything in Pro",
      "Staff Scheduling & Management",
      "Table Reservations",
      "Ingredient-Based Inventory",
      "Suppliers & Purchase Orders",
      "Audit Dashboard",
      "Cash Drawer Management",
      "Bulk Import/Export",
      "Expense Tracking",
      "Refund Approval System",
      "Activity Logs",
    ],
  },
];

// Check if a screen requires a premium tier
export function getRequiredTier(screen: Screen): LicenseTier {
  return SCREEN_TIER[screen] || "free";
}

// Check if a tier has access to a screen
export function hasAccess(userTier: LicenseTier, screen: Screen): boolean {
  const required = getRequiredTier(screen);
  if (required === "free") return true;
  if (userTier === "business") return true;
  if (userTier === "pro" && required === "pro") return true;
  return false;
}

// Get tier rank for comparison
export function getTierRank(tier: LicenseTier): number {
  switch (tier) {
    case "free": return 0;
    case "pro": return 1;
    case "business": return 2;
  }
}
