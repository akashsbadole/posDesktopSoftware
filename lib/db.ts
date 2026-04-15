// lib/db.ts
// SQLite via Tauri invoke commands (Rust backend)
// Falls back to localStorage when running in browser (dev mode)

import { invoke } from "@tauri-apps/api/tauri";
import pako from "pako";
import { neon } from "@neondatabase/serverless";
import { dbLogger } from "@/lib/logger";
import CryptoJS from "crypto-js";

const IS_TAURI = typeof window !== "undefined" && "__TAURI__" in window;

const SENSITIVE_KEYS = ["pos_users", "pos_organizations"];

const ENCRYPTION_KEY = "pos-tauri-encryption-key-2026"; // TODO: derive from user org or env

let currentOrganizationId: string | null = null;

export function setOrganizationId(id: string | null) {
  currentOrganizationId = id;
}

// ─── Seed Function ────────────────────────────────────────────────────────────────
export async function seedDatabase(): Promise<void> {
  return sql("seed_database");
}

export async function resetDatabase(): Promise<void> {
  return sql("reset_database");
}

export async function resetAndSeedDatabase(): Promise<void> {
  await resetDatabase();
  return sql("seed_database");
}

// ─── Multi-Tenancy Types ──────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  status: "active" | "suspended" | "trial";
}

// ─── Multi-Store Types ────────────────────────────────────────────────────────
export interface Store {
  id: string;
  organization_id?: string;
  name: string;
  industry:
    | "food"
    | "retail"
    | "pharmacy"
    | "gift_shop"
    | "salon_spa"
    | "repair_shop";
  is_active: boolean;
  created_at: string;
}

export interface StoreConfig {
  store_id: string;
  organization_id?: string;
  settings: string; // JSON string
}

// ─── Data Types ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
  product_id: string;
  store_id: string;
  serial_number: string;
  status: "available" | "sold" | "returned" | "defective";
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
  store_id: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card" | "upi" | "wallet" | "store_credit";
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  payment_status?: "paid" | "unpaid" | "partial";
  status:
    | "completed"
    | "refunded"
    | "hold"
    | "cancelled"
    | "pending"
    | "processing";
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
  organization_id?: string;
  store_id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  position_x: number;
  position_y: number;
}

export interface StaffAttendance {
  id: string;
  organization_id?: string;
  store_id: string;
  user_id: string;
  user_name: string;
  clock_in: string;
  clock_out: string | null;
  date: string;
}

export interface StaffSalary {
  id: string;
  organization_id?: string;
  store_id: string;
  staff_id: string;
  staff_name: string;
  amount: number;
  total_hours: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id?: string;
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
  tax_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  enable_round_off: boolean;
  auto_reminders_enabled: boolean;
  auto_reminder_days: number;
  license_agreed: boolean;
  onboarding_completed: boolean;
  license_key: string;
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
  organization_id?: string;
  store_id: string;
  name: string;
  stock: number;
  unit: string;
  reorder_level: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  organization_id?: string;
  store_id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
}

export interface Supplier {
  id: string;
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  table_name?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
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
  organization_id?: string;
  store_id: string;
  order_id: string;
  action: string;
  previous_data: string | null;
  new_data: string | null;
  reason: string;
  userId: string;
  user_name: string;
  created_at: string;
}

// ─── Neon Client ──────────────────────────────────────────────────────────────
const getNeonClient = () => {
  const url = process.env.NEXT_PUBLIC_NEON_URL;
  if (!url) return null;
  return neon(url);
};

export async function dbInitNeon(): Promise<void> {
  const sql = getNeonClient();
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'trial'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT REFERENCES organizations(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      pin TEXT,
      role TEXT DEFAULT 'cashier',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      organization_id TEXT REFERENCES organizations(id),
      name TEXT NOT NULL,
      industry TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

// ─── Invoke wrapper ────────────────────────────────────────────────────────────
async function sql<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const enhancedArgs = currentOrganizationId
    ? { organizationId: currentOrganizationId, ...args }
    : args;

  if (IS_TAURI) {
    return invoke<T>(cmd, enhancedArgs);
  }

  // Neon Web Fallback (If URL is provided, use Neon, otherwise use localStorage)
  const neonClient = getNeonClient();
  if (neonClient && !cmd.startsWith("get_premium")) {
    try {
      if (cmd === "register") {
        const { orgName, email, password } = enhancedArgs as any;
        const orgId = Math.random().toString(36).substr(2, 9);
        const userId = Math.random().toString(36).substr(2, 9);

        await neonClient`INSERT INTO organizations (id, name, email) VALUES (${orgId}, ${orgName}, ${email})`;
        await neonClient`INSERT INTO users (id, organization_id, name, email, password_hash, role, pin)
                         VALUES (${userId}, ${orgId}, 'Admin', ${email}, ${password}, 'admin', '1234')`;
        await neonClient`INSERT INTO stores (id, organization_id, name, industry) VALUES ('default', ${orgId}, 'Main Store', 'food')`;

        return (await browserFallback(cmd, enhancedArgs)) as T;
      }

      if (cmd === "login") {
        const { email, password } = enhancedArgs as any;
        const rows =
          await neonClient`SELECT u.*, o.name as org_name FROM users u
                                      JOIN organizations o ON u.organization_id = o.id
                                      WHERE u.email = ${email} AND u.password_hash = ${password}`;
        if (rows.length > 0) {
          return (await browserFallback(cmd, enhancedArgs)) as T;
        }
      }

      dbLogger.debug(`Scaffolding for ${cmd}`, enhancedArgs);
    } catch (e) {
      dbLogger.error("Neon execution failed", e);
    }
  }

  // Browser fallback (dev without Tauri)
  return browserFallback<T>(
    enhancedArgs ? (enhancedArgs as any).cmd || cmd : cmd,
    enhancedArgs,
  );
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
  return sql<Product[]>("get_products", { storeId });
}

export async function dbSaveProduct(
  product: Product,
  storeId: string,
): Promise<void> {
  return sql("upsert_product", { product, storeId });
}

export async function dbDeleteProduct(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_product", { id, storeId });
}

export async function dbGetProductVariants(
  productId: string,
  storeId: string,
): Promise<ProductVariant[]> {
  return sql<ProductVariant[]>("get_product_variants", { productId, storeId });
}

export async function dbSaveProductVariant(
  variant: ProductVariant,
  storeId: string,
): Promise<void> {
  return sql("save_product_variant", { variant, storeId });
}

export async function dbDeleteProductVariant(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_product_variant", { id, storeId });
}

export async function dbUpdateStock(
  id: string,
  delta: number,
  storeId: string,
  userId: string,
): Promise<void> {
  return sql("update_stock", { id, delta, storeId, userId });
}

export async function dbTransferStock(
  id: string,
  fromStore: string,
  toStore: string,
  qty: number,
  userId: string,
): Promise<void> {
  return sql("transfer_stock", { id, fromStore, toStore, qty, userId });
}

export async function dbGetBatches(
  productId: string,
  storeId: string,
): Promise<Batch[]> {
  return sql<Batch[]>("get_batches", { productId, storeId });
}

export async function dbSaveBatch(batch: Batch): Promise<void> {
  return sql("save_batch", { batch });
}

export async function dbGetSerialNumbers(
  productId: string,
  storeId: string,
): Promise<SerialNumber[]> {
  return sql<SerialNumber[]>("get_serial_numbers", { productId, storeId });
}

export async function dbSaveSerialNumber(serial: SerialNumber): Promise<void> {
  return sql("save_serial_number", { serial });
}

export async function dbGetInventoryTransactions(
  productId: string,
  storeId: string,
): Promise<InventoryTransaction[]> {
  return sql<InventoryTransaction[]>("get_inventory_transactions", {
    productId,
    storeId,
  });
}

export async function dbGetAllInventoryTransactions(
  storeId: string,
): Promise<InventoryTransaction[]> {
  return sql<InventoryTransaction[]>("get_all_inventory_transactions", {
    storeId,
  });
}

export async function dbCalculateValuation(
  storeId: string,
  method: "AVG" | "FIFO" | "LIFO",
): Promise<number> {
  return sql<number>("calculate_inventory_valuation", { storeId, method });
}

export async function dbGetStockCounts(storeId: string): Promise<StockCount[]> {
  return sql<StockCount[]>("get_stock_counts", { storeId });
}

export async function dbSaveStockCount(count: StockCount): Promise<void> {
  return sql("save_stock_count", { count });
}

// ─── Combos ──────────────────────────────────────────────────────────────────
export async function dbGetCombos(storeId: string): Promise<Combo[]> {
  return sql<Combo[]>("get_combos", { storeId });
}

export async function dbSaveCombo(
  combo: Combo,
  storeId: string,
): Promise<void> {
  return sql("save_combo", { combo, storeId });
}

export async function dbDeleteCombo(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_combo", { id, storeId });
}

export async function dbToggleCombo(
  id: string,
  isActive: boolean,
  storeId: string,
): Promise<void> {
  return sql("toggle_combo", { id, active: isActive, storeId });
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function dbGetOrders(
  storeId: string,
  limit?: number,
  offset?: number,
): Promise<Order[]> {
  return sql<Order[]>("get_orders", { storeId, limit, offset });
}

export async function dbSaveOrder(
  order: Order,
  storeId: string,
): Promise<void> {
  return sql("save_order", { order, storeId });
}

export async function dbRefundOrder(
  id: string,
  storeId: string,
  userId: string = "system",
  userName: string = "System",
): Promise<void> {
  return sql("refund_order", { id, storeId, userId, userName });
}

export async function updateDeliveryStatus(
  id: string,
  status: string,
  storeId: string,
): Promise<void> {
  return sql("update_delivery_status", { id, status, storeId });
}

export async function dbUpdateOrderStatus(
  id: string,
  status: string,
  storeId: string,
): Promise<void> {
  return sql("update_order_status", { id, status, storeId });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function dbGetSettings(storeId: string): Promise<Settings> {
  return sql<Settings>("get_settings", { storeId });
}

export async function dbSaveSettings(
  settings: Settings,
  storeId: string,
): Promise<void> {
  return sql("save_settings", { settings, storeId });
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function dbGetDailySummary(storeId: string) {
  return sql<{
    revenue: number;
    transactions: number;
    avg_order: number;
    items_sold: number;
  }>("get_daily_summary", { storeId });
}

export async function dbGetWeeklyRevenue(storeId: string) {
  return sql<{ label: string; revenue: number }[]>("get_weekly_revenue", {
    storeId,
  });
}

export async function dbGetTopProducts(storeId: string) {
  return sql<{ name: string; qty: number; revenue: number }[]>(
    "get_top_products",
    { storeId },
  );
}

export async function dbGetLowStock(storeId: string) {
  return sql<{ name: string; stock: number }[]>("get_low_stock", { storeId });
}

export async function getSalesByPaymentMethod(
  date: string,
  storeId: string,
): Promise<{ cash: number; upi: number; card: number }> {
  const result = await sql<[number, number, number]>(
    "get_sales_by_payment_method",
    { date, storeId },
  );
  return { cash: result[0], upi: result[1], card: result[2] };
}

// ─── CSV Import/Export ─────────────────────────────────────────────────────
export async function exportProductsCsv(storeId: string): Promise<string> {
  return sql<string>("export_products_csv", { storeId });
}

export async function exportOrdersCsv(storeId: string): Promise<string> {
  return sql<string>("export_orders_csv", { storeId });
}

export async function importProductsCsv(
  csvData: string,
  storeId: string,
): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_products_csv", {
    csvData,
    storeId,
  });
}

// ─── Reports ───────────────────────────────────────────────────────────────
export async function getSalesReport(
  startDate: string,
  endDate: string,
  storeId: string,
) {
  return sql<{
    start_date: string;
    end_date: string;
    total_revenue: number;
    total_orders: number;
    avg_order: number;
  }>("get_sales_report", { startDate, endDate, storeId });
}

// ─── Users ─────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  organization_id?: string;
  name: string;
  email: string;
  role: string;
  store_id?: string;
  hourly_rate: number;
  pin?: string;
  password?: string; // Only used for browser fallback/internal logic
  created_at?: string;
}

