// lib/db.ts
// SQLite via Tauri invoke commands (Rust backend)
// Falls back to localStorage when running in browser (dev mode)

import { invoke } from "@tauri-apps/api/tauri";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  barcode: string;
  tax: number;
  created_at?: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  discount: number;
  tax: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card" | "upi";
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  status: "completed" | "refunded" | "hold" | "cancelled";
  order_type: "dine_in" | "takeaway" | "delivery";
  delivery_status: "pending" | "out_for_delivery" | "delivered" | "cancelled";
  delivery_address: string;
  delivery_phone: string;
  created_at: string;
  synced?: boolean;
  table_id?: string;
  notes?: string;
  user_id?: string;
  user_name?: string;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  position_x: number;
  position_y: number;
}

export interface StaffAttendance {
  id: string;
  user_id: string;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyalty_points: number;
  total_spent: number;
  visits: number;
  created_at: string;
}

export interface OrderNote {
  id: string;
  order_id: string;
  note: string;
  created_at: string;
}

export interface InventoryAlert {
  id: string;
  product_id: string;
  product_name: string;
  current_stock: number;
  threshold: number;
  alert_type: "low_stock" | "out_of_stock";
  created_at: string;
}

export interface HourlySales {
  hour: number;
  revenue: number;
  orders: number;
}

export interface StaffPerformance {
  user_id: string;
  user_name: string;
  total_orders: number;
  total_revenue: number;
}

export interface SalesByItem {
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
}

