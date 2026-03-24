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
  image_url?: string;
  is_combo?: boolean;
  combo_items?: ComboItem[];
  combo_discount?: number;
}

export interface ComboItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  items: ComboItem[];
  combo_price: number;
  discount_amount: number;
  discount_percent: number;
  is_active: boolean;
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
  payment_method: "cash" | "card" | "upi" | "wallet";
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  status: "completed" | "refunded" | "hold" | "cancelled" | "pending" | "processing";
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
  // Multi-tax support
  tax_inclusive: boolean;
  tax_breakdown: string;
  auto_print_kot: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
  country: string;
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

// ─── Combos ──────────────────────────────────────────────────────────────────
export async function dbGetCombos(): Promise<Combo[]> {
  return sql<Combo[]>("get_combos");
}

export async function dbSaveCombo(combo: Combo): Promise<void> {
  return sql("save_combo", { combo });
}

export async function dbDeleteCombo(id: string): Promise<void> {
  return sql("delete_combo", { id });
}

export async function dbToggleCombo(id: string, isActive: boolean): Promise<void> {
  return sql("toggle_combo", { id, isActive });
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

export async function getSalesByPaymentMethod(date: string): Promise<{ cash: number; upi: number; card: number }> {
  const result = await sql<[number, number, number]>("get_sales_by_payment_method", { date });
  return { cash: result[0], upi: result[1], card: result[2] };
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

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await sleep(delay * attempt);
      }
    }
  }
  throw lastError;
}

export async function syncToNeon(): Promise<{ synced: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_to_neon"));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Neon sync failed after retries:", errorMsg);
    return { synced: 0, error: `Sync failed: ${errorMsg}. Please check your connection and try again.` };
  }
}