export async function dbRegister(
  orgName: string,
  email: string,
  password: string,
): Promise<{ user: User; organization: Organization }> {
  return sql<{ user: User; organization: Organization }>("register", {
    orgName,
    email,
    password,
  });
}

export async function dbLogin(
  email: string,
  password: string,
): Promise<{ user: User; organization: Organization } | null> {
  return sql<{ user: User; organization: Organization } | null>("login", {
    email,
    password,
  });
}

export async function dbForgotPassword(email: string): Promise<boolean> {
  return sql<boolean>("forgot_password", { email });
}

export async function dbResetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<boolean> {
  return sql<boolean>("reset_password", { email, code, newPassword });
}

export async function dbForgotUser(email: string): Promise<boolean> {
  return sql<boolean>("forgot_user", { email });
}

export async function verifyPin(
  pin: string,
  organizationId: string,
): Promise<User | null> {
  return sql<User | null>("verify_pin", {
    pin,
    organization_id: organizationId,
  });
}

/**
 * Offline-only PIN authentication
 * Used in offline mode to login with just PIN and organization ID
 * Returns both user and organization data
 */
export async function loginWithPinOffline(
  pin: string,
  organizationId: string,
): Promise<{ user: User; organization: Organization } | null> {
  return sql<{ user: User; organization: Organization } | null>(
    "login_with_pin_offline",
    {
      pin,
      organization_id: organizationId,
    },
  );
}

export async function changePin(userId: string, newPin: string): Promise<void> {
  return sql("change_pin", { userId, newPin });
}

export async function getUsers(): Promise<User[]> {
  return sql<User[]>("get_users");
}

export async function dbUpsertUser(user: User): Promise<void> {
  return sql("upsert_user", { user });
}

export async function dbDeleteUser(id: string): Promise<void> {
  return sql("delete_user", { id });
}

export async function dbGetAttendanceByRange(
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<StaffAttendance[]> {
  return sql<StaffAttendance[]>("get_attendance_by_range", {
    store_id: storeId,
    start_date: startDate,
    end_date: endDate,
  });
}

export async function dbSaveSalary(salary: StaffSalary): Promise<void> {
  return sql("save_salary", { salary });
}

export async function dbGetSalaries(storeId: string): Promise<StaffSalary[]> {
  return sql<StaffSalary[]>("get_salaries", { storeId });
}

// ─── Backup ─────────────────────────────────────────────────────────────────
export async function exportBackup(storeId: string): Promise<string> {
  return sql<string>("export_backup", { storeId });
}

export async function importBackup(
  backupJson: string,
  storeId: string,
): Promise<{ products_imported: number; orders_imported: number }> {
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
    jsonString = pako.ungzip(bytes, { to: "string" });
  } catch {
    // Not gzipped base64, treat as plain JSON string
  }

  return sql<{ products_imported: number; orders_imported: number }>(
    "import_backup",
    { backupJson: jsonString, storeId },
  );
}

// ─── Activity Logs ─────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string;
  organization_id?: string;
  store_id: string;
  order_id: string;
  action: string;
  previous_data: string | null;
  new_data: string | null;
  reason: string;
  userId: string;
  user_name: string;
  created_at: string;
}

export async function dbAddActivityLog(
  storeId: string,
  action: string,
  reason: string,
  userId: string,
  userName: string,
  orderId?: string,
  previousData?: string,
  newData?: string,
): Promise<void> {
  return sql("add_activity_log", {
    storeId,
    action,
    reason,
    userId,
    userName,
    orderId,
    previousData,
    newData,
  });
}

export async function getActivityLogs(
  storeId: string,
  limit: number = 100,
): Promise<ActivityLog[]> {
  return sql<ActivityLog[]>("get_activity_logs", { storeId, limit });
}

// ─── Tables ───────────────────────────────────────────────────────────────────
export async function dbGetTables(storeId: string): Promise<Table[]> {
  return sql<Table[]>("get_tables", { storeId });
}

export async function dbSaveTable(
  table: Table,
  storeId: string,
): Promise<void> {
  return sql("save_table", { table, storeId });
}

export async function dbDeleteTable(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_table", { id, storeId });
}

export async function dbUpdateTableStatus(
  id: string,
  status: string,
  storeId: string,
): Promise<void> {
  return sql("update_table_status", { id, status, storeId });
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────
export async function dbClockIn(
  userId: string,
  userName: string,
  storeId: string,
): Promise<void> {
  return sql("clock_in", { userId, userName, storeId });
}

export async function dbClockOut(
  userId: string,
  storeId: string,
): Promise<void> {
  return sql("clock_out", { userId, storeId });
}

export async function dbGetTodayAttendance(
  storeId: string,
): Promise<StaffAttendance[]> {
  return sql<StaffAttendance[]>("get_today_attendance", { storeId });
}

export async function dbIsClockedIn(
  userId: string,
  storeId: string,
): Promise<boolean> {
  return sql<boolean>("is_clocked_in", { userId, storeId });
}

// ─── Customers ──────────────────────────────────────────────────────────────
export async function dbGetCustomers(storeId: string): Promise<Customer[]> {
  return sql<Customer[]>("get_customers", { storeId });
}

export async function dbSaveCustomer(
  customer: Customer,
  storeId: string,
): Promise<void> {
  return sql("save_customer", { customer, storeId });
}

export async function dbDeleteCustomer(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_customer", { id, storeId });
}

export async function dbGetCustomerAddresses(
  customerId: string,
): Promise<CustomerAddress[]> {
  return sql<CustomerAddress[]>("get_customer_addresses", {
    customerId: customerId,
  });
}

export async function dbSaveCustomerAddress(
  address: CustomerAddress,
): Promise<void> {
  return sql("save_customer_address", { address });
}

export async function dbDeleteCustomerAddress(id: string): Promise<void> {
  return sql("delete_customer_address", { id });
}

export async function exportCustomersCsv(storeId: string): Promise<string> {
  return sql<string>("export_customers_csv", { storeId });
}

export async function importCustomersCsv(
  csvData: string,
  storeId: string,
): Promise<{ imported: number; errors: number }> {
  return sql<{ imported: number; errors: number }>("import_customers_csv", {
    csvData,
    storeId,
  });
}

export async function dbGetCustomerStatistics(
  customerId: string,
): Promise<CustomerStatistics> {
  return sql<CustomerStatistics>("get_customer_statistics", {
    customerId: customerId,
  });
}

export async function dbGetCustomerByPhone(
  phone: string,
  storeId: string,
): Promise<Customer | null> {
  return sql<Customer | null>("get_customer_by_phone", { phone, storeId });
}

export async function dbAddLoyaltyPoints(
  customerId: string,
  points: number,
  spent: number,
  storeId: string,
): Promise<void> {
  return sql("add_loyalty_points", {
    customerId: customerId,
    points,
    spent,
    storeId,
  });
}

export async function dbGetCustomerOrders(
  phone: string,
  storeId: string,
): Promise<Order[]> {
  return sql<Order[]>("get_customer_orders", { phone, storeId });
}

export async function dbGetCustomerUnpaidOrders(
  customerId: string,
  storeId: string,
): Promise<Order[]> {
  return sql<Order[]>("get_customer_unpaid_orders", { customerId, storeId });
}

export async function dbSettleOrderPayment(
  orderId: string,
  amount: number,
  paymentMethod: string,
  storeId: string,
): Promise<void> {
  return sql("settle_order_payment", {
    orderId,
    amount,
    paymentMethod,
    storeId,
  });
}

// ─── Order Notes ────────────────────────────────────────────────────────────
export async function dbAddOrderNote(
  orderId: string,
  note: string,
  storeId: string,
): Promise<void> {
  return sql("add_order_note", { orderId, note, storeId });
}

export async function dbGetOrderNotes(
  orderId: string,
  storeId: string,
): Promise<OrderNote[]> {
  return sql<OrderNote[]>("get_order_notes", { orderId, storeId });
}

// ─── Inventory Alerts ───────────────────────────────────────────────────────
export async function dbGetInventoryAlerts(
  storeId: string,
): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("get_inventory_alerts", { storeId });
}

export async function dbCheckInventoryAlerts(
  storeId: string,
): Promise<InventoryAlert[]> {
  return sql<InventoryAlert[]>("check_inventory_alerts", { storeId });
}

export async function dbCreateInventoryAlert(
  alert: InventoryAlert,
  storeId: string,
): Promise<void> {
  return sql("create_inventory_alert", { alert, storeId });
}

export async function dbClearInventoryAlert(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("clear_inventory_alert", { id, storeId });
}

// ─── Enhanced Reports ───────────────────────────────────────────────────────
export async function dbGetHourlySales(
  date: string,
  storeId: string,
): Promise<HourlySales[]> {
  return sql<HourlySales[]>("get_hourly_sales", { date, storeId });
}