export interface RefundRequest {
  id: string;
  order_id: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Settings {
  store_name: string;
  currency: string;
  currency_symbol: string;
  country: string;
  timezone: string;
  tax_rate: number;
  tax_name: string;
  tax_system: string;
  address: string;
  phone: string;
  neon_url: string;
  business_name: string;
  tax_id: string;
  receipt_save_path: string;
  twilio_sid: string;
  twilio_token: string;
  twilio_phone: string;
  lan_sync_enabled: boolean;
  lan_server_port: number;
  dark_mode: boolean;
  language: string;
  whatsapp_enabled: boolean;
  whatsapp_api_url: string;
  offline_mode: boolean;
  // Whitelabel
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  footer_text: string;
  // Contact
  contact_email: string;
  contact_website: string;
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  reorder_level: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit_cost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  total: number;
  notes: string;
  items: PurchaseOrderItem[];
  created_at: string;
}

export interface Reservation {
  id: string;
  table_id: string;
  table_name: string;
  customer_name: string;
  phone: string;
  date: string;
  time: string;
  party_size: number;
  status: string;
  notes: string;
  created_at?: string;
}

export interface KdsOrder {
  id: string;
  items: KdsItem[];
  order_type: string;
  customer_name: string;
  created_at: string;
}

export interface KdsItem {
  product_name: string;
  quantity: number;
  done: boolean;
}

export interface LanServerStatus {
  running: boolean;
  port: number;
  connected_clients: number;
}

export interface Shift {
  id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  start_time: string;
  end_time: string;
  role: string;
  notes: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  payment_method: string;
  created_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
}

export interface CustomerWallet {
  customer_id: string;
  balance: number;
  total_loaded: number;
  total_spent: number;
}

export interface WalletTransaction {
  id: string;
  customer_id: string;
  amount: number;
  transaction_type: string;
  order_id?: string;
  notes: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
}

export interface DayEndReconciliation {
  id: string;
  date: string;
  opening_cash: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  total_expenses: number;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface GstReport {
  invoice_no: string;
  date: string;
  customer_name: string;
  customer_gstin?: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  place_of_supply: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  previous_value?: string;
  new_value?: string;
  reason?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

// ─── Invoke wrapper ────────────────────────────────────────────────────────────
async function sql<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IS_TAURI) {
    return invoke<T>(cmd, args);
  }
  // Browser fallback (dev without Tauri)
  return browserFallback<T>(cmd, args);
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function dbGetProducts(): Promise<Product[]> {
  return sql<Product[]>("get_products");
}

export async function dbSaveProduct(p: Product): Promise<void> {
  return sql("upsert_product", { product: p });
}

export async function dbDeleteProduct(id: string): Promise<void> {
  return sql("delete_product", { id });
}

export async function dbUpdateStock(id: string, delta: number): Promise<void> {
  return sql("update_stock", { id, delta });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function dbGetOrders(): Promise<Order[]> {
  return sql<Order[]>("get_orders");
}

export async function dbSaveOrder(o: Order): Promise<void> {
  return sql("save_order", { order: o });
}

export async function dbRefundOrder(id: string, userId: string = "system", userName: string = "System"): Promise<void> {
  return sql("refund_order", { id, userId, userName });
}

export async function updateDeliveryStatus(id: string, status: string): Promise<void> {
  return sql("update_delivery_status", { id, status });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function dbGetSettings(): Promise<Settings> {
  return sql<Settings>("get_settings");
}

export async function dbSaveSettings(s: Settings): Promise<void> {
  return sql("save_settings", { settings: s });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function dbGetDailySummary() {
  return sql<{
    revenue: number;
    transactions: number;
    avg_order: number;
    items_sold: number;
  }>("get_daily_summary");
}

export async function dbGetWeeklyRevenue() {
  return sql<{ label: string; revenue: number }[]>("get_weekly_revenue");
}

export async function dbGetTopProducts() {
  return sql<{ name: string; qty: number; revenue: number }[]>("get_top_products");
}

export async function dbGetLowStock() {
  return sql<{ name: string; stock: number }[]>("get_low_stock");
}

// ─── CSV Import/Export ─────────────────────────────────────────────────────
export async function exportProductsCsv(): Promise<string> {
  return sql<string>("export_products_csv");
}

export async function exportOrdersCsv(): Promise<string> {
  return sql<string>("export_orders_csv");
}

export async function importProductsCsv(csvData: string): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_products_csv", { csvData });
}

// ─── Reports ───────────────────────────────────────────────────────────────
export async function getSalesReport(startDate: string, endDate: string) {
  return sql<{
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_orders: number;
    avg_order: number;
  }>("get_sales_report", { startDate, endDate });
}

// ─── Users ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: string;
}

export async function verifyPin(pin: string): Promise<User | null> {
  return sql<User | null>("verify_pin", { pin });
}

export async function changePin(userId: string, newPin: string): Promise<void> {
  return sql("change_pin", { userId, newPin });
}

export async function getUsers(): Promise<User[]> {
  return sql<User[]>("get_users");
}

// ─── Backup ─────────────────────────────────────────────────────────────────
export async function exportBackup(): Promise<string> {
  return sql<string>("export_backup");
}

// ─── Activity Logs ─────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  order_id: string;
  action: string;
  previous_data: string | null;
  new_data: string | null;
  reason: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
  return sql<ActivityLog[]>("get_activity_logs", { limit });
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export async function dbGetTables(): Promise<Table[]> {
  return sql<Table[]>("get_tables");
}

export async function dbSaveTable(table: Table): Promise<void> {
  return sql("save_table", { table });
}

export async function dbDeleteTable(id: string): Promise<void> {
  return sql("delete_table", { id });
}

export async function dbUpdateTableStatus(id: string, status: string): Promise<void> {
  return sql("update_table_status", { id, status });
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────
export async function dbClockIn(userId: string, userName: string): Promise<void> {
  return sql("clock_in", { userId, userName });
}

export async function dbClockOut(userId: string): Promise<void> {
  return sql("clock_out", { userId });
}

export async function dbGetTodayAttendance(): Promise<StaffAttendance[]> {
  return sql<StaffAttendance[]>("get_today_attendance");
}

export async function dbIsClockedIn(userId: string): Promise<boolean> {
  return sql<boolean>("is_clocked_in", { userId });
}

// ─── Customers ──────────────────────────────────────────────────────────────
export async function dbGetCustomers(): Promise<Customer[]> {
  return sql<Customer[]>("get_customers");
}

export async function dbSaveCustomer(customer: Customer): Promise<void> {
  return sql("save_customer", { customer });
}

export async function dbGetCustomerByPhone(phone: string): Promise<Customer | null> {
  return sql<Customer | null>("get_customer_by_phone", { phone });
}

export async function dbAddLoyaltyPoints(customerId: string, points: number, spent: number): Promise<void> {
  return sql("add_loyalty_points", { customerId, points, spent });
}

export async function dbGetCustomerOrders(phone: string): Promise<Order[]> {
  return sql<Order[]>("get_customer_orders", { phone });
}

// ─── Order Notes ────────────────────────────────────────────────────────────
export async function dbAddOrderNote(orderId: string, note: string): Promise<void> {
  return sql("add_order_note", { orderId, note });
}

export async function dbGetOrderNotes(orderId: string): Promise<OrderNote[]> {
  return sql<OrderNote[]>("get_order_notes", { orderId });
}

// ─── Inventory Alerts ───────────────────────────────────────────────────────
export async function dbGetInventoryAlerts(): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("get_inventory_alerts");
}

export async function dbCheckInventoryAlerts(): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("check_inventory_alerts");
}

export async function dbCreateInventoryAlert(alert: InventoryAlert): Promise<void> {
  return sql("create_inventory_alert", { alert });
}

export async function dbClearInventoryAlert(id: string): Promise<void> {
  return sql("clear_inventory_alert", { id });
}

// ─── Enhanced Reports ───────────────────────────────────────────────────────
export async function dbGetHourlySales(date: string): Promise<HourlySales[]> {
  return sql<HourlySales[]>("get_hourly_sales", { date });
}

export async function dbGetStaffPerformance(startDate: string, endDate: string): Promise<StaffPerformance[]> {
  return sql<StaffPerformance[]>("get_staff_performance", { startDate, endDate });
}

export async function dbGetSalesByItem(startDate: string, endDate: string): Promise<SalesByItem[]> {
  return sql<SalesByItem[]>("get_sales_by_item", { startDate, endDate });
}

// ─── Hold & Cancel ──────────────────────────────────────────────────────────
export async function dbHoldOrder(order: Order): Promise<void> {
  return sql("hold_order", { order });
}

export async function dbGetHeldOrders(): Promise<Order[]> {
  return sql<Order[]>("get_held_orders");
}

export async function dbCancelOrder(id: string, reason: string, userId: string, userName: string): Promise<void> {
  return sql("cancel_order", { id, reason, userId, userName });
}

// ─── Refunds ───────────────────────────────────────────────────────────────
export async function dbCreateRefundRequest(orderId: string, amount: number, reason: string): Promise<string> {
  return sql<string>("create_refund_request", { orderId, amount, reason });
}

export async function dbGetRefundRequests(): Promise<RefundRequest[]> {
  return sql<RefundRequest[]>("get_refund_requests");
}

export async function dbApproveRefund(id: string, userId: string, userName: string): Promise<void> {
  return sql("approve_refund", { id, userId, userName });
}

export async function dbRejectRefund(id: string): Promise<void> {
  return sql("reject_refund", { id });
}

// ─── Crash Recovery ─────────────────────────────────────────────────────────
export async function dbGetPendingOrdersCount(): Promise<number> {
  return sql<number>("get_pending_orders_count");
}

export async function dbGetPendingOrders(): Promise<Order[]> {
  return sql<Order[]>("get_pending_orders");
}

export async function dbDeletePendingOrder(id: string): Promise<void> {
  return sql("delete_pending_order", { id });
}

// ─── Hardware Integration ───────────────────────────────────────────────────
export async function printToPrinter(receipt: string, printerName?: string): Promise<void> {
  return sql("print_to_printer", { receipt, printerName });
}

export async function openCashDrawer(): Promise<void> {
  return sql("open_cash_drawer");
}

// ─── Neon Sync ────────────────────────────────────────────────────────────────
export async function syncToNeon(): Promise<{ synced: number; error?: string }> {
  return sql("sync_to_neon");
}

export async function syncFromNeon(): Promise<{ imported: number; error?: string }> {
  return sql("sync_from_neon");
}

// ─── Cart Calculation (pure JS, no DB needed) ─────────────────────────────────
export function calcCart(items: { product: Product; quantity: number; discount: number }[], globalDiscount = 0) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  items.forEach((item) => {
    const line = item.product.price * item.quantity;
    const itemDisc = line * (item.discount / 100);
    const afterDisc = line - itemDisc;
    const tax = afterDisc * (item.product.tax / 100);
    subtotal += afterDisc;
    taxAmount += tax;
    discountAmount += itemDisc;
  });

