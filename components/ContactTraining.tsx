"use client";
import { useState } from "react";
import {
  Globe,
  Mail,
  Phone,
  BookOpen,
  Wrench,
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
  Wallet,
  Receipt,
  Truck,
  Apple,
  Calendar,
  Calculator,
  RotateCcw,
  Bell,
  CreditCard,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

interface MenuGuide {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  steps: { title: string; description: string }[];
  tips: string[];
}

export default function ContactTraining() {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

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
            "Click on the customer name at the top to select an existing customer or add a new one for loyalty points.",
        },
        {
          title: "Browse Products",
          description:
            "Products are displayed in categories on the left panel. Click on a category to see its products.",
        },
        {
          title: "Add Items to Order",
          description:
            "Click on any product to add it to the current order. Use +/- buttons to adjust quantity.",
        },
        {
          title: "Apply Modifiers",
          description:
            "Click on an item in the order to see modifiers, add notes, or remove items.",
        },
        {
          title: "Apply Discount",
          description:
            "Enter a discount code in the 'Coupon' field or select a predefined discount.",
        },
        {
          title: "Choose Payment Method",
          description:
            "Select payment method: Cash, UPI, Card, or Split payment options.",
        },
        {
          title: "Print Kitchen Ticket",
          description:
            "Click 'Print KOT' to send order to kitchen display without completing payment.",
        },
        {
          title: "Complete Order",
          description:
            "Click 'Pay' to complete the transaction. Receipt will be printed automatically.",
        },
        {
          title: "Hold Orders",
          description:
            "Click 'Hold' to save the current order for later. Access held orders from the icon in top-right.",
        },
      ],
      tips: [
        "Press F1 to quickly access POS from any screen",
        "Use keyboard shortcuts: 1-9 for quantity, Space to toggle payment",
        "Enable 'Auto-print KOT' in Settings for automatic kitchen tickets",
      ],
    },
    {
      id: "orders",
      title: "Orders",
      icon: <Receipt size={18} />,
      description: "View and manage all completed and pending orders",
      steps: [
        {
          title: "View Order List",
          description:
            "All orders are displayed with order number, date, total amount, and status.",
        },
        {
          title: "Filter Orders",
          description:
            "Use filters to show: All, Completed, Pending, Hold, or Cancelled orders.",
        },
        {
          title: "Search Orders",
          description:
            "Enter order number, customer name, or phone in the search bar to find specific orders.",
        },
        {
          title: "View Order Details",
          description:
            "Click on any order to see full item list, payment details, and timestamps.",
        },
        {
          title: "Cancel Order",
          description:
            "Click 'Cancel Order' button and select a reason for cancellation.",
        },
        {
          title: "Print Receipt",
          description:
            "Use the print button to reprint receipts for any completed order.",
        },
      ],
      tips: [
        "Use date filters to view orders from specific time periods",
        "Cancelled orders are marked in red for easy identification",
        "Order details include the staff member who processed it",
      ],
    },
    {
      id: "products",
      title: "Products",
      icon: <Package size={18} />,
      description: "Manage your product catalog, categories, and modifiers",
      steps: [
        {
          title: "View Products",
          description:
            "Browse all products organized by categories in the left panel.",
        },
        {
          title: "Add Category",
          description:
            "Click '+ Add Category' to create new product categories (e.g., Beverages, Main Course).",
        },
        {
          title: "Add Product",
          description:
            "Click '+ Add Product', fill in: Name, Price, Category, HSN code, Tax rate.",
        },
        {
          title: "Set Variants",
          description:
            "Add variants like Size (Small/Medium/Large) or Add-ons with different prices.",
        },
        {
          title: "Add Modifiers",
          description:
            "Create modifiers for customizations (e.g., Extra Cheese +₹20, No Onions).",
        },
        {
          title: "Set Stock Alert",
          description:
            "Enable stock tracking and set minimum quantity for low-stock alerts.",
        },
        {
          title: "Edit/Delete Product",
          description:
            "Click on any product to edit its details or delete it from the catalog.",
        },
      ],
      tips: [
        "Products with stock tracking show current quantity in the product card",
        "Use 'dine-in' and 'takeaway' tags to show products appropriately",
        "Enable 'Popular' flag to highlight best-selling items",
      ],
    },
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <BarChart3 size={18} />,
      description: "Overview of your business performance and key metrics",
      steps: [
        {
          title: "View Today's Summary",
          description:
            "See total revenue, order count, average order value for today.",
        },
        {
          title: "Payment Breakdown",
          description:
            "View pie chart showing Cash, UPI, Card payment distribution.",
        },
        {
          title: "Top Selling Items",
          description:
            "Check the list of best-performing products by quantity sold.",
        },
        {
          title: "Hourly Sales Trend",
          description:
            "View sales pattern throughout the day to identify peak hours.",
        },
        {
          title: "Compare Periods",
          description:
            "Select different dates to compare performance with previous periods.",
        },
        {
          title: "Staff Performance",
          description:
            "View top-performing staff members by order count and revenue.",
        },
      ],
      tips: [
        "Dashboard updates in real-time as orders are completed",
        "Use 'This Week' vs 'Last Week' comparison for trend analysis",
        "Pin important metrics to your dashboard for quick access",
      ],
    },
    {
      id: "kds",
      title: "Kitchen Display (KDS)",
      icon: <ChefHat size={18} />,
      description: "Digital display system for kitchen staff to manage orders",
      steps: [
        {
          title: "View Pending Orders",
          description:
            "All pending kitchen orders appear as cards with item details.",
        },
        {
          title: "Order Priority",
          description:
            "Orders are sorted by time. New orders appear at the top with a flash highlight.",
        },
        {
          title: "View Order Items",
          description:
            "Click on an order card to see full item list with modifiers and notes.",
        },
        {
          title: "Bump Order",
          description:
            "Click 'Done' or swipe the order to mark it as completed/picked up.",
        },
        {
          title: "Bump Individual Items",
          description:
            "Mark individual items as ready to help track partial completion.",
        },
        {
          title: "Kitchen Display URL",
          description:
            "Access KDS on a separate screen using the dedicated KDS URL.",
        },
      ],
      tips: [
        "Use F5 to quickly access KDS from any screen",
        "Enable audio alerts in Settings for new order notifications",
        "Color-code orders by order type (Dine-in: Blue, Takeaway: Green)",
      ],
    },
    {
      id: "tables",
      title: "Table Management",
      icon: <LayoutGrid size={18} />,
      description: "Manage dining tables and track table occupancy",
      steps: [
        {
          title: "View Floor Plan",
          description:
            "See all tables displayed in a grid with status indicators.",
        },
        {
          title: "Table Status Colors",
          description:
            "Green: Available, Red: Occupied, Yellow: Reserved, Gray: Blocked.",
        },
        {
          title: "Add Table",
          description:
            "Click '+ Add Table' to create a new table with name and capacity.",
        },
        {
          title: "Edit Table",
          description:
            "Click on any table to change its name, capacity, or status.",
        },
        {
          title: "Mark Occupied",
          description: "Click 'Mark Occupied' when a customer is seated.",
        },
        {
          title: "Mark Available",
          description:
            "Click 'Mark Available' when the table is cleared and cleaned.",
        },
      ],
      tips: [
        "Assign table numbers matching your physical floor plan for easy identification",
        "Use capacity setting to show only tables suitable for party size",
        "Track table turnover time to optimize seating efficiency",
      ],
    },
    {
      id: "customers",
      title: "Customer CRM",
      icon: <Heart size={18} />,
      description: "Manage customer database and loyalty program",
      steps: [
        {
          title: "Search Customers",
          description: "Find existing customers by name or phone number.",
        },
        {
          title: "Add New Customer",
          description:
            "Click 'Add' button and enter customer details: Name, Phone, Email.",
        },
        {
          title: "View Customer Profile",
          description:
            "Click on a customer to see their visit history and total spending.",
        },
        {
          title: "Loyalty Points",
          description:
            "Points are automatically earned with each purchase (configurable rate).",
        },
        {
          title: "Manually Add Points",
          description:
            "Staff can manually add or deduct points from customer accounts.",
        },
        {
          title: "View Order History",
          description:
            "See all past orders for a customer with dates and amounts.",
        },
      ],
      tips: [
        "Encourage customers to provide phone number for loyalty tracking",
        "Set up automatic SMS notifications for points earned",
        "Use customer data for targeted marketing campaigns",
      ],
    },
    {
      id: "coupons",
      title: "Coupons & Discounts",
      icon: <Ticket size={18} />,
      description: "Create and manage discount coupons and offers",
      steps: [
        {
          title: "View Coupons",
          description: "See all active and expired coupons in the list.",
        },
        {
          title: "Create Coupon",
          description:
            "Click '+ Add Coupon' and set: Code, Discount Type (Percentage/Fixed), Value.",
        },
        {
          title: "Set Conditions",
          description:
            "Define minimum order amount, maximum discount, and validity dates.",
        },
        {
          title: "Usage Limits",
          description: "Set total usage limit and per-customer usage limit.",
        },
        {
          title: "Enable/Disable",
          description: "Toggle coupon status to activate or pause the offer.",
        },
        {
          title: "Apply at POS",
          description:
            "Customer enters coupon code at checkout to avail the discount.",
        },
      ],
      tips: [
        "Create combo offers: Buy 2 Get 1 Free using percentage discount",
        "Set expiry dates to create urgency for customers",
        "Track coupon usage in Reports to measure campaign effectiveness",
      ],
    },
    // {
    //   id: "wallet",
    //   title: "Customer Wallet",
    //   icon: <Wallet size={18} />,
    //   description: "Prepaid wallet system for customers",
    //   steps: [
    //     { title: "View Wallet Balance", description: "Each customer can have a prepaid wallet balance." },
    //     { title: "Load Money", description: "Click 'Load Money' and enter amount to add to customer's wallet." },
    //     { title: "Payment from Wallet", description: "Customers can pay from wallet balance at POS (auto-deducted)." },
    //     { title: "Wallet Transactions", description: "View history of all wallet loading and deduction transactions." },
    //     { title: "Refund to Wallet", description: "Process refunds directly to customer wallet for future use." }
    //   ],
    //   tips: [
    //     "Encourage prepaid balances during slow periods to boost cash flow",
    //     "Offer wallet loading bonuses (e.g., Load ₹1000 Get ₹1050)",
    //     "Wallet balance shows in customer profile for quick reference"
    //   ]
    // },
    {
      id: "gst",
      title: "GST Reports",
      icon: <Receipt size={18} />,
      description: "Tax compliance and GST filing reports",
      steps: [
        {
          title: "View GST Summary",
          description:
            "See total taxable amount, CGST, SGST collected for the period.",
        },
        {
          title: "Date Range Filter",
          description:
            "Select date range to generate GST report for filing period.",
        },
        {
          title: "HSN-wise Summary",
          description:
            "View sales breakdown by HSN code for accurate tax calculation.",
        },
        {
          title: "Export Report",
          description:
            "Download GST report in Excel format for accountant reference.",
        },
        {
          title: "GSTR-1 Ready Data",
          description:
            "Export data in format compatible with GST portal filing.",
        },
      ],
      tips: [
        "Reconcile with your bank statement for accuracy",
        "Export monthly reports for your accountant before filing deadline",
        "HSN codes must be correctly set in products for proper classification",
      ],
    },
    // {
    //   id: "suppliers",
    //   title: "Suppliers",
    //   icon: <Truck size={18} />,
    //   description: "Manage your raw material and inventory suppliers",
    //   steps: [
    //     { title: "View Suppliers", description: "See list of all registered suppliers with contact information." },
    //     { title: "Add Supplier", description: "Click '+ Add Supplier', enter: Name, Phone, Email, Address." },
    //     { title: "Edit Supplier", description: "Click on a supplier to update their contact details." },
    //     { title: "Delete Supplier", description: "Remove suppliers that are no longer in use (with confirmation)." },
    //     { title: "Search Suppliers", description: "Use search to quickly find specific suppliers." }
    //   ],
    //   tips: [
    //     "Maintain at least 2 suppliers for each critical ingredient",
    //     "Add notes about supplier terms and payment conditions",
    //     "Use supplier contact for quick reorder communication"
    //   ]
    // },
    // {
    //   id: "purchase_orders",
    //   title: "Purchase Orders",
    //   icon: <Package size={18} />,
    //   description: "Create and track purchase orders for inventory",
    //   steps: [
    //     { title: "Create Purchase Order", description: "Click '+ New Order', select supplier, add items with quantities." },
    //     { title: "Add Items", description: "Select ingredients/supplies, enter quantity and unit price." },
    //     { title: "Set Delivery Date", description: "Specify expected delivery date for the order." },
    //     { title: "Mark Received", description: "When items arrive, mark order as 'Received' to update inventory." },
    //     { title: "Partial Receipt", description: "Receive partial orders and track pending items separately." },
    //     { title: "View History", description: "See all purchase orders with their status and totals." }
    //   ],
    //   tips: [
    //     "Set reorder levels in Ingredients to get low-stock warnings",
    //     "Track delivery performance to evaluate supplier reliability",
    //     "Match purchase orders with bills for accurate accounting"
    //   ]
    // },
    // {
    //   id: "ingredients",
    //   title: "Ingredients & Stock",
    //   icon: <Apple size={18} />,
    //   description: "Track raw material inventory and stock levels",
    //   steps: [
    //     { title: "View Ingredients", description: "See all ingredients with current stock levels and units." },
    //     { title: "Add Ingredient", description: "Click '+ Add Ingredient', enter: Name, Unit, Current Stock, Min Stock Alert." },
    //     { title: "Update Stock", description: "Manually adjust stock levels when physical counting." },
    //     { title: "Auto-deduct", description: "Enable auto-deduction when products are sold (requires recipe mapping)." },
    //     { title: "Low Stock Alerts", description: "Ingredients below minimum stock appear in Inventory Alerts." },
    //     { title: "View Usage History", description: "Track ingredient consumption over time." }
    //   ],
    //   tips: [
    //     "Set realistic minimum stock levels based on usage patterns",
    //     "Do weekly physical stock verification",
    //     "Link ingredients to products using recipes for automatic deduction"
    //   ]
    // },
    {
      id: "staff",
      title: "Staff Attendance",
      icon: <Users size={18} />,
      description: "Track employee clock-in/out and work hours",
      steps: [
        {
          title: "View Today's Attendance",
          description:
            "See all staff members who are clocked in or completed shifts today.",
        },
        {
          title: "Clock In",
          description:
            "Staff member clicks 'Clock In' when starting their shift.",
        },
        {
          title: "Clock Out",
          description:
            "Staff member clicks 'Clock Out' when ending their shift.",
        },
        {
          title: "View Duration",
          description: "See total hours worked for each shift.",
        },
        {
          title: "Track Status",
          description: "Green dot = On Shift, Gray dot = Off Duty.",
        },
      ],
      tips: [
        "Staff must be logged in to clock in/out",
        "Use attendance data for payroll calculations",
        "Review attendance patterns to optimize staffing",
      ],
    },
    // {
    //   id: "scheduling",
    //   title: "Staff Scheduling",
    //   icon: <Calendar size={18} />,
    //   description: "Plan and manage staff work schedules",
    //   steps: [
    //     { title: "View Calendar", description: "See scheduled shifts for each day in the calendar view." },
    //     { title: "Add Shift", description: "Click '+ Add Shift', select staff member, set start/end time." },
    //     { title: "Set Role", description: "Assign role: Cashier, Waiter, Kitchen, Manager for the shift." },
    //     { title: "Edit Shift", description: "Click on existing shift to modify time or reassign staff." },
    //     { title: "Delete Shift", description: "Remove scheduled shifts when plans change." },
    //     { title: "Navigate Dates", description: "Use arrow buttons to view previous/next days." }
    //   ],
    //   tips: [
    //     "Schedule shifts in advance to help staff plan",
    //     "Use roles to ensure required staff coverage",
    //     "Add notes to shifts for special instructions"
    //   ]
    // },
    // {
    //   id: "reconciliation",
    //   title: "Day-End Reconciliation",
    //   icon: <Calculator size={18} />,
    //   description: "Reconcile daily cash and sales",
    //   steps: [
    //     { title: "Select Date", description: "Choose the date for which to perform reconciliation." },
    //     { title: "View Expected Cash", description: "System calculates expected cash based on sales minus expenses." },
    //     { title: "Enter Actual Cash", description: "Count cash in drawer and enter the actual amount." },
    //     { title: "View Difference", description: "See variance between expected and actual cash." },
    //     { title: "Add Notes", description: "Document any observations or explanations for variance." },
    //     { title: "Save Reconciliation", description: "Save the record for audit trail." }
    //   ],
    //   tips: [
    //     "Perform reconciliation at the end of each business day",
    //     "Investigate large variances immediately",
    //     "Use notes field to document cash drops or float changes"
    //   ]
    // },
    // {
    //   id: "expenses",
    //   title: "Expenses",
    //   icon: <CreditCard size={18} />,
    //   description: "Track business expenses and categories",
    //   steps: [
    //     { title: "View Expenses", description: "See list of all recorded expenses with dates and amounts." },
    //     { title: "Add Expense", description: "Click '+ Add Expense', enter: Amount, Category, Description, Date." },
    //     { title: "Manage Categories", description: "Create and manage expense categories (Rent, Utilities, Supplies, etc.)." },
    //     { title: "Filter by Date", description: "Use date filter to view expenses for specific periods." },
    //     { title: "View Total", description: "See total expenses for the selected period." }
    //   ],
    //   tips: [
    //     "Record expenses immediately for accurate tracking",
    //     "Use categories for better expense analysis",
    //     "Attach receipt photos to expenses for documentation"
    //   ]
    // },
    {
      id: "refund_requests",
      title: "Refund Requests",
      icon: <RotateCcw size={18} />,
      description: "Process and track customer refund requests",
      steps: [
        {
          title: "View Requests",
          description: "See all pending and processed refund requests.",
        },
        {
          title: "Create Request",
          description:
            "Click '+ New Request', select original order, enter refund amount.",
        },
        {
          title: "Select Reason",
          description:
            "Choose reason for refund: Wrong Item, Quality Issue, Customer Request, Other.",
        },
        {
          title: "Process Refund",
          description:
            "Approve and process refund via original payment method.",
        },
        {
          title: "Refund to Wallet",
          description: "Optionally refund to customer's wallet for future use.",
        },
        {
          title: "Track Status",
          description:
            "Monitor pending, approved, and rejected refund requests.",
        },
      ],
      tips: [
        "Verify original order before approving refunds",
        "Set refund limits requiring manager approval for large amounts",
        "Document refund reasons for quality improvement analysis",
      ],
    },
    {
      id: "inventory_alerts",
      title: "Inventory Alerts",
      icon: <Bell size={18} />,
      description: "View low stock and inventory alerts",
      steps: [
        {
          title: "View Alerts",
          description: "See all ingredients below minimum stock level.",
        },
        {
          title: "Alert Priority",
          description:
            "Critical items appear at the top for immediate attention.",
        },
        {
          title: "Quick Reorder",
          description: "Create purchase order directly from alert.",
        },
        {
          title: "Dismiss Alert",
          description: "Mark alerts as acknowledged after taking action.",
        },
        {
          title: "Set Thresholds",
          description:
            "Configure minimum stock levels in Ingredients settings.",
        },
      ],
      tips: [
        "Check alerts daily to prevent stockouts",
        "Set conservative stock levels to have buffer time for orders",
        "Enable email/SMS notifications for critical alerts",
      ],
    },
    {
      id: "reports",
      title: "Reports",
      icon: <FileText size={18} />,
      description: "Comprehensive business reports and analytics",
      steps: [
        {
          title: "Sales Report",
          description:
            "View total sales, order count, average order value by period.",
        },
        {
          title: "Product Performance",
          description:
            "See which products sell the most and generate most revenue.",
        },
        {
          title: "Staff Reports",
          description: "Track staff performance by orders processed and sales.",
        },
        {
          title: "Payment Analysis",
          description: "View breakdown by payment method (Cash, UPI, Card).",
        },
        {
          title: "Date Range Filter",
          description: "Customize reports by selecting specific date ranges.",
        },
        {
          title: "Export Data",
          description:
            "Download reports in Excel format for external analysis.",
        },
      ],
      tips: [
        "Use F6 to quickly access Reports from any screen",
        "Compare periods to identify trends and growth patterns",
        "Share reports with your accountant for tax preparation",
      ],
    },
    {
      id: "logs",
      title: "Activity Logs",
      icon: <FileText size={18} />,
      description: "System activity and audit trail",
      steps: [
        {
          title: "View Activity",
          description: "See chronological list of all system actions.",
        },
        {
          title: "Filter by Type",
          description:
            "Filter by: All, Order, Product, Staff, Settings changes.",
        },
        {
          title: "Search Logs",
          description: "Search for specific activities by keywords.",
        },
        {
          title: "Date Filter",
          description: "View activities from specific time periods.",
        },
        {
          title: "Track Changes",
          description: "Monitor who made what changes and when.",
        },
      ],
      tips: [
        "Use logs to investigate discrepancies or errors",
        "Track staff actions for accountability",
        "Logs are useful for auditing and compliance",
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
          description: "Set business name, address, phone, GST number.",
        },
        {
          title: "Invoice Settings",
          description: "Configure invoice prefix, footer text, logo.",
        },
        {
          title: "Tax Settings",
          description: "Set default tax rates and GST slabs.",
        },
        {
          title: "Printer Setup",
          description: "Configure receipt printer and kitchen ticket printer.",
        },
        {
          title: "Payment Settings",
          description: "Enable/disable payment methods, set UPI ID.",
        },
        {
          title: "Loyalty Settings",
          description: "Configure points earning rate, redemption value.",
        },
        {
          title: "Backup",
          description: "Export database backup for safekeeping.",
        },
      ],
      tips: [
        "Complete all settings before going live",
        "Regularly backup your data",
        "Test printer settings before busy hours",
      ],
    },
  ];

  const toggleMenu = (id: string) => {
    setExpandedMenu(expandedMenu === id ? null : id);
  };

  return (
    <div className="h-full overflow-y-auto p-5">
      <h1 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
        <GraduationCap size={24} style={{ color: "#F5C842" }} />
        Menu Training Guide
      </h1>
      <p className="text-sm mb-6" style={{ color: "#9090A8" }}>
        Learn how to use each menu in the POS system. Click on any section to
        expand.
      </p>

      <div className="space-y-3">
        {menuGuides.map((menu) => (
          <div key={menu.id} className="card overflow-hidden">
            <button
              onClick={() => toggleMenu(menu.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-[rgba(245,200,66,0.05)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#1E1E26" }}
                >
                  <span style={{ color: "#F5C842" }}>{menu.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{menu.title}</h3>
                  <p className="text-xs" style={{ color: "#9090A8" }}>
                    {menu.description}
                  </p>
                </div>
              </div>
              {expandedMenu === menu.id ? (
                <ChevronDown size={20} style={{ color: "#9090A8" }} />
              ) : (
                <ChevronRight size={20} style={{ color: "#9090A8" }} />
              )}
            </button>

            {expandedMenu === menu.id && (
              <div
                className="border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="p-4">
                  <h4
                    className="font-semibold mb-3 text-sm flex items-center gap-2"
                    style={{ color: "#F5C842" }}
                  >
                    <CheckCircle size={16} />
                    Step-by-Step Guide
                  </h4>
                  <div className="space-y-3 mb-6">
                    {menu.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: "#F5C842", color: "#0D0D0F" }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{step.title}</p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "#9090A8" }}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h4
                    className="font-semibold mb-3 text-sm flex items-center gap-2"
                    style={{ color: "#2ECC71" }}
                  >
                    <Sparkles size={16} />
                    Pro Tips
                  </h4>
                  <div className="space-y-2">
                    {menu.tips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 text-xs"
                        style={{ color: "#9090A8" }}
                      >
                        <span style={{ color: "#2ECC71" }}>•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "#F5C842" }}
          >
            <Sparkles size={24} color="#0D0D0F" fill="#0D0D0F" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Appixen</h2>
            <p className="text-xs" style={{ color: "#9090A8" }}>
              Software Solutions & Training
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <a
            href="https://www.appixen.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-[rgba(245,200,66,0.08)]"
            style={{ border: "1px solid var(--border)" }}
          >
            <Globe size={18} style={{ color: "#F5C842" }} />
            <div>
              <div className="font-medium text-sm">Website</div>
              <div className="text-xs" style={{ color: "#3498DB" }}>
                www.appixen.com
              </div>
            </div>
          </a>

          <a
            href="mailto:info@appixen.com"
            className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-[rgba(245,200,66,0.08)]"
            style={{ border: "1px solid var(--border)" }}
          >
            <Mail size={18} style={{ color: "#F5C842" }} />
            <div>
              <div className="font-medium text-sm">Email</div>
              <div className="text-xs" style={{ color: "#3498DB" }}>
                info@appixen.com
              </div>
            </div>
          </a>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap size={16} style={{ color: "#F5C842" }} />
          <h2 className="font-semibold">Training Services</h2>
        </div>
        <div className="space-y-3 text-sm" style={{ color: "#9090A8" }}>
          <div className="flex items-start gap-2">
            <BookOpen
              size={14}
              style={{ color: "#2ECC71", marginTop: 2, flexShrink: 0 }}
            />
            <span>On-site and remote POS system training for your staff</span>
          </div>
          <div className="flex items-start gap-2">
            <GraduationCap
              size={14}
              style={{ color: "#2ECC71", marginTop: 2, flexShrink: 0 }}
            />
            <span>Customized training programs for restaurants and retail</span>
          </div>
          <div className="flex items-start gap-2">
            <Headphones
              size={14}
              style={{ color: "#2ECC71", marginTop: 2, flexShrink: 0 }}
            />
            <span>Ongoing support and troubleshooting assistance</span>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle size={16} style={{ color: "#F5C842" }} />
          <h2 className="font-semibold">Quick Help</h2>
        </div>
        <div className="space-y-3 text-sm" style={{ color: "#9090A8" }}>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F1</span>
            <span>POS Screen</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F2</span>
            <span>Dashboard</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F3</span>
            <span>Orders</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F4</span>
            <span>Products</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F5</span>
            <span>Kitchen Display (KDS)</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F6</span>
            <span>Reports</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F7</span>
            <span>Activity Logs</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>F8</span>
            <span>Settings</span>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ color: "#F5C842" }}>?</span>
            <span>Keyboard Shortcuts Help</span>
          </div>
        </div>
      </div>
    </div>
  );
}