export async function dbGetStaffPerformance(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<StaffPerformance[]> {
  return sql<StaffPerformance[]>("get_staff_performance", {
    startDate,
    endDate,
    storeId,
  });
}

export async function dbGetSalesByItem(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<SalesByItem[]> {
  return sql<SalesByItem[]>("get_sales_by_item", {
    startDate,
    endDate,
    storeId,
  });
}

// ─── Hold & Cancel ──────────────────────────────────────────────────────────
export async function dbHoldOrder(
  order: Order,
  storeId: string,
): Promise<void> {
  return sql("hold_order", { order, storeId });
}

export async function dbGetHeldOrders(storeId: string): Promise<Order[]> {
  return sql<Order[]>("get_held_orders", { storeId });
}

export async function dbCancelOrder(
  id: string,
  reason: string,
  userId: string,
  userName: string,
  storeId: string,
): Promise<void> {
  return sql("cancel_order", { id, reason, userId, userName, storeId });
}

// ─── Refunds ───────────────────────────────────────────────────────────────
export async function dbCreateRefundRequest(
  orderId: string,
  amount: number,
  reason: string,
  storeId: string,
): Promise<string> {
  return sql<string>("create_refund_request", {
    orderId,
    amount,
    reason,
    storeId,
  });
}

export async function dbGetRefundRequests(
  storeId: string,
): Promise<RefundRequest[]> {
  return sql<RefundRequest[]>("get_refund_requests", { storeId });
}

export async function dbApproveRefund(
  id: string,
  userId: string,
  userName: string,
  storeId: string,
): Promise<void> {
  return sql("approve_refund", { id, userId, userName, storeId });
}

export async function dbRejectRefund(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("reject_refund", { id, storeId });
}

// ─── Crash Recovery ─────────────────────────────────────────────────────────
export async function dbGetPendingOrdersCount(
  storeId: string,
): Promise<number> {
  return sql<number>("get_pending_orders_count", { storeId });
}

export async function dbGetPendingOrders(storeId: string): Promise<Order[]> {
  return sql<Order[]>("get_pending_orders", { storeId });
}

export async function dbDeletePendingOrder(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_pending_order", { id, storeId });
}

// ─── Hardware Integration ───────────────────────────────────────────────────
export async function printToPrinter(
  receipt: string,
  printerName?: string,
): Promise<void> {
  return sql("print_to_printer", { receipt, printerName });
}

export async function printReceipt(receipt: string): Promise<void> {
  return sql("print_receipt", { receipt });
}

export async function openCashDrawer(): Promise<void> {
  return sql("open_cash_drawer");
}

export async function saveReceiptToFile(
  receipt: string,
  fileName: string,
): Promise<string> {
  return sql<string>("save_receipt_to_file", { receipt, fileName });
}

export async function openWhatsAppShare(receipt: string): Promise<void> {
  return sql("open_whatsapp_share", { receipt });
}

export async function openEmailShare(
  receipt: string,
  subject: string,
): Promise<void> {
  return sql("open_email_share", { receipt, subject });
}

// ─── Neon Sync ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS,
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

export async function syncToNeon(
  storeId: string,
): Promise<{ synced: number; error?: string }> {
  try {
    return await retryWithBackoff(() =>
      sql<{ synced: number; error?: string }>("sync_to_neon", { storeId }),
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    dbLogger.error("Neon sync failed after retries", errorMsg);
    return {
      synced: 0,
      error: `Sync failed: ${errorMsg}. Please check your connection and try again.`,
    };
  }
}

export async function syncFromNeon(
  storeId: string,
): Promise<{ synced: number; error?: string }> {
  try {
    const result = await retryWithBackoff(() =>
      sql<{ synced: number; error?: string }>("sync_from_neon", { storeId }),
    );
    // After sync, deduplicate to handle potential conflicts
    await deduplicateData();
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    dbLogger.error("Neon import failed after retries", errorMsg);
    return {
      synced: 0,
      error: `Import failed: ${errorMsg}. Please check your connection and try again.`,
    };
  }
}

// TODO: Implement deduplication logic in Rust backend to remove duplicates after sync
export async function deduplicateData() {
  dbLogger.info(
    "Deduplication called - implement in Rust for proper conflict resolution",
  );
  // Placeholder: In Rust, run SQL to delete duplicates based on unique fields
  // e.g., DELETE FROM products WHERE id NOT IN (SELECT MIN(id) FROM products GROUP BY sku)
}

// TODO: Implement delta sync in Rust backend to sync only changed data
export async function deltaSyncToNeon(
  storeId: string,
  since: string,
): Promise<{ synced: number; error?: string }> {
  dbLogger.info("Delta sync called - implement in Rust", { storeId, since });
  // Placeholder: Call sync_to_neon_delta command
  return { synced: 0, error: "Delta sync not implemented" };
}

export async function deltaSyncFromNeon(
  storeId: string,
  since: string,
): Promise<{ synced: number; error?: string }> {
  dbLogger.info("Delta sync from called - implement in Rust", {
    storeId,
    since,
  });
  // Placeholder: Call sync_from_neon_delta command
  return { synced: 0, error: "Delta sync not implemented" };
}

export interface PremiumStatus {
  enabled: boolean;
  source: "env" | "license" | "license_file" | "trial" | "none";
  trial_days_left: number;
  trial_expiry: string | null;
}

export async function getPremiumStatus(): Promise<PremiumStatus> {
  return sql<PremiumStatus>("get_premium_status");
}

export async function isPremiumEnabled(): Promise<boolean> {
  return sql<boolean>("is_premium_enabled");
}

export async function getAppVersion(): Promise<string> {
  return sql<string>("get_app_version");
}

export interface AppUpdateMetadata {
  latest_version: string;
  changelog: string[];
  download_url: string;
  critical: boolean;
}

export async function checkAppUpdates(): Promise<AppUpdateMetadata> {
  // Mock logic to simulate update check
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    latest_version: "1.0.1",
    changelog: [
      "Optimized database performance during high-volume sales.",
      "Added Support Center for better user assistance.",
      "Fixed UI glitch in Table Manager on smaller screens.",
      "Enhanced printer compatibility for 80mm thermal printers.",
    ],
    download_url: "https://www.appixen.com/pos-billing/download",
    critical: false,
  };
}

// ─── Cart Calculation (pure JS, no DB needed) ─────────────────────────────────
export function calcCart(
  items: {
    product: Product;
    quantity: number;
    discount: number;
    discount_type?: "percentage" | "fixed";
    override_price?: number;
  }[],
  globalDiscount = 0,
  globalDiscountType: "percentage" | "fixed" = "percentage",
  taxInclusive = false,
  globalTaxRate?: number,
  isGST = false,
) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  if (taxInclusive) {
    // For inclusive tax, prices include tax, so calculate backwards
    items.forEach((item) => {
      const price =
        item.override_price !== undefined
          ? item.override_price
          : item.product.price;
      const line = price * item.quantity; // This includes tax
      const rate = item.product.tax;

      // For GST, use global tax rate split
      const effectiveRate = isGST && globalTaxRate ? globalTaxRate : rate;
      // Calculate tax and taxable from inclusive price
      const itemTax = (line * effectiveRate) / (100 + effectiveRate);
      const itemTaxable = line - itemTax;

      const itemDisc =
        item.discount_type === "fixed"
          ? item.discount
          : itemTaxable * (item.discount / 100); // Discount on taxable amount

      const afterDiscTaxable = Math.max(0, itemTaxable - itemDisc);
      const afterDiscTax = (afterDiscTaxable * rate) / 100;
      const afterDisc = afterDiscTaxable + afterDiscTax;

      subtotal += afterDisc;
      discountAmount += itemDisc;
      taxAmount += afterDiscTax;
    });

    // Global discount applied to subtotal (which includes tax)
    const globalDisc =
      globalDiscountType === "fixed"
        ? globalDiscount
        : subtotal * (globalDiscount / 100);

    discountAmount += globalDisc;
    const finalSubtotal = Math.max(0, subtotal - globalDisc);

    return {
      subtotal: finalSubtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total: finalSubtotal,
    };
  } else {
    // Exclusive tax (current logic)
    items.forEach((item) => {
      const price =
        item.override_price !== undefined
          ? item.override_price
          : item.product.price;
      const line = price * item.quantity;
      const itemDisc =
        item.discount_type === "fixed"
          ? item.discount
          : line * (item.discount / 100);

      const afterDisc = Math.max(0, line - itemDisc);
      subtotal += afterDisc;
      discountAmount += itemDisc;
    });

    const globalDisc =
      globalDiscountType === "fixed"
        ? globalDiscount
        : subtotal * (globalDiscount / 100);

    discountAmount += globalDisc;
    const taxableSubtotal = Math.max(0, subtotal - globalDisc);

    // Calculate tax on taxable amounts
    items.forEach((item) => {
      const price =
        item.override_price !== undefined
          ? item.override_price
          : item.product.price;
      const line = price * item.quantity;
      const itemDisc =
        item.discount_type === "fixed"
          ? item.discount
          : line * (item.discount / 100);
      const afterDisc = Math.max(0, line - itemDisc);

      // Proportion of global discount to this item
      const itemGlobalDisc =
        subtotal > 0 ? (afterDisc / subtotal) * globalDisc : 0;
      const itemTaxable = Math.max(0, afterDisc - itemGlobalDisc);
      // For GST, use global tax rate
      const effectiveRate =
        isGST && globalTaxRate ? globalTaxRate : item.product.tax;
      const tax = itemTaxable * (effectiveRate / 100);
      taxAmount += tax;
    });

    const total = Math.max(0, taxableSubtotal + taxAmount);

    return {
      subtotal: taxableSubtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total,
    };
  }
}

// ─── Receipt ──────────────────────────────────────────────────────────────────
export function generateReceipt(
  order: Order,
  settings: Settings,
  isPaymentRequest: boolean = false,
): string {
  const c = settings.currency_symbol;
  const isIndia =
    settings.country === "IN" ||
    settings.country === "India" ||
    settings.currency_symbol === "₹" ||
    settings.currency === "INR";
  const lines: string[] = [];
  const W = 40;

  const center = (t: string) => {
    const pad = Math.max(0, Math.floor((W - t.length) / 2));
    return " ".repeat(pad) + t;
  };

  // 1. Logo
  if (settings.show_logo_on_receipt && settings.logo_url) {
    lines.push(`[LOGO: ${settings.logo_url}]`);
  }

  // 2. Header
  lines.push("=".repeat(W));
  lines.push(center(settings.store_name.toUpperCase()));
  if (settings.address) lines.push(center(settings.address));
  if (isIndia && settings.tax_id)
    lines.push(center(`GSTIN: ${settings.tax_id}`));
  if (settings.phone) lines.push(center(`Contact: ${settings.phone}`));
  lines.push("=".repeat(W));

  // 3. Invoice Info
  const title = isIndia ? "TAX INVOICE" : "RECEIPT ID";
  lines.push(`${title.padEnd(12)}: #${order.id.slice(-6).toUpperCase()}`);
  lines.push("-".repeat(W));

  const created = new Date(order.created_at);
  const dateStr = created.toLocaleDateString();
  const timeStr = created.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  lines.push(`Date: ${dateStr.padEnd(15)} Time: ${timeStr}`);

  const typeStr = (order.order_type || "dine_in").toUpperCase();
  const staffStr = order.user_name || "Admin";
  lines.push(`Type: ${typeStr.padEnd(15)} Staff: ${staffStr}`);

  if (order.customer_name) lines.push(`Customer: ${order.customer_name}`);
  if (order.table_id) lines.push(`Table:    ${order.table_id}`);
  lines.push("-".repeat(W));

  // 4. Items Table
  if (isIndia) {
    lines.push(`ITEMS             QTY    RATE     AMOUNT`);
  } else {
    lines.push(`DESCRIPTION       QTY    PRICE     TOTAL`);
  }
  lines.push("-".repeat(W));

  order.items.forEach((i) => {
    const name =
      i.product_name.length > 17
        ? i.product_name.slice(0, 14) + "..."
        : i.product_name;
    const qty = i.quantity.toString().padStart(3);
    const rate = i.price.toFixed(2).padStart(8);
    const amount = (i.price * i.quantity).toFixed(2).padStart(10);
    lines.push(`${name.padEnd(17)} ${qty} ${rate} ${amount}`);
    if (i.discount > 0) {
      const discAmt = (i.price * i.quantity * i.discount) / 100;
      lines.push(`  (Discount -${c}${discAmt.toFixed(2)})`);
    }
  });
  lines.push("-".repeat(W));

  // 5. Totals
  const L = 25;
  const V = W - L;

  lines.push(
    `${"SUBTOTAL:".padEnd(L)}${c}${order.subtotal.toFixed(2).padStart(V - 1)}`,
  );

  if (order.tax_amount > 0) {
    const taxRate = settings.tax_rate || 0;
    if (isIndia) {
      const split = order.tax_amount / 2;
      const halfRate = taxRate / 2;
      lines.push(
        `${"CGST (" + halfRate + "%):".padEnd(L)}${c}${split.toFixed(2)}`,
      );
      lines.push(
        `${"SGST (" + halfRate + "%):".padEnd(L)}${c}${split.toFixed(2)}`,
      );
    } else {
      const taxName = settings.tax_name || "TAX";
      lines.push(
        `${(taxName + " (" + taxRate + "%):").padEnd(L)}${c}${order.tax_amount.toFixed(2).padStart(V - 1)}`,
      );
    }
  }

  if (order.discount_amount > 0) {
    lines.push(
      `${"DISCOUNT:".padEnd(23)}-${c}${Math.abs(order.discount_amount)
        .toFixed(2)
        .padStart(V - 2)}`,
    );
  }

  if (order.tip_amount && order.tip_amount > 0) {
    lines.push(
      `${"TIP:".padEnd(L)}${c}${order.tip_amount.toFixed(2).padStart(V - 1)}`,
    );
  }

  lines.push("-".repeat(W));

  if (settings.enable_round_off) {
    const rounded = Math.round(order.total * 100) / 100;
    const roundingOff = rounded - order.total;
    lines.push(
      `${"TOTAL AMOUNT:".padEnd(L)}${c} ${order.total.toFixed(2).padStart(14)}`,
    );
    lines.push(
      `${"ROUND OFF:".padEnd(L)}${roundingOff >= 0 ? "(+) " : "(-) "}${c} ${Math.abs(roundingOff).toFixed(2).padStart(14)}`,
    );
    lines.push(
      `${"NET PAYABLE:".padEnd(L)}${c} ${rounded.toFixed(2).padStart(14)}`,
    );
    lines.push(center("Amount rounded to nearest paise"));

    // QR Code for India
    if (isIndia && settings.upi_id) {
      const upiUrl = `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.store_name)}&am=${rounded.toFixed(2)}&cu=INR`;
      lines.push(`[QRCODE: ${upiUrl}]`);
    }
  } else {
    lines.push(
      `${"GRAND TOTAL:".padEnd(L)}${c} ${order.total.toFixed(2).padStart(14)}`,
    );
  }

  lines.push("-".repeat(W));

  // 7. Footer
  if (settings.footer_text) {
    lines.push(center(settings.footer_text));
  } else {
    lines.push(center("Thank you! Visit again."));
  }
  lines.push(center("Powered by AppIXEN"));
  lines.push("=".repeat(W));

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
  if (!raw) return null;
  let data = SENSITIVE_KEYS.includes(key)
    ? (() => {
        try {
          return CryptoJS.AES.decrypt(raw, ENCRYPTION_KEY).toString(
            CryptoJS.enc.Utf8,
          );
        } catch {
          return raw; // fallback to plain text if not encrypted
        }
      })()
    : raw;
  if (!data || !data.trim()) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  const data = JSON.stringify(val);
  const encrypted = SENSITIVE_KEYS.includes(key)
    ? CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString()
    : data;
  localStorage.setItem(key, encrypted);
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
    auto_reminders_enabled: false,
    auto_reminder_days: 30,
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
    enable_round_off: true,
    license_agreed: false,
    onboarding_completed: false,
    license_key: "",
  };
}