  const globalDisc = subtotal * (globalDiscount / 100);
  discountAmount += globalDisc;
  const total = subtotal - globalDisc + taxAmount;

  return {
    subtotal: r(subtotal),
    tax_amount: r(taxAmount),
    discount_amount: r(discountAmount),
    total: r(total),
  };
}

function r(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
export function generateReceipt(order: Order, settings: Settings): string {
  const c = settings.currency;
  const lines = [
    `================================`,
    `       ${settings.store_name}`,
    `  ${settings.address}`,
    `  ${settings.phone}`,
    `================================`,
    `Order: #${order.id.slice(-6).toUpperCase()}`,
    `Date:  ${new Date(order.created_at).toLocaleString()}`,
    order.customer_name ? `Customer: ${order.customer_name}` : "",
    `--------------------------------`,
    ...order.items.map((i) => {
      const left = `${i.product_name} x${i.quantity}`;
      const right = `${c}${(i.price * i.quantity).toFixed(2)}`;
      return `${left.padEnd(22)}${right.padStart(8)}`;
    }),
    `--------------------------------`,
    `Subtotal:${(c + order.subtotal.toFixed(2)).padStart(21)}`,
    `Tax:     ${(c + order.tax_amount.toFixed(2)).padStart(21)}`,
    order.discount_amount > 0
      ? `Discount:${("-" + c + order.discount_amount.toFixed(2)).padStart(21)}`
      : "",
    `================================`,
    `TOTAL:   ${(c + order.total.toFixed(2)).padStart(21)}`,
    `Payment: ${order.payment_method.toUpperCase()}`,
    order.payment_method === "cash"
      ? `Paid:    ${(c + order.amount_paid.toFixed(2)).padStart(21)}`
      : "",
    order.payment_method === "cash"
      ? `Change:  ${(c + order.change_amount.toFixed(2)).padStart(21)}`
      : "",
    `================================`,
    `   Thank you! Visit again soon`,
    `================================`,
  ]
    .filter(Boolean)
    .join("\n");
  return lines;
}

// ─── Browser Fallback (localStorage) ─────────────────────────────────────────
// Used when running `next dev` without Tauri
const LS = {
  products: "pos_products",
  orders: "pos_orders",
  settings: "pos_settings",
};

function lsGet<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
function lsSet(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

function defaultSettings(): Settings {
  return {
    store_name: "My POS Store",
    currency: "USD",
    currency_symbol: "$",
    country: "US",
    timezone: "America/New_York",
    tax_rate: 10,
    tax_name: "Tax",
    tax_system: "none",
    address: "123 Main Street",
    phone: "+1 234 567 8900",
    neon_url: "",
    business_name: "",
    tax_id: "",
    receipt_save_path: "",
    twilio_sid: "",
    twilio_token: "",
    twilio_phone: "",
    lan_sync_enabled: false,
    lan_server_port: 8765,
    dark_mode: true,
    language: "en",
    whatsapp_enabled: false,
    whatsapp_api_url: "",
    offline_mode: false,
    logo_url: "",
    primary_color: "#F5C842",
    secondary_color: "#1E1E26",
    accent_color: "#2ECC71",
    footer_text: "Powered by POS Billing",
    contact_email: "",
    contact_website: "",
  };
}

function seedProducts(): Product[] {
  return [
    { id: "p1", name: "Coffee", price: 120, category: "Beverages", stock: 100, barcode: "001", tax: 5 },
    { id: "p2", name: "Tea", price: 60, category: "Beverages", stock: 150, barcode: "002", tax: 5 },
    { id: "p3", name: "Sandwich", price: 180, category: "Food", stock: 50, barcode: "003", tax: 12 },
    { id: "p4", name: "Burger", price: 250, category: "Food", stock: 40, barcode: "004", tax: 12 },
    { id: "p5", name: "Chips", price: 40, category: "Snacks", stock: 200, barcode: "005", tax: 18 },
    { id: "p6", name: "Juice", price: 90, category: "Beverages", stock: 80, barcode: "006", tax: 5 },
    { id: "p7", name: "Cake Slice", price: 150, category: "Bakery", stock: 30, barcode: "007", tax: 18 },
    { id: "p8", name: "Pasta", price: 220, category: "Food", stock: 45, barcode: "008", tax: 12 },
    { id: "p9", name: "Lemonade", price: 80, category: "Beverages", stock: 60, barcode: "009", tax: 5 },
    { id: "p10", name: "Cookies", price: 70, category: "Bakery", stock: 120, barcode: "010", tax: 18 },
    { id: "p11", name: "Pizza Slice", price: 200, category: "Food", stock: 35, barcode: "011", tax: 12 },
    { id: "p12", name: "Water", price: 20, category: "Beverages", stock: 300, barcode: "012", tax: 0 },
  ];
}

async function browserFallback<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // Simulate async
  await new Promise((r) => setTimeout(r, 0));

  switch (cmd) {
    case "get_products": {
      const p = lsGet<Product[]>(LS.products);
      if (!p) { lsSet(LS.products, seedProducts()); return seedProducts() as T; }
      return p as T;
    }
    case "upsert_product": {
      const products = lsGet<Product[]>(LS.products) || seedProducts();
      const p = (args as any).product as Product;
      const idx = products.findIndex((x) => x.id === p.id);
      if (idx >= 0) products[idx] = p; else products.push(p);
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "delete_product": {
      const products = (lsGet<Product[]>(LS.products) || []).filter((p) => p.id !== (args as any).id);
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "update_stock": {
      const products = lsGet<Product[]>(LS.products) || [];
      const p = products.find((x) => x.id === (args as any).id);
      if (p) { p.stock = Math.max(0, p.stock + (args as any).delta); lsSet(LS.products, products); }
      return undefined as T;
    }
    case "get_orders":
      return (lsGet<Order[]>(LS.orders) || []) as T;
    case "save_order": {
      const o = (args as any).order as Order;
      const orders = lsGet<Order[]>(LS.orders) || [];
      orders.unshift(o);
      lsSet(LS.orders, orders);
      // deduct stock
      const products = lsGet<Product[]>(LS.products) || [];
      o.items.forEach((item) => {
        const p = products.find((x) => x.id === item.product_id);
        if (p) p.stock = Math.max(0, p.stock - item.quantity);
      });
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "refund_order": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const o = orders.find((x) => x.id === (args as any).id);
      if (o && o.status !== "refunded") {
        o.status = "refunded";
        lsSet(LS.orders, orders);
        const products = lsGet<Product[]>(LS.products) || [];
        o.items.forEach((item) => {
          const p = products.find((x) => x.id === item.product_id);
          if (p) p.stock += item.quantity;
        });
        lsSet(LS.products, products);
      }
      return undefined as T;
    }
    case "get_settings": {
      // Try Tauri first, fallback to localStorage
      try {
        // @ts-ignore
        return await invoke<Settings>("get_settings");
      } catch {
        return (lsGet<Settings>(LS.settings) || defaultSettings()) as T;
      }
    }
    case "save_settings": {
      // Try Tauri first, fallback to localStorage
      try {
        // @ts-ignore
        await invoke("save_settings", { settings: (args as any).settings });
      } catch {
        lsSet(LS.settings, (args as any).settings);
      }
      return undefined as T;
    }
    case "get_daily_summary": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter(
        (o) => o.status === "completed" && new Date(o.created_at).toDateString() === new Date().toDateString()
      );
      const revenue = orders.reduce((s, o) => s + o.total, 0);
      const transactions = orders.length;
      const avg_order = transactions ? revenue / transactions : 0;
      const items_sold = orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);
      return { revenue, transactions, avg_order, items_sold } as T;
    }
    case "get_weekly_revenue": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en", { weekday: "short" });
        const revenue = orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString())
          .reduce((s, o) => s + o.total, 0);
        days.push({ label, revenue });
      }
      return days as T;
    }
    case "get_top_products": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const map: Record<string, { name: string; qty: number; revenue: number }> = {};
      orders.forEach((o) => o.items.forEach((item) => {
        if (!map[item.product_id]) map[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
        map[item.product_id].qty += item.quantity;
        map[item.product_id].revenue += item.price * item.quantity;
      }));
      return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5) as T;
    }
    case "get_low_stock": {
      const products = lsGet<Product[]>(LS.products) || [];
      return products.filter((p) => p.stock <= 10).map((p) => ({ name: p.name, stock: p.stock })) as T;
    }
    case "export_products_csv": {
      const products = lsGet<Product[]>(LS.products) || [];
      const header = "id,name,price,category,stock,barcode,tax\n";
      const rows = products.map((p) => `${p.id},${p.name},${p.price},${p.category},${p.stock},${p.barcode},${p.tax}`).join("\n");
      return (header + rows) as T;
    }
    case "export_orders_csv": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const header = "id,subtotal,tax_amount,discount_amount,total,payment_method,amount_paid,change_amount,customer_name,status,created_at\n";
      const rows = orders.map((o) => `${o.id},${o.subtotal},${o.tax_amount},${o.discount_amount},${o.total},${o.payment_method},${o.amount_paid},${o.change_amount},${o.customer_name},${o.status},${o.created_at}`).join("\n");
      return (header + rows) as T;
    }
    case "import_products_csv": {
      const csv = (args as any).csvData as string;
      const lines = csv.split("\n");
      let imported = 0, errors = 0;
      const products = lsGet<Product[]>(LS.products) || [];
      for (let i = 1; i < lines.length; i++) {
        const fields = lines[i].split(",");
        if (fields.length >= 7) {
          const [id, name, price, category, stock, barcode, tax] = fields;
          products.push({ id, name, price: parseFloat(price), category, stock: parseInt(stock), barcode, tax: parseFloat(tax) });
          imported++;
        } else {
          errors++;
        }
      }
      lsSet(LS.products, products);
      return { imported, errors } as T;
    }
    case "get_sales_report": {
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      const orders = (lsGet<Order[]>(LS.orders) || []).filter(
        (o) => o.status === "completed" && o.created_at >= startDate && o.created_at <= endDate + "T23:59:59"
      );
      const total_revenue = orders.reduce((s, o) => s + o.total, 0);
      const total_orders = orders.length;
      const avg_order = total_orders ? total_revenue / total_orders : 0;
      return { start_date: startDate, end_date: endDate, total_revenue, total_orders, avg_order } as T;
    }
    case "sync_to_neon":
      return { synced: 0, error: "Neon sync only available in Tauri desktop app" } as T;
    case "sync_from_neon":
      return { imported: 0, error: "Neon sync only available in Tauri desktop app" } as T;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

