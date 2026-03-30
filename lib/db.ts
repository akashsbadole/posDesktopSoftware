// lib/db.ts
// SQLite via Tauri invoke commands (Rust backend)
// Falls back to localStorage when running in browser (dev mode)

import { invoke } from "@tauri-apps/api/tauri";
import pako from 'pako';

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

// ─── Seed Function ────────────────────────────────────────────────────────────────
export async function seedDatabase(): Promise<void> {
  return sql("seed_database");
}

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
  cost_price: number;
  wholesale_price: number;
  category: string;
  subcategory: string;
  stock: number;
  barcode: string;
  sku: string;
  description: string;
  tax: number;
  status: "active" | "inactive" | "discontinued";
  tags: string;
  is_digital: boolean;
  is_favorite: boolean;
  created_at?: string;
  image_url?: string;
  is_combo?: boolean;
  combo_items?: ComboItem[];
  combo_discount?: number;
  metadata?: any;
  base_unit?: string;
  conversion_factor?: number;
}

export interface Batch {
  id: string;
  product_id: string;
  store_id: string;
  batch_number: string;
  expiry_date?: string;
  cost_price: number;
  quantity: number;
  created_at: string;
}

export interface SerialNumber {
  id: string;
  product_id: string;
  store_id: string;
  serial_number: string;
  status: "available" | "sold" | "returned" | "defective";
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  store_id: string;
  transaction_type: "in" | "out" | "adjustment" | "transfer" | "return";
  qty_delta: number;
  batch_id?: string;
  serial_number_id?: string;
  reference_type?: "order" | "purchase_order" | "adjustment" | "transfer";
  reference_id?: string;
  user_id: string;
  created_at: string;
}

export interface StockCount {
  id: string;
  store_id: string;
  status: "draft" | "completed" | "cancelled";
  created_by: string;
  created_at: string;
  items: StockCountItem[];
}