function seedProducts(storeId: string): Product[] {
  return [
    {
      id: `p1_${storeId}`,
      store_id: storeId,
      name: "Coffee",
      price: 120,
      cost_price: 50,
      wholesale_price: 100,
      category: "Beverages",
      subcategory: "Hot Coffee",
      stock: 100,
      barcode: "001",
      sku: "COF-001",
      description: "Rich blend coffee",
      tax: 5,
      status: "active",
      tags: "hot,morning",
      is_digital: false,
      is_favorite: true,
    },
    {
      id: `p2_${storeId}`,
      store_id: storeId,
      name: "Tea",
      price: 60,
      cost_price: 20,
      wholesale_price: 50,
      category: "Beverages",
      subcategory: "Hot Tea",
      stock: 150,
      barcode: "002",
      sku: "TEA-002",
      description: "Green tea",
      tax: 5,
      status: "active",
      tags: "hot,healthy",
      is_digital: false,
      is_favorite: false,
    },
    {
      id: `p3_${storeId}`,
      store_id: storeId,
      name: "Sandwich",
      price: 180,
      cost_price: 80,
      wholesale_price: 150,
      category: "Food",
      subcategory: "Snacks",
      stock: 50,
      barcode: "003",
      sku: "SND-003",
      description: "Club sandwich",
      tax: 12,
      status: "active",
      tags: "snack,lunch",
      is_digital: false,
      is_favorite: false,
    },
    {
      id: `p4_${storeId}`,
      store_id: storeId,
      name: "Burger",
      price: 250,
      cost_price: 120,
      wholesale_price: 220,
      category: "Food",
      subcategory: "Main Course",
      stock: 40,
      barcode: "004",
      sku: "BRG-004",
      description: "Beef burger",
      tax: 12,
      status: "active",
      tags: "heavy,dinner",
      is_digital: false,
      is_favorite: true,
    },
  ];
}