// ─── KDS Functions ───────────────────────────────────────────────────────────
export async function openKdsWindow(): Promise<void> {
  return sql("open_kds_window");
}

export async function getKdsOrders(): Promise<KdsOrder[]> {
  return sql<KdsOrder[]>("get_kds_orders");
}

export async function markKdsItemDone(orderId: string, itemIndex: number): Promise<void> {
  return sql("mark_kds_item_done", { orderId, itemIndex });
}

// ─── Ingredient Functions ───────────────────────────────────────────────────
export async function getIngredients(): Promise<Ingredient[]> {
  return sql<Ingredient[]>("get_ingredients");
}

export async function saveIngredient(ingredient: Ingredient): Promise<void> {
  return sql("save_ingredient", { ingredient });
}

export async function deleteIngredient(id: string): Promise<void> {
  return sql("delete_ingredient", { id });
}

// ─── Recipe Functions ───────────────────────────────────────────────────────
export async function getRecipes(): Promise<Recipe[]> {
  return sql<Recipe[]>("get_recipes");
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  return sql("save_recipe", { recipe });
}

// ─── Supplier Functions ─────────────────────────────────────────────────────
export async function getSuppliers(): Promise<Supplier[]> {
  return sql<Supplier[]>("get_suppliers");
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  return sql("save_supplier", { supplier });
}

