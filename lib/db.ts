// lib/db.ts
// SQLite via Tauri invoke commands (Rust backend)
// Falls back to localStorage when running in browser (dev mode)

import { invoke } from "@tauri-apps/api/tauri";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Multi-Store Types ────────────────────────────────────────────────────────
export interface Store {
  id: string;
  name: string;
  industry: "food" | "retail" | "pharmacy" | "gift_shop" | "salon_spa" | "repair_shop";
  is_active: boolean;
  created_at: string;
}

export interface StoreConfig {
  store_id: string;
  settings: string; // JSON string
}

// ─── Data Types ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  store_id: string;
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
  metadata?: any;
}

export interface ComboItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Combo {
  id: string;
  store_id: string;
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
  done?: boolean;
  status?: "pending" | "preparing" | "done" | "cancelled";
  started_at?: string;
  done_at?: string;
  metadata?: any;
}

export interface Order {
  id: string;
  store_id: string;
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
  source_type?: string;
  source_id?: string;
}

export interface Table {
  id: string;
  store_id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  position_x: number;
  position_y: number;
}

export interface StaffAttendance {
  id: string;
  store_id: string;
  user_id: string;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
}

export interface Customer {
  id: string;
  store_id: string;
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
  store_id: string;
  order_id: string;
  note: string;
  created_at: string;
}

export interface InventoryAlert {
  id: string;
  store_id: string;
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
  store_id: string;
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
  upi_id: string;
  // Receipt customization
  show_logo_on_receipt: boolean;
  receipt_header_text: string;
  merchant_id: string;
  show_tax_breakdown: boolean;
}

export interface TaxRate {
  id: string;
  store_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  country: string;
}

export interface Ingredient {
  id: string;
  store_id: string;
  name: string;
  stock: number;
  unit: string;
  reorder_level: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  store_id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
}

export interface Supplier {
  id: string;
  store_id: string;
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
  store_id: string;
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
  store_id: string;
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
  status: "pending" | "preparing" | "done" | "cancelled";
  started_at?: string;
  done_at?: string;
}

export interface LanServerStatus {
  running: boolean;
  port: number;
  connected_clients: number;
}

export interface Shift {
  id: string;
  store_id: string;
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
  store_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  payment_method: string;
  created_at?: string;
}