async function browserFallback<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const storeId =
    (args?.storeId as string) ||
    (args?.store_id as string) ||
    process.env.NEXT_PUBLIC_DEFAULT_STORE_ID ||
    "default";

  // Initialize seed data if not present
  const initSeedData = () => {
    if (!lsGet("pos_initialized")) {
      lsSet(LS.stores, [
        {
          id: "default",
          name: process.env.NEXT_PUBLIC_DEFAULT_STORE_NAME || "Main Store",
          industry: (process.env.NEXT_PUBLIC_DEFAULT_INDUSTRY as any) || "food",
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: "retail1",
          name: "Fashion Boutique",
          industry: "retail",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      lsSet(
        LS.products,
        seedProducts("default").concat(seedProducts("retail1")),
      );
      lsSet(LS.settings, {
        default: { ...defaultSettings(), onboarding_completed: true },
        retail1: { ...defaultSettings(), onboarding_completed: true },
      });
      lsSet("pos_organizations", [
        {
          id: "default",
          name: "Default Organization",
          email: "admin@example.com",
          created_at: new Date().toISOString(),
          status: "trial",
        },
      ]);
      lsSet("pos_users", [
        {
          id: "admin",
          organization_id: "default",
          name: "Administrator",
          email: "admin@example.com",
          password: "admin123",
          role: "admin",
          hourly_rate: 0,
          pin: "1234",
        },
        {
          id: "cashier",
          organization_id: "default",
          name: "Cashier",
          email: "cashier@example.com",
          password: "cashier123",
          role: "cashier",
          hourly_rate: 0,
          pin: "0000",
        },
      ]);
      lsSet("pos_initialized", true);
    }
    if (!lsGet("pos_tables") || lsGet<any[]>("pos_tables")?.length === 0) {
      lsSet("pos_tables", [
        {
          id: "t1",
          store_id: "default",
          name: "Table 1",
          capacity: 4,
          status: "available",
          position_x: 100,
          position_y: 100,
        },
        {
          id: "t2",
          store_id: "default",
          name: "Table 2",
          capacity: 2,
          status: "available",
          position_x: 250,
          position_y: 100,
        },
        {
          id: "t3",
          store_id: "default",
          name: "Table 3",
          capacity: 6,
          status: "available",
          position_x: 100,
          position_y: 250,
        },
      ]);
    }
  };
  initSeedData();

  // Simulate async
  await new Promise((r) => setTimeout(r, 0));

  switch (cmd) {
    case "seed_database":
      initSeedData();
      return undefined as T;
    case "reset_database":
      lsSet(LS.products, []);
      lsSet(LS.orders, []);
      lsSet("pos_customers", []);
      lsSet("pos_ingredients", []);
      lsSet("pos_recipes", []);
      lsSet("pos_tables", []);
      lsSet("pos_attendance", []);
      lsSet("pos_expenses", []);
      lsSet("pos_coupons", []);
      lsSet("pos_held_orders", []);
      lsSet("pos_reconciliations", []);
      lsSet("pos_reservations", []);
      lsSet("pos_purchase_orders", []);
      lsSet("pos_suppliers", []);
      return undefined as T;
    case "get_stores": {
      const orgId = (args as any).organizationId;
      const s = lsGet<Store[]>(LS.stores) || [];
      return s.filter((x) => !orgId || x.organization_id === orgId) as T;
    }
    case "upsert_store": {
      const stores = lsGet<Store[]>(LS.stores) || [];
      const s = (args as any).store as Store;
      const idx = stores.findIndex((x) => x.id === s.id);
      if (idx >= 0) stores[idx] = s;
      else stores.push(s);
      lsSet(LS.stores, stores);
      return undefined as T;
    }
    case "get_products": {
      const orgId = (args as any).organizationId;
      const p = lsGet<Product[]>(LS.products) || [];
      return p.filter(
        (x) =>
          x.store_id === storeId && (!orgId || x.organization_id === orgId),
      ) as T;
    }
    case "upsert_product": {
      const orgId = (args as any).organizationId;
      const products = lsGet<Product[]>(LS.products) || [];
      const p = (args as any).product as Product;
      p.store_id = storeId;
      if (orgId) p.organization_id = orgId;
      // Scoped findIndex
      const idx = products.findIndex(
        (x) =>
          x.id === p.id &&
          x.store_id === storeId &&
          (!orgId || x.organization_id === orgId),
      );
      if (idx >= 0) products[idx] = p;
      else products.push(p);
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "transfer_stock": {
      const products = lsGet<Product[]>(LS.products) || [];
      const { id, fromStore, toStore, qty } = args as any;
      const fromIdx = products.findIndex(
        (p) => p.id === id && p.store_id === fromStore,
      );
      const toIdx = products.findIndex(
        (p) => p.id === id && p.store_id === toStore,
      );
      if (fromIdx >= 0) products[fromIdx].stock -= qty;
      if (toIdx >= 0) products[toIdx].stock += qty;
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "delete_product": {
      const products = (lsGet<Product[]>(LS.products) || []).filter(
        (p) => !(p.id === (args as any).id && p.store_id === storeId),
      );
      lsSet(LS.products, products);
      return undefined as T;
    }
    case "get_orders": {
      const orgId = (args as any).organizationId;
      const orders = lsGet<Order[]>(LS.orders) || [];
      return orders.filter(
        (o) =>
          o.store_id === storeId && (!orgId || o.organization_id === orgId),
      ) as T;
    }
    case "save_order": {
      const orgId = (args as any).organizationId;
      const o = (args as any).order as Order;
      o.store_id = storeId;
      if (orgId) o.organization_id = orgId;
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
      return tables.filter((t) => t.store_id === storeId) as T;
    }
    case "save_table": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      const t = (args as any).table as Table;
      const idx = tables.findIndex((x) => x.id === t.id);
      if (idx >= 0) tables[idx] = t;
      else tables.push(t);
      lsSet("pos_tables", tables);
      return undefined as T;
    }
    case "delete_table": {
      const tables = (lsGet<Table[]>("pos_tables") || []).filter(
        (t) => t.id !== (args as any).id,
      );
      lsSet("pos_tables", tables);
      return undefined as T;
    }
    case "update_table_status": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      const { id, status } = args as any;
      const idx = tables.findIndex((t) => t.id === id);
      if (idx >= 0) tables[idx].status = status;
      lsSet("pos_tables", tables);
      return undefined as T;
    }
    case "register": {
      console.log("[register] Creating new organization");
      const { orgName, email, password } = args as any;

      // Validate inputs
      if (!orgName?.trim() || !email?.trim() || !password?.trim()) {
        throw new Error("Organization name, email, and password are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Check if email already exists
      const existingUsers = lsGet<User[]>("pos_users") || [];
      if (
        existingUsers.some(
          (u) => u.email?.toLowerCase() === email.toLowerCase(),
        )
      ) {
        throw new Error("Email already registered");
      }

      const orgId = Math.random().toString(36).substr(2, 9);
      const userId = Math.random().toString(36).substr(2, 9);
      const storeId = Math.random().toString(36).substr(2, 9);

      // Store password as-is in localStorage (note: in production use bcrypt)
      // For PIN, use default "1234"
      const organization: Organization = {
        id: orgId,
        name: orgName,
        email,
        created_at: new Date().toISOString(),
        status: "trial",
      };
      const user: User = {
        id: userId,
        organization_id: orgId,
        name: "Admin",
        email,
        role: "admin",
        hourly_rate: 0,
        pin: "1234", // Default PIN for new users
        password, // Store password for login with credentials
        created_at: new Date().toISOString(),
        store_id: storeId,
      };

      // Create a default store for the new organization
      const store: Store = {
        id: storeId,
        organization_id: orgId,
        name: "Main Store",
        industry: "food",
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Add store
      const stores = lsGet<Store[]>(LS.stores) || [];
      stores.push(store);
      lsSet(LS.stores, stores);

      // Add organization and user
      const orgs = lsGet<Organization[]>("pos_organizations") || [];
      orgs.push(organization);
      lsSet("pos_organizations", orgs);

      const users = lsGet<User[]>("pos_users") || [];
      users.push(user);
      lsSet("pos_users", users);

      // Seed products for the new organization's store
      const products = lsGet<Product[]>(LS.products) || [];
      const newProducts = seedProducts(storeId).map((p) => ({
        ...p,
        organization_id: orgId,
      }));
      lsSet(LS.products, [...products, ...newProducts]);

      console.log("[register] Successfully created organization:", orgId);
      return { user, organization } as T;
    }
    case "login": {
      const { email, password } = args as any;

      // Validate inputs
      if (!email?.trim() || !password?.trim()) {
        throw new Error("Email and password are required");
      }

      console.log("[login] Attempting login with email:", email);
      const users = lsGet<User[]>("pos_users") || [];
      const user = users.find(
        (u) =>
          u.email?.toLowerCase() === email.toLowerCase() &&
          u.password === password,
      );

      if (user) {
        const orgs = lsGet<Organization[]>("pos_organizations") || [];
        const organization = orgs.find((o) => o.id === user.organization_id);

        if (!organization) {
          throw new Error("Organization not found for user");
        }

        console.log(
          "[login] Login successful for:",
          email,
          "orgId:",
          user.organization_id,
        );
        return { user, organization } as T;
      }

      console.log("[login] Login failed: Invalid credentials");
      return null as T;
    }
    case "forgot_password": {
      const { email } = args as any;
      const users = lsGet<User[]>("pos_users") || [];
      const user = users.find((u) => u.email === email);
      if (user) {
        dbLogger.info(`Recovery code sent to ${email}`, { simulation: true });
        return true as T;
      }
      return false as T;
    }
    case "reset_password": {
      const { email, code, newPassword } = args as any;
      if (code !== "123456") return false as T;
      const users = lsGet<User[]>("pos_users") || [];
      const idx = users.findIndex((u) => u.email === email);
      if (idx >= 0) {
        users[idx].password = newPassword;
        lsSet("pos_users", users);
        return true as T;
      }
      return false as T;
    }
    case "forgot_user": {
      const { email } = args as any;
      const users = lsGet<User[]>("pos_users") || [];
      const user = users.find((u) => u.email === email);
      if (user) {
        dbLogger.info(`Username info sent to ${email}`, {
          name: user.name,
          simulation: true,
        });
        return true as T;
      }
      return false as T;
    }
    case "verify_pin": {
      const pin = (args as any).pin;
      const orgId =
        (args as any).organization_id || (args as any).organizationId;

      // Validate inputs
      if (!pin?.trim() || !orgId?.trim()) {
        throw new Error("PIN and organization ID are required");
      }

      if (pin.length < 4) {
        throw new Error("PIN must be at least 4 digits");
      }

      console.log("[verify_pin] Verifying PIN for orgId:", orgId);
      const users = lsGet<User[]>("pos_users") || [];
      const user = users.find(
        (u) => u.pin === pin && u.organization_id === orgId,
      );

      if (user) {
        console.log(
          "[verify_pin] PIN verified successfully for user:",
          user.id,
        );
        return user as T;
      }

      console.log("[verify_pin] PIN verification failed");
      return null as T;
    }
    case "login_with_pin_offline": {
      const pin = (args as any).pin;
      const orgId =
        (args as any).organization_id || (args as any).organizationId;

      // Validate inputs
      if (!pin?.trim() || !orgId?.trim()) {
        throw new Error("PIN and organization ID are required");
      }

      if (pin.length < 4) {
        throw new Error("PIN must be at least 4 digits");
      }

      console.log(
        "[login_with_pin_offline] Attempting PIN-only login for orgId:",
        orgId,
      );

      // Get user with matching PIN and organization
      const users = lsGet<User[]>("pos_users") || [];
      const user = users.find(
        (u) => u.pin === pin && u.organization_id === orgId,
      );

      if (!user) {
        console.log("[login_with_pin_offline] PIN verification failed");
        return null as T;
      }

      // Get corresponding organization
      const orgs = lsGet<Organization[]>("pos_organizations") || [];
      const organization = orgs.find((o) => o.id === orgId);

      if (!organization) {
        console.log("[login_with_pin_offline] Organization not found");
        return null as T;
      }

      console.log(
        "[login_with_pin_offline] PIN-only login successful for user:",
        user.id,
      );
      return { user, organization } as T;
    }
    case "get_daily_summary": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const today = new Date().toISOString().split("T")[0];
      const filtered = orders.filter(
        (o) =>
          o.store_id === storeId &&
          o.status === "completed" &&
          o.created_at.split("T")[0] === today,
      );
      const revenue = filtered.reduce((s, o) => s + o.total, 0);
      const transactions = filtered.length;
      const items_sold = filtered.reduce(
        (s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0),
        0,
      );
      return {
        revenue,
        transactions,
        avg_order: transactions > 0 ? revenue / transactions : 0,
        items_sold,
      } as T;
    }
    case "get_weekly_revenue":
      return [] as T;
    case "get_top_products":
      return [] as T;
    case "get_low_stock":
      return [] as T;
    case "get_ingredients": {
      const items = lsGet<Ingredient[]>("pos_ingredients") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "get_recipes": {
      const items = lsGet<Recipe[]>("pos_recipes") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "get_tables": {
      const tables = lsGet<Table[]>("pos_tables") || [];
      return tables.filter((t) => t.store_id === storeId) as T;
    }
    case "get_customer_wallet": {
      const customerId = (args as any).customerId;
      const wallets = lsGet<CustomerWallet[]>("pos_wallets") || [];
      let w = wallets.find((x) => x.customer_id === customerId);
      if (!w) {
        w = {
          customer_id: customerId,
          balance: 0,
          total_loaded: 0,
          total_spent: 0,
        };
      }
      return w as T;
    }
    case "add_wallet_balance": {
      const { customerId, amount, notes } = args as any;
      const wallets = lsGet<CustomerWallet[]>("pos_wallets") || [];
      let idx = wallets.findIndex((x) => x.customer_id === customerId);
      if (idx >= 0) {
        wallets[idx].balance += amount;
        wallets[idx].total_loaded += amount > 0 ? amount : 0;
      } else {
        wallets.push({
          customer_id: customerId,
          balance: amount,
          total_loaded: amount > 0 ? amount : 0,
          total_spent: 0,
        });
      }
      lsSet("pos_wallets", wallets);

      const txs = lsGet<WalletTransaction[]>("pos_wallet_transactions") || [];
      txs.push({
        id: Math.random().toString(36).substr(2, 9),
        customer_id: customerId,
        amount,
        transaction_type: amount > 0 ? "credit" : "debit",
        notes,
        created_at: new Date().toISOString(),
      });
      lsSet("pos_wallet_transactions", txs);
      return undefined as T;
    }
    case "deduct_wallet_balance": {
      const { customerId, amount, orderId } = args as any;
      const wallets = lsGet<CustomerWallet[]>("pos_wallets") || [];
      let idx = wallets.findIndex((x) => x.customer_id === customerId);
      if (idx >= 0) {
        wallets[idx].balance -= amount;
        wallets[idx].total_spent += amount;
      } else {
        wallets.push({
          customer_id: customerId,
          balance: -amount,
          total_loaded: 0,
          total_spent: amount,
        });
      }
      lsSet("pos_wallets", wallets);

      const txs = lsGet<WalletTransaction[]>("pos_wallet_transactions") || [];
      txs.push({
        id: Math.random().toString(36).substr(2, 9),
        customer_id: customerId,
        amount: -amount,
        transaction_type: "debit",
        order_id: orderId,
        notes: `Order ${orderId}`,
        created_at: new Date().toISOString(),
      });
      lsSet("pos_wallet_transactions", txs);
      return undefined as T;
    }
    case "get_customers": {
      const c = lsGet<Customer[]>("pos_customers") || [];
      return c.filter((x) => x.store_id === storeId) as T;
    }
    case "get_expenses": {
      const items = lsGet<Expense[]>("pos_expenses") || [];
      return items.filter(
        (x) => x.store_id === storeId && x.date === (args as any).date,
      ) as T;
    }
    case "get_expenses_by_range": {
      const items = lsGet<Expense[]>("pos_expenses") || [];
      const { start_date, end_date } = args as any;
      return items.filter(
        (x) =>
          x.store_id === storeId && x.date >= start_date && x.date <= end_date,
      ) as T;
    }
    case "get_coupons": {
      const items = lsGet<Coupon[]>("pos_coupons") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "get_today_attendance": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "get_kds_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const tables = lsGet<Table[]>("pos_tables") || [];
      const today = new Date().toISOString().split("T")[0];
      return orders
        .filter(
          (o) =>
            o.store_id === storeId &&
            o.created_at.split("T")[0] === today &&
            ["completed", "pending", "processing"].includes(o.status),
        )
        .map((o) => {
          const table = tables.find((t) => t.id === o.table_id);
          return {
            id: o.id,
            order_type: o.order_type,
            customer_name: o.customer_name,
            table_name: table?.name,
            created_at: o.created_at,
            items: o.items.map((i) => ({
              product_name: i.product_name,
              quantity: i.quantity,
              done: i.done || false,
              status: i.status || (i.done ? "done" : "pending"),
            })),
          };
        }) as T;
    }
    case "get_pending_orders_count": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      return orders.filter(
        (o) => o.store_id === storeId && o.status === "pending",
      ).length as T;
    }
    case "get_lan_server_status":
      return { running: false, port: 0, connected_clients: 0 } as T;
    case "get_sales_by_payment_method": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { date } = args as any;
      const filtered = orders.filter(
        (o) =>
          o.store_id === storeId &&
          o.status === "completed" &&
          o.created_at.split("T")[0] === date,
      );
      const get = (m: string) =>
        filtered
          .filter((o) => o.payment_method === m)
          .reduce((s, o) => s + o.total, 0);
      return [get("cash"), get("upi"), get("card")] as T;
    }
    case "get_day_end_reconciliation": {
      const recs = lsGet<DayEndReconciliation[]>("pos_reconciliations") || [];
      const { date } = args as any;
      return (recs.find((r) => r.store_id === storeId && r.date === date) ||
        null) as T;
    }
    case "save_day_end_reconciliation": {
      const recs = lsGet<DayEndReconciliation[]>("pos_reconciliations") || [];
      const rec = (args as any).reconciliation as DayEndReconciliation;
      rec.store_id = storeId;
      const idx = recs.findIndex(
        (r) => r.store_id === storeId && r.date === rec.date,
      );
      if (idx >= 0) recs[idx] = rec;
      else recs.push(rec);
      lsSet("pos_reconciliations", recs);
      return undefined as T;
    }
    case "get_expense_categories": {
      const items = lsGet<ExpenseCategory[]>("pos_expense_categories") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "get_product_variants": {
      const items = lsGet<ProductVariant[]>("pos_product_variants") || [];
      return items.filter(
        (x) =>
          x.product_id === (args as any).product_id && x.store_id === storeId,
      ) as T;
    }
    case "save_product_variant": {
      const items = lsGet<ProductVariant[]>("pos_product_variants") || [];
      const v = (args as any).variant as ProductVariant;
      v.store_id = storeId;
      const idx = items.findIndex((x) => x.id === v.id);
      if (idx >= 0) items[idx] = v;
      else items.push(v);
      lsSet("pos_product_variants", items);
      return undefined as T;
    }
    case "delete_product_variant": {
      const items = (
        lsGet<ProductVariant[]>("pos_product_variants") || []
      ).filter((x) => !(x.id === (args as any).id && x.store_id === storeId));
      lsSet("pos_product_variants", items);
      return undefined as T;
    }
    case "update_order_status": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const id = (args as any).id;
      const status = (args as any).status;
      const idx = orders.findIndex(
        (o) => o.id === id && o.store_id === storeId,
      );
      if (idx >= 0) orders[idx].status = status;
      lsSet(LS.orders, orders);
      return undefined as T;
    }
    case "get_combos":
      return [] as T;
    case "get_customers": {
      const c = lsGet<Customer[]>("pos_customers") || [];
      return c.filter((x) => x.store_id === storeId) as T;
    }
    case "save_customer": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = (args as any).customer as Customer;
      c.store_id = storeId;
      const idx = customers.findIndex((x) => x.id === c.id);
      if (idx >= 0) customers[idx] = c;
      else customers.push(c);
      lsSet("pos_customers", customers);
      return undefined as T;
    }
    case "delete_customer": {
      const customers = (lsGet<Customer[]>("pos_customers") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_customers", customers);
      return undefined as T;
    }
    case "get_customer_addresses": {
      const a = lsGet<CustomerAddress[]>("pos_customer_addresses") || [];
      return a.filter((x) => x.customer_id === (args as any).customerId) as T;
    }
    case "save_customer_address": {
      const addresses =
        lsGet<CustomerAddress[]>("pos_customer_addresses") || [];
      const a = (args as any).address as CustomerAddress;
      const idx = addresses.findIndex((x) => x.id === a.id);
      if (idx >= 0) addresses[idx] = a;
      else addresses.push(a);
      lsSet("pos_customer_addresses", addresses);
      return undefined as T;
    }
    case "delete_customer_address": {
      const addresses = (
        lsGet<CustomerAddress[]>("pos_customer_addresses") || []
      ).filter((x) => x.id !== (args as any).id);
      lsSet("pos_customer_addresses", addresses);
      return undefined as T;
    }
    case "export_customers_csv": {
      const c = lsGet<Customer[]>("pos_customers") || [];
      const filtered = c.filter((x) => x.store_id === storeId);
      const header = [
        "id",
        "name",
        "phone",
        "email",
        "loyalty_points",
        "total_spent",
        "visits",
        "group_name",
        "notes",
        "birthday",
        "anniversary",
        "credit_limit",
        "price_tier",
        "loyalty_tier",
      ];
      const rows = filtered.map((x) => [
        x.id,
        x.name,
        x.phone,
        x.email,
        x.loyalty_points.toString(),
        x.total_spent.toString(),
        x.visits.toString(),
        x.group_name || "",
        x.notes || "",
        x.birthday || "",
        x.anniversary || "",
        (x.credit_limit || 0).toString(),
        x.price_tier || "",
        x.loyalty_tier || "",
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
        .join("\n");
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
        const parts = line
          .split(",")
          .map((p) => p.replace(/^"|"$/g, "").replace(/""/g, '"'));
        if (parts.length < 3) {
          errors++;
          continue;
        }
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
          tax_id: parts[14] || "",
          created_at: new Date().toISOString(),
        };
        const idx = customers.findIndex((x) => x.id === c.id);
        if (idx >= 0) customers[idx] = c;
        else customers.push(c);
        imported++;
      }
      lsSet("pos_customers", customers);
      return { imported, errors } as T;
    }
    case "get_customer_statistics": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const c = customers.find((x) => x.id === (args as any).customerId);
      if (!c) return { total_spent: 0, visits: 0, avg_order_value: 0 } as T;
      return {
        total_spent: c.total_spent,
        visits: c.visits,
        avg_order_value: c.visits > 0 ? c.total_spent / c.visits : 0,
      } as T;
    }
    case "get_customer_by_phone": {
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const { phone } = args as any;
      const c = customers.find(
        (x) => x.phone === phone && x.store_id === storeId,
      );
      return (c || null) as T;
    }
    case "get_customer_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { phone } = args as any;
      return orders.filter(
        (o) =>
          (o.delivery_phone === phone || o.customer_name === phone) &&
          o.store_id === storeId,
      ) as T;
    }
    case "get_customer_unpaid_orders": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { customerId } = args as any;
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const customer = customers.find((c) => c.id === customerId);
      if (!customer) return [] as T;

      return orders.filter(
        (o) =>
          o.store_id === storeId &&
          (o.customer_name === customer.name ||
            o.delivery_phone === customer.phone) &&
          o.payment_status === "unpaid" &&
          o.status !== "cancelled",
      ) as T;
    }
    case "settle_order_payment": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { orderId, amount, paymentMethod } = args as any;
      const idx = orders.findIndex(
        (o) => o.id === orderId && o.store_id === storeId,
      );
      if (idx >= 0) {
        orders[idx].amount_paid += amount;
        if (orders[idx].amount_paid >= orders[idx].total) {
          orders[idx].payment_status = "paid";
        } else {
          orders[idx].payment_status = "partial";
        }
        lsSet(LS.orders, orders);
      }
      return undefined as T;
    }
    case "get_ingredients": {
      const items = lsGet<Ingredient[]>("pos_ingredients") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "save_ingredient": {
      const items = lsGet<Ingredient[]>("pos_ingredients") || [];
      const i = (args as any).ingredient as Ingredient;
      const idx = items.findIndex((x) => x.id === i.id);
      if (idx >= 0) items[idx] = i;
      else items.push(i);
      lsSet("pos_ingredients", items);
      return undefined as T;
    }
    case "delete_ingredient": {
      const items = (lsGet<Ingredient[]>("pos_ingredients") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_ingredients", items);
      return undefined as T;
    }
    case "get_recipes": {
      const items = lsGet<Recipe[]>("pos_recipes") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "save_recipe": {
      const items = lsGet<Recipe[]>("pos_recipes") || [];
      const r = (args as any).recipe as Recipe;
      const idx = items.findIndex((x) => x.id === r.id);
      if (idx >= 0) items[idx] = r;
      else items.push(r);
      lsSet("pos_recipes", items);
      return undefined as T;
    }
    case "get_suppliers": {
      const items = lsGet<Supplier[]>("pos_suppliers") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "save_supplier": {
      const items = lsGet<Supplier[]>("pos_suppliers") || [];
      const s = (args as any).supplier as Supplier;
      s.store_id = storeId;
      const idx = items.findIndex((x) => x.id === s.id);
      if (idx >= 0) items[idx] = s;
      else items.push(s);
      lsSet("pos_suppliers", items);
      return undefined as T;
    }
    case "delete_supplier": {
      const items = (lsGet<Supplier[]>("pos_suppliers") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_suppliers", items);
      return undefined as T;
    }
    case "get_purchase_orders": {
      const items = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "save_purchase_order": {
      const items = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const po = (args as any).po as PurchaseOrder;
      po.store_id = storeId;
      const idx = items.findIndex((x) => x.id === po.id);
      if (idx >= 0) items[idx] = po;
      else items.push(po);
      lsSet("pos_purchase_orders", items);
      return undefined as T;
    }
    case "update_po_status": {
      const items = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const { id, status } = args as any;
      const idx = items.findIndex((x) => x.id === id);
      if (idx >= 0) items[idx].status = status;
      lsSet("pos_purchase_orders", items);
      return undefined as T;
    }
    case "receive_purchase_order": {
      const items = lsGet<PurchaseOrder[]>("pos_purchase_orders") || [];
      const { id } = args as any;
      const idx = items.findIndex((x) => x.id === id);
      if (idx >= 0) {
        items[idx].status = "received";
        // Mock stock adjustment for ingredients
        const ingredients = lsGet<Ingredient[]>("pos_ingredients") || [];
        items[idx].items.forEach((item) => {
          const ingIdx = ingredients.findIndex(
            (i) => i.id === item.ingredient_id,
          );
          if (ingIdx >= 0) ingredients[ingIdx].stock += item.quantity;
        });
        lsSet("pos_ingredients", ingredients);
      }
      lsSet("pos_purchase_orders", items);
      return undefined as T;
    }
    case "get_reservations": {
      const items = lsGet<Reservation[]>("pos_reservations") || [];
      const { date } = args as any;
      return items.filter(
        (x) => x.store_id === storeId && x.date === date,
      ) as T;
    }
    case "save_reservation": {
      const items = lsGet<Reservation[]>("pos_reservations") || [];
      const r = (args as any).reservation as Reservation;
      r.store_id = storeId;
      const idx = items.findIndex((x) => x.id === r.id);
      if (idx >= 0) items[idx] = r;
      else items.push(r);
      lsSet("pos_reservations", items);
      return undefined as T;
    }
    case "delete_reservation": {
      const items = (lsGet<Reservation[]>("pos_reservations") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_reservations", items);
      return undefined as T;
    }
    case "get_shifts":
      return [] as T;
    case "get_expenses": {
      const items = lsGet<Expense[]>("pos_expenses") || [];
      return items.filter(
        (x) => x.store_id === storeId && x.date === (args as any).date,
      ) as T;
    }
    case "hold_order": {
      const o = (args as any).order as Order;
      o.store_id = storeId;
      const held = lsGet<Order[]>("pos_held_orders") || [];
      held.unshift(o);
      lsSet("pos_held_orders", held);
      return undefined as T;
    }
    case "get_held_orders": {
      const held = lsGet<Order[]>("pos_held_orders") || [];
      return held.filter((o) => o.store_id === storeId) as T;
    }
    case "delete_pending_order": {
      const id = (args as any).id;
      const held = lsGet<Order[]>("pos_held_orders") || [];
      lsSet(
        "pos_held_orders",
        held.filter((o) => o.id !== id),
      );
      return undefined as T;
    }
    case "get_expenses_by_range": {
      const items = lsGet<Expense[]>("pos_expenses") || [];
      const { start_date, end_date } = args as any;
      return items.filter(
        (x) =>
          x.store_id === storeId && x.date >= start_date && x.date <= end_date,
      ) as T;
    }
    case "save_expense": {
      const items = lsGet<Expense[]>("pos_expenses") || [];
      const e = (args as any).expense as Expense;
      const idx = items.findIndex((x) => x.id === e.id);
      if (idx >= 0) items[idx] = e;
      else items.push(e);
      lsSet("pos_expenses", items);
      return undefined as T;
    }
    case "delete_expense": {
      const items = (lsGet<Expense[]>("pos_expenses") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_expenses", items);
      return undefined as T;
    }
    case "save_expense_category": {
      const items = lsGet<ExpenseCategory[]>("pos_expense_categories") || [];
      const c = (args as any).category as ExpenseCategory;
      const idx = items.findIndex((x) => x.id === c.id);
      if (idx >= 0) items[idx] = c;
      else items.push(c);
      lsSet("pos_expense_categories", items);
      return undefined as T;
    }
    case "get_coupons": {
      const items = lsGet<Coupon[]>("pos_coupons") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "save_coupon": {
      const items = lsGet<Coupon[]>("pos_coupons") || [];
      const c = (args as any).coupon as Coupon;
      const idx = items.findIndex((x) => x.id === c.id);
      if (idx >= 0) items[idx] = c;
      else items.push(c);
      lsSet("pos_coupons", items);
      return undefined as T;
    }
    case "delete_coupon": {
      const items = (lsGet<Coupon[]>("pos_coupons") || []).filter(
        (x) => x.id !== (args as any).id,
      );
      lsSet("pos_coupons", items);
      return undefined as T;
    }
    case "get_refund_requests":
      return [] as T;
    case "get_activity_logs":
      return [] as T;
    case "get_inventory_alerts":
      return [] as T;
    case "check_inventory_alerts":
      return [] as T;
    case "get_users": {
      const orgId = (args as any).organizationId;
      const users = lsGet<User[]>("pos_users") || [
        {
          id: "admin",
          organization_id: "default",
          name: "Administrator",
          email: "admin@example.com",
          password: "admin123",
          role: "admin",
          hourly_rate: 0,
        },
        {
          id: "cashier",
          organization_id: "default",
          name: "Cashier",
          email: "cashier@example.com",
          password: "cashier123",
          role: "cashier",
          hourly_rate: 0,
        },
      ];
      return users.filter((x) => !orgId || x.organization_id === orgId) as T;
    }
    case "upsert_user": {
      const users = lsGet<User[]>("pos_users") || [
        { id: "admin", name: "Administrator", role: "admin", hourly_rate: 0 },
        { id: "cashier", name: "Cashier", role: "cashier", hourly_rate: 0 },
      ];
      const u = (args as any).user as User;
      const idx = users.findIndex((x) => x.id === u.id);
      if (idx >= 0) users[idx] = u;
      else users.push(u);
      lsSet("pos_users", users);
      return undefined as T;
    }
    case "delete_user": {
      const users = lsGet<User[]>("pos_users") || [];
      const filtered = users.filter((x) => x.id !== (args as any).id);
      lsSet("pos_users", filtered);
      return undefined as T;
    }
    case "get_attendance_by_range": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const { start_date, end_date } = args as any;
      return items.filter(
        (x) =>
          x.store_id === storeId && x.date >= start_date && x.date <= end_date,
      ) as T;
    }
    case "save_salary": {
      const salaries = lsGet<StaffSalary[]>("pos_salaries") || [];
      const s = (args as any).salary as StaffSalary;
      salaries.push(s);
      lsSet("pos_salaries", salaries);
      // Also add to expenses
      const expenses = lsGet<Expense[]>("pos_expenses") || [];
      expenses.push({
        id: Math.random().toString(36).substr(2, 9),
        store_id: s.store_id,
        category: "Salary",
        amount: s.amount,
        description: `Salary for ${s.staff_name} (${s.period_start} - ${s.period_end})`,
        date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
      });
      lsSet("pos_expenses", expenses);
      return undefined as T;
    }
    case "get_salaries": {
      const salaries = lsGet<StaffSalary[]>("pos_salaries") || [];
      return salaries.filter((x) => x.store_id === storeId) as T;
    }
    case "get_today_attendance": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      return items.filter((x) => x.store_id === storeId) as T;
    }
    case "clock_in": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const { userId, userName } = args as any;
      items.push({
        id: Math.random().toString(36).substr(2, 9),
        store_id: storeId,
        user_id: userId,
        user_name: userName,
        clock_in: new Date().toISOString(),
        clock_out: null,
        date: new Date().toISOString().split("T")[0],
      });
      lsSet("pos_attendance", items);
      return undefined as T;
    }
    case "clock_out": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const { userId } = args as any;
      const idx = items.findIndex(
        (x) => x.user_id === userId && !x.clock_out && x.store_id === storeId,
      );
      if (idx >= 0) items[idx].clock_out = new Date().toISOString();
      lsSet("pos_attendance", items);
      return undefined as T;
    }
    case "is_clocked_in": {
      const items = lsGet<StaffAttendance[]>("pos_attendance") || [];
      const { userId } = args as any;
      return items.some(
        (x) => x.user_id === userId && !x.clock_out && x.store_id === storeId,
      ) as T;
    }
    case "get_premium_status": {
      const isEnv = process.env.NEXT_PUBLIC_ENABLE_PREMIUM === "true";
      const allSettings = lsGet<Record<string, Settings>>(LS.settings) || {};
      const hasLicense = Object.values(allSettings).some((s) =>
        (s.license_key || "").startsWith("PREM-"),
      );

      if (isEnv)
        return {
          enabled: true,
          source: "env",
          trial_days_left: 0,
          trial_expiry: null,
        } as T;
      if (hasLicense)
        return {
          enabled: true,
          source: "license",
          trial_days_left: 0,
          trial_expiry: null,
        } as T;

      // Mock trial for browser fallback: 180 days from first access
      let firstAccess = lsGet<string>("pos_first_access");
      if (!firstAccess) {
        firstAccess = new Date().toISOString();
        lsSet("pos_first_access", firstAccess);
      }
      const expiry = new Date(firstAccess);
      expiry.setDate(expiry.getDate() + 183);
      const daysLeft = Math.ceil(
        (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        enabled: daysLeft > 0,
        source: daysLeft > 0 ? "trial" : "none",
        trial_days_left: Math.max(0, daysLeft),
        trial_expiry: expiry.toISOString(),
      } as T;
    }
    case "is_premium_enabled": {
      if (process.env.NEXT_PUBLIC_ENABLE_PREMIUM === "true") return true as T;
      const allSettings = lsGet<Record<string, Settings>>(LS.settings) || {};
      const hasLicense = Object.values(allSettings).some((s) =>
        (s.license_key || "").startsWith("PREM-"),
      );
      if (hasLicense) return true as T;

      // Trial check
      const firstAccess = lsGet<string>("pos_first_access");
      if (firstAccess) {
        const expiry = new Date(firstAccess);
        expiry.setDate(expiry.getDate() + 183);
        return (expiry.getTime() > new Date().getTime()) as T;
      }
      return false as T;
    }
    case "get_app_version":
      return "1.0.0" as any as T;
    case "get_gstr1_report": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const customers = lsGet<Customer[]>("pos_customers") || [];
      const { startDate, endDate } = args as any;
      return orders
        .filter(
          (o) =>
            o.store_id === storeId &&
            o.status === "completed" &&
            o.created_at.split("T")[0] >= startDate &&
            o.created_at.split("T")[0] <= endDate,
        )
        .map((o) => {
          const c = customers.find(
            (x) => x.name === o.customer_name && x.store_id === storeId,
          );
          return {
            invoice_no: o.id,
            date: o.created_at.split("T")[0],
            customer_name: o.customer_name,
            customer_gstin: c?.tax_id || "",
            taxable_value: o.subtotal,
            cgst: o.tax_amount / 2,
            sgst: o.tax_amount / 2,
            igst: 0,
            total: o.total,
            place_of_supply: "Local",
          };
        }) as T;
    }
    case "get_gstr3b_report": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { startDate, endDate } = args as any;
      const filtered = orders.filter(
        (o) =>
          o.store_id === storeId &&
          o.status === "completed" &&
          o.created_at.split("T")[0] >= startDate &&
          o.created_at.split("T")[0] <= endDate,
      );
      const taxable = filtered.reduce((s, o) => s + o.subtotal, 0);
      const tax = filtered.reduce((s, o) => s + o.tax_amount, 0);
      return [taxable, tax / 2, tax / 2, 0, tax, 0] as T;
    }
    case "export_backup": {
      const p = lsGet<Product[]>(LS.products) || [];
      const o = lsGet<Order[]>(LS.orders) || [];
      const s =
        (lsGet<Record<string, Settings>>(LS.settings) || {})[storeId] ||
        defaultSettings();
      const data = {
        products: p.filter((x) => x.store_id === storeId),
        orders: o.filter((x) => x.store_id === storeId),
        settings: s,
        exported_at: new Date().toISOString(),
      };
      return btoa(JSON.stringify(data)) as T;
    }
    case "import_backup": {
      const data = JSON.parse((args as any).backupJson);
      const products = lsGet<Product[]>(LS.products) || [];
      const orders = lsGet<Order[]>(LS.orders) || [];
      const settings = lsGet<Record<string, Settings>>(LS.settings) || {};

      data.products.forEach((p: Product) => {
        const idx = products.findIndex(
          (x) => x.id === p.id && x.store_id === storeId,
        );
        if (idx >= 0) products[idx] = p;
        else products.push(p);
      });
      data.orders.forEach((o: Order) => {
        const idx = orders.findIndex(
          (x) => x.id === o.id && x.store_id === storeId,
        );
        if (idx >= 0) orders[idx] = o;
        else orders.push(o);
      });
      settings[storeId] = data.settings;

      lsSet(LS.products, products);
      lsSet(LS.orders, orders);
      lsSet(LS.settings, settings);

      return {
        products_imported: data.products.length,
        orders_imported: data.orders.length,
      } as T;
    }
    case "export_orders_csv": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const filtered = orders.filter((o) => o.store_id === storeId);
      const header = [
        "id",
        "total",
        "payment_method",
        "customer",
        "status",
        "order_type",
        "created_at",
      ];
      const rows = filtered.map((o) => [
        o.id,
        o.total.toString(),
        o.payment_method,
        o.customer_name,
        o.status,
        o.order_type,
        o.created_at,
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
        .join("\n");
      return csv as T;
    }
    case "export_products_csv": {
      const p = lsGet<Product[]>(LS.products) || [];
      const variants = lsGet<ProductVariant[]>("pos_product_variants") || [];
      const filtered = p.filter((x) => x.store_id === storeId);
      const header = [
        "id",
        "parent_id",
        "name",
        "price",
        "cost_price",
        "wholesale_price",
        "category",
        "subcategory",
        "stock",
        "barcode",
        "sku",
        "description",
        "tax",
        "status",
        "tags",
        "is_digital",
        "is_favorite",
        "image_url",
        "metadata",
        "variant_value",
      ];
      const rows: string[][] = [];

      filtered.forEach((x) => {
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
          "", // variant_value
        ]);

        // Export variants for this product
        variants
          .filter((v) => v.product_id === x.id && v.store_id === storeId)
          .forEach((v) => {
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
              v.value,
            ]);
          });
      });

      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
        .join("\n");
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
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
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

        let id,
          parent_id,
          name,
          price,
          cost_price,
          wholesale_price,
          category,
          subcategory,
          stock,
          barcode,
          sku,
          description,
          tax,
          status,
          tags,
          is_digital,
          is_favorite,
          image_url,
          metadata,
          variant_value;

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
          try {
            metadata = parts[18] ? JSON.parse(parts[18]) : {};
          } catch {
            metadata = {};
          }
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
          try {
            metadata = parts[17] ? JSON.parse(parts[17]) : {};
          } catch {
            metadata = {};
          }
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
          cost_price = 0;
          wholesale_price = 0;
          subcategory = "";
          sku = "";
          description = "";
          status = "active";
          tags = "";
          is_digital = false;
          is_favorite = false;
          image_url = "";
          metadata = {};
          variant_value = "";
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
            stock: stock,
          };
          const idx = variants.findIndex(
            (x) => x.id === v.id && x.store_id === storeId,
          );
          if (idx >= 0) variants[idx] = v;
          else variants.push(v);
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
            metadata: metadata,
          };
          const idx = products.findIndex(
            (x) => x.id === p.id && x.store_id === storeId,
          );
          if (idx >= 0) products[idx] = p;
          else products.push(p);
          imported++;
        }
      }
      lsSet(LS.products, products);
      lsSet("pos_product_variants", variants);
      return { imported, errors } as T;
    }
    case "start_preparing_item": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { order_id, item_index } = args as any;
      const idx = orders.findIndex((o) => o.id === order_id);
      if (idx >= 0 && orders[idx].items[item_index]) {
        orders[idx].items[item_index].status = "preparing";
        orders[idx].items[item_index].started_at = new Date().toISOString();
        lsSet(LS.orders, orders);
      }
      return undefined as T;
    }
    case "mark_kds_item_done": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { order_id, item_index } = args as any;
      const idx = orders.findIndex((o) => o.id === order_id);
      if (idx >= 0 && orders[idx].items[item_index]) {
        orders[idx].items[item_index].status = "done";
        orders[idx].items[item_index].done = true;
        orders[idx].items[item_index].done_at = new Date().toISOString();
        lsSet(LS.orders, orders);
      }
      return undefined as T;
    }
    case "cancel_kds_item": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { order_id, item_index } = args as any;
      const idx = orders.findIndex((o) => o.id === order_id);
      if (idx >= 0 && orders[idx].items[item_index]) {
        orders[idx].items[item_index].status = "cancelled";
        lsSet(LS.orders, orders);
      }
      return undefined as T;
    }
    case "recall_kds_order": {
      const orders = lsGet<Order[]>(LS.orders) || [];
      const { order_id } = args as any;
      const idx = orders.findIndex((o) => o.id === order_id);
      if (idx >= 0) {
        orders[idx].items.forEach((item) => {
          item.status = "pending";
          item.done = false;
        });
        lsSet(LS.orders, orders);
      }
      return undefined as T;
    }
    case "calculate_inventory_valuation": {
      const products = lsGet<Product[]>(LS.products) || [];
      const { method } = args as any;
      const filtered = products.filter((p) => p.store_id === storeId);
      const total = filtered.reduce(
        (sum, p) => sum + p.stock * p.cost_price,
        0,
      );
      return total as T;
    }
    default:
      dbLogger.warn(
        `Browser fallback: Command ${cmd} not fully implemented for store ${storeId}`,
        { cmd, storeId },
      );
      return null as any as T;
  }
}