export interface StockCountItem {
  id: string;
  count_id: string;
  product_id: string;
  expected_qty: number;
  actual_qty: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  store_id: string;
  name: string;
  value: string;
  sku: string;
  price: number;
  stock: number;
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
  discount_type?: "percentage" | "fixed";
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
  tip_amount?: number;
  discount_type?: "percentage" | "fixed";
  metadata?: any;
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
  group_name?: string;
  notes?: string;
  birthday?: string;
  anniversary?: string;
  credit_limit?: number;
  price_tier?: string;
  loyalty_tier?: string;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface CustomerStatistics {
  total_spent: number;
  visits: number;
  avg_order_value: number;
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
  onboarding_completed: boolean;
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
export async function dbGetProducts(storeId: string): Promise<Product[]> {
  return sql<Product[]>("get_products", { store_id: storeId });
}

export async function dbSaveProduct(product: Product, storeId: string): Promise<void> {
  return sql("upsert_product", { product, store_id: storeId });
}

export async function dbDeleteProduct(id: string, storeId: string): Promise<void> {
  return sql("delete_product", { id, store_id: storeId });
}

export async function dbGetProductVariants(productId: string, storeId: string): Promise<ProductVariant[]> {
  return sql<ProductVariant[]>("get_product_variants", { product_id: productId, store_id: storeId });
}

export async function dbSaveProductVariant(variant: ProductVariant, storeId: string): Promise<void> {
  return sql("save_product_variant", { variant, store_id: storeId });
}

export async function dbDeleteProductVariant(id: string, storeId: string): Promise<void> {
  return sql("delete_product_variant", { id, store_id: storeId });
}

export async function dbUpdateStock(id: string, delta: number, storeId: string, userId: string): Promise<void> {
  return sql("update_stock", { id, delta, store_id: storeId, user_id: userId });
}

export async function dbTransferStock(id: string, fromStore: string, toStore: string, qty: number, userId: string): Promise<void> {
  return sql("transfer_stock", { id, from_store: fromStore, to_store: toStore, qty, user_id: userId });
}

export async function dbGetBatches(productId: string, storeId: string): Promise<Batch[]> {
  return sql<Batch[]>("get_batches", { product_id: productId, store_id: storeId });
}

export async function dbSaveBatch(batch: Batch): Promise<void> {
  return sql("save_batch", { batch });
}

export async function dbGetSerialNumbers(productId: string, storeId: string): Promise<SerialNumber[]> {
  return sql<SerialNumber[]>("get_serial_numbers", { product_id: productId, store_id: storeId });
}

export async function dbSaveSerialNumber(serial: SerialNumber): Promise<void> {
  return sql("save_serial_number", { serial });
}

export async function dbGetInventoryTransactions(productId: string, storeId: string): Promise<InventoryTransaction[]> {
  return sql<InventoryTransaction[]>("get_inventory_transactions", { product_id: productId, store_id: storeId });
}

export async function dbCalculateValuation(storeId: string, method: "AVG" | "FIFO" | "LIFO"): Promise<number> {
  return sql<number>("calculate_inventory_valuation", { store_id: storeId, method });
}

export async function dbGetStockCounts(storeId: string): Promise<StockCount[]> {
  return sql<StockCount[]>("get_stock_counts", { store_id: storeId });
}

export async function dbSaveStockCount(count: StockCount): Promise<void> {
  return sql("save_stock_count", { count });
}

// ─── Combos ──────────────────────────────────────────────────────────────────
export async function dbGetCombos(storeId: string): Promise<Combo[]> {
  return sql<Combo[]>("get_combos", { store_id: storeId });
}

export async function dbSaveCombo(combo: Combo, storeId: string): Promise<void> {
  return sql("save_combo", { combo, store_id: storeId });
}

export async function dbDeleteCombo(id: string, storeId: string): Promise<void> {
  return sql("delete_combo", { id, store_id: storeId });
}

export async function dbToggleCombo(id: string, isActive: boolean, storeId: string): Promise<void> {
  return sql("toggle_combo", { id, active: isActive, store_id: storeId });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function dbGetOrders(storeId: string, limit?: number, offset?: number): Promise<Order[]> {
  return sql<Order[]>("get_orders", { store_id: storeId, limit, offset });
}

export async function dbSaveOrder(order: Order, storeId: string): Promise<void> {
  return sql("save_order", { order, store_id: storeId });
}

export async function dbRefundOrder(id: string, storeId: string, userId: string = "system", userName: string = "System"): Promise<void> {
  return sql("refund_order", { id, store_id: storeId, user_id: userId, user_name: userName });
}

export async function updateDeliveryStatus(id: string, status: string, storeId: string): Promise<void> {
  return sql("update_delivery_status", { id, status, store_id: storeId });
}

export async function dbUpdateOrderStatus(id: string, status: string, storeId: string): Promise<void> {
  return sql("update_order_status", { id, status, store_id: storeId });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function dbGetSettings(storeId: string): Promise<Settings> {
  return sql<Settings>("get_settings", { store_id: storeId });
}

export async function dbSaveSettings(settings: Settings, storeId: string): Promise<void> {
  return sql("save_settings", { settings, store_id: storeId });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function dbGetDailySummary(storeId: string) {
  return sql<{
    revenue: number;
    transactions: number;
    avg_order: number;
    items_sold: number;
  }>("get_daily_summary", { store_id: storeId });
}

export async function dbGetWeeklyRevenue(storeId: string) {
  return sql<{ label: string; revenue: number }[]>("get_weekly_revenue", { store_id: storeId });
}

export async function dbGetTopProducts(storeId: string) {
  return sql<{ name: string; qty: number; revenue: number }[]>("get_top_products", { store_id: storeId });
}

export async function dbGetLowStock(storeId: string) {
  return sql<{ name: string; stock: number }[]>("get_low_stock", { store_id: storeId });
}

export async function getSalesByPaymentMethod(date: string, storeId: string): Promise<{ cash: number; upi: number; card: number }> {
  const result = await sql<[number, number, number]>("get_sales_by_payment_method", { date, store_id: storeId });
  return { cash: result[0], upi: result[1], card: result[2] };
}

// ─── CSV Import/Export ─────────────────────────────────────────────────────
export async function exportProductsCsv(storeId: string): Promise<string> {
  return sql<string>("export_products_csv", { store_id: storeId });
}

export async function exportOrdersCsv(storeId: string): Promise<string> {
  return sql<string>("export_orders_csv", { store_id: storeId });
}

export async function importProductsCsv(csvData: string, storeId: string): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_products_csv", { csv_data: csvData, store_id: storeId });
}

// ─── Reports ───────────────────────────────────────────────────────────────
export async function getSalesReport(startDate: string, endDate: string, storeId: string) {
  return sql<{
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_orders: number;
    avg_order: number;
  }>("get_sales_report", { start_date: startDate, end_date: endDate, store_id: storeId });
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
export async function exportBackup(storeId: string): Promise<string> {
  return sql<string>("export_backup", { store_id: storeId });
}

export async function importBackup(backupJson: string, storeId: string): Promise<{ products_imported: number; orders_imported: number }> {
  let jsonString = backupJson;

  // Detect and decompress gzipped base64 data for backward compatibility
  try {
    // Attempt to decode as base64 and decompress as gzip
    const binaryString = atob(backupJson);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // If this succeeds, it's gzipped base64
    jsonString = pako.ungzip(bytes, { to: 'string' });
  } catch {
    // Not gzipped base64, treat as plain JSON string
  }

  return sql<{ products_imported: number; orders_imported: number }>("import_backup", { backup_json: jsonString, store_id: storeId });
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

export async function dbAddActivityLog(storeId: string, action: string, reason: string, userId: string, userName: string, orderId?: string): Promise<void> {
  return sql("add_activity_log", { store_id: storeId, action, reason, user_id: userId, user_name: userName, order_id: orderId });
}

export async function getActivityLogs(storeId: string, limit: number = 100): Promise<ActivityLog[]> {
  return sql<ActivityLog[]>("get_activity_logs", { store_id: storeId, limit });
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export async function dbGetTables(storeId: string): Promise<Table[]> {
  return sql<Table[]>("get_tables", { store_id: storeId });
}

export async function dbSaveTable(table: Table, storeId: string): Promise<void> {
  return sql("save_table", { table, store_id: storeId });
}

export async function dbDeleteTable(id: string, storeId: string): Promise<void> {
  return sql("delete_table", { id, store_id: storeId });
}

export async function dbUpdateTableStatus(id: string, status: string, storeId: string): Promise<void> {
  return sql("update_table_status", { id, status, store_id: storeId });
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────
export async function dbClockIn(userId: string, userName: string, storeId: string): Promise<void> {
  return sql("clock_in", { user_id: userId, user_name: userName, store_id: storeId });
}

export async function dbClockOut(userId: string, storeId: string): Promise<void> {
  return sql("clock_out", { user_id: userId, store_id: storeId });
}

export async function dbGetTodayAttendance(storeId: string): Promise<StaffAttendance[]> {
  return sql<StaffAttendance[]>("get_today_attendance", { store_id: storeId });
}

export async function dbIsClockedIn(userId: string, storeId: string): Promise<boolean> {
  return sql<boolean>("is_clocked_in", { user_id: userId, store_id: storeId });
}

// ─── Customers ──────────────────────────────────────────────────────────────
export async function dbGetCustomers(storeId: string): Promise<Customer[]> {
  return sql<Customer[]>("get_customers", { store_id: storeId });
}

export async function dbSaveCustomer(customer: Customer, storeId: string): Promise<void> {
  return sql("save_customer", { customer, store_id: storeId });
}

export async function dbDeleteCustomer(id: string, storeId: string): Promise<void> {
  return sql("delete_customer", { id, store_id: storeId });
}

export async function dbGetCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  return sql<CustomerAddress[]>("get_customer_addresses", { customer_id: customerId });
}

export async function dbSaveCustomerAddress(address: CustomerAddress): Promise<void> {
  return sql("save_customer_address", { address });
}

export async function dbDeleteCustomerAddress(id: string): Promise<void> {
  return sql("delete_customer_address", { id });
}

export async function exportCustomersCsv(storeId: string): Promise<string> {
  return sql<string>("export_customers_csv", { store_id: storeId });
}

export async function importCustomersCsv(csvData: string, storeId: string): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_customers_csv", { csv_data: csvData, store_id: storeId });
}

export async function dbGetCustomerStatistics(customerId: string): Promise<CustomerStatistics> {
  return sql<CustomerStatistics>("get_customer_statistics", { customer_id: customerId });
}

export async function dbGetCustomerByPhone(phone: string, storeId: string): Promise<Customer | null> {
  return sql<Customer | null>("get_customer_by_phone", { phone, store_id: storeId });
}

export async function dbAddLoyaltyPoints(customerId: string, points: number, spent: number, storeId: string): Promise<void> {
  return sql("add_loyalty_points", { customer_id: customerId, points, spent, store_id: storeId });
}

export async function dbGetCustomerOrders(phone: string, storeId: string): Promise<Order[]> {
  return sql<Order[]>("get_customer_orders", { phone, store_id: storeId });
}

// ─── Order Notes ────────────────────────────────────────────────────────────
export async function dbAddOrderNote(orderId: string, note: string, storeId: string): Promise<void> {
  return sql("add_order_note", { order_id: orderId, note, store_id: storeId });
}

export async function dbGetOrderNotes(orderId: string, storeId: string): Promise<OrderNote[]> {
  return sql<OrderNote[]>("get_order_notes", { order_id: orderId, store_id: storeId });
}

// ─── Inventory Alerts ───────────────────────────────────────────────────────
export async function dbGetInventoryAlerts(storeId: string): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("get_inventory_alerts", { store_id: storeId });
}

export async function dbCheckInventoryAlerts(storeId: string): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("check_inventory_alerts", { store_id: storeId });
}

export async function dbCreateInventoryAlert(alert: InventoryAlert, storeId: string): Promise<void> {
  return sql("create_inventory_alert", { alert, store_id: storeId });
}

export async function dbClearInventoryAlert(id: string, storeId: string): Promise<void> {
  return sql("clear_inventory_alert", { id, store_id: storeId });
}

// ─── Enhanced Reports ───────────────────────────────────────────────────────
export async function dbGetHourlySales(date: string, storeId: string): Promise<HourlySales[]> {
  return sql<HourlySales[]>("get_hourly_sales", { date, store_id: storeId });
}

export async function dbGetStaffPerformance(startDate: string, endDate: string, storeId: string): Promise<StaffPerformance[]> {
  return sql<StaffPerformance[]>("get_staff_performance", { start_date: startDate, end_date: endDate, store_id: storeId });
}

export async function dbGetSalesByItem(startDate: string, endDate: string, storeId: string): Promise<SalesByItem[]> {
  return sql<SalesByItem[]>("get_sales_by_item", { start_date: startDate, end_date: endDate, store_id: storeId });
}

// ─── Hold & Cancel ──────────────────────────────────────────────────────────
export async function dbHoldOrder(order: Order, storeId: string): Promise<void> {
  return sql("hold_order", { order, store_id: storeId });
}

export async function dbGetHeldOrders(storeId: string): Promise<Order[]> {
  return sql<Order[]>("get_held_orders", { store_id: storeId });
}

export async function dbCancelOrder(id: string, reason: string, userId: string, userName: string, storeId: string): Promise<void> {
  return sql("cancel_order", { id, reason, user_id: userId, user_name: userName, store_id: storeId });
}

// ─── Refunds ───────────────────────────────────────────────────────────────
export async function dbCreateRefundRequest(orderId: string, amount: number, reason: string, storeId: string): Promise<string> {
  return sql<string>("create_refund_request", { order_id: orderId, amount, reason, store_id: storeId });
}

export async function dbGetRefundRequests(storeId: string): Promise<RefundRequest[]> {
  return sql<RefundRequest[]>("get_refund_requests", { store_id: storeId });
}

export async function dbApproveRefund(id: string, userId: string, userName: string, storeId: string): Promise<void> {
  return sql("approve_refund", { id, user_id: userId, user_name: userName, store_id: storeId });
}

export async function dbRejectRefund(id: string, storeId: string): Promise<void> {
  return sql("reject_refund", { id, store_id: storeId });
}

// ─── Crash Recovery ─────────────────────────────────────────────────────────
export async function dbGetPendingOrdersCount(storeId: string): Promise<number> {
  return sql<number>("get_pending_orders_count", { store_id: storeId });
}

export async function dbGetPendingOrders(storeId: string): Promise<Order[]> {
  return sql<Order[]>("get_pending_orders", { store_id: storeId });
}

export async function dbDeletePendingOrder(id: string, storeId: string): Promise<void> {
  return sql("delete_pending_order", { id, store_id: storeId });
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

export async function syncToNeon(storeId: string): Promise<{ synced: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_to_neon", { store_id: storeId }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Neon sync failed after retries:", errorMsg);
    return { synced: 0, error: `Sync failed: ${errorMsg}. Please check your connection and try again.` };
  }
}

export async function syncFromNeon(storeId: string): Promise<{ imported: number; error?: string }> {
  try {
    return await retryWithBackoff(() => sql("sync_from_neon", { store_id: storeId }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Neon import failed after retries:", errorMsg);
    return { imported: 0, error: `Import failed: ${errorMsg}. Please check your connection and try again.` };
  }
}

// ─── Cart Calculation (pure JS, no DB needed) ─────────────────────────────────
export function calcCart(
  items: { product: Product; quantity: number; discount: number; discount_type?: "percentage" | "fixed"; override_price?: number }[],
  globalDiscount = 0,
  globalDiscountType: "percentage" | "fixed" = "percentage"
) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  items.forEach((item) => {
    const price = item.override_price !== undefined ? item.override_price : item.product.price;
    const line = price * item.quantity;
    const itemDisc = item.discount_type === "fixed"
      ? item.discount
      : line * (item.discount / 100);

    const afterDisc = Math.max(0, line - itemDisc);
    const tax = afterDisc * (item.product.tax / 100);
    subtotal += afterDisc;
    taxAmount += tax;
    discountAmount += itemDisc;
  });

  const globalDisc = globalDiscountType === "fixed"
    ? globalDiscount
    : subtotal * (globalDiscount / 100);

  discountAmount += globalDisc;
  const total = Math.max(0, subtotal - globalDisc + taxAmount);

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
  if (order.user_name) lines.push(`Staff:    ${order.user_name}`);
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
  
  if (order.tip_amount && order.tip_amount > 0) {
    lines.push(`Tip:      ${(c + order.tip_amount.toFixed(2)).padStart(18)}`);
  }

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

  if (order.metadata?.split_payments) {
    const split = order.metadata.split_payments as { method: string, amount: number }[];
    split.forEach(s => {
      lines.push(`${s.method.toUpperCase()}: ${(c + s.amount.toFixed(2)).padStart(21 - s.method.length)}`);
    });
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
    onboarding_completed: false,
  };
}

function seedProducts(storeId: string): Product[] {
  return [
    { id: `p1_${storeId}`, store_id: storeId, name: "Coffee", price: 120, cost_price: 50, wholesale_price: 100, category: "Beverages", subcategory: "Hot Coffee", stock: 100, barcode: "001", sku: "COF-001", description: "Rich blend coffee", tax: 5, status: "active", tags: "hot,morning", is_digital: false, is_favorite: true },
    { id: `p2_${storeId}`, store_id: storeId, name: "Tea", price: 60, cost_price: 20, wholesale_price: 50, category: "Beverages", subcategory: "Hot Tea", stock: 150, barcode: "002", sku: "TEA-002", description: "Green tea", tax: 5, status: "active", tags: "hot,healthy", is_digital: false, is_favorite: false },
    { id: `p3_${storeId}`, store_id: storeId, name: "Sandwich", price: 180, cost_price: 80, wholesale_price: 150, category: "Food", subcategory: "Snacks", stock: 50, barcode: "003", sku: "SND-003", description: "Club sandwich", tax: 12, status: "active", tags: "snack,lunch", is_digital: false, is_favorite: false },
    { id: `p4_${storeId}`, store_id: storeId, name: "Burger", price: 250, cost_price: 120, wholesale_price: 220, category: "Food", subcategory: "Main Course", stock: 40, barcode: "004", sku: "BRG-004", description: "Beef burger", tax: 12, status: "active", tags: "heavy,dinner", is_digital: false, is_favorite: true },
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
      lsSet(LS.settings, {
        "default": { ...defaultSettings(), onboarding_completed: true },
        "retail1": { ...defaultSettings(), onboarding_completed: true }
      });
      lsSet("pos_initialized", true);
    }
  };
  initSeedData();

  // Simulate async
  await new Promise((r) => setTimeout(r, 0));

  switch (cmd) {
    case "seed_database":
      initSeedData();
      return undefined as T;
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
    case "get_product_variants": {
      const items = lsGet<ProductVariant[]>("pos_product_variants") || [];
      return items.filter(x => x.product_id === (args as any).product_id && x.store_id === storeId) as T;
    }
    case "save_product_variant": {
      const items = lsGet<ProductVariant[]>("pos_product_variants") || [];
      const v = (args as any).variant as ProductVariant;
      v.store_id = storeId;
      const idx = items.findIndex(x => x.id === v.id);
      if (idx >= 0) items[idx] = v; else items.push(v);
      lsSet("pos_product_variants", items);
      return undefined as T;
    }
    case "delete_product_variant": {
      const items = (lsGet<ProductVariant[]>("pos_product_variants") || []).filter(x => !(x.id === (args as any).id && x.store_id === storeId));
      lsSet("pos_product_variants", items);
      return undefined as T;
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
    case "get_customers": {
      const c = lsGet<Customer[]>("pos_customers") || [];
      return c.filter(x => x.store_id === storeId) as T;
    }
    case "save_customer": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = (args as any).customer as Customer;
      c.store_id = storeId;
      const idx = customers.findIndex(x => x.id === c.id);
      if (idx >= 0) customers[idx] = c; else customers.push(c);
      lsSet("pos_customers", customers);
      return undefined as T;
    }
    case "delete_customer": {
      const customers = (lsGet<Customer[]>("pos_customers") || []).filter(x => x.id !== (args as any).id);
      lsSet("pos_customers", customers);
      return undefined as T;
    }
    case "get_customer_addresses": {
      const a = lsGet<CustomerAddress[]>("pos_customer_addresses") || [];
      return a.filter(x => x.customer_id === (args as any).customer_id) as T;
    }
    case "save_customer_address": {
      const addresses = lsGet<CustomerAddress[]>("pos_customer_addresses") || [];
      const a = (args as any).address as CustomerAddress;
      const idx = addresses.findIndex(x => x.id === a.id);
      if (idx >= 0) addresses[idx] = a; else addresses.push(a);
      lsSet("pos_customer_addresses", addresses);
      return undefined as T;
    }
    case "delete_customer_address": {
      const addresses = (lsGet<CustomerAddress[]>("pos_customer_addresses") || []).filter(x => x.id !== (args as any).id);
      lsSet("pos_customer_addresses", addresses);
      return undefined as T;
    }
    case "export_customers_csv": {
      const c = lsGet<Customer[]>("pos_customers") || [];
      const filtered = c.filter(x => x.store_id === storeId);
      const header = ["id", "name", "phone", "email", "loyalty_points", "total_spent", "visits", "group_name", "notes", "birthday", "anniversary", "credit_limit", "price_tier", "loyalty_tier"];
      const rows = filtered.map(x => [
        x.id, x.name, x.phone, x.email,
        x.loyalty_points.toString(), x.total_spent.toString(), x.visits.toString(),
        x.group_name || "", x.notes || "", x.birthday || "", x.anniversary || "",
        (x.credit_limit || 0).toString(), x.price_tier || "", x.loyalty_tier || ""
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
      return csv as T;
    }
    case "import_customers_csv": {
      const csvData = (args as any).csvData as string;
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const lines = csvData.split("\n");
      let imported = 0;
      let errors = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(",").map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
        if (parts.length < 3) { errors++; continue; }
        const c: Customer = {
          id: parts[0] || Math.random().toString(36).substr(2, 9),
          store_id: storeId,
          name: parts[1],
          phone: parts[2],
          email: parts[3] || "",
          loyalty_points: parseInt(parts[4]) || 0,
          total_spent: parseFloat(parts[5]) || 0,
          visits: parseInt(parts[6]) || 0,
          group_name: parts[7],
          notes: parts[8],
          birthday: parts[9],
          anniversary: parts[10],
          credit_limit: parseFloat(parts[11]),
          price_tier: parts[12],
          loyalty_tier: parts[13],
          created_at: new Date().toISOString()
        };
        const idx = customers.findIndex(x => x.id === c.id);
        if (idx >= 0) customers[idx] = c; else customers.push(c);
        imported++;
      }
      lsSet("pos_customers", customers);
      return { imported, errors } as T;
    }
    case "get_customer_statistics": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = customers.find(x => x.id === (args as any).customer_id);
      if (!c) return { total_spent: 0, visits: 0, avg_order_value: 0 } as T;
      return {
        total_spent: c.total_spent,
        visits: c.visits,
        avg_order_value: c.visits > 0 ? c.total_spent / c.visits : 0
      } as T;
    }
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
    case "export_products_csv": {
      const p = lsGet<Product[]>(LS.products) || [];
      const variants = lsGet<ProductVariant[]>("pos_product_variants") || [];
      const filtered = p.filter(x => x.store_id === storeId);
      const header = [
        "id", "parent_id", "name", "price", "cost_price", "wholesale_price",
        "category", "subcategory", "stock", "barcode", "sku", "description",
        "tax", "status", "tags", "is_digital", "is_favorite", "image_url", "metadata", "variant_value"
      ];
      const rows: string[][] = [];

      filtered.forEach(x => {
        rows.push([
          x.id,
          "", // parent_id
          x.name,
          x.price.toString(),
          x.cost_price.toString(),
          x.wholesale_price.toString(),
          x.category,
          x.subcategory || "",
          x.stock.toString(),
          x.barcode || "",
          x.sku || "",
          x.description || "",
          x.tax.toString(),
          x.status || "active",
          x.tags || "",
          x.is_digital ? "true" : "false",
          x.is_favorite ? "true" : "false",
          x.image_url || "",
          JSON.stringify(x.metadata || {}),
          "" // variant_value
        ]);

        // Export variants for this product
        variants.filter(v => v.product_id === x.id && v.store_id === storeId).forEach(v => {
          rows.push([
            v.id,
            x.id, // parent_id
            v.name,
            v.price.toString(),
            "0", // cost_price
            "0", // wholesale_price
            x.category,
            x.subcategory || "",
            v.stock.toString(),
            "", // barcode
            v.sku || "",
            "", // description
            x.tax.toString(),
            "active",
            "",
            "false",
            "false",
            "",
            "{}",
            v.value
          ]);
        });
      });

      const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
      return csv as T;
    }
    case "import_products_csv": {
      const csvData = (args as any).csvData as string;
      const products = lsGet<Product[]>(LS.products) || [];
      const variants = lsGet<ProductVariant[]>("pos_product_variants") || [];
      const lines = csvData.split("\n");
      let imported = 0;
      let errors = 0;

      const parseCsvLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && (i + 1 < line.length) && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(current);
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCsvLine(line);
        const len = parts.length;
        if (len < 4) {
          errors++;
          continue;
        }

        let id, parent_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, variant_value;

        if (len >= 19) {
          id = parts[0];
          parent_id = parts[1];
          name = parts[2];
          price = parseFloat(parts[3]) || 0;
          cost_price = parseFloat(parts[4]) || 0;
          wholesale_price = parseFloat(parts[5]) || 0;
          category = parts[6] || "General";
          subcategory = parts[7] || "";
          stock = parseInt(parts[8]) || 0;
          barcode = parts[9] || "";
          sku = parts[10] || "";
          description = parts[11] || "";
          tax = parseFloat(parts[12]) || 0;
          status = (parts[13] as any) || "active";
          tags = parts[14] || "";
          is_digital = parts[15] === "true";
          is_favorite = parts[16] === "true";
          image_url = parts[17] || "";
          try { metadata = parts[18] ? JSON.parse(parts[18]) : {}; } catch { metadata = {}; }
          variant_value = parts[19] || "";
        } else if (len == 18) {
          id = parts[0];
          parent_id = "";
          name = parts[1];
          price = parseFloat(parts[2]) || 0;
          cost_price = parseFloat(parts[3]) || 0;
          wholesale_price = parseFloat(parts[4]) || 0;
          category = parts[5] || "General";
          subcategory = parts[6] || "";
          stock = parseInt(parts[7]) || 0;
          barcode = parts[8] || "";
          sku = parts[9] || "";
          description = parts[10] || "";
          tax = parseFloat(parts[11]) || 0;
          status = (parts[12] as any) || "active";
          tags = parts[13] || "";
          is_digital = parts[14] === "true";
          is_favorite = parts[15] === "true";
          image_url = parts[16] || "";
          try { metadata = parts[17] ? JSON.parse(parts[17]) : {}; } catch { metadata = {}; }
          variant_value = "";
        } else {
          id = parts[0];
          parent_id = "";
          name = parts[1];
          price = parseFloat(parts[2]) || 0;
          category = parts[3] || "General";
          stock = parseInt(parts[4]) || 0;
          barcode = parts[5] || "";
          tax = parseFloat(parts[6]) || 18;
          cost_price = 0; wholesale_price = 0; subcategory = ""; sku = ""; description = ""; status = "active"; tags = ""; is_digital = false; is_favorite = false; image_url = ""; metadata = {}; variant_value = "";
        }

        if (parent_id) {
          const v: ProductVariant = {
            id: id || Math.random().toString(36).substr(2, 9),
            product_id: parent_id,
            store_id: storeId,
            name: name,
            value: variant_value,
            sku: sku,
            price: price,
            stock: stock
          };
          const idx = variants.findIndex(x => x.id === v.id && x.store_id === storeId);
          if (idx >= 0) variants[idx] = v; else variants.push(v);
          imported++;
        } else {
          const p: Product = {
            id: id || Math.random().toString(36).substr(2, 9),
            store_id: storeId,
            name: name,
            price: price,
            cost_price: cost_price,
            wholesale_price: wholesale_price,
            category: category,
            subcategory: subcategory,
            stock: stock,
            barcode: barcode,
            sku: sku,
            description: description,
            tax: tax,
            status: status as any,
            tags: tags,
            is_digital: is_digital,
            is_favorite: is_favorite,
            image_url: image_url,
            metadata: metadata
          };
          const idx = products.findIndex(x => x.id === p.id && x.store_id === storeId);
          if (idx >= 0) products[idx] = p; else products.push(p);
          imported++;
        }
      }
      lsSet(LS.products, products);
      lsSet("pos_product_variants", variants);
      return { imported, errors } as T;
    }
    default:
      console.warn(`Browser fallback: Command ${cmd} not fully implemented for store ${storeId}`);
      return [] as any as T;
  }
}

// ─── KDS Functions ───────────────────────────────────────────────────────────
export async function openKdsWindow(): Promise<void> {
  return sql("open_kds_window");
}

export async function getKdsOrders(storeId: string): Promise<KdsOrder[]> {
  return sql<KdsOrder[]>("get_kds_orders", { store_id: storeId });
}

export async function markKdsItemDone(orderId: string, itemIndex: number, storeId: string): Promise<void> {
  return sql("mark_kds_item_done", { order_id: orderId, item_index: itemIndex, store_id: storeId });
}

export async function startPreparingItem(orderId: string, itemIndex: number, storeId: string): Promise<void> {
  return sql("start_preparing_item", { order_id: orderId, item_index: itemIndex, store_id: storeId });
}

export async function cancelKdsItem(orderId: string, itemIndex: number, storeId: string): Promise<void> {
  return sql("cancel_kds_item", { order_id: orderId, item_index: itemIndex, store_id: storeId });
}

export async function recallKdsOrder(orderId: string, storeId: string): Promise<void> {
  return sql("recall_kds_order", { order_id: orderId, store_id: storeId });
}

// ─── Ingredient Functions ───────────────────────────────────────────────────
export async function getIngredients(storeId: string): Promise<Ingredient[]> {
  return sql<Ingredient[]>("get_ingredients", { store_id: storeId });
}

export async function saveIngredient(ingredient: Ingredient, storeId: string): Promise<void> {
  return sql("save_ingredient", { ingredient, store_id: storeId });
}

export async function deleteIngredient(id: string, storeId: string): Promise<void> {
  return sql("delete_ingredient", { id, store_id: storeId });
}

// ─── Recipe Functions ───────────────────────────────────────────────────────
export async function getRecipes(storeId: string): Promise<Recipe[]> {
  return sql<Recipe[]>("get_recipes", { store_id: storeId });
}

export async function saveRecipe(recipe: Recipe, storeId: string): Promise<void> {
  return sql("save_recipe", { recipe, store_id: storeId });
}

// ─── Supplier Functions ─────────────────────────────────────────────────────
export async function getSuppliers(storeId: string): Promise<Supplier[]> {
  return sql<Supplier[]>("get_suppliers", { store_id: storeId });
}

export async function saveSupplier(supplier: Supplier, storeId: string): Promise<void> {
  return sql("save_supplier", { supplier, store_id: storeId });
}

export async function deleteSupplier(id: string, storeId: string): Promise<void> {
  return sql("delete_supplier", { id, store_id: storeId });
}

// ─── Purchase Order Functions ───────────────────────────────────────────────
export async function getPurchaseOrders(storeId: string): Promise<PurchaseOrder[]> {
  return sql<PurchaseOrder[]>("get_purchase_orders", { store_id: storeId });
}

export async function savePurchaseOrder(po: PurchaseOrder, storeId: string): Promise<void> {
  return sql("save_purchase_order", { po, store_id: storeId });
}

export async function updatePoStatus(id: string, status: string, storeId: string): Promise<void> {
  return sql("update_po_status", { id, status, store_id: storeId });
}

export async function receivePurchaseOrder(id: string, storeId: string): Promise<void> {
  return sql("receive_purchase_order", { id, store_id: storeId });
}

// ─── Reservation Functions ─────────────────────────────────────────────────
export async function getReservations(date: string, storeId: string): Promise<Reservation[]> {
  return sql<Reservation[]>("get_reservations", { date, store_id: storeId });
}

export async function saveReservation(reservation: Reservation, storeId: string): Promise<void> {
  return sql("save_reservation", { reservation, store_id: storeId });
}

export async function deleteReservation(id: string, storeId: string): Promise<void> {
  return sql("delete_reservation", { id, store_id: storeId });
}

// ─── SMS Functions ─────────────────────────────────────────────────────────
export async function sendSmsNotification(phone: string, message: string, storeId: string): Promise<void> {
  return sql("send_sms_notification", { phone, message, store_id: storeId });
}

// ─── LAN Sync Functions ───────────────────────────────────────────────────
export async function startLanServer(storeId: string, port?: number): Promise<string> {
  return sql<string>("start_lan_server", { port, store_id: storeId });
}

export async function stopLanServer(): Promise<string> {
  return sql<string>("stop_lan_server");
}

export async function getLanServerStatus(): Promise<LanServerStatus> {
  return sql<LanServerStatus>("get_lan_server_status");
}

// ─── Shift Functions ─────────────────────────────────────────────────────────
export async function getShifts(date: string, storeId: string): Promise<Shift[]> {
  return sql<Shift[]>("get_shifts", { date, store_id: storeId });
}

export async function saveShift(shift: Shift, storeId: string): Promise<void> {
  return sql("save_shift", { shift, store_id: storeId });
}

export async function deleteShift(id: string, storeId: string): Promise<void> {
  return sql("delete_shift", { id, store_id: storeId });
}

// ─── Expense Functions ───────────────────────────────────────────────────────
export async function getExpenses(date: string, storeId: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses", { date, store_id: storeId });
}

export async function getExpensesByRange(startDate: string, endDate: string, storeId: string): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses_by_range", { start_date: startDate, end_date: endDate, store_id: storeId });
}

export async function saveExpense(expense: Expense, storeId: string): Promise<void> {
  return sql("save_expense", { expense, store_id: storeId });
}

export async function deleteExpense(id: string, storeId: string): Promise<void> {
  return sql("delete_expense", { id, store_id: storeId });
}

export async function getExpenseCategories(storeId: string): Promise<ExpenseCategory[]> {
  return sql<ExpenseCategory[]>("get_expense_categories", { store_id: storeId });
}

export async function saveExpenseCategory(category: ExpenseCategory, storeId: string): Promise<void> {
  return sql("save_expense_category", { category, store_id: storeId });
}

// ─── Wallet Functions ───────────────────────────────────────────────────────
export async function getCustomerWallet(customerId: string): Promise<CustomerWallet> {
  return sql<CustomerWallet>("get_customer_wallet", { customer_id: customerId });
}

export async function addWalletBalance(customerId: string, amount: number, notes: string): Promise<void> {
  return sql("add_wallet_balance", { customer_id: customerId, amount, notes });
}

export async function deductWalletBalance(customerId: string, amount: number, orderId: string): Promise<void> {
  return sql("deduct_wallet_balance", { customer_id: customerId, amount, order_id: orderId });
}

export async function getWalletTransactions(customerId: string): Promise<WalletTransaction[]> {
  return sql<WalletTransaction[]>("get_wallet_transactions", { customer_id: customerId });
}

// ─── Coupon Functions ───────────────────────────────────────────────────────
export async function getCoupons(storeId: string): Promise<Coupon[]> {
  return sql<Coupon[]>("get_coupons", { store_id: storeId });
}

export async function saveCoupon(coupon: Coupon, storeId: string): Promise<void> {
  return sql("save_coupon", { coupon, store_id: storeId });
}

export async function validateCoupon(code: string, orderAmount: number, storeId: string): Promise<Coupon> {
  return sql<Coupon>("validate_coupon", { code, order_amount: orderAmount, store_id: storeId });
}

export async function useCoupon(code: string, storeId: string): Promise<void> {
  return sql("use_coupon", { code, store_id: storeId });
}

export async function deleteCoupon(id: string, storeId: string): Promise<void> {
  return sql("delete_coupon", { id, store_id: storeId });
}

// ─── Day End Reconciliation Functions ───────────────────────────────────────
export async function getDayEndReconciliation(date: string, storeId: string): Promise<DayEndReconciliation | null> {
  return sql<DayEndReconciliation | null>("get_day_end_reconciliation", { date, store_id: storeId });
}

export async function saveDayEndReconciliation(reconciliation: DayEndReconciliation, storeId: string): Promise<void> {
  return sql("save_day_end_reconciliation", { reconciliation, store_id: storeId });
}

// ─── GST Report Functions ───────────────────────────────────────────────────
export async function getGstr1Report(startDate: string, endDate: string, storeId: string): Promise<GstReport[]> {
  return sql<GstReport[]>("get_gstr1_report", { start_date: startDate, end_date: endDate, store_id: storeId });
}

export async function getGstr3bReport(startDate: string, endDate: string, storeId: string): Promise<[number, number, number, number, number, number]> {
  return sql<[number, number, number, number, number, number]>("get_gstr3b_report", { start_date: startDate, end_date: endDate, store_id: storeId });
}

// ─── Activity Log Functions ────────────────────────────────────────────────
export async function getActivityLogsDetailed(startDate: string, endDate: string, limit: number, storeId: string): Promise<ActivityLogEntry[]> {
  return sql<ActivityLogEntry[]>("get_activity_logs_range", { start_date: startDate, end_date: endDate, limit, store_id: storeId });
}

// ─── Export Functions ──────────────────────────────────────────────────────
export async function exportToTally(startDate: string, endDate: string, storeId: string): Promise<string> {
  return sql<string>("export_to_tally", { start_date: startDate, end_date: endDate, store_id: storeId });
}

export async function exportToQuickbooks(startDate: string, endDate: string, storeId: string): Promise<string> {
  return sql<string>("export_to_quickbooks", { start_date: startDate, end_date: endDate, store_id: storeId });
}

export async function createCompressedBackup(storeId: string): Promise<number[]> {
  return sql<number[]>("create_compressed_backup", { store_id: storeId });
}

// ─── WhatsApp Functions ───────────────────────────────────────────────────
export async function sendWhatsAppMessage(phone: string, message: string, storeId: string): Promise<void> {
  return sql("send_whatsapp_message", { phone, message, store_id: storeId });
}