export interface ExpenseCategory {
  id: string;
  store_id: string;
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
  store_id: string;
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
  store_id: string;
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
  store_id: string;
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

// ─── Stores ───────────────────────────────────────────────────────────────────
export async function dbGetStores(): Promise<Store[]> {
  return sql<Store[]>("get_stores");
}

export async function dbUpsertStore(store: Store): Promise<void> {
  return sql("upsert_store", { store });
}

export async function dbDeleteStore(id: string): Promise<void> {
  return sql("delete_store", { id });
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function dbGetProducts(store_id: string): Promise<Product[]> {
  return sql<Product[]>("get_products", { store_id });
}

export async function dbSaveProduct(product: Product, store_id: string): Promise<void> {
  return sql("upsert_product", { product, store_id });
}

export async function dbDeleteProduct(id: string, store_id: string): Promise<void> {
  return sql("delete_product", { id, store_id });
}

export async function dbUpdateStock(id: string, delta: number, store_id: string): Promise<void> {
  return sql("update_stock", { id, delta, store_id });
}

export async function dbTransferStock(id: string, from_store: string, to_store: string, qty: number): Promise<void> {
  return sql("transfer_stock", { id, from_store, to_store, qty });
}

// ─── Combos ──────────────────────────────────────────────────────────────────
export async function dbGetCombos(store_id: string): Promise<Combo[]> {
  return sql<Combo[]>("get_combos", { store_id });
}

export async function dbSaveCombo(combo: Combo, store_id: string): Promise<void> {
  return sql("save_combo", { combo, store_id });
}

export async function dbDeleteCombo(id: string, store_id: string): Promise<void> {
  return sql("delete_combo", { id, store_id });
}

export async function dbToggleCombo(id: string, isActive: boolean, store_id: string): Promise<void> {
  return sql("toggle_combo", { id, isActive, store_id });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function dbGetOrders(store_id: string): Promise<Order[]> {
  return sql<Order[]>("get_orders", { store_id });
}

export async function dbSaveOrder(order: Order, store_id: string): Promise<void> {
  return sql("save_order", { order, store_id });
}

export async function dbRefundOrder(id: string, store_id: string, userId: string = "system", userName: string = "System"): Promise<void> {
  return sql("refund_order", { id, store_id, userId, userName });
}

export async function updateDeliveryStatus(id: string, status: string, store_id: string): Promise<void> {
  return sql("update_delivery_status", { id, status, store_id });
}

export async function dbUpdateOrderStatus(id: string, status: string, store_id: string): Promise<void> {
  return sql("update_order_status", { id, status, store_id });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function dbGetSettings(store_id: string): Promise<Settings> {
  return sql<Settings>("get_settings", { store_id });
}

export async function dbSaveSettings(settings: Settings, store_id: string): Promise<void> {
  return sql("save_settings", { settings, store_id });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function dbGetDailySummary(store_id: string) {
  return sql<{
    revenue: number;
    transactions: number;
    avg_order: number;
    items_sold: number;
  }>("get_daily_summary", { store_id });
}

export async function dbGetWeeklyRevenue(store_id: string) {
  return sql<{ label: string; revenue: number }[]>("get_weekly_revenue", { store_id });
}

export async function dbGetTopProducts(store_id: string) {
  return sql<{ name: string; qty: number; revenue: number }[]>("get_top_products", { store_id });
}

export async function dbGetLowStock(store_id: string) {
  return sql<{ name: string; stock: number }[]>("get_low_stock", { store_id });
}

export async function getSalesByPaymentMethod(date: string, store_id: string): Promise<{ cash: number; upi: number; card: number }> {
  const result = await sql<[number, number, number]>("get_sales_by_payment_method", { date, store_id });
  return { cash: result[0], upi: result[1], card: result[2] };
}

// ─── CSV Import/Export ─────────────────────────────────────────────────────
export async function exportProductsCsv(store_id: string): Promise<string> {
  return sql<string>("export_products_csv", { store_id });
}

export async function exportOrdersCsv(store_id: string): Promise<string> {
  return sql<string>("export_orders_csv", { store_id });
}

export async function importProductsCsv(csvData: string, store_id: string): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_products_csv", { csvData, store_id });
}

// ─── Reports ───────────────────────────────────────────────────────────────
export async function getSalesReport(startDate: string, endDate: string, store_id: string) {
  return sql<{
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_orders: number;
    avg_order: number;
  }>("get_sales_report", { startDate, endDate, store_id });
}

// ─── Users ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  role: string;
  store_id?: string;
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
export async function exportBackup(store_id: string): Promise<string> {
  return sql<string>("export_backup", { store_id });
}

export async function importBackup(backupJson: string, store_id: string): Promise<{ products_imported: number; orders_imported: number }> {
  return sql<{ products_imported: number; orders_imported: number }>("import_backup", { backupJson, store_id });
}

// ─── Activity Logs ─────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  store_id: string;
  order_id: string;
  action: string;
  previous_data: string | null;
  new_data: string | null;
  reason: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export async function getActivityLogs(store_id: string, limit: number = 100): Promise<ActivityLog[]> {
  return sql<ActivityLog[]>("get_activity_logs", { store_id, limit });
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export async function dbGetTables(store_id: string): Promise<Table[]> {
  return sql<Table[]>("get_tables", { store_id });
}

export async function dbSaveTable(table: Table, store_id: string): Promise<void> {
  return sql("save_table", { table, store_id });
}

export async function dbDeleteTable(id: string, store_id: string): Promise<void> {
  return sql("delete_table", { id, store_id });
}

export async function dbUpdateTableStatus(id: string, status: string, store_id: string): Promise<void> {
  return sql("update_table_status", { id, status, store_id });
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────
export async function dbClockIn(userId: string, userName: string, store_id: string): Promise<void> {
  return sql("clock_in", { userId, userName, store_id });
}

export async function dbClockOut(userId: string, store_id: string): Promise<void> {
  return sql("clock_out", { userId, store_id });
}

export async function dbGetTodayAttendance(store_id: string): Promise<StaffAttendance[]> {
  return sql<StaffAttendance[]>("get_today_attendance", { store_id });
}

export async function dbIsClockedIn(userId: string, store_id: string): Promise<boolean> {
  return sql<boolean>("is_clocked_in", { userId, store_id });
}

// ─── Customers ──────────────────────────────────────────────────────────────
export async function dbGetCustomers(store_id: string): Promise<Customer[]> {
  return sql<Customer[]>("get_customers", { store_id });
}

export async function dbSaveCustomer(customer: Customer, store_id: string): Promise<void> {
  return sql("save_customer", { customer, store_id });
}

export async function dbGetCustomerByPhone(phone: string, store_id: string): Promise<Customer | null> {
  return sql<Customer | null>("get_customer_by_phone", { phone, store_id });
}

export async function dbAddLoyaltyPoints(customerId: string, points: number, spent: number, store_id: string): Promise<void> {
  return sql("add_loyalty_points", { customerId, points, spent, store_id });
}

export async function dbGetCustomerOrders(phone: string, store_id: string): Promise<Order[]> {
  return sql<Order[]>("get_customer_orders", { phone, store_id });
}

// ─── Order Notes ────────────────────────────────────────────────────────────
export async function dbAddOrderNote(orderId: string, note: string, store_id: string): Promise<void> {
  return sql("add_order_note", { orderId, note, store_id });
}

export async function dbGetOrderNotes(orderId: string, store_id: string): Promise<OrderNote[]> {
  return sql<OrderNote[]>("get_order_notes", { orderId, store_id });
}

// ─── Inventory Alerts ───────────────────────────────────────────────────────
export async function dbGetInventoryAlerts(store_id: string): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("get_inventory_alerts", { store_id });
}

export async function dbCheckInventoryAlerts(store_id: string): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("check_inventory_alerts", { store_id });
}

export async function dbCreateInventoryAlert(alert: InventoryAlert, store_id: string): Promise<void> {
  return sql("create_inventory_alert", { alert, store_id });
}

export async function dbClearInventoryAlert(id: string, store_id: string): Promise<void> {
  return sql("clear_inventory_alert", { id, store_id });
}

// ─── Enhanced Reports ───────────────────────────────────────────────────────
export async function dbGetHourlySales(date: string, store_id: string): Promise<HourlySales[]> {
  return sql<HourlySales[]>("get_hourly_sales", { date, store_id });
}

export async function dbGetStaffPerformance(startDate: string, endDate: string, store_id: string): Promise<StaffPerformance[]> {
  return sql<StaffPerformance[]>("get_staff_performance", { startDate, endDate, store_id });
}

export async function dbGetSalesByItem(startDate: string, endDate: string, store_id: string): Promise<SalesByItem[]> {
  return sql<SalesByItem[]>("get_sales_by_item", { startDate, endDate, store_id });
}

// ─── Hold & Cancel ──────────────────────────────────────────────────────────
export async function dbHoldOrder(order: Order, store_id: string): Promise<void> {
  return sql("hold_order", { order, store_id });
}

export async function dbGetHeldOrders(store_id: string): Promise<Order[]> {
  return sql<Order[]>("get_held_orders", { store_id });
}

export async function dbCancelOrder(id: string, reason: string, userId: string, userName: string, store_id: string): Promise<void> {
  return sql("cancel_order", { id, reason, userId, userName, store_id });
}

// ─── Refunds ───────────────────────────────────────────────────────────────
export async function dbCreateRefundRequest(orderId: string, amount: number, reason: string, store_id: string): Promise<string> {
  return sql<string>("create_refund_request", { orderId, amount, reason, store_id });
}

export async function dbGetRefundRequests(store_id: string): Promise<RefundRequest[]> {
  return sql<RefundRequest[]>("get_refund_requests", { store_id });
}

export async function dbApproveRefund(id: string, userId: string, userName: string, store_id: string): Promise<void> {
  return sql("approve_refund", { id, userId, userName, store_id });
}

export async function dbRejectRefund(id: string, store_id: string): Promise<void> {
  return sql("reject_refund", { id, store_id });
}

// ─── Crash Recovery ─────────────────────────────────────────────────────────
export async function dbGetPendingOrdersCount(store_id: string): Promise<number> {
  return sql<number>("get_pending_orders_count", { store_id });
}

export async function dbGetPendingOrders(store_id: string): Promise<Order[]> {
  return sql<Order[]>("get_pending_orders", { store_id });
}

export async function dbDeletePendingOrder(id: string, store_id: string): Promise<void> {
  return sql("delete_pending_order", { id, store_id });
}

// ─── Hardware Integration ───────────────────────────────────────────────────
export async function printToPrinter(receipt: string, printerName?: string): Promise<void> {
  return sql("print_to_printer", { receipt, printerName });
}

export async function printReceipt(receipt: string): Promise<void> {
  return sql("print_receipt", { receipt });
}

export async function openCashDrawer(): Promise<void> {
  return sql("open_cash_drawer");
}

export async function saveReceiptToFile(receipt: string, fileName: string): Promise<string> {
  return sql<string>("save_receipt_to_file", { receipt, fileName });
}

export async function openWhatsAppShare(receipt: string): Promise<void> {
  return sql("open_whatsapp_share", { receipt });
}

export async function openEmailShare(receipt: string, subject: string): Promise<void> {
  return sql("open_email_share", { receipt, subject });
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

export async function syncToNeon(store_id: string): Promise<{ synced: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_to_neon", { store_id }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Neon sync failed after retries:", errorMsg);
    return { synced: 0, error: `Sync failed: ${errorMsg}. Please check your connection and try again.` };
  }
}

export async function syncFromNeon(store_id: string): Promise<{ imported: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_from_neon", { store_id }));
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
  const c = settings.currency_symbol;
  const isIndia = settings.country === "IN";
  const lines: string[] = [];
  
  // Header
  if (settings.show_logo_on_receipt && settings.logo_url) {
    lines.push(`[LOGO: ${settings.logo_url}]`);
  }
  lines.push(`================================`);
  lines.push(`       ${settings.store_name}`);
  if (settings.address) lines.push(`  ${settings.address}`);
  if (settings.phone) lines.push(`  ${settings.phone}`);
  if (settings.receipt_header_text) lines.push(`  ${settings.receipt_header_text}`);
  if (isIndia && settings.tax_id) lines.push(`  GSTIN: ${settings.tax_id}`);
  lines.push(`================================`);
  
  // Order Info
  lines.push(`Order #: ${order.id.slice(-6).toUpperCase()}`);
  lines.push(`Date:    ${new Date(order.created_at).toLocaleString()}`);
  if (order.customer_name) lines.push(`Customer: ${order.customer_name}`);
  if (order.delivery_phone) lines.push(`Phone:    ${order.delivery_phone}`);
  if (order.table_id) lines.push(`Table:    ${order.table_id}`);
  lines.push(`Type:     ${order.order_type || "dine_in"}`);
  lines.push(`--------------------------------`);
  
  // Items
  lines.push(`ITEMS`);
  lines.push(`--------------------------------`);
  order.items.forEach((i) => {
    const itemTotal = i.price * i.quantity;
    const left = `${i.product_name} x${i.quantity}`;
    const right = `${c}${itemTotal.toFixed(2)}`;
    lines.push(`${left.padEnd(22)}${right.padStart(8)}`);
    if (i.discount > 0) {
      lines.push(`  Discount: -${c}${(itemTotal * i.discount / 100).toFixed(2)}`);
    }
  });
  lines.push(`--------------------------------`);
  
  // Totals
  lines.push(`Subtotal: ${(c + order.subtotal.toFixed(2)).padStart(18)}`);
  
  // Tax breakdown
  if (settings.show_tax_breakdown && order.tax_amount > 0) {
    const taxName = settings.tax_name || "Tax";
    const taxRate = settings.tax_rate || 0;
    lines.push(`${taxName} (${taxRate}%): ${(c + order.tax_amount.toFixed(2)).padStart(13)}`);
  }
  
  if (order.discount_amount > 0) {
    lines.push(`Discount: -${(c + order.discount_amount.toFixed(2)).padStart(16)}`);
  }
  
  lines.push(`================================`);
  lines.push(`TOTAL:    ${(c + order.total.toFixed(2)).padStart(18)}`);
  lines.push(`================================`);
  
  // Payment Details
  lines.push(`PAYMENT`);
  lines.push(`--------------------------------`);
  lines.push(`Method:   ${order.payment_method?.toUpperCase() || "CASH"}`);
  
  if (isIndia) {
    if (order.payment_method === "upi" && settings.upi_id) {
      lines.push(`UPI ID:   ${settings.upi_id}`);
    }
    if (settings.merchant_id) {
      lines.push(`Merchant: ${settings.merchant_id}`);
    }
  }
  
  if (order.payment_method === "cash") {
    lines.push(`Paid:     ${(c + (order.amount_paid || 0).toFixed(2)).padStart(18)}`);
    lines.push(`Change:   ${(c + (order.change_amount || 0).toFixed(2)).padStart(18)}`);
  }
  
  if (order.amount_paid && order.total && order.amount_paid > order.total) {
    lines.push(`Balance:  ${(c + (order.amount_paid - order.total).toFixed(2)).padStart(18)}`);
  }
  
  // Footer
  lines.push(`================================`);
  if (settings.footer_text) {
    lines.push(`   ${settings.footer_text}`);
  } else {
    lines.push(`   Thank you! Visit again`);
  }
  lines.push(`================================`);
  
  return lines.filter(Boolean).join("\n");
}

// ─── Browser Fallback (localStorage) ─────────────────────────────────────────
// Used when running `next dev` without Tauri
const LS = {
  products: "pos_products",
  orders: "pos_orders",
  settings: "pos_settings_v2", // Updated for multi-store
  stores: "pos_stores",
};

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

function defaultSettings(): Settings {
  return {
    store_name: process.env.NEXT_PUBLIC_DEFAULT_STORE_NAME || "My POS Store",
    currency: "USD",
    currency_symbol: "$",
    country: "US",
    timezone: "America/New_York",
    tax_rate: 10,
    tax_name: "Tax",
    tax_system: "none",
    address: "123 Main Street",
    phone: "+1 234 567 8900",
    neon_url: process.env.NEXT_PUBLIC_NEON_URL || "",
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
    whatsapp_api_url: process.env.NEXT_PUBLIC_WHATSAPP_API || "",
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
    upi_id: "",
    show_logo_on_receipt: true,
    receipt_header_text: "",
    merchant_id: "",
    show_tax_breakdown: true,
  };
}

function seedProducts(storeId: string): Product[] {
  return [
    { id: `p1_${storeId}`, store_id: storeId, name: "Coffee", price: 120, category: "Beverages", stock: 100, barcode: "001", tax: 5 },
    { id: `p2_${storeId}`, store_id: storeId, name: "Tea", price: 60, category: "Beverages", stock: 150, barcode: "002", tax: 5 },
    { id: `p3_${storeId}`, store_id: storeId, name: "Sandwich", price: 180, category: "Food", stock: 50, barcode: "003", tax: 12 },
    { id: `p4_${storeId}`, store_id: storeId, name: "Burger", price: 250, category: "Food", stock: 40, barcode: "004", tax: 12 },
  ];
}

async function browserFallback<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const storeId = (args?.storeId as string) || (args?.store_id as string) || process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || "default";

  // Initialize seed data if not present
  const initSeedData = () => {
    if (!lsGet("pos_initialized")) {
      lsSet(LS.stores, [
        { id: "default", name: process.env.NEXT_PUBLIC_DEFAULT_STORE_NAME || "Main Store", industry: (process.env.NEXT_PUBLIC_DEFAULT_INDUSTRY as any) || "food", is_active: true, created_at: new Date().toISOString() },
        { id: "retail1", name: "Fashion Boutique", industry: "retail", is_active: true, created_at: new Date().toISOString() }
      ]);
      lsSet(LS.products, seedProducts("default").concat(seedProducts("retail1")));
      lsSet(LS.settings, { "default": defaultSettings(), "retail1": defaultSettings() });
      lsSet("pos_initialized", true);
    }
  };
  initSeedData();

  // Simulate async
  await new Promise((r) => setTimeout(r, 0));

  switch (cmd) {
    case "get_stores": return (lsGet<Store[]>(LS.stores) || []) as T;
    case "upsert_store": {
        const stores = lsGet<Store[]>(LS.stores) || [];
        const s = (args as any).store as Store;
        const idx = stores.findIndex(x => x.id === s.id);
        if (idx >= 0) stores[idx] = s; else stores.push(s);
        lsSet(LS.stores, stores);
        return undefined as T;
    }
    case "get_products": {
      const p = lsGet<Product[]>(LS.products) || [];
      return p.filter(x => x.store_id === storeId) as T;
    }
    case "upsert_product": {
      const products = lsGet<Product[]>(LS.products) || [];
      const p = (args as any).product as Product;
      p.store_id = storeId;
      // Scoped findIndex
      const idx = products.findIndex((x) => x.id === p.id && x.store_id === storeId);
      if (idx >= 0) products[idx] = p; else products.push(p);
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "transfer_stock": {
      const products = lsGet<Product[]>(LS.products) || [];
      const { id, fromStore, toStore, qty } = args as any;
      const fromIdx = products.findIndex(p => p.id === id && p.store_id === fromStore);
      const toIdx = products.findIndex(p => p.id === id && p.store_id === toStore);
      if (fromIdx >= 0) products[fromIdx].stock -= qty;
      if (toIdx >= 0) products[toIdx].stock += qty;
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "delete_product": {
      const products = (lsGet<Product[]>(LS.products) || []).filter((p) => !(p.id === (args as any).id && p.store_id === storeId));
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "get_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      return orders.filter(o => o.store_id === storeId) as T;
    }
    case "save_order": {
      const o = (args as any).order as Order;
      o.store_id = storeId;
      const orders = lsGet<Order[]>(LS.orders) || [];
      orders.unshift(o);
      lsSet(LS.orders, orders);
      return undefined as T;
    }
    case "get_settings": {
      const allSettings = lsGet<Record<string, Settings>>(LS.settings) || {};
      return (allSettings[storeId] || defaultSettings()) as T;
    }
    case "save_settings": {
      const allSettings = lsGet<Record<string, Settings>>(LS.settings) || {};
      allSettings[storeId] = (args as any).settings as Settings;
      lsSet(LS.settings, allSettings);
      return undefined as T;
    }
    case "get_tables": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      return tables.filter(t => t.store_id === storeId) as T;
    }
    case "verify_pin": {
      const pin = (args as any).pin;
      if (pin === "1234") return { id: "admin", name: "Administrator", role: "admin" } as T;
      if (pin === "0000") return { id: "cashier", name: "Cashier", role: "cashier" } as T;
      return null as T;
    }
    case "get_daily_summary": {
        return { revenue: 0, transactions: 0, avg_order: 0, items_sold: 0 } as T;
    }
    case "get_weekly_revenue": return [] as T;
    case "get_top_products": return [] as T;
    case "get_low_stock": return [] as T;
    case "get_expense_categories": {
      const items = lsGet<ExpenseCategory[]>("pos_expense_categories") || [];
      return items.filter(x => x.store_id === storeId) as T;
    }
    case "update_order_status": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const id = (args as any).id;
      const status = (args as any).status;
      const idx = orders.findIndex(o => o.id === id && o.store_id === storeId);
      if (idx >= 0) orders[idx].status = status;
      lsSet(LS.orders, orders);
      return undefined as T;
    }
    case "get_combos": return [] as T;
    case "get_customers": return [] as T;
    case "get_ingredients": return [] as T;
    case "get_recipes": return [] as T;
    case "get_suppliers": return [] as T;
    case "get_purchase_orders": return [] as T;
    case "get_reservations": return [] as T;
    case "get_shifts": return [] as T;
    case "get_expenses": return [] as T;
    case "get_held_orders": return [] as T;
    case "get_refund_requests": return [] as T;
    case "get_activity_logs": return [] as T;
    case "get_inventory_alerts": return [] as T;
    case "check_inventory_alerts": return [] as T;
    case "get_users": return [
      { id: "admin", name: "Administrator", role: "admin" },
      { id: "cashier", name: "Cashier", role: "cashier" }
    ] as T;
    default:
      console.warn(`Browser fallback: Command ${cmd} not fully implemented for store ${storeId}`);
      return [] as any as T;
  }
}

// ─── KDS Functions ───────────────────────────────────────────────────────────
export async function openKdsWindow(): Promise<void> {
  return sql("open_kds_window");
}

export async function getKdsOrders(store_id: string): Promise<KdsOrder[]> {
  return sql<KdsOrder[]>("get_kds_orders", { store_id });
}

export async function markKdsItemDone(orderId: string, itemIndex: number, store_id: string): Promise<void> {
  return sql("mark_kds_item_done", { order_id: orderId, item_index: itemIndex, store_id });
}

export async function startPreparingItem(orderId: string, itemIndex: number, store_id: string): Promise<void> {
  return sql("start_preparing_item", { order_id: orderId, item_index: itemIndex, store_id });
}

export async function cancelKdsItem(orderId: string, itemIndex: number, store_id: string): Promise<void> {
  return sql("cancel_kds_item", { order_id: orderId, item_index: itemIndex, store_id });
}

export async function recallKdsOrder(orderId: string, store_id: string): Promise<void> {
  return sql("recall_kds_order", { order_id: orderId, store_id });
}

// ─── Ingredient Functions ───────────────────────────────────────────────────
export async function getIngredients(store_id: string): Promise<Ingredient[]> {
  return sql<Ingredient[]>("get_ingredients", { store_id });
}

export async function saveIngredient(ingredient: Ingredient, store_id: string): Promise<void> {
  return sql("save_ingredient", { ingredient, store_id });
}

export async function deleteIngredient(id: string, store_id: string): Promise<void> {
  return sql("delete_ingredient", { id, store_id });
}

// ─── Recipe Functions ───────────────────────────────────────────────────────
export async function getRecipes(store_id: string): Promise<Recipe[]> {
  return sql<Recipe[]>("get_recipes", { store_id });
}

export async function saveRecipe(recipe: Recipe, store_id: string): Promise<void> {
  return sql("save_recipe", { recipe, store_id });
}

// ─── Supplier Functions ─────────────────────────────────────────────────────
export async function getSuppliers(store_id: string): Promise<Supplier[]> {
  return sql<Supplier[]>("get_suppliers", { store_id });
}

export async function saveSupplier(supplier: Supplier, store_id: string): Promise<void> {
  return sql("save_supplier", { supplier, store_id });
}

export async function deleteSupplier(id: string, store_id: string): Promise<void> {
  return sql("delete_supplier", { id, store_id });
}

// ─── Purchase Order Functions ───────────────────────────────────────────────
export async function getPurchaseOrders(store_id: string): Promise<PurchaseOrder[]> {
  return sql<PurchaseOrder[]>("get_purchase_orders", { store_id });
}

export async function savePurchaseOrder(po: PurchaseOrder, store_id: string): Promise<void> {
  return sql("save_purchase_order", { po, store_id });
}

export async function updatePoStatus(id: string, status: string, store_id: string): Promise<void> {
  return sql("update_po_status", { id, status, store_id });
}

export async function receivePurchaseOrder(id: string, store_id: string): Promise<void> {
  return sql("receive_purchase_order", { id, store_id });
}

// ─── Reservation Functions ─────────────────────────────────────────────────
export async function getReservations(date: string, store_id: string): Promise<Reservation[]> {
  return sql<Reservation[]>("get_reservations", { date, store_id });
}

export async function saveReservation(reservation: Reservation, store_id: string): Promise<void> {
  return sql("save_reservation", { reservation, store_id });
}

export async function deleteReservation(id: string, store_id: string): Promise<void> {
  return sql("delete_reservation", { id, store_id });
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
export async function getShifts(date: string, store_id: string): Promise<Shift[]> {
  return sql<Shift[]>("get_shifts", { date, store_id });
}

export async function saveShift(shift: Shift, store_id: string): Promise<void> {
  return sql("save_shift", { shift, store_id });
}

export async function deleteShift(id: string, store_id: string): Promise<void> {
  return sql("delete_shift", { id, store_id });
}

// ─── Expense Functions ───────────────────────────────────────────────────────
export async function getExpenses(date: string, store_id: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses", { date, store_id });
}

export async function getExpensesByRange(startDate: string, endDate: string, store_id: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses_by_range", { startDate, endDate, store_id });
}

export async function saveExpense(expense: Expense, store_id: string): Promise<void> {
  return sql("save_expense", { expense, store_id });
}

export async function deleteExpense(id: string, store_id: string): Promise<void> {
  return sql("delete_expense", { id, store_id });
}

export async function getExpenseCategories(store_id: string): Promise<ExpenseCategory[]> {
  return sql<ExpenseCategory[]>("get_expense_categories", { store_id });
}

export async function saveExpenseCategory(category: ExpenseCategory, store_id: string): Promise<void> {
  return sql("save_expense_category", { category, store_id });
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
export async function getCoupons(store_id: string): Promise<Coupon[]> {
  return sql<Coupon[]>("get_coupons", { store_id });
}

export async function saveCoupon(coupon: Coupon, store_id: string): Promise<void> {
  return sql("save_coupon", { coupon, store_id });
}

export async function validateCoupon(code: string, order_amount: number, store_id: string): Promise<Coupon> {
  return sql<Coupon>("validate_coupon", { code, order_amount, store_id });
}

export async function useCoupon(code: string, store_id: string): Promise<void> {
  return sql("use_coupon", { code, store_id });
}

export async function deleteCoupon(id: string, store_id: string): Promise<void> {
  return sql("delete_coupon", { id, store_id });
}

// ─── Day End Reconciliation Functions ───────────────────────────────────────
export async function getDayEndReconciliation(date: string, store_id: string): Promise<DayEndReconciliation | null> {
  return sql<DayEndReconciliation | null>("get_day_end_reconciliation", { date, store_id });
}

export async function saveDayEndReconciliation(reconciliation: DayEndReconciliation, store_id: string): Promise<void> {
  return sql("save_day_end_reconciliation", { reconciliation, store_id });
}

// ─── GST Report Functions ───────────────────────────────────────────────────
export async function getGstr1Report(startDate: string, endDate: string, store_id: string): Promise<GstReport[]> {
  return sql<GstReport[]>("get_gstr1_report", { startDate, endDate, store_id });
}

export async function getGstr3bReport(startDate: string, endDate: string, store_id: string): Promise<[number, number, number, number, number, number]> {
  return sql<[number, number, number, number, number, number]>("get_gstr3b_report", { startDate, endDate, store_id });
}

// ─── Activity Log Functions ────────────────────────────────────────────────
export async function getActivityLogsDetailed(startDate: string, endDate: string, limit: number, store_id: string): Promise<ActivityLogEntry[]> {
  return sql<ActivityLogEntry[]>("get_activity_logs_range", { startDate, endDate, limit, store_id });
}

// ─── Export Functions ──────────────────────────────────────────────────────
export async function exportToTally(startDate: string, endDate: string, store_id: string): Promise<string> {
  return sql<string>("export_to_tally", { startDate, endDate, store_id });
}

export async function exportToQuickbooks(startDate: string, endDate: string, store_id: string): Promise<string> {
  return sql<string>("export_to_quickbooks", { startDate, endDate, store_id });
}

export async function createCompressedBackup(store_id: string): Promise<number[]> {
  return sql<number[]>("create_compressed_backup", { store_id });
}

// ─── WhatsApp Functions ───────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone: string, message: string, store_id: string): Promise<void> {
  return sql("send_whatsapp_message", { phone, message, store_id });
}