// ─── KDS Functions ───────────────────────────────────────────────────────────
export async function openKdsWindow(): Promise<void> {
  return sql("open_kds_window");
}

export async function getKdsOrders(storeId: string): Promise<KdsOrder[]> {
  return sql<KdsOrder[]>("get_kds_orders", { storeId });
}

export async function markKdsItemDone(
  orderId: string,
  itemIndex: number,
  storeId: string,
): Promise<void> {
  return sql("mark_kds_item_done", {
    orderId: orderId,
    itemIndex: itemIndex,
    storeId,
  });
}

export async function startPreparingItem(
  orderId: string,
  itemIndex: number,
  storeId: string,
): Promise<void> {
  return sql("start_preparing_item", {
    orderId: orderId,
    itemIndex: itemIndex,
    storeId,
  });
}

export async function cancelKdsItem(
  orderId: string,
  itemIndex: number,
  storeId: string,
): Promise<void> {
  return sql("cancel_kds_item", {
    orderId: orderId,
    itemIndex: itemIndex,
    storeId,
  });
}

export async function recallKdsOrder(
  orderId: string,
  storeId: string,
): Promise<void> {
  return sql("recall_kds_order", { orderId: orderId, storeId });
}

// ─── Ingredient Functions ───────────────────────────────────────────────────
export async function getIngredients(storeId: string): Promise<Ingredient[]> {
  return sql<Ingredient[]>("get_ingredients", { storeId });
}