export async function syncFromNeon(): Promise<{ imported: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_from_neon"));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Neon import failed after retries:", errorMsg);
    return { imported: 0, error: `Import failed: ${errorMsg}. Please check your connection and try again.` };
  }
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
    footer_text: "Powered by AppIXEN",
    contact_email: "",
    contact_website: "",
    tax_inclusive: false,
    tax_breakdown: "[]",
    auto_print_kot: false,
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
  // Initialize seed data if not present
  const initSeedData = () => {
    if (!lsGet("pos_initialized")) {
      // Seed products
      if (!lsGet(LS.products)) lsSet(LS.products, seedProducts());
      // Seed customers
      if (!lsGet("pos_customers")) lsSet("pos_customers", [
        { id: "c1", name: "John Smith", phone: "9876543210", loyalty_points: 150, total_spent: 4500, visits: 12 },
        { id: "c2", name: "Sarah Johnson", phone: "9876543211", loyalty_points: 280, total_spent: 8200, visits: 25 },
        { id: "c3", name: "Mike Brown", phone: "9876543212", loyalty_points: 75, total_spent: 2100, visits: 8 },
        { id: "c4", name: "Emily Davis", phone: "9876543213", loyalty_points: 420, total_spent: 12500, visits: 42 },
        { id: "c5", name: "Robert Wilson", phone: "9876543214", loyalty_points: 200, total_spent: 5800, visits: 18 },
      ]);
      // Seed tables
      if (!lsGet("pos_tables")) lsSet("pos_tables", [
        { id: "t1", name: "Table 1", capacity: 4, status: "available", position_x: 0, position_y: 0 },
        { id: "t2", name: "Table 2", capacity: 4, status: "occupied", position_x: 1, position_y: 0 },
        { id: "t3", name: "Table 3", capacity: 6, status: "available", position_x: 2, position_y: 0 },
        { id: "t4", name: "Table 4", capacity: 2, status: "reserved", position_x: 0, position_y: 1 },
        { id: "t5", name: "Table 5", capacity: 8, status: "available", position_x: 1, position_y: 1 },
        { id: "t6", name: "Table 6", capacity: 4, status: "occupied", position_x: 2, position_y: 1 },
        { id: "t7", name: "Table 7", capacity: 6, status: "available", position_x: 0, position_y: 2 },
        { id: "t8", name: "Bar 1", capacity: 2, status: "available", position_x: 1, position_y: 2 },
      ]);
      // Seed suppliers
      if (!lsGet("pos_suppliers")) lsSet("pos_suppliers", [
        { id: "s1", name: "Fresh Foods Co", phone: "9123456789", email: "orders@freshfoods.com", address: "123 Market Road, City" },
        { id: "s2", name: "Beverages Distributors", phone: "9123456790", email: "sales@bevdist.com", address: "456 Supply Lane, City" },
        { id: "s3", name: "Daily Dairy", phone: "9123456791", email: "contact@dailydairy.com", address: "789 Milk Street" },
        { id: "s4", name: "Organic Veggies", phone: "9123456792", email: "orders@organicveggies.com", address: "321 Green Market" },
      ]);
      // Seed ingredients
      if (!lsGet("pos_ingredients")) lsSet("pos_ingredients", [
        { id: "i1", name: "Rice (Basmati)", stock: 50, unit: "kg", reorder_level: 10 },
        { id: "i2", name: "Chicken", stock: 20, unit: "kg", reorder_level: 5 },
        { id: "i3", name: "Vegetables (Mixed)", stock: 30, unit: "kg", reorder_level: 8 },
        { id: "i4", name: "Coffee Beans", stock: 15, unit: "kg", reorder_level: 3 },
        { id: "i5", name: "Milk", stock: 40, unit: "liters", reorder_level: 10 },
        { id: "i6", name: "Bread", stock: 25, unit: "pieces", reorder_level: 10 },
        { id: "i7", name: "Cheese", stock: 8, unit: "kg", reorder_level: 2 },
        { id: "i8", name: "Tomatoes", stock: 12, unit: "kg", reorder_level: 5 },
        { id: "i9", name: "Onions", stock: 18, unit: "kg", reorder_level: 5 },
        { id: "i10", name: "Cooking Oil", stock: 30, unit: "liters", reorder_level: 5 },
      ]);
      // Seed expense categories
      if (!lsGet("pos_expense_categories")) lsSet("pos_expense_categories", [
        { id: "cat1", name: "Rent", icon: "🏠" },
        { id: "cat2", name: "Utilities", icon: "💡" },
        { id: "cat3", name: "Supplies", icon: "📦" },
        { id: "cat4", name: "Salaries", icon: "👥" },
        { id: "cat5", name: "Marketing", icon: "📢" },
        { id: "cat6", name: "Maintenance", icon: "🔧" },
        { id: "cat7", name: "Insurance", icon: "🛡️" },
        { id: "cat8", name: "Other", icon: "📝" },
      ]);
      // Seed expenses
      const today = new Date();
      if (!lsGet("pos_expenses")) lsSet("pos_expenses", [
        { id: "e1", category: "Rent", amount: 15000, description: "Monthly restaurant rent", date: today.toISOString().slice(0, 10), payment_method: "cash", created_at: today.toISOString() },
        { id: "e2", category: "Utilities", amount: 3500, description: "Electricity bill", date: today.toISOString().slice(0, 10), payment_method: "upi", created_at: today.toISOString() },
        { id: "e3", category: "Supplies", amount: 5500, description: "Kitchen supplies", date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), payment_method: "card", created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "e4", category: "Salaries", amount: 45000, description: "Staff salaries", date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), payment_method: "cash", created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "e5", category: "Marketing", amount: 2000, description: "Social media ads", date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), payment_method: "upi", created_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed coupons
      if (!lsGet("pos_coupons")) lsSet("pos_coupons", [
        { id: "cp1", code: "WELCOME10", discount_type: "percentage", discount_value: 10, min_order_amount: 200, max_uses: 100, used_count: 15, valid_from: "2026-01-01", valid_until: "2026-12-31", active: true },
        { id: "cp2", code: "SAVE50", discount_type: "fixed", discount_value: 50, min_order_amount: 500, max_uses: 50, used_count: 8, valid_from: "2026-01-01", valid_until: "2026-06-30", active: true },
        { id: "cp3", code: "FLAT20", discount_type: "percentage", discount_value: 20, min_order_amount: 1000, max_uses: 25, used_count: 3, valid_from: "2026-03-01", valid_until: "2026-03-31", active: true },
        { id: "cp4", code: "OFF100", discount_type: "fixed", discount_value: 100, min_order_amount: 1500, max_uses: 10, used_count: 0, valid_from: "2026-03-01", valid_until: "2026-04-30", active: false },
      ]);
      // Seed reservations
      if (!lsGet("pos_reservations")) lsSet("pos_reservations", [
        { id: "r1", table_id: "t4", customer_name: "David Lee", phone: "9876543215", date: today.toISOString().slice(0, 10), time: "19:00", party_size: 4, status: "confirmed", notes: "Birthday celebration", created_at: today.toISOString() },
        { id: "r2", table_id: "t3", customer_name: "Anna Martinez", phone: "9876543216", date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), time: "12:30", party_size: 6, status: "confirmed", notes: "Business lunch", created_at: today.toISOString() },
        { id: "r3", table_id: "t5", customer_name: "James Chen", phone: "9876543217", date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), time: "20:00", party_size: 8, status: "pending", notes: "Anniversary dinner", created_at: today.toISOString() },
      ]);
      // Seed shifts
      if (!lsGet("pos_shifts")) lsSet("pos_shifts", [
        { id: "sh1", staff_id: "admin", staff_name: "Administrator", date: today.toISOString().slice(0, 10), start_time: "09:00", end_time: "18:00", role: "manager", notes: "Morning shift", created_at: today.toISOString() },
        { id: "sh2", staff_id: "user1", staff_name: "John Doe", date: today.toISOString().slice(0, 10), start_time: "14:00", end_time: "22:00", role: "cashier", notes: "Evening shift", created_at: today.toISOString() },
      ]);
      // Seed wallets
      if (!lsGet("pos_wallets")) lsSet("pos_wallets", {
        "c1": { customer_id: "c1", balance: 500, total_loaded: 1000, total_spent: 500 },
        "c2": { customer_id: "c2", balance: 1200, total_loaded: 2000, total_spent: 800 },
        "c3": { customer_id: "c3", balance: 250, total_loaded: 500, total_spent: 250 },
        "c4": { customer_id: "c4", balance: 800, total_loaded: 1500, total_spent: 700 },
      });
      // Seed wallet transactions
      if (!lsGet("pos_wallet_transactions")) lsSet("pos_wallet_transactions", [
        { id: "wt1", customer_id: "c1", amount: 500, transaction_type: "credit", notes: "Initial load", created_at: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "wt2", customer_id: "c1", amount: 250, transaction_type: "debit", order_id: "old1", notes: "", created_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "wt3", customer_id: "c2", amount: 1000, transaction_type: "credit", notes: "Wallet loaded", created_at: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed activity logs
      if (!lsGet("pos_activity_logs")) lsSet("pos_activity_logs", [
        { id: "log1", action: "Order completed", entity_type: "order", entity_id: "ord1", previous_value: "", new_value: "completed", reason: "Payment received", user_id: "admin", user_name: "Administrator", created_at: new Date(today.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "log2", action: "Product added", entity_type: "product", entity_id: "p1", previous_value: "", new_value: "Coffee", reason: "New product", user_id: "admin", user_name: "Administrator", created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "log3", action: "Stock updated", entity_type: "product", entity_id: "p2", previous_value: "50", new_value: "45", reason: "Sale", user_id: "user1", user_name: "John Doe", created_at: new Date(today.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "log4", action: "Settings changed", entity_type: "settings", entity_id: "settings", previous_value: "", new_value: "tax_rate=18", reason: "Tax rate update", user_id: "admin", user_name: "Administrator", created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed refund requests
      if (!lsGet("pos_refund_requests")) lsSet("pos_refund_requests", [
        { id: "ref1", order_id: "old_ord1", amount: 250, reason: "Wrong item delivered", status: "approved", created_at: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "ref2", order_id: "old_ord2", amount: 450, reason: "Customer dissatisfaction", status: "pending", created_at: new Date(today.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed inventory alerts
      if (!lsGet("pos_inventory_alerts")) lsSet("pos_inventory_alerts", [
        { id: "alert1", product_id: "p1", product_name: "Coffee", current_stock: 5, threshold: 10, alert_type: "low_stock", created_at: new Date(today.getTime() - 0.25 * 24 * 60 * 60 * 1000).toISOString() },
        { id: "alert2", product_id: "p4", product_name: "Burger", current_stock: 0, threshold: 5, alert_type: "out_of_stock", created_at: new Date(today.getTime() - 0.1 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed purchase orders
      if (!lsGet("pos_purchase_orders")) lsSet("pos_purchase_orders", [
        { id: "po1", supplier_id: "s1", items: [{ ingredient_id: "i1", ingredient_name: "Rice (Basmati)", quantity: 25, unit_cost: 45, total: 1125 }], expected_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), status: "pending", created_at: today.toISOString() },
        { id: "po2", supplier_id: "s3", items: [{ ingredient_id: "i5", ingredient_name: "Milk", quantity: 50, unit_cost: 30, total: 1500 }], expected_date: today.toISOString().slice(0, 10), status: "received", created_at: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      // Seed tax rates
      if (!lsGet("pos_tax_rates")) lsSet("pos_tax_rates", [
        { id: "tax_us_sales", name: "US Sales Tax", rate: 8.25, is_default: false, country: "US" },
        { id: "tax_uk_vat", name: "UK VAT", rate: 20.0, is_default: false, country: "GB" },
        { id: "tax_in_gst", name: "India GST", rate: 18.0, is_default: true, country: "IN" },
        { id: "tax_au_gst", name: "Australia GST", rate: 10.0, is_default: false, country: "AU" },
        { id: "tax_ca_gst", name: "Canada GST", rate: 5.0, is_default: false, country: "CA" },
        { id: "tax_de_vat", name: "Germany VAT", rate: 19.0, is_default: false, country: "DE" },
      ]);
      // Seed day end reconciliations
      if (!lsGet("pos_day_end")) lsSet("pos_day_end", [
        { id: "de1", date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), opening_cash: 5000, expected_cash: 8500, actual_cash: 8200, difference: -300, cash_sales: 8500, upi_sales: 12000, card_sales: 5000, total_expenses: 2500, notes: "Short by 300 - investigation needed", created_by: "admin", created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
      lsSet("pos_initialized", true);
    }
  };
  initSeedData();

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
    case "get_orders": {
      let orders = lsGet<Order[]>(LS.orders);
      if (!orders || orders.length === 0) {
        // Seed sample orders for demo
        const today = new Date();
        orders = [
          { id: "ord1", items: [{ product_id: "p1", product_name: "Coffee", price: 120, quantity: 3, discount: 0, tax: 5 }, { product_id: "p3", product_name: "Sandwich", price: 180, quantity: 2, discount: 0, tax: 12 }], subtotal: 660, tax_amount: 67, discount_amount: 0, total: 727, payment_method: "cash", amount_paid: 727, change_amount: 0, customer_name: "John Smith", status: "completed", order_type: "dine_in", delivery_status: "pending", delivery_address: "", delivery_phone: "", created_at: new Date(today.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "ord2", items: [{ product_id: "p4", product_name: "Burger", price: 250, quantity: 2, discount: 0, tax: 12 }, { product_id: "p6", product_name: "Juice", price: 90, quantity: 2, discount: 0, tax: 5 }], subtotal: 680, tax_amount: 58, discount_amount: 0, total: 738, payment_method: "upi", amount_paid: 738, change_amount: 0, customer_name: "Sarah Johnson", status: "completed", order_type: "takeaway", delivery_status: "pending", delivery_address: "", delivery_phone: "", created_at: new Date(today.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "ord3", items: [{ product_id: "p2", product_name: "Tea", price: 60, quantity: 5, discount: 0, tax: 5 }], subtotal: 300, tax_amount: 15, discount_amount: 0, total: 315, payment_method: "cash", amount_paid: 315, change_amount: 0, customer_name: "Mike Brown", status: "completed", order_type: "dine_in", delivery_status: "pending", delivery_address: "", delivery_phone: "", created_at: new Date(today.getTime() - 0 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "ord4", items: [{ product_id: "p8", product_name: "Pasta", price: 220, quantity: 3, discount: 20, tax: 12 }, { product_id: "p7", product_name: "Cake Slice", price: 150, quantity: 2, discount: 0, tax: 18 }], subtotal: 990, tax_amount: 98, discount_amount: 20, total: 1068, payment_method: "card", amount_paid: 1068, change_amount: 0, customer_name: "John Smith", status: "completed", order_type: "delivery", delivery_status: "delivered", delivery_address: "123 Main St", delivery_phone: "9876543210", created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
          { id: "ord5", items: [{ product_id: "p11", product_name: "Pizza Slice", price: 200, quantity: 4, discount: 0, tax: 12 }], subtotal: 800, tax_amount: 96, discount_amount: 0, total: 896, payment_method: "upi", amount_paid: 896, change_amount: 0, customer_name: "", status: "completed", order_type: "dine_in", delivery_status: "pending", delivery_address: "", delivery_phone: "", created_at: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        ];
        lsSet(LS.orders, orders);
      }
      return orders as T;
    }
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
    case "get_combos": {
      const combos = lsGet<Combo[]>("pos_combos") || [];
      return combos as T;
    }
    case "save_combo": {
      const combos = lsGet<Combo[]>("pos_combos") || [];
      const combo = (args as any).combo as Combo;
      const idx = combos.findIndex((x) => x.id === combo.id);
      if (idx >= 0) combos[idx] = combo; else combos.push(combo);
      lsSet("pos_combos", combos);
      return undefined as T;
    }
    case "delete_combo": {
      const combos = (lsGet<Combo[]>("pos_combos") || []).filter((c) => c.id !== (args as any).id);
      lsSet("pos_combos", combos);
      return undefined as T;
    }
    case "toggle_combo": {
      const combos = lsGet<Combo[]>("pos_combos") || [];
      const combo = combos.find((c) => c.id === (args as any).id);
      if (combo) { combo.is_active = (args as any).isActive; lsSet("pos_combos", combos); }
      return undefined as T;
    }
    case "get_tables": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      return tables as T;
    }
    case "save_table": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      const t = (args as any).table as Table;
      const idx = tables.findIndex((x) => x.id === t.id);
      if (idx >= 0) tables[idx] = t; else tables.push(t);
      lsSet("pos_tables", tables);
      return undefined as T;
    }
    case "delete_table": {
      const tables = (lsGet<Table[]>("pos_tables") || []).filter((t) => t.id !== (args as any).id);
      lsSet("pos_tables", tables);
      return undefined as T;
    }
    case "update_table_status": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      const t = tables.find((t) => t.id === (args as any).id);
      if (t) { t.status = (args as any).status; lsSet("pos_tables", tables); }
      return undefined as T;
    }
    case "get_customers": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      return customers as T;
    }
    case "save_customer": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = (args as any).customer as Customer;
      const idx = customers.findIndex((x) => x.id === c.id);
      if (idx >= 0) customers[idx] = c; else customers.push(c);
      lsSet("pos_customers", customers);
      return undefined as T;
    }
    case "get_customer_by_phone": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const customer = customers.find((c) => c.phone === (args as any).phone);
      return (customer || null) as T;
    }
    case "add_loyalty_points": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = customers.find((c) => c.id === (args as any).customerId);
      if (c) { c.loyalty_points += (args as any).points; c.total_spent += (args as any).spent; c.visits += 1; lsSet("pos_customers", customers); }
      return undefined as T;
    }
    case "get_customer_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const phone = (args as any).phone as string;
      const customer = (lsGet<Customer[]>("pos_customers") || []).find((c) => c.phone === phone);
      if (!customer) return [] as T;
      return orders.filter((o) => o.customer_name === customer.name).slice(0, 50) as T;
    }
    case "clock_in": {
      const attendance = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const now = new Date().toISOString();
      const date = now.slice(0, 10);
      attendance.push({ id: crypto.randomUUID(), user_id: (args as any).userId, user_name: (args as any).userName, clock_in: now, clock_out: null, date });
      lsSet("pos_attendance", attendance);
      return undefined as T;
    }
    case "clock_out": {
      const attendance = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const userId = (args as any).userId;
      const now = new Date().toISOString();
      const record = attendance.find((a) => a.user_id === userId && !a.clock_out);
      if (record) { record.clock_out = now; lsSet("pos_attendance", attendance); }
      return undefined as T;
    }
    case "get_today_attendance": {
      const attendance = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const today = new Date().toISOString().slice(0, 10);
      return attendance.filter((a) => a.date === today) as T;
    }
    case "is_clocked_in": {
      const attendance = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const userId = (args as any).userId;
      const today = new Date().toISOString().slice(0, 10);
      return attendance.some((a) => a.user_id === userId && a.date === today && !a.clock_out) as T;
    }
    case "get_ingredients": {
      const ingredients = lsGet<Ingredient[]>("pos_ingredients") || [];
      return ingredients as T;
    }
    case "save_ingredient": {
      const ingredients = lsGet<Ingredient[]>("pos_ingredients") || [];
      const i = (args as any).ingredient as Ingredient;
      const idx = ingredients.findIndex((x) => x.id === i.id);
      if (idx >= 0) ingredients[idx] = i; else ingredients.push(i);
      lsSet("pos_ingredients", ingredients);
      return undefined as T;
    }
    case "delete_ingredient": {
      const ingredients = (lsGet<Ingredient[]>("pos_ingredients") || []).filter((i) => i.id !== (args as any).id);
      lsSet("pos_ingredients", ingredients);
      return undefined as T;
    }
    case "get_recipes": {
      const recipes = lsGet<Recipe[]>("pos_recipes") || [];
      return recipes as T;
    }
    case "save_recipe": {
      const recipes = lsGet<Recipe[]>("pos_recipes") || [];
      const r = (args as any).recipe as Recipe;
      const idx = recipes.findIndex((x) => x.id === r.id);
      if (idx >= 0) recipes[idx] = r; else recipes.push(r);
      lsSet("pos_recipes", recipes);
      return undefined as T;
    }
    case "get_suppliers": {
      const suppliers = lsGet<Supplier[]>("pos_suppliers") || [];
      return suppliers as T;
    }
    case "save_supplier": {
      const suppliers = lsGet<Supplier[]>("pos_suppliers") || [];
      const s = (args as any).supplier as Supplier;
      const idx = suppliers.findIndex((x) => x.id === s.id);
      if (idx >= 0) suppliers[idx] = s; else suppliers.push(s);
      lsSet("pos_suppliers", suppliers);
      return undefined as T;
    }
    case "delete_supplier": {
      const suppliers = (lsGet<Supplier[]>("pos_suppliers") || []).filter((s) => s.id !== (args as any).id);
      lsSet("pos_suppliers", suppliers);
      return undefined as T;
    }
    case "get_purchase_orders": {
      const pos = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      return pos as T;
    }
    case "save_purchase_order": {
      const pos = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const po = (args as any).po as PurchaseOrder;
      const idx = pos.findIndex((x) => x.id === po.id);
      if (idx >= 0) pos[idx] = po; else pos.push(po);
      lsSet("pos_purchase_orders", pos);
      return undefined as T;
    }
    case "update_po_status": {
      const pos = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const po = pos.find((p) => p.id === (args as any).id);
      if (po) { po.status = (args as any).status; lsSet("pos_purchase_orders", pos); }
      return undefined as T;
    }
    case "receive_purchase_order": {
      const pos = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const ingredients = lsGet<Ingredient[]>("pos_ingredients") || [];
      const po = pos.find((p) => p.id === (args as any).id);
      if (po) { po.status = "received"; po.items.forEach((item) => { const ing = ingredients.find((i) => i.id === item.ingredient_id); if (ing) ing.stock += item.quantity; }); lsSet("pos_purchase_orders", pos); lsSet("pos_ingredients", ingredients); }
      return undefined as T;
    }
    case "get_reservations": {
      const reservations = lsGet<Reservation[]>("pos_reservations") || [];
      const date = (args as any).date as string;
      return reservations.filter((r) => r.date === date) as T;
    }
    case "save_reservation": {
      const reservations = lsGet<Reservation[]>("pos_reservations") || [];
      const r = (args as any).reservation as Reservation;
      const idx = reservations.findIndex((x) => x.id === r.id);
      if (idx >= 0) reservations[idx] = r; else reservations.push(r);
      lsSet("pos_reservations", reservations);
      return undefined as T;
    }
    case "delete_reservation": {
      const reservations = (lsGet<Reservation[]>("pos_reservations") || []).filter((r) => r.id !== (args as any).id);
      lsSet("pos_reservations", reservations);
      return undefined as T;
    }
    case "get_shifts": {
      const shifts = lsGet<Shift[]>("pos_shifts") || [];
      const date = (args as any).date as string;
      return shifts.filter((s) => s.date === date) as T;
    }
    case "save_shift": {
      const shifts = lsGet<Shift[]>("pos_shifts") || [];
      const s = (args as any).shift as Shift;
      const idx = shifts.findIndex((x) => x.id === s.id);
      if (idx >= 0) shifts[idx] = s; else shifts.push(s);
      lsSet("pos_shifts", shifts);
      return undefined as T;
    }
    case "delete_shift": {
      const shifts = (lsGet<Shift[]>("pos_shifts") || []).filter((s) => s.id !== (args as any).id);
      lsSet("pos_shifts", shifts);
      return undefined as T;
    }
    case "get_expenses": {
      const expenses = lsGet<Expense[]>("pos_expenses") || [];
      const date = (args as any).date as string;
      return expenses.filter((e) => e.date === date) as T;
    }
    case "get_expenses_by_range": {
      const expenses = lsGet<Expense[]>("pos_expenses") || [];
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      return expenses.filter((e) => e.date >= startDate && e.date <= endDate) as T;
    }
    case "save_expense": {
      const expenses = lsGet<Expense[]>("pos_expenses") || [];
      const e = (args as any).expense as Expense;
      const idx = expenses.findIndex((x) => x.id === e.id);
      if (idx >= 0) expenses[idx] = e; else expenses.push(e);
      lsSet("pos_expenses", expenses);
      return undefined as T;
    }
    case "delete_expense": {
      const expenses = (lsGet<Expense[]>("pos_expenses") || []).filter((e) => e.id !== (args as any).id);
      lsSet("pos_expenses", expenses);
      return undefined as T;
    }
    case "get_expense_categories": {
      const categories = lsGet<ExpenseCategory[]>("pos_expense_categories") || [
        { id: "cat1", name: "Rent", icon: "🏠" },
        { id: "cat2", name: "Utilities", icon: "💡" },
        { id: "cat3", name: "Supplies", icon: "📦" },
        { id: "cat4", name: "Salaries", icon: "👥" },
        { id: "cat5", name: "Marketing", icon: "📢" },
        { id: "cat6", name: "Maintenance", icon: "🔧" },
        { id: "cat7", name: "Other", icon: "📝" },
      ];
      lsSet("pos_expense_categories", categories);
      return categories as T;
    }
    case "save_expense_category": {
      const categories = lsGet<ExpenseCategory[]>("pos_expense_categories") || [];
      const c = (args as any).category as ExpenseCategory;
      const idx = categories.findIndex((x) => x.id === c.id);
      if (idx >= 0) categories[idx] = c; else categories.push(c);
      lsSet("pos_expense_categories", categories);
      return undefined as T;
    }
    case "get_customer_wallet": {
      const wallets = lsGet<Record<string, CustomerWallet>>("pos_wallets") || {};
      const customerId = (args as any).customerId as string;
      return (wallets[customerId] || { customer_id: customerId, balance: 0, total_loaded: 0, total_spent: 0 }) as T;
    }
    case "add_wallet_balance": {
      const wallets = lsGet<Record<string, CustomerWallet>>("pos_wallets") || {};
      const transactions = lsGet<WalletTransaction[]>("pos_wallet_transactions") || [];
      const customerId = (args as any).customerId as string;
      const amount = (args as any).amount as number;
      const notes = (args as any).notes as string;
      if (!wallets[customerId]) wallets[customerId] = { customer_id: customerId, balance: 0, total_loaded: 0, total_spent: 0 };
      wallets[customerId].balance += amount;
      wallets[customerId].total_loaded += amount;
      transactions.push({ id: crypto.randomUUID(), customer_id: customerId, amount, transaction_type: "credit", notes, created_at: new Date().toISOString() });
      lsSet("pos_wallets", wallets);
      lsSet("pos_wallet_transactions", transactions);
      return undefined as T;
    }
    case "deduct_wallet_balance": {
      const wallets = lsGet<Record<string, CustomerWallet>>("pos_wallets") || {};
      const transactions = lsGet<WalletTransaction[]>("pos_wallet_transactions") || [];
      const customerId = (args as any).customerId as string;
      const amount = (args as any).amount as number;
      const orderId = (args as any).orderId as string;
      if (wallets[customerId] && wallets[customerId].balance >= amount) {
        wallets[customerId].balance -= amount;
        wallets[customerId].total_spent += amount;
        transactions.push({ id: crypto.randomUUID(), customer_id: customerId, amount, transaction_type: "debit", order_id: orderId, notes: "", created_at: new Date().toISOString() });
        lsSet("pos_wallets", wallets);
        lsSet("pos_wallet_transactions", transactions);
      }
      return undefined as T;
    }
    case "get_wallet_transactions": {
      const transactions = lsGet<WalletTransaction[]>("pos_wallet_transactions") || [];
      const customerId = (args as any).customerId as string;
      return transactions.filter((t) => t.customer_id === customerId).slice(0, 50) as T;
    }
    case "get_coupons": {
      const coupons = lsGet<Coupon[]>("pos_coupons") || [];
      return coupons as T;
    }
    case "save_coupon": {
      const coupons = lsGet<Coupon[]>("pos_coupons") || [];
      const c = (args as any).coupon as Coupon;
      const idx = coupons.findIndex((x) => x.id === c.id);
      if (idx >= 0) coupons[idx] = c; else coupons.push(c);
      lsSet("pos_coupons", coupons);
      return undefined as T;
    }
    case "validate_coupon": {
      const coupons = lsGet<Coupon[]>("pos_coupons") || [];
      const code = (args as any).code as string;
      const orderAmount = (args as any).orderAmount as number;
      const coupon = coupons.find((c) => c.code === code && c.active);
      if (!coupon) throw new Error("Coupon not found");
      const now = new Date().toISOString().slice(0, 10);
      if (now < coupon.valid_from || now > coupon.valid_until) throw new Error("Coupon expired");
      if (coupon.used_count >= coupon.max_uses) throw new Error("Coupon usage limit reached");
      if (orderAmount < coupon.min_order_amount) throw new Error("Minimum order amount not met");
      return coupon as T;
    }
    case "use_coupon": {
      const coupons = lsGet<Coupon[]>("pos_coupons") || [];
      const code = (args as any).code as string;
      const coupon = coupons.find((c) => c.code === code);
      if (coupon) { coupon.used_count += 1; lsSet("pos_coupons", coupons); }
      return undefined as T;
    }
    case "delete_coupon": {
      const coupons = (lsGet<Coupon[]>("pos_coupons") || []).filter((c) => c.id !== (args as any).id);
      lsSet("pos_coupons", coupons);
      return undefined as T;
    }
    case "get_day_end_reconciliation": {
      const reconciliations = lsGet<DayEndReconciliation[]>("pos_day_end") || [];
      const date = (args as any).date as string;
      return reconciliations.find((r) => r.date === date) as T;
    }
    case "save_day_end_reconciliation": {
      const reconciliations = lsGet<DayEndReconciliation[]>("pos_day_end") || [];
      const r = (args as any).reconciliation as DayEndReconciliation;
      const idx = reconciliations.findIndex((x) => x.date === r.date);
      if (idx >= 0) reconciliations[idx] = r; else reconciliations.push(r);
      lsSet("pos_day_end", reconciliations);
      return undefined as T;
    }
    case "get_gstr1_report": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      const filtered = orders.filter((o) => o.created_at.slice(0, 10) >= startDate && o.created_at.slice(0, 10) <= endDate);
      return filtered.map((o) => ({
        invoice_no: o.id,
        date: o.created_at.slice(0, 10),
        customer_name: o.customer_name,
        customer_gstin: null as string | null,
        taxable_value: o.total - o.tax_amount,
        cgst: o.tax_amount / 2,
        sgst: o.tax_amount / 2,
        igst: 0,
        total: o.total,
        place_of_supply: "Local",
      })) as T;
    }
    case "get_gstr3b_report": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      const filtered = orders.filter((o) => o.created_at.slice(0, 10) >= startDate && o.created_at.slice(0, 10) <= endDate);
      const total_taxable = filtered.reduce((sum, o) => sum + (o.total - o.tax_amount), 0);
      const total_cgst = filtered.reduce((sum, o) => sum + (o.tax_amount / 2), 0);
      const total_sgst = total_cgst;
      const total_igst = 0;
      const total_liability = filtered.reduce((sum, o) => sum + o.tax_amount, 0);
      return [total_taxable, total_cgst, total_sgst, total_igst, total_liability, total_liability] as T;
    }
    case "get_activity_logs_range": {
      const logs = lsGet<ActivityLogEntry[]>("pos_activity_logs") || [];
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      const limit = (args as any).limit as number;
      return logs.filter((l) => l.created_at.slice(0, 10) >= startDate && l.created_at.slice(0, 10) <= endDate).slice(0, limit) as T;
    }
    case "get_kds_orders": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => (o.status === "completed" || o.status === "processing") && o.order_type !== "takeaway");
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      return orders.filter((o) => o.created_at > twoHoursAgo).slice(0, 50).map((o) => ({ id: o.id, items: o.items.map((i) => ({ product_name: i.product_name, quantity: i.quantity, done: false })), order_type: o.order_type, customer_name: o.customer_name, created_at: o.created_at })) as T;
    }
    case "mark_kds_item_done": return undefined as T;
    case "get_inventory_alerts": {
      const alerts = lsGet<InventoryAlert[]>("pos_inventory_alerts") || [];
      return alerts as T;
    }
    case "check_inventory_alerts": {
      const products = lsGet<Product[]>(LS.products) || [];
      const alerts: InventoryAlert[] = [];
      products.filter((p) => p.stock <= 10).forEach((p) => {
        alerts.push({ id: crypto.randomUUID(), product_id: p.id, product_name: p.name, current_stock: p.stock, threshold: p.stock === 0 ? 0 : 10, alert_type: p.stock === 0 ? "out_of_stock" : "low_stock", created_at: new Date().toISOString() });
      });
      return alerts as T;
    }
    case "create_inventory_alert": {
      const alerts = lsGet<InventoryAlert[]>("pos_inventory_alerts") || [];
      const alert = (args as any).alert as InventoryAlert;
      alerts.push(alert);
      lsSet("pos_inventory_alerts", alerts);
      return undefined as T;
    }
    case "clear_inventory_alert": {
      const alerts = (lsGet<InventoryAlert[]>("pos_inventory_alerts") || []).filter((a) => a.id !== (args as any).id);
      lsSet("pos_inventory_alerts", alerts);
      return undefined as T;
    }
    case "get_held_orders": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "hold");
      return orders as T;
    }
    case "hold_order": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const order = (args as any).order as Order;
      order.status = "hold";
      orders.unshift(order);
      lsSet(LS.orders, orders);
      return undefined as T;
    }
    case "cancel_order": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const o = orders.find((x) => x.id === (args as any).id);
      if (o) { o.status = "cancelled"; lsSet(LS.orders, orders); }
      return undefined as T;
    }
    case "get_refund_requests": {
      const refunds = lsGet<RefundRequest[]>("pos_refund_requests") || [];
      return refunds as T;
    }
    case "create_refund_request": {
      const refunds = lsGet<RefundRequest[]>("pos_refund_requests") || [];
      refunds.unshift({ id: crypto.randomUUID(), order_id: (args as any).orderId, amount: (args as any).amount, reason: (args as any).reason, status: "pending", created_at: new Date().toISOString() });
      lsSet("pos_refund_requests", refunds);
      return crypto.randomUUID() as T;
    }
    case "approve_refund": {
      const refunds = lsGet<RefundRequest[]>("pos_refund_requests") || [];
      const r = refunds.find((x) => x.id === (args as any).id);
      if (r) { r.status = "approved"; lsSet("pos_refund_requests", refunds); }
      const orders = lsGet<Order[]>(LS.orders) || [];
      const o = orders.find((x) => x.id === r?.order_id);
      if (o && o.status !== "refunded") {
        o.status = "refunded";
        const products = lsGet<Product[]>(LS.products) || [];
        o.items.forEach((item) => { const p = products.find((x) => x.id === item.product_id); if (p) p.stock += item.quantity; });
        lsSet(LS.orders, orders);
        lsSet(LS.products, products);
      }
      return undefined as T;
    }
    case "reject_refund": {
      const refunds = lsGet<RefundRequest[]>("pos_refund_requests") || [];
      const r = refunds.find((x) => x.id === (args as any).id);
      if (r) { r.status = "rejected"; lsSet("pos_refund_requests", refunds); }
      return undefined as T;
    }
    case "get_hourly_sales": {
      const date = (args as any).date as string;
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed" && o.created_at.slice(0, 10) === date);
      const results: HourlySales[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourOrders = orders.filter((o) => new Date(o.created_at).getHours() === hour);
        results.push({ hour, revenue: hourOrders.reduce((sum, o) => sum + o.total, 0), orders: hourOrders.length });
      }
      return results as T;
    }
    case "get_staff_performance": {
      return [] as T;
    }
    case "get_sales_by_item": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const map: Record<string, SalesByItem> = {};
      orders.forEach((o) => o.items.forEach((item) => {
        if (!map[item.product_id]) map[item.product_id] = { product_id: item.product_id, product_name: item.product_name, quantity: 0, revenue: 0 };
        map[item.product_id].quantity += item.quantity;
        map[item.product_id].revenue += item.price * item.quantity;
      }));
      return Object.values(map).sort((a, b) => b.revenue - a.revenue) as T;
    }
    case "add_order_note": {
      const notes = lsGet<OrderNote[]>("pos_order_notes") || [];
      notes.push({ id: crypto.randomUUID(), order_id: (args as any).orderId, note: (args as any).note, created_at: new Date().toISOString() });
      lsSet("pos_order_notes", notes);
      return undefined as T;
    }
    case "get_order_notes": {
      const notes = lsGet<OrderNote[]>("pos_order_notes") || [];
      return notes.filter((n) => n.order_id === (args as any).orderId) as T;
    }
    case "get_pending_orders_count": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      return orders.filter((o) => o.status === "hold" || o.status === "pending").length as T;
    }
    case "get_pending_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      return orders.filter((o) => o.status === "hold" || o.status === "pending") as T;
    }
    case "delete_pending_order": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.id !== (args as any).id);
      lsSet(LS.orders, orders);
      return undefined as T;
    }
    case "get_users": {
      return [{ id: "admin", name: "Administrator", role: "admin" }, { id: "cashier", name: "Cashier", role: "cashier" }] as T;
    }
    case "verify_pin": {
      const pin = args as unknown as string;
      if (pin === "1234") return { id: "admin", name: "Administrator", role: "admin" } as T;
      if (pin === "0000") return { id: "cashier", name: "Cashier", role: "cashier" } as T;
      return null as T;
    }
    case "change_pin": return undefined as T;
    case "get_activity_logs": {
      const logs = lsGet<ActivityLogEntry[]>("pos_activity_logs") || [];
      return logs.slice(0, (args as any).limit || 100) as T;
    }
    case "get_daily_summary": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed" && new Date(o.created_at).toDateString() === new Date().toDateString());
      const revenue = orders.reduce((sum, o) => sum + o.total, 0);
      const transactions = orders.length;
      const avg_order = transactions ? revenue / transactions : 0;
      const items_sold = orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.quantity, 0), 0);
      return { revenue, transactions, avg_order, items_sold } as T;
    }
    case "get_weekly_revenue": {
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed");
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en", { weekday: "short" });
        const revenue = orders.filter((o) => new Date(o.created_at).toDateString() === d.toDateString()).reduce((sum, o) => sum + o.total, 0);
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
    case "get_sales_by_payment_method": {
      const date = (args as any).date as string;
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed" && o.created_at.slice(0, 10) === date);
      let cash = 0, upi = 0, card = 0;
      orders.forEach((o) => {
        if (o.payment_method === "cash") cash += o.total;
        else if (o.payment_method === "upi") upi += o.total;
        else if (o.payment_method === "card") card += o.total;
      });
      return [cash, upi, card] as T;
    }
    case "get_sales_report": {
      const startDate = (args as any).startDate as string;
      const endDate = (args as any).endDate as string;
      const orders = (lsGet<Order[]>(LS.orders) || []).filter((o) => o.status === "completed" && o.created_at.slice(0, 10) >= startDate && o.created_at.slice(0, 10) <= endDate);
      const total_revenue = orders.reduce((sum, o) => sum + o.total, 0);
      const total_orders = orders.length;
      const avg_order = total_orders ? total_revenue / total_orders : 0;
      return { start_date: startDate, end_date: endDate, total_revenue, total_orders, avg_order } as T;
    }
    case "export_backup": {
      const products = lsGet<Product[]>(LS.products) || [];
      const orders = lsGet<Order[]>(LS.orders) || [];
      const settings = lsGet<Settings>(LS.settings) || defaultSettings();
      return JSON.stringify({ products, orders, settings, exported_at: new Date().toISOString() }) as T;
    }
    case "export_to_tally": return "<ENVELOPE></ENVELOPE>" as T;
    case "export_to_quickbooks": return "{}" as T;
    case "create_compressed_backup": return [] as T;
    case "get_tax_rates": {
      const rates = lsGet<TaxRate[]>("pos_tax_rates") || [
        // Americas
        { id: "tax_us_sales", name: "US Sales Tax (Average)", rate: 8.25, is_default: true, country: "US" },
        { id: "tax_us_ca", name: "US - California", rate: 7.25, is_default: false, country: "US" },
        { id: "tax_us_ny", name: "US - New York", rate: 8.0, is_default: false, country: "US" },
        { id: "tax_us_tx", name: "US - Texas", rate: 6.25, is_default: false, country: "US" },
        { id: "tax_us_fl", name: "US - Florida", rate: 6.0, is_default: false, country: "US" },
        { id: "tax_ca_gst", name: "Canada GST", rate: 5.0, is_default: false, country: "CA" },
        { id: "tax_ca_hst", name: "Canada HST (Ontario)", rate: 13.0, is_default: false, country: "CA" },
        { id: "tax_ca_pst", name: "Canada PST (BC)", rate: 12.0, is_default: false, country: "CA" },
        { id: "tax_mx_iva", name: "Mexico IVA", rate: 16.0, is_default: false, country: "MX" },
        { id: "tax_br_icms", name: "Brazil ICMS", rate: 18.0, is_default: false, country: "BR" },
        // Europe
        { id: "tax_uk_vat", name: "UK VAT", rate: 20.0, is_default: false, country: "GB" },
        { id: "tax_de_vat", name: "Germany VAT", rate: 19.0, is_default: false, country: "DE" },
        { id: "tax_fr_vat", name: "France VAT", rate: 20.0, is_default: false, country: "FR" },
        { id: "tax_it_vat", name: "Italy VAT", rate: 22.0, is_default: false, country: "IT" },
        { id: "tax_es_vat", name: "Spain VAT", rate: 21.0, is_default: false, country: "ES" },
        { id: "tax_nl_vat", name: "Netherlands VAT", rate: 21.0, is_default: false, country: "NL" },
        { id: "tax_be_vat", name: "Belgium VAT", rate: 21.0, is_default: false, country: "BE" },
        { id: "tax_pl_vat", name: "Poland VAT", rate: 23.0, is_default: false, country: "PL" },
        { id: "tax_se_vat", name: "Sweden VAT", rate: 25.0, is_default: false, country: "SE" },
        // Asia Pacific
        { id: "tax_in_gst", name: "India GST (Standard)", rate: 18.0, is_default: false, country: "IN" },
        { id: "tax_in_cgst", name: "India GST (CGST+SGST)", rate: 18.0, is_default: false, country: "IN" },
        { id: "tax_au_gst", name: "Australia GST", rate: 10.0, is_default: false, country: "AU" },
        { id: "tax_nz_gst", name: "New Zealand GST", rate: 15.0, is_default: false, country: "NZ" },
        { id: "tax_sg_gst", name: "Singapore GST", rate: 9.0, is_default: false, country: "SG" },
        { id: "tax_jp_consump", name: "Japan Consumption Tax", rate: 10.0, is_default: false, country: "JP" },
        { id: "tax_kr_vat", name: "Korea VAT", rate: 10.0, is_default: false, country: "KR" },
        { id: "tax_my_sst", name: "Malaysia SST", rate: 6.0, is_default: false, country: "MY" },
        { id: "tax_th_vat", name: "Thailand VAT", rate: 7.0, is_default: false, country: "TH" },
        { id: "tax_ph_vat", name: "Philippines VAT", rate: 12.0, is_default: false, country: "PH" },
        { id: "tax_id_vat", name: "Indonesia VAT", rate: 11.0, is_default: false, country: "ID" },
        { id: "tax_vn_vat", name: "Vietnam VAT", rate: 10.0, is_default: false, country: "VN" },
        // Middle East
        { id: "tax_ae_vat", name: "UAE VAT", rate: 5.0, is_default: false, country: "AE" },
        { id: "tax_sa_vat", name: "Saudi Arabia VAT", rate: 15.0, is_default: false, country: "SA" },
        { id: "tax_il_vat", name: "Israel VAT", rate: 17.0, is_default: false, country: "IL" },
        { id: "tax_eg_vat", name: "Egypt VAT", rate: 14.0, is_default: false, country: "EG" },
        // Africa
        { id: "tax_za_vat", name: "South Africa VAT", rate: 15.0, is_default: false, country: "ZA" },
        { id: "tax_ng_vat", name: "Nigeria VAT", rate: 7.5, is_default: false, country: "NG" },
        { id: "tax_ke_vat", name: "Kenya VAT", rate: 16.0, is_default: false, country: "KE" },
      ];
      return rates as T;
    }
    case "save_tax_rate": {
      const rates = lsGet<TaxRate[]>("pos_tax_rates") || [];
      const t = (args as any).taxRate as TaxRate;
      if (t.is_default) rates.forEach(r => r.is_default = false);
      const idx = rates.findIndex((x) => x.id === t.id);
      if (idx >= 0) rates[idx] = t; else rates.push(t);
      lsSet("pos_tax_rates", rates);
      return undefined as T;
    }
    case "delete_tax_rate": {
      const rates = (lsGet<TaxRate[]>("pos_tax_rates") || []).filter((t) => t.id !== (args as any).id);
      lsSet("pos_tax_rates", rates);
      return undefined as T;
    }
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
  return sql<ActivityLogEntry[]>("get_activity_logs_range", { startDate, endDate, limit });
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