export async function deleteSupplier(id: string): Promise<void> {
  return sql("delete_supplier", { id });
}

// ─── Purchase Order Functions ───────────────────────────────────────────────
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return sql<PurchaseOrder[]>("get_purchase_orders");
}

export async function savePurchaseOrder(po: PurchaseOrder): Promise<void> {
  return sql("save_purchase_order", { po });
}

export async function updatePoStatus(id: string, status: string): Promise<void> {
  return sql("update_po_status", { id, status });
}

export async function receivePurchaseOrder(id: string): Promise<void> {
  return sql("receive_purchase_order", { id });
}

// ─── Reservation Functions ─────────────────────────────────────────────────
export async function getReservations(date: string): Promise<Reservation[]> {
  return sql<Reservation[]>("get_reservations", { date });
}

export async function saveReservation(reservation: Reservation): Promise<void> {
  return sql("save_reservation", { reservation });
}

export async function deleteReservation(id: string): Promise<void> {
  return sql("delete_reservation", { id });
}

// ─── SMS Functions ─────────────────────────────────────────────────────────
export async function sendSmsNotification(phone: string, message: string): Promise<void> {
  return sql("send_sms_notification", { phone, message });
}

// ─── LAN Sync Functions ───────────────────────────────────────────────────
export async function startLanServer(port?: number): Promise<string> {
  return sql<string>("start_lan_server", { port });
}