export async function saveIngredient(
  ingredient: Ingredient,
  storeId: string,
): Promise<void> {
  return sql("save_ingredient", { ingredient, storeId });
}

export async function deleteIngredient(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_ingredient", { id, storeId });
}

// ─── Recipe Functions ───────────────────────────────────────────────────────
export async function getRecipes(storeId: string): Promise<Recipe[]> {
  return sql<Recipe[]>("get_recipes", { storeId });
}

export async function saveRecipe(
  recipe: Recipe,
  storeId: string,
): Promise<void> {
  return sql("save_recipe", { recipe, storeId });
}

// ─── Supplier Functions ─────────────────────────────────────────────────────
export async function getSuppliers(storeId: string): Promise<Supplier[]> {
  return sql<Supplier[]>("get_suppliers", { storeId });
}

export async function saveSupplier(
  supplier: Supplier,
  storeId: string,
): Promise<void> {
  return sql("save_supplier", { supplier, storeId });
}

export async function deleteSupplier(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_supplier", { id, storeId });
}

// ─── Purchase Order Functions ───────────────────────────────────────────────
export async function getPurchaseOrders(
  storeId: string,
): Promise<PurchaseOrder[]> {
  return sql<PurchaseOrder[]>("get_purchase_orders", { storeId });
}

export async function savePurchaseOrder(
  po: PurchaseOrder,
  storeId: string,
): Promise<void> {
  return sql("save_purchase_order", { po, storeId });
}

export async function updatePoStatus(
  id: string,
  status: string,
  storeId: string,
): Promise<void> {
  return sql("update_po_status", { id, status, storeId });
}

export async function receivePurchaseOrder(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("receive_purchase_order", { id, storeId });
}

export async function deletePurchaseOrder(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_purchase_order", { id, storeId });
}

// ─── Reservation Functions ─────────────────────────────────────────────────
export async function getReservations(
  date: string,
  storeId: string,
): Promise<Reservation[]> {
  return sql<Reservation[]>("get_reservations", { date, storeId });
}

export async function saveReservation(
  reservation: Reservation,
  storeId: string,
): Promise<void> {
  return sql("save_reservation", { reservation, storeId });
}

export async function deleteReservation(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_reservation", { id, storeId });
}

// ─── SMS Functions ─────────────────────────────────────────────────────────
export async function sendSmsNotification(
  phone: string,
  message: string,
  storeId: string,
): Promise<void> {
  return sql("send_sms_notification", { phone, message, storeId });
}

// ─── LAN Sync Functions ───────────────────────────────────────────────────
export async function startLanServer(
  storeId: string,
  port?: number,
): Promise<string> {
  return sql<string>("start_lan_server", { port, storeId });
}

export async function stopLanServer(): Promise<string> {
  return sql<string>("stop_lan_server");
}

export async function getLanServerStatus(): Promise<LanServerStatus> {
  return sql<LanServerStatus>("get_lan_server_status");
}

// ─── Shift Functions ─────────────────────────────────────────────────────────
export async function getShifts(
  date: string,
  storeId: string,
): Promise<Shift[]> {
  return sql<Shift[]>("get_shifts", { date, storeId });
}

export async function saveShift(shift: Shift, storeId: string): Promise<void> {
  return sql("save_shift", { shift, storeId });
}

export async function deleteShift(id: string, storeId: string): Promise<void> {
  return sql("delete_shift", { id, storeId });
}

// ─── Expense Functions ───────────────────────────────────────────────────────
export async function getExpenses(
  date: string,
  storeId: string,
): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses", { date, storeId });
}

export async function getExpensesByRange(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<Expense[]> {
  return sql<Expense[]>("get_expenses_by_range", {
    startDate,
    endDate,
    storeId,
  });
}

export async function saveExpense(
  expense: Expense,
  storeId: string,
): Promise<void> {
  return sql("save_expense", { expense, storeId });
}

export async function deleteExpense(
  id: string,
  storeId: string,
): Promise<void> {
  return sql("delete_expense", { id, storeId });
}

export async function getExpenseCategories(
  storeId: string,
): Promise<ExpenseCategory[]> {
  return sql<ExpenseCategory[]>("get_expense_categories", { storeId });
}

export async function saveExpenseCategory(
  category: ExpenseCategory,
  storeId: string,
): Promise<void> {
  return sql("save_expense_category", { category, storeId });
}

// ─── Wallet Functions ───────────────────────────────────────────────────────
export async function getCustomerWallet(
  customerId: string,
): Promise<CustomerWallet> {
  return sql<CustomerWallet>("get_customer_wallet", {
    customerId: customerId,
  });
}

export async function addWalletBalance(
  customerId: string,
  amount: number,
  notes: string,
): Promise<void> {
  return sql("add_wallet_balance", { customerId: customerId, amount, notes });
}

export async function deductWalletBalance(
  customerId: string,
  amount: number,
  orderId: string,
): Promise<void> {
  return sql("deduct_wallet_balance", {
    customerId: customerId,
    amount,
    orderId: orderId,
  });
}

export async function getWalletTransactions(
  customerId: string,
): Promise<WalletTransaction[]> {
  return sql<WalletTransaction[]>("get_wallet_transactions", {
    customerId: customerId,
  });
}

// ─── Coupon Functions ───────────────────────────────────────────────────────
export async function getCoupons(storeId: string): Promise<Coupon[]> {
  return sql<Coupon[]>("get_coupons", { storeId });
}

export async function saveCoupon(
  coupon: Coupon,
  storeId: string,
): Promise<void> {
  return sql("save_coupon", { coupon, storeId });
}

export async function validateCoupon(
  code: string,
  orderAmount: number,
  storeId: string,
): Promise<Coupon> {
  return sql<Coupon>("validate_coupon", {
    code,
    orderAmount: orderAmount,
    storeId,
  });
}

export async function useCoupon(code: string, storeId: string): Promise<void> {
  return sql("use_coupon", { code, storeId });
}

export async function deleteCoupon(id: string, storeId: string): Promise<void> {
  return sql("delete_coupon", { id, storeId });
}

// ─── Day End Reconciliation Functions ───────────────────────────────────────
export async function getDayEndReconciliation(
  date: string,
  storeId: string,
): Promise<DayEndReconciliation | null> {
  return sql<DayEndReconciliation | null>("get_day_end_reconciliation", {
    date,
    storeId,
  });
}

export async function saveDayEndReconciliation(
  reconciliation: DayEndReconciliation,
  storeId: string,
): Promise<void> {
  return sql("save_day_end_reconciliation", { reconciliation, storeId });
}

// ─── GST Report Functions ───────────────────────────────────────────────────
export async function getGstr1Report(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<GstReport[]> {
  return sql<GstReport[]>("get_gstr1_report", { startDate, endDate, storeId });
}

export async function getGstr3bReport(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<[number, number, number, number, number, number]> {
  return sql<[number, number, number, number, number, number]>(
    "get_gstr3b_report",
    { startDate, endDate, storeId },
  );
}

// ─── Activity Log Functions ────────────────────────────────────────────────
export async function getActivityLogsDetailed(
  startDate: string,
  endDate: string,
  limit: number,
  storeId: string,
): Promise<ActivityLogEntry[]> {
  return sql<ActivityLogEntry[]>("get_activity_logs_range", {
    startDate,
    endDate,
    limit,
    storeId,
  });
}

// ─── Export Functions ──────────────────────────────────────────────────────
export async function exportToTally(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<string> {
  return sql<string>("export_to_tally", { startDate, endDate, storeId });
}

export async function exportToQuickbooks(
  startDate: string,
  endDate: string,
  storeId: string,
): Promise<string> {
  return sql<string>("export_to_quickbooks", { startDate, endDate, storeId });
}

export async function createCompressedBackup(
  storeId: string,
): Promise<number[]> {
  return sql<number[]>("create_compressed_backup", { storeId });
}

// ─── WhatsApp Functions ───────────────────────────────────────────────────
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  storeId: string,
): Promise<void> {
  return sql("send_whatsapp_message", { phone, message, storeId });
}