export async function stopLanServer(): Promise<string> {
  return sql<string>("stop_lan_server");
}

export async function getLanServerStatus(): Promise<LanServerStatus> {
  return sql<LanServerStatus>("get_lan_server_status");
}

// ─── Shift Functions ─────────────────────────────────────────────────────────
export async function getShifts(date: string): Promise<Shift[]> {
  return sql<Shift[]>("get_shifts", { date });
}

export async function saveShift(shift: Shift): Promise<void> {
  return sql("save_shift", { shift });
}

export async function deleteShift(id: string): Promise<void> {
  return sql("delete_shift", { id });
}

// ─── Expense Functions ───────────────────────────────────────────────────────
export async function getExpenses(date: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses", { date });
}

export async function getExpensesByRange(startDate: string, endDate: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses_by_range", { startDate, endDate });
}

export async function saveExpense(expense: Expense): Promise<void> {
  return sql("save_expense", { expense });
}

export async function deleteExpense(id: string): Promise<void> {
  return sql("delete_expense", { id });
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  return sql<ExpenseCategory[]>("get_expense_categories");
}

export async function saveExpenseCategory(category: ExpenseCategory): Promise<void> {
  return sql("save_expense_category", { category });
}

// ─── Wallet Functions ───────────────────────────────────────────────────────
export async function getCustomerWallet(customerId: string): Promise<CustomerWallet> {
  return sql<CustomerWallet>("get_customer_wallet", { customerId });
}

export async function addWalletBalance(customerId: string, amount: number, notes: string): Promise<void> {
  return sql("add_wallet_balance", { customerId, amount, notes });
}

export async function deductWalletBalance(customerId: string, amount: number, orderId: string): Promise<void> {
  return sql("deduct_wallet_balance", { customerId, amount, orderId });
}

export async function getWalletTransactions(customerId: string): Promise<WalletTransaction[]> {
  return sql<WalletTransaction[]>("get_wallet_transactions", { customerId });
}

// ─── Coupon Functions ───────────────────────────────────────────────────────
export async function getCoupons(): Promise<Coupon[]> {
  return sql<Coupon[]>("get_coupons");
}

export async function saveCoupon(coupon: Coupon): Promise<void> {
  return sql("save_coupon", { coupon });
}

export async function validateCoupon(code: string, orderAmount: number): Promise<Coupon> {
  return sql<Coupon>("validate_coupon", { code, orderAmount });
}

export async function useCoupon(code: string): Promise<void> {
  return sql("use_coupon", { code });
}

export async function deleteCoupon(id: string): Promise<void> {
  return sql("delete_coupon", { id });
}

// ─── Day End Reconciliation Functions ───────────────────────────────────────
export async function getDayEndReconciliation(date: string): Promise<DayEndReconciliation | null> {
  return sql<DayEndReconciliation | null>("get_day_end_reconciliation", { date });
}

export async function saveDayEndReconciliation(reconciliation: DayEndReconciliation): Promise<void> {
  return sql("save_day_end_reconciliation", { reconciliation });
}

// ─── GST Report Functions ───────────────────────────────────────────────────
export async function getGstr1Report(startDate: string, endDate: string): Promise<GstReport[]> {
  return sql<GstReport[]>("get_gstr1_report", { startDate, endDate });
}

export async function getGstr3bReport(startDate: string, endDate: string): Promise<[number, number, number, number, number, number]> {
  return sql<[number, number, number, number, number, number]>("get_gstr3b_report", { startDate, endDate });
}

// ─── Activity Log Functions ────────────────────────────────────────────────
export async function getActivityLogsDetailed(startDate: string, endDate: string, limit: number): Promise<ActivityLogEntry[]> {
  return sql<ActivityLogEntry[]>("get_activity_logs", { startDate, endDate, limit });
}

// ─── Export Functions ──────────────────────────────────────────────────────
export async function exportToTally(startDate: string, endDate: string): Promise<string> {
  return sql<string>("export_to_tally", { startDate, endDate });
}

export async function exportToQuickbooks(startDate: string, endDate: string): Promise<string> {
  return sql<string>("export_to_quickbooks", { startDate, endDate });
}

export async function createCompressedBackup(): Promise<number[]> {
  return sql<number[]>("create_compressed_backup");
}

// ─── WhatsApp Functions ───────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  return sql("send_whatsapp_message", { phone, message });
}
