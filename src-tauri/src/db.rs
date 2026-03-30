// src-tauri/src/db.rs
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use bcrypt;
use csv;
use rand::Rng;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;

fn get_encryption_key() -> [u8; 32] {
    let key_str = env::var("TAURI_ENCRYPTION_KEY")
        .unwrap_or_else(|_| "POS_BILLING_SECURE_KEY_32BYTES!!".to_string());
    let mut key = [0u8; 32];
    let bytes = key_str.as_bytes();
    let len = bytes.len().min(32);
    key[..len].copy_from_slice(&bytes[..len]);
    key
}

fn encrypt_value(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let cipher = Aes256Gcm::new(&get_encryption_key().into());
    let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, value.as_bytes())
        .unwrap_or_else(|_| value.as_bytes().to_vec());
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &combined)
}

fn decrypt_value(encrypted: &str) -> String {
    if encrypted.is_empty() {
        return String::new();
    }
    let data = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encrypted)
        .unwrap_or_else(|_| encrypted.as_bytes().to_vec());
    if data.len() < 12 {
        return encrypted.to_string();
    }
    let cipher = Aes256Gcm::new(&get_encryption_key().into());
    let nonce = Nonce::from_slice(&data[..12]);
    let ciphertext = &data[12..];
    String::from_utf8(
        cipher
            .decrypt(nonce, ciphertext)
            .unwrap_or_else(|_| ciphertext.to_vec()),
    )
    .unwrap_or_else(|_| encrypted.to_string())
}

// ─── Multi-Store Types ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Store {
    pub id: String,
    pub name: String,
    pub industry: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoreConfig {
    pub store_id: String,
    pub settings: String, // JSON string
}

// ─── Data Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub price: f64,
    pub cost_price: f64,
    pub wholesale_price: f64,
    pub category: String,
    pub subcategory: Option<String>,
    pub stock: i64,
    pub barcode: String,
    pub sku: Option<String>,
    pub description: Option<String>,
    pub tax: f64,
    pub status: String,
    pub tags: String,
    pub is_digital: bool,
    pub is_favorite: bool,
    pub image_url: Option<String>,
    pub created_at: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub base_unit: Option<String>,
    pub conversion_factor: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Batch {
    pub id: String,
    pub product_id: String,
    pub store_id: String,
    pub batch_number: String,
    pub expiry_date: Option<String>,
    pub cost_price: f64,
    pub quantity: i64,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialNumber {
    pub id: String,
    pub product_id: String,
    pub store_id: String,
    pub serial_number: String,
    pub status: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryTransaction {
    pub id: String,
    pub product_id: String,
    pub store_id: String,
    pub transaction_type: String, // 'in', 'out', 'adjustment', 'transfer', 'return'
    pub qty_delta: i64,
    pub batch_id: Option<String>,
    pub serial_number_id: Option<String>,
    pub reference_type: Option<String>, // 'order', 'purchase_order', 'adjustment', 'transfer'
    pub reference_id: Option<String>,
    pub user_id: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockCount {
    pub id: String,
    pub store_id: String,
    pub status: String, // 'draft', 'completed', 'cancelled'
    pub created_by: String,
    pub created_at: String,
    pub items: Vec<StockCountItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StockCountItem {
    pub id: String,
    pub count_id: String,
    pub product_id: String,
    pub expected_qty: i64,
    pub actual_qty: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductVariant {
    pub id: String,
    pub product_id: String,
    pub store_id: String,
    pub name: String,
    pub value: String,
    pub sku: String,
    pub price: f64,
    pub stock: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComboItem {
    pub product_id: String,
    pub product_name: String,
    pub quantity: i64,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Combo {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub description: String,
    pub items: Vec<ComboItem>,
    pub combo_price: f64,
    pub discount_amount: f64,
    pub discount_percent: f64,
    pub is_active: bool,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderItem {
    pub product_id: String,
    pub product_name: String,
    pub price: f64,
    pub quantity: i64,
    pub discount: f64,
    pub discount_type: Option<String>,
    pub tax: f64,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Order {
    pub id: String,
    pub store_id: String,
    pub items: Vec<OrderItem>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total: f64,
    pub payment_method: String,
    pub amount_paid: f64,
    pub change_amount: f64,
    pub customer_name: String,
    pub status: String,
    pub order_type: String,
    pub delivery_status: String,
    pub delivery_address: String,
    pub delivery_phone: String,
    pub created_at: String,
    pub synced: Option<bool>,
    pub user_id: Option<String>,
    pub user_name: Option<String>,
    pub tip_amount: Option<f64>,
    pub discount_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub store_name: String,
    pub currency: String,
    pub currency_symbol: String,
    pub country: String,
    pub timezone: String,
    pub tax_rate: f64,
    pub tax_name: String,
    pub tax_system: String,
    pub address: String,
    pub phone: String,
    pub neon_url: String,
    pub business_name: String,
    pub tax_id: String,
    pub receipt_save_path: String,
    pub twilio_sid: String,
    pub twilio_token: String,
    pub twilio_phone: String,
    pub lan_sync_enabled: bool,
    pub lan_server_port: i32,
    pub dark_mode: bool,
    pub language: String,
    pub whatsapp_enabled: bool,
    pub whatsapp_api_url: String,
    pub offline_mode: bool,
    // Whitelabel
    pub logo_url: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub accent_color: String,
    pub footer_text: String,
    // Contact
    pub contact_email: String,
    pub contact_website: String,
    // Multi-tax support
    pub tax_inclusive: bool,
    pub tax_breakdown: String,
    // Auto-print KOT
    pub auto_print_kot: bool,
    pub upi_id: String,
    pub show_logo_on_receipt: bool,
    pub receipt_header_text: String,
    pub merchant_id: String,
    pub show_tax_breakdown: bool,
    #[serde(default)]
    pub onboarding_completed: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaxRate {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub rate: f64,
    pub is_default: bool,
    pub country: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySummary {
    pub revenue: f64,
    pub transactions: i64,
    pub avg_order: f64,
    pub items_sold: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DayRevenue {
    pub label: String,
    pub revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TopProduct {
    pub name: String,
    pub qty: i64,
    pub revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LowStockItem {
    pub name: String,
    pub stock: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReport {
    pub start_date: String,
    pub end_date: String,
    pub total_revenue: f64,
    pub total_orders: i64,
    pub avg_order: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub name: String,
    pub role: String,
    pub store_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Table {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub capacity: i32,
    pub status: String,
    pub position_x: i32,
    pub position_y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StaffAttendance {
    pub id: String,
    pub store_id: String,
    pub user_id: String,
    pub user_name: String,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub loyalty_points: i32,
    pub total_spent: f64,
    pub visits: i32,
    pub group_name: Option<String>,
    pub notes: Option<String>,
    pub birthday: Option<String>,
    pub anniversary: Option<String>,
    pub credit_limit: Option<f64>,
    pub price_tier: Option<String>,
    pub loyalty_tier: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomerAddress {
    pub id: String,
    pub customer_id: String,
    pub label: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub zip: String,
    pub phone: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomerStatistics {
    pub total_spent: f64,
    pub visits: i32,
    pub avg_order_value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderNote {
    pub id: String,
    pub store_id: String,
    pub order_id: String,
    pub note: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryAlert {
    pub id: String,
    pub store_id: String,
    pub product_id: String,
    pub product_name: String,
    pub current_stock: i32,
    pub threshold: i32,
    pub alert_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HourlySales {
    pub hour: i32,
    pub revenue: f64,
    pub orders: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StaffPerformance {
    pub user_id: String,
    pub user_name: String,
    pub total_orders: i32,
    pub total_revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesByItem {
    pub product_id: String,
    pub product_name: String,
    pub quantity: i32,
    pub revenue: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RefundRequest {
    pub id: String,
    pub store_id: String,
    pub order_id: String,
    pub amount: f64,
    pub reason: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct BackupData {
    pub products: Vec<Product>,
    pub orders: Vec<Order>,
    pub settings: Settings,
    pub exported_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ImportResult {
    pub products_imported: i64,
    pub orders_imported: i64,
}

#[derive(Serialize, Deserialize)]
pub struct CsvImportResult {
    pub imported: i64,
    pub errors: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLog {
    pub id: String,
    pub store_id: String,
    pub order_id: String,
    pub action: String,
    pub previous_data: Option<String>,
    pub new_data: Option<String>,
    pub reason: String,
    pub user_id: String,
    pub user_name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KdsOrder {
    pub id: String,
    pub items: Vec<KdsItem>,
    pub order_type: String,
    pub customer_name: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KdsItem {
    pub product_name: String,
    pub quantity: i64,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ingredient {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub stock: f64,
    pub unit: String,
    pub reorder_level: f64,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipe {
    pub id: String,
    pub store_id: String,
    pub product_id: String,
    pub ingredient_id: String,
    pub quantity: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Supplier {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseOrderItem {
    pub id: String,
    pub ingredient_id: String,
    pub ingredient_name: String,
    pub quantity: f64,
    pub unit_cost: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PurchaseOrder {
    pub id: String,
    pub store_id: String,
    pub supplier_id: String,
    pub supplier_name: String,
    pub status: String,
    pub total: f64,
    pub notes: String,
    pub items: Vec<PurchaseOrderItem>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Reservation {
    pub id: String,
    pub store_id: String,
    pub table_id: String,
    pub table_name: String,
    pub customer_name: String,
    pub phone: String,
    pub date: String,
    pub time: String,
    pub party_size: i32,
    pub status: String,
    pub notes: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Shift {
    pub id: String,
    pub store_id: String,
    pub staff_id: String,
    pub staff_name: String,
    pub date: String,
    pub start_time: String,
    pub end_time: String,
    pub role: String,
    pub notes: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense {
    pub id: String,
    pub store_id: String,
    pub category: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
    pub payment_method: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExpenseCategory {
    pub id: String,
    pub store_id: String,
    pub name: String,
    pub icon: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomerWallet {
    pub customer_id: String,
    pub balance: f64,
    pub total_loaded: f64,
    pub total_spent: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WalletTransaction {
    pub id: String,
    pub customer_id: String,
    pub amount: f64,
    pub transaction_type: String,
    pub order_id: Option<String>,
    pub notes: String,
    pub created_at: String,
    pub store_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coupon {
    pub id: String,
    pub store_id: String,
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_order_amount: f64,
    pub max_uses: i32,
    pub used_count: i32,
    pub valid_from: String,
    pub valid_until: String,
    pub active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DayEndReconciliation {
    pub id: String,
    pub store_id: String,
    pub date: String,
    pub opening_cash: f64,
    pub expected_cash: f64,
    pub actual_cash: f64,
    pub difference: f64,
    pub cash_sales: f64,
    pub upi_sales: f64,
    pub card_sales: f64,
    pub total_expenses: f64,
    pub notes: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GstReport {
    pub invoice_no: String,
    pub date: String,
    pub customer_name: String,
    pub customer_gstin: Option<String>,
    pub taxable_value: f64,
    pub cgst: f64,
    pub sgst: f64,
    pub igst: f64,
    pub total: f64,
    pub place_of_supply: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLogEntry {
    pub id: String,
    pub store_id: String,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub previous_value: Option<String>,
    pub new_value: Option<String>,
    pub reason: Option<String>,
    pub user_id: String,
    pub user_name: String,
    pub created_at: String,
}

// ─── Database ────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;

        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             PRAGMA synchronous=NORMAL;",
        )?;

        let db = Database { conn };
        db.init_schema()?;
        db.migrate_schema()?;
        db.create_indexes()?;
        db.seed_if_empty()?;
        db.init_users()?;

        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS stores (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                industry TEXT NOT NULL DEFAULT 'food',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS products (
                id          TEXT NOT NULL,
                store_id    TEXT NOT NULL DEFAULT 'default',
                name        TEXT NOT NULL,
                price       REAL NOT NULL DEFAULT 0,
                cost_price  REAL NOT NULL DEFAULT 0,
                wholesale_price REAL NOT NULL DEFAULT 0,
                category    TEXT NOT NULL DEFAULT 'General',
                subcategory TEXT,
                stock       INTEGER NOT NULL DEFAULT 0,
                barcode     TEXT NOT NULL DEFAULT '',
                sku         TEXT,
                description TEXT,
                tax         REAL NOT NULL DEFAULT 18,
                status      TEXT NOT NULL DEFAULT 'active',
                tags        TEXT NOT NULL DEFAULT '',
                is_digital  INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                image_url   TEXT NOT NULL DEFAULT '',
                metadata    TEXT,
                base_unit   TEXT,
                conversion_factor REAL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (id, store_id)
            );

            CREATE TABLE IF NOT EXISTS batches (
                id          TEXT PRIMARY KEY,
                product_id  TEXT NOT NULL,
                store_id    TEXT NOT NULL,
                batch_number TEXT NOT NULL,
                expiry_date TEXT,
                cost_price  REAL NOT NULL,
                quantity    INTEGER NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (product_id, store_id) REFERENCES products(id, store_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS serial_numbers (
                id          TEXT PRIMARY KEY,
                product_id  TEXT NOT NULL,
                store_id    TEXT NOT NULL,
                serial_number TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'available',
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (product_id, store_id) REFERENCES products(id, store_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS inventory_transactions (
                id          TEXT PRIMARY KEY,
                product_id  TEXT NOT NULL,
                store_id    TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                qty_delta   INTEGER NOT NULL,
                batch_id    TEXT,
                serial_number_id TEXT,
                reference_type TEXT,
                reference_id TEXT,
                user_id     TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (product_id, store_id) REFERENCES products(id, store_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS stock_counts (
                id          TEXT PRIMARY KEY,
                store_id    TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'draft',
                created_by  TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS stock_count_items (
                id          TEXT PRIMARY KEY,
                count_id    TEXT NOT NULL,
                product_id  TEXT NOT NULL,
                expected_qty INTEGER NOT NULL,
                actual_qty  INTEGER NOT NULL,
                FOREIGN KEY (count_id) REFERENCES stock_counts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS product_variants (
                id         TEXT PRIMARY KEY,
                product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                store_id   TEXT NOT NULL DEFAULT 'default',
                name       TEXT NOT NULL,
                value      TEXT NOT NULL,
                sku        TEXT NOT NULL DEFAULT '',
                price      REAL NOT NULL DEFAULT 0,
                stock      INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS orders (
                id              TEXT PRIMARY KEY,
                store_id        TEXT NOT NULL DEFAULT 'default',
                subtotal        REAL NOT NULL,
                tax_amount      REAL NOT NULL,
                discount_amount REAL NOT NULL,
                discount_type   TEXT,
                total           REAL NOT NULL,
                payment_method  TEXT NOT NULL,
                amount_paid     REAL NOT NULL,
                change_amount   REAL NOT NULL,
                customer_name   TEXT NOT NULL DEFAULT '',
                status          TEXT NOT NULL DEFAULT 'completed',
                order_type      TEXT NOT NULL DEFAULT 'dine_in',
                delivery_status TEXT NOT NULL DEFAULT 'pending',
                delivery_address TEXT NOT NULL DEFAULT '',
                delivery_phone  TEXT NOT NULL DEFAULT '',
                user_id         TEXT NOT NULL DEFAULT '',
                user_name       TEXT NOT NULL DEFAULT '',
                tip_amount      REAL DEFAULT 0,
                synced          INTEGER NOT NULL DEFAULT 0,
                metadata        TEXT,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                store_id     TEXT NOT NULL DEFAULT 'default',
                product_id   TEXT NOT NULL,
                product_name TEXT NOT NULL,
                price        REAL NOT NULL,
                quantity     INTEGER NOT NULL,
                discount     REAL NOT NULL DEFAULT 0,
                discount_type TEXT,
                tax          REAL NOT NULL DEFAULT 18,
                metadata     TEXT,
                done         INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS settings_multi (
                store_id TEXT PRIMARY KEY,
                value    TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id       TEXT PRIMARY KEY,
                pin      TEXT NOT NULL,
                name     TEXT NOT NULL,
                role     TEXT NOT NULL DEFAULT 'cashier',
                store_id TEXT
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id              TEXT PRIMARY KEY,
                store_id        TEXT NOT NULL DEFAULT 'default',
                order_id        TEXT NOT NULL,
                action          TEXT NOT NULL,
                previous_data   TEXT,
                new_data        TEXT,
                reason          TEXT NOT NULL,
                user_id         TEXT NOT NULL,
                user_name       TEXT NOT NULL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tables (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                capacity INTEGER NOT NULL DEFAULT 4,
                status TEXT NOT NULL DEFAULT 'available',
                position_x INTEGER NOT NULL DEFAULT 0,
                position_y INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS staff_attendance (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                clock_in TEXT NOT NULL,
                clock_out TEXT,
                date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                loyalty_points INTEGER NOT NULL DEFAULT 0,
                total_spent REAL NOT NULL DEFAULT 0,
                visits INTEGER NOT NULL DEFAULT 0,
                group_name TEXT,
                notes TEXT,
                birthday TEXT,
                anniversary TEXT,
                credit_limit REAL,
                price_tier TEXT,
                loyalty_tier TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS customer_addresses (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                label TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL DEFAULT '',
                state TEXT NOT NULL DEFAULT '',
                zip TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS inventory_alerts (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                current_stock INTEGER NOT NULL,
                threshold INTEGER NOT NULL,
                alert_type TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS refund_requests (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                order_id TEXT NOT NULL,
                amount REAL NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                stock REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL DEFAULT 'pcs',
                reorder_level REAL NOT NULL DEFAULT 10,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                product_id TEXT NOT NULL,
                ingredient_id TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 1,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
                UNIQUE(product_id, ingredient_id)
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                supplier_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                total REAL NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            );

            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id TEXT PRIMARY KEY,
                po_id TEXT NOT NULL,
                store_id TEXT NOT NULL DEFAULT 'default',
                ingredient_id TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_cost REAL NOT NULL,
                FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                table_id TEXT NOT NULL,
                customer_name TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                party_size INTEGER NOT NULL DEFAULT 2,
                status TEXT NOT NULL DEFAULT 'confirmed',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (table_id) REFERENCES tables(id)
            );

            CREATE TABLE IF NOT EXISTS shifts (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                staff_id TEXT NOT NULL,
                staff_name TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cashier',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'cash',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS expense_categories (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '📦'
            );

            CREATE TABLE IF NOT EXISTS tax_rates (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                country TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                customer_id TEXT NOT NULL,
                amount REAL NOT NULL,
                transaction_type TEXT NOT NULL,
                order_id TEXT,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS coupons (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                code TEXT NOT NULL,
                discount_type TEXT NOT NULL DEFAULT 'percentage',
                discount_value REAL NOT NULL,
                min_order_amount REAL NOT NULL DEFAULT 0,
                max_uses INTEGER NOT NULL DEFAULT 100,
                used_count INTEGER NOT NULL DEFAULT 0,
                valid_from TEXT NOT NULL,
                valid_until TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(store_id, code)
            );

            CREATE TABLE IF NOT EXISTS day_end_reconciliations (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                date TEXT NOT NULL,
                opening_cash REAL NOT NULL DEFAULT 0,
                expected_cash REAL NOT NULL DEFAULT 0,
                actual_cash REAL NOT NULL DEFAULT 0,
                difference REAL NOT NULL DEFAULT 0,
                cash_sales REAL NOT NULL DEFAULT 0,
                upi_sales REAL NOT NULL DEFAULT 0,
                card_sales REAL NOT NULL DEFAULT 0,
                total_expenses REAL NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT '',
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(store_id, date)
            );

            CREATE TABLE IF NOT EXISTS combos (
                id TEXT PRIMARY KEY,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                items TEXT NOT NULL,
                combo_price REAL NOT NULL,
                discount_amount REAL NOT NULL DEFAULT 0,
                discount_percent REAL NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        ",
        )?;
        Ok(())
    }

    fn create_indexes(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
            CREATE INDEX IF NOT EXISTS idx_products_store_id_created_at ON products(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
            CREATE INDEX IF NOT EXISTS idx_orders_store_id_created_at ON orders(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
            CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON order_items(store_id);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id ON activity_logs(store_id);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id_created_at ON activity_logs(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_order_id ON activity_logs(order_id);
            CREATE INDEX IF NOT EXISTS idx_tables_store_id ON tables(store_id);
            CREATE INDEX IF NOT EXISTS idx_staff_attendance_store_id ON staff_attendance(store_id);
            CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
            CREATE INDEX IF NOT EXISTS idx_customers_store_id_created_at ON customers(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);
            CREATE INDEX IF NOT EXISTS idx_inventory_alerts_store_id ON inventory_alerts(store_id);
            CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product_id ON inventory_alerts(product_id);
            CREATE INDEX IF NOT EXISTS idx_inventory_alerts_store_id_created_at ON inventory_alerts(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_refund_requests_store_id ON refund_requests(store_id);
            CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests(order_id);
            CREATE INDEX IF NOT EXISTS idx_refund_requests_store_id_created_at ON refund_requests(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_ingredients_store_id ON ingredients(store_id);
            CREATE INDEX IF NOT EXISTS idx_ingredients_store_id_created_at ON ingredients(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_recipes_store_id ON recipes(store_id);
            CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
            CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON recipes(ingredient_id);
            CREATE INDEX IF NOT EXISTS idx_suppliers_store_id ON suppliers(store_id);
            CREATE INDEX IF NOT EXISTS idx_suppliers_store_id_created_at ON suppliers(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_id ON purchase_orders(store_id);
            CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_id_created_at ON purchase_orders(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(po_id);
            CREATE INDEX IF NOT EXISTS idx_purchase_order_items_ingredient_id ON purchase_order_items(ingredient_id);
            CREATE INDEX IF NOT EXISTS idx_purchase_order_items_store_id ON purchase_order_items(store_id);
            CREATE INDEX IF NOT EXISTS idx_reservations_store_id ON reservations(store_id);
            CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
            CREATE INDEX IF NOT EXISTS idx_reservations_store_id_created_at ON reservations(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_shifts_store_id ON shifts(store_id);
            CREATE INDEX IF NOT EXISTS idx_shifts_store_id_created_at ON shifts(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON expenses(store_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_store_id_created_at ON expenses(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_expense_categories_store_id ON expense_categories(store_id);
            CREATE INDEX IF NOT EXISTS idx_tax_rates_store_id ON tax_rates(store_id);
            CREATE INDEX IF NOT EXISTS idx_tax_rates_store_id_created_at ON tax_rates(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_store_id ON wallet_transactions(store_id);
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_id ON wallet_transactions(customer_id);
            CREATE INDEX IF NOT EXISTS idx_wallet_transactions_store_id_created_at ON wallet_transactions(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON coupons(store_id);
            CREATE INDEX IF NOT EXISTS idx_coupons_store_id_created_at ON coupons(store_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_day_end_reconciliations_store_id ON day_end_reconciliations(store_id);
            CREATE INDEX IF NOT EXISTS idx_day_end_reconciliations_store_id_date ON day_end_reconciliations(store_id, date);
            CREATE INDEX IF NOT EXISTS idx_combos_store_id ON combos(store_id);
            CREATE INDEX IF NOT EXISTS idx_combos_store_id_created_at ON combos(store_id, created_at);
        "
        )?;
        Ok(())
    }

    pub fn transfer_stock(
        &self,
        id: &str,
        from_store: &str,
        to_store: &str,
        qty: i64,
        user_id: &str,
    ) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        Self::adjust_inventory(&tx, id, from_store, -qty, "transfer", Some(to_store), user_id, None, None)?;
        Self::adjust_inventory(&tx, id, to_store, qty, "transfer", Some(from_store), user_id, None, None)?;

        tx.commit()?;
        Ok(())
    }

    fn adjust_inventory(
        conn: &rusqlite::Connection,
        product_id: &str,
        store_id: &str,
        qty_delta: i64,
        reference_type: &str,
        reference_id: Option<&str>,
        user_id: &str,
        batch_id: Option<&str>,
        serial_number_id: Option<&str>,
    ) -> Result<()> {
        // 1. Update Product Stock
        conn.execute(
            "UPDATE products SET stock = stock + ?1 WHERE id = ?2 AND store_id = ?3",
            params![qty_delta, product_id, store_id],
        )?;

        // 2. Log Transaction
        let tx_id = uuid::Uuid::new_v4().to_string();
        let transaction_type = if qty_delta > 0 { "in" } else { "out" };
        conn.execute(
            "INSERT INTO inventory_transactions (id, product_id, store_id, transaction_type, qty_delta, batch_id, serial_number_id, reference_type, reference_id, user_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![tx_id, product_id, store_id, transaction_type, qty_delta, batch_id, serial_number_id, reference_type, reference_id, user_id],
        )?;

        // 3. Update Batch if applicable
        if let Some(bid) = batch_id {
            conn.execute(
                "UPDATE batches SET quantity = quantity + ?1 WHERE id = ?2",
                params![qty_delta, bid],
            )?;
        }

        // 4. Update Serial Number if applicable
        if let Some(sid) = serial_number_id {
            let status = if qty_delta < 0 { "sold" } else { "available" };
            conn.execute(
                "UPDATE serial_numbers SET status = ?1 WHERE id = ?2",
                params![status, sid],
            )?;
        }

        // 5. Recipe / Ingredient logic
        let mut stmt = conn.prepare(
            "SELECT ingredient_id, quantity FROM recipes WHERE product_id = ?1 AND store_id = ?2",
        )?;
        let recipes = stmt.query_map(params![product_id, store_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })?;

        for recipe in recipes {
            let (ing_id, recipe_qty) = recipe?;
            let ing_delta = (qty_delta as f64) * recipe_qty;
            conn.execute(
                "UPDATE ingredients SET stock = stock + ?1 WHERE id = ?2 AND store_id = ?3",
                params![ing_delta, ing_id, store_id],
            )?;
        }
        Ok(())
    }

    fn migrate_schema(&self) -> Result<()> {
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN group_name TEXT", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN notes TEXT", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN birthday TEXT", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN anniversary TEXT", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN credit_limit REAL", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN price_tier TEXT", []);
        let _ = self.conn.execute("ALTER TABLE customers ADD COLUMN loyalty_tier TEXT", []);

        let store_name = "Main Store";
        let sql = format!(
            "INSERT OR IGNORE INTO stores (id, name, industry, is_active) VALUES ('default', '{}', 'food', 1)",
            store_name
        );
        self.conn.execute(&sql, [])?;

        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN wholesale_price REAL NOT NULL DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN subcategory TEXT", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN sku TEXT", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN description TEXT", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active'", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN tags TEXT NOT NULL DEFAULT ''", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN is_digital INTEGER NOT NULL DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0", []);

        let _ = self
            .conn
            .execute("ALTER TABLE products ADD COLUMN metadata TEXT", []);
        let _ = self
            .conn
            .execute("ALTER TABLE order_items ADD COLUMN metadata TEXT", []);
        let _ = self.conn.execute(
            "ALTER TABLE order_items ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default'",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE purchase_order_items ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default'",
            [],
        );
        let _ = self.conn.execute("ALTER TABLE orders ADD COLUMN metadata TEXT", []);
        let _ = self.conn.execute("ALTER TABLE orders ADD COLUMN tip_amount REAL DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE orders ADD COLUMN discount_type TEXT", []);
        let _ = self.conn.execute("ALTER TABLE order_items ADD COLUMN discount_type TEXT", []);

        Ok(())
    }

    pub fn seed_all(&self) -> Result<()> {
        self.seed_if_empty()?;
        Ok(())
    }

    fn seed_if_empty(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0))?;
        if count == 0 {
            // No seeding for now to keep it clean
        }
        Ok(())
    }

    fn init_users(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
        if count == 0 {
            let admin_pin = bcrypt::hash("1234", bcrypt::DEFAULT_COST).unwrap();
            let cashier_pin = bcrypt::hash("0000", bcrypt::DEFAULT_COST).unwrap();

            self.conn.execute(
                "INSERT INTO users (id, pin, name, role) VALUES (?1, ?2, ?3, ?4)",
                params!["admin", admin_pin, "Administrator", "admin"],
            )?;
            self.conn.execute(
                "INSERT INTO users (id, pin, name, role) VALUES (?1, ?2, ?3, ?4)",
                params!["cashier", cashier_pin, "Cashier", "cashier"],
            )?;
        }
        Ok(())
    }

    // ─── Stores ───────────────────────────────────────────────────────────────────

    pub fn get_stores(&self) -> Result<Vec<Store>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, industry, is_active, created_at FROM stores")?;
        let stores = stmt
            .query_map([], |row| {
                Ok(Store {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    industry: row.get(2)?,
                    is_active: row.get::<_, i32>(3)? == 1,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(stores)
    }

    pub fn verify_pin(&self, pin: &str) -> Result<Option<User>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, pin, name, role, store_id FROM users")?;
        let user_iter = stmt.query_map([], |row| {
            Ok((
                User {
                    id: row.get(0)?,
                    name: row.get(2)?,
                    role: row.get(3)?,
                    store_id: row.get(4)?,
                },
                row.get::<_, String>(1)?,
            ))
        })?;

        for user_res in user_iter {
            if let Ok((user, hashed_pin)) = user_res {
                if let Ok(verified) = bcrypt::verify(pin, &hashed_pin) {
                    if verified {
                        return Ok(Some(user));
                    }
                }
            }
        }
        Ok(None)
    }

    pub fn change_pin(&self, user_id: &str, new_pin: &str) -> Result<()> {
        let hashed = bcrypt::hash(new_pin, bcrypt::DEFAULT_COST)
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        self.conn.execute(
            "UPDATE users SET pin = ?1 WHERE id = ?2",
            params![hashed, user_id],
        )?;
        Ok(())
    }

    pub fn get_users(&self) -> Result<Vec<User>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, role, store_id FROM users")?;
        let users = stmt
            .query_map([], |row| {
                Ok(User {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    role: row.get(2)?,
                    store_id: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(users)
    }

    pub fn get_pending_orders_count(&self, store_id: &str) -> Result<i64> {
        self.conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE store_id = ?1 AND status = 'pending'",
            params![store_id],
            |r| r.get(0),
        )
    }

    pub fn get_pending_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id FROM orders WHERE store_id = ?1 AND status = 'pending' ORDER BY created_at DESC"
        )?;
        let ids: Vec<String> = stmt
            .query_map(params![store_id], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;
        let mut res = Vec::new();
        for id in ids {
            if let Ok(o) = self.get_order_by_id(&id, store_id) {
                res.push(o);
            }
        }
        Ok(res)
    }

    pub fn delete_pending_order(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM orders WHERE id = ?1 AND store_id = ?2 AND status = 'pending'",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_kds_orders(&self, store_id: &str) -> Result<Vec<KdsOrder>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_type, customer_name, created_at FROM orders
             WHERE store_id = ?1 AND status IN ('completed', 'pending', 'processing')
             AND created_at >= date('now', '-1 day')
             ORDER BY created_at ASC",
        )?;
        let mut orders = stmt
            .query_map(params![store_id], |row| {
                Ok(KdsOrder {
                    id: row.get(0)?,
                    order_type: row.get(1)?,
                    customer_name: row.get(2)?,
                    created_at: row.get(3)?,
                    items: vec![],
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut item_stmt = self.conn.prepare(
                "SELECT product_name, quantity, done FROM order_items WHERE order_id = ?1",
            )?;
            order.items = item_stmt
                .query_map(params![order.id], |row| {
                    Ok(KdsItem {
                        product_name: row.get(0)?,
                        quantity: row.get(1)?,
                        done: row.get::<_, i32>(2)? == 1,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }
        Ok(orders)
    }

    pub fn mark_kds_item_done(
        &self,
        order_id: &str,
        item_index: usize,
        _store_id: &str,
    ) -> Result<()> {
        let items: Vec<i64> = self
            .conn
            .prepare("SELECT id FROM order_items WHERE order_id = ?1 ORDER BY id")?
            .query_map(params![order_id], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;

        if let Some(item_id) = items.get(item_index) {
            self.conn.execute(
                "UPDATE order_items SET done = 1 WHERE id = ?1",
                params![item_id],
            )?;
        }
        Ok(())
    }

    pub fn get_coupons(&self, store_id: &str) -> Result<Vec<Coupon>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active, created_at
             FROM coupons WHERE store_id = ?1"
        )?;
        let coupons = stmt
            .query_map(params![store_id], |row| {
                Ok(Coupon {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    code: row.get(2)?,
                    discount_type: row.get(3)?,
                    discount_value: row.get(4)?,
                    min_order_amount: row.get(5)?,
                    max_uses: row.get(6)?,
                    used_count: row.get(7)?,
                    valid_from: row.get(8)?,
                    valid_until: row.get(9)?,
                    active: row.get::<_, i32>(10)? == 1,
                    created_at: row.get(11)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(coupons)
    }

    pub fn save_coupon(&self, c: &Coupon, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO coupons (id, store_id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                code=excluded.code, discount_type=excluded.discount_type, discount_value=excluded.discount_value,
                min_order_amount=excluded.min_order_amount, max_uses=excluded.max_uses,
                valid_from=excluded.valid_from, valid_until=excluded.valid_until, active=excluded.active",
            params![c.id, store_id, c.code, c.discount_type, c.discount_value, c.min_order_amount, c.max_uses, c.used_count, c.valid_from, c.valid_until, if c.active { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn validate_coupon(&self, code: &str, order_amount: f64, store_id: &str) -> Result<Coupon> {
        let coupon: Coupon = self.conn.query_row(
            "SELECT id, store_id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active, created_at
             FROM coupons WHERE code = ?1 AND store_id = ?2 AND active = 1",
            params![code, store_id],
            |row| {
                Ok(Coupon {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    code: row.get(2)?,
                    discount_type: row.get(3)?,
                    discount_value: row.get(4)?,
                    min_order_amount: row.get(5)?,
                    max_uses: row.get(6)?,
                    used_count: row.get(7)?,
                    valid_from: row.get(8)?,
                    valid_until: row.get(9)?,
                    active: row.get::<_, i32>(10)? == 1,
                    created_at: row.get(11)?,
                })
            }
        )?;

        if order_amount < coupon.min_order_amount {
            return Err(rusqlite::Error::InvalidQuery);
        }
        if coupon.used_count >= coupon.max_uses {
            return Err(rusqlite::Error::InvalidQuery);
        }
        Ok(coupon)
    }

    pub fn use_coupon(&self, code: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE coupons SET used_count = used_count + 1 WHERE code = ?1 AND store_id = ?2",
            params![code, store_id],
        )?;
        Ok(())
    }

    pub fn delete_coupon(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM coupons WHERE id = ?1 AND store_id = ?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_reservations(&self, date: &str, store_id: &str) -> Result<Vec<Reservation>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, r.store_id, r.table_id, t.name, r.customer_name, r.phone, r.date, r.time, r.party_size, r.status, r.notes, r.created_at
             FROM reservations r JOIN tables t ON r.table_id = t.id
             WHERE r.store_id = ?1 AND r.date = ?2 ORDER BY r.time ASC"
        )?;
        let reservations = stmt
            .query_map(params![store_id, date], |row| {
                Ok(Reservation {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    table_id: row.get(2)?,
                    table_name: row.get(3)?,
                    customer_name: row.get(4)?,
                    phone: row.get(5)?,
                    date: row.get(6)?,
                    time: row.get(7)?,
                    party_size: row.get(8)?,
                    status: row.get(9)?,
                    notes: row.get(10)?,
                    created_at: row.get(11)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(reservations)
    }

    pub fn save_reservation(&self, r: &Reservation, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO reservations (id, store_id, table_id, customer_name, phone, date, time, party_size, status, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                table_id=excluded.table_id, customer_name=excluded.customer_name, phone=excluded.phone,
                date=excluded.date, time=excluded.time, party_size=excluded.party_size,
                status=excluded.status, notes=excluded.notes",
            params![r.id, store_id, r.table_id, r.customer_name, r.phone, r.date, r.time, r.party_size, r.status, r.notes],
        )?;
        Ok(())
    }

    pub fn delete_reservation(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM reservations WHERE id = ?1 AND store_id = ?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_expenses(&self, date: &str, store_id: &str) -> Result<Vec<Expense>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, category, amount, description, date, payment_method, created_at FROM expenses WHERE store_id = ?1 AND date = ?2")?;
        let expenses = stmt
            .query_map(params![store_id, date], |row| {
                Ok(Expense {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    category: row.get(2)?,
                    amount: row.get(3)?,
                    description: row.get(4)?,
                    date: row.get(5)?,
                    payment_method: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(expenses)
    }

    pub fn get_expenses_by_range(
        &self,
        start_date: &str,
        end_date: &str,
        store_id: &str,
    ) -> Result<Vec<Expense>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, category, amount, description, date, payment_method, created_at FROM expenses WHERE store_id = ?1 AND date BETWEEN ?2 AND ?3 ORDER BY date DESC")?;
        let expenses = stmt
            .query_map(params![store_id, start_date, end_date], |row| {
                Ok(Expense {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    category: row.get(2)?,
                    amount: row.get(3)?,
                    description: row.get(4)?,
                    date: row.get(5)?,
                    payment_method: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(expenses)
    }

    pub fn save_expense(&self, e: &Expense, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO expenses (id, store_id, category, amount, description, date, payment_method)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                category=excluded.category, amount=excluded.amount, description=excluded.description,
                date=excluded.date, payment_method=excluded.payment_method",
            params![e.id, store_id, e.category, e.amount, e.description, e.date, e.payment_method],
        )?;
        Ok(())
    }

    pub fn delete_expense(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM expenses WHERE id = ?1 AND store_id = ?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_expense_categories(&self, store_id: &str) -> Result<Vec<ExpenseCategory>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, name, icon FROM expense_categories WHERE store_id = ?1",
        )?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(ExpenseCategory {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    icon: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_expense_category(&self, c: &ExpenseCategory, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO expense_categories (id, store_id, name, icon) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon",
            params![c.id, store_id, c.name, c.icon],
        )?;
        Ok(())
    }

    pub fn get_day_end_reconciliation(
        &self,
        date: &str,
        store_id: &str,
    ) -> Result<Option<DayEndReconciliation>> {
        let res = self.conn.query_row(
            "SELECT id, store_id, date, opening_cash, expected_cash, actual_cash, difference, cash_sales, upi_sales, card_sales, total_expenses, notes, created_by, created_at
             FROM day_end_reconciliations WHERE store_id = ?1 AND date = ?2",
            params![store_id, date],
            |row| {
                Ok(DayEndReconciliation {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    date: row.get(2)?,
                    opening_cash: row.get(3)?,
                    expected_cash: row.get(4)?,
                    actual_cash: row.get(5)?,
                    difference: row.get(6)?,
                    cash_sales: row.get(7)?,
                    upi_sales: row.get(8)?,
                    card_sales: row.get(9)?,
                    total_expenses: row.get(10)?,
                    notes: row.get(11)?,
                    created_by: row.get(12)?,
                    created_at: row.get(13)?,
                })
            }
        );
        match res {
            Ok(r) => Ok(Some(r)),
            Err(_) => Ok(None),
        }
    }

    pub fn save_day_end_reconciliation(
        &self,
        r: &DayEndReconciliation,
        store_id: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO day_end_reconciliations (id, store_id, date, opening_cash, expected_cash, actual_cash, difference, cash_sales, upi_sales, card_sales, total_expenses, notes, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
             ON CONFLICT(store_id, date) DO UPDATE SET
                opening_cash=excluded.opening_cash, expected_cash=excluded.expected_cash, actual_cash=excluded.actual_cash,
                difference=excluded.difference, cash_sales=excluded.cash_sales, upi_sales=excluded.upi_sales,
                card_sales=excluded.card_sales, total_expenses=excluded.total_expenses, notes=excluded.notes, created_by=excluded.created_by",
            params![r.id, store_id, r.date, r.opening_cash, r.expected_cash, r.actual_cash, r.difference, r.cash_sales, r.upi_sales, r.card_sales, r.total_expenses, r.notes, r.created_by],
        )?;
        Ok(())
    }

    pub fn upsert_store(&self, s: &Store) -> Result<()> {
        self.conn.execute(
            "INSERT INTO stores (id, name, industry, is_active) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, industry=excluded.industry, is_active=excluded.is_active",
            params![s.id, s.name, s.industry, if s.is_active { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn delete_store(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM stores WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Products ─────────────────────────────────────────────────────────────

    pub fn get_products(&self, store_id: &str) -> Result<Vec<Product>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, created_at FROM products WHERE store_id=?1 ORDER BY is_favorite DESC, name"
        )?;
        let products = stmt
            .query_map(params![store_id], |row| {
                let metadata_str: Option<String> = row.get(18)?;
                let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok(Product {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    price: row.get(3)?,
                    cost_price: row.get(4)?,
                    wholesale_price: row.get(5)?,
                    category: row.get(6)?,
                    subcategory: row.get(7)?,
                    stock: row.get(8)?,
                    barcode: row.get(9)?,
                    sku: row.get(10)?,
                    description: row.get(11)?,
                    tax: row.get(12)?,
                    status: row.get(13)?,
                    tags: row.get(14)?,
                    is_digital: row.get::<_, i32>(15)? == 1,
                    is_favorite: row.get::<_, i32>(16)? == 1,
                    image_url: row.get(17)?,
                    metadata,
                    created_at: row.get(19)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(products)
    }

    pub fn upsert_product(&self, p: &Product, store_id: &str) -> Result<()> {
        let metadata_str = p
            .metadata
            .as_ref()
            .and_then(|m| serde_json::to_string(m).ok());
        self.conn.execute(
            "INSERT INTO products (id, store_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, base_unit, conversion_factor)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
             ON CONFLICT(id, store_id) DO UPDATE SET
               name=excluded.name, price=excluded.price, cost_price=excluded.cost_price, wholesale_price=excluded.wholesale_price,
               category=excluded.category, subcategory=excluded.subcategory, stock=excluded.stock, barcode=excluded.barcode,
               sku=excluded.sku, description=excluded.description, tax=excluded.tax, status=excluded.status, tags=excluded.tags,
               is_digital=excluded.is_digital, is_favorite=excluded.is_favorite, image_url=excluded.image_url, metadata=excluded.metadata,
               base_unit=excluded.base_unit, conversion_factor=excluded.conversion_factor",
            params![p.id, store_id, p.name, p.price, p.cost_price, p.wholesale_price, p.category, p.subcategory, p.stock, p.barcode, p.sku, p.description, p.tax, p.status, p.tags, if p.is_digital { 1 } else { 0 }, if p.is_favorite { 1 } else { 0 }, p.image_url, metadata_str, p.base_unit, p.conversion_factor],
        )?;
        Ok(())
    }

    pub fn delete_product(&self, id: &str, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM recipes WHERE product_id=?1 AND store_id=?2", params![id, store_id])?;
        tx.execute("DELETE FROM product_variants WHERE product_id=?1 AND store_id=?2", params![id, store_id])?;
        tx.execute("DELETE FROM products WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn update_stock(&self, id: &str, delta: i64, store_id: &str, user_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        Self::adjust_inventory(&tx, id, store_id, delta, "adjustment", None, user_id, None, None)?;
        tx.commit()?;
        Ok(())
    }

    // ─── Combos ────────────────────────────────────────────────────────────────

    pub fn get_combos(&self, store_id: &str) -> Result<Vec<Combo>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, name, description, items, combo_price, discount_amount, discount_percent, is_active, created_at FROM combos WHERE store_id=?1 ORDER BY name"
        )?;
        let combos = stmt
            .query_map(params![store_id], |row| {
                let items_json: String = row.get(4)?;
                let items: Vec<ComboItem> = serde_json::from_str(&items_json).unwrap_or_default();
                Ok(Combo {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    items,
                    combo_price: row.get(5)?,
                    discount_amount: row.get(6)?,
                    discount_percent: row.get(7)?,
                    is_active: row.get::<_, i32>(8)? == 1,
                    created_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(combos)
    }

    pub fn save_combo(&self, c: &Combo, store_id: &str) -> Result<()> {
        let items_json = serde_json::to_string(&c.items).unwrap_or_default();
        self.conn.execute(
            "INSERT INTO combos (id, store_id, name, description, items, combo_price, discount_amount, discount_percent, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, description=excluded.description, items=excluded.items,
               combo_price=excluded.combo_price, discount_amount=excluded.discount_amount,
               discount_percent=excluded.discount_percent, is_active=excluded.is_active",
            params![c.id, store_id, c.name, c.description, items_json, c.combo_price, c.discount_amount, c.discount_percent, if c.is_active { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn delete_combo(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM combos WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn toggle_combo(&self, id: &str, active: bool, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE combos SET is_active=?1 WHERE id=?2 AND store_id=?3",
            params![if active { 1 } else { 0 }, id, store_id],
        )?;
        Ok(())
    }

    // ─── Orders ───────────────────────────────────────────────────────────────

    pub fn get_orders(
        &self,
        store_id: &str,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Order>> {
        let limit_val = limit.unwrap_or(500);
        let offset_val = offset.unwrap_or(0);
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, metadata, tip_amount, discount_type, created_at
             FROM orders WHERE store_id=?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
        )?;

        let mut orders: Vec<Order> = stmt
            .query_map(params![store_id, limit_val, offset_val], |row| {
                let metadata_str: Option<String> = row.get(18)?;
                let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok(Order {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    items: vec![],
                    subtotal: row.get(2)?,
                    tax_amount: row.get(3)?,
                    discount_amount: row.get(4)?,
                    total: row.get(5)?,
                    payment_method: row.get(6)?,
                    amount_paid: row.get(7)?,
                    change_amount: row.get(8)?,
                    customer_name: row.get(9)?,
                    status: row.get(10)?,
                    order_type: row.get(11)?,
                    delivery_status: row.get(12)?,
                    delivery_address: row.get(13)?,
                    delivery_phone: row.get(14)?,
                    user_id: row.get(15)?,
                    user_name: row.get(16)?,
                    synced: Some(row.get::<_, i32>(17)? == 1),
                    metadata,
                    tip_amount: row.get(19)?,
                    discount_type: row.get(20)?,
                    created_at: row.get(21)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut item_stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax, metadata, discount_type FROM order_items WHERE order_id=?1"
            )?;
            order.items = item_stmt
                .query_map(params![order.id], |row| {
                    let metadata_str: Option<String> = row.get(6)?;
                    let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
                    Ok(OrderItem {
                        product_id: row.get(0)?,
                        product_name: row.get(1)?,
                        price: row.get(2)?,
                        quantity: row.get(3)?,
                        discount: row.get(4)?,
                        tax: row.get(5)?,
                        metadata,
                        discount_type: row.get(7)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    pub fn save_order(&self, o: &Order, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        let metadata_str = o.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok());

        tx.execute(
            "INSERT OR REPLACE INTO orders
             (id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, metadata, tip_amount, discount_type, created_at)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,0,?18,?19,?20,?21)",
            params![
                o.id, store_id, o.subtotal, o.tax_amount, o.discount_amount, o.total,
                o.payment_method, o.amount_paid, o.change_amount,
                o.customer_name, o.status, o.order_type, o.delivery_status,
                o.delivery_address, o.delivery_phone, o.user_id, o.user_name, metadata_str, o.tip_amount, o.discount_type, o.created_at
            ],
        )?;

        tx.execute("DELETE FROM order_items WHERE order_id=?1", params![o.id])?;

        for item in &o.items {
            let item_metadata_str = item.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok());
            tx.execute(
                "INSERT INTO order_items (order_id, store_id, product_id, product_name, price, quantity, discount, tax, metadata, discount_type)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                params![o.id, o.store_id, item.product_id, item.product_name, item.price, item.quantity, item.discount, item.tax, item_metadata_str, item.discount_type],
            )?;

            if o.status == "completed" {
                let batch_id = item.metadata.as_ref().and_then(|m| m.get("batch_id")).and_then(|v| v.as_str());
                let serial_id = item.metadata.as_ref().and_then(|m| m.get("serial_number_id")).and_then(|v| v.as_str());
                let user_id = o.user_id.as_deref().unwrap_or("system");

                Self::adjust_inventory(&tx, &item.product_id, store_id, -item.quantity, "order", Some(&o.id), user_id, batch_id, serial_id)?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn refund_order(
        &self,
        id: &str,
        store_id: &str,
        user_id: &str,
        _user_name: &str,
    ) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        let items = tx.prepare("SELECT product_id, quantity, metadata FROM order_items WHERE order_id=?1")?
            .query_map(params![id], |row| {
                let m_str: Option<String> = row.get(2)?;
                let m: Option<serde_json::Value> = m_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, m))
            })?.collect::<Result<Vec<_>>>()?;

        for (product_id, qty, metadata) in items {
            let batch_id = metadata.as_ref().and_then(|m| m.get("batch_id")).and_then(|v| v.as_str());
            let serial_id = metadata.as_ref().and_then(|m| m.get("serial_number_id")).and_then(|v| v.as_str());
            Self::adjust_inventory(&tx, &product_id, store_id, qty, "return", Some(id), user_id, batch_id, serial_id)?;
        }

        tx.execute("UPDATE orders SET status='refunded' WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn update_delivery_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE orders SET delivery_status=?1 WHERE id=?2 AND store_id=?3",
            params![status, id, store_id],
        )?;
        Ok(())
    }

    pub fn update_order_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE orders SET status=?1 WHERE id=?2 AND store_id=?3",
            params![status, id, store_id],
        )?;
        Ok(())
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    pub fn get_settings(&self, store_id: &str) -> Result<Settings> {
        let value: String = self
            .conn
            .query_row(
                "SELECT value FROM settings_multi WHERE store_id=?1",
                params![store_id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "{}".to_string());

        let mut s: Settings =
            serde_json::from_str(&value).unwrap_or_else(|_| self.default_settings());
        s.neon_url = decrypt_value(&s.neon_url);
        s.twilio_sid = decrypt_value(&s.twilio_sid);
        s.twilio_token = decrypt_value(&s.twilio_token);
        s.twilio_phone = decrypt_value(&s.twilio_phone);
        s.whatsapp_api_url = decrypt_value(&s.whatsapp_api_url);
        Ok(s)
    }

    fn default_settings(&self) -> Settings {
        Settings {
            store_name: "My Store".into(),
            currency: "USD".into(),
            currency_symbol: "$".into(),
            country: "US".into(),
            timezone: "UTC".into(),
            tax_rate: 0.0,
            tax_name: "Tax".into(),
            tax_system: "none".into(),
            address: "".into(),
            phone: "".into(),
            neon_url: "".into(),
            business_name: "".into(),
            tax_id: "".into(),
            receipt_save_path: "".into(),
            twilio_sid: "".into(),
            twilio_token: "".into(),
            twilio_phone: "".into(),
            lan_sync_enabled: false,
            lan_server_port: 8765,
            dark_mode: true,
            language: "en".into(),
            whatsapp_enabled: false,
            whatsapp_api_url: "".into(),
            offline_mode: true,
            logo_url: "".into(),
            primary_color: "#F5C842".into(),
            secondary_color: "#1E1E26".into(),
            accent_color: "#2ECC71".into(),
            footer_text: "".into(),
            contact_email: "".into(),
            contact_website: "".into(),
            tax_inclusive: false,
            tax_breakdown: "[]".into(),
            auto_print_kot: false,
            upi_id: "".into(),
            show_logo_on_receipt: true,
            receipt_header_text: "".into(),
            merchant_id: "".into(),
            show_tax_breakdown: true,
            onboarding_completed: false,
        }
    }

    pub fn save_settings(&self, s: &Settings, store_id: &str) -> Result<()> {
        let mut s_enc = s.clone();
        s_enc.neon_url = encrypt_value(&s.neon_url);
        s_enc.twilio_sid = encrypt_value(&s.twilio_sid);
        s_enc.twilio_token = encrypt_value(&s.twilio_token);
        s_enc.twilio_phone = encrypt_value(&s.twilio_phone);
        s_enc.whatsapp_api_url = encrypt_value(&s.whatsapp_api_url);

        let value = serde_json::to_string(&s_enc).unwrap_or_else(|_| "{}".to_string());
        self.conn.execute(
            "INSERT INTO settings_multi (store_id, value) VALUES (?1, ?2) ON CONFLICT(store_id) DO UPDATE SET value=excluded.value",
            params![store_id, value],
        )?;
        Ok(())
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    pub fn get_daily_summary(&self, store_id: &str) -> Result<DailySummary> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        self.conn.query_row(
            "SELECT
                COALESCE(SUM(total), 0),
                COUNT(*),
                COALESCE(AVG(total), 0),
                (SELECT COALESCE(SUM(quantity), 0) FROM order_items oi JOIN orders o ON oi.order_id = o.id
                 WHERE o.store_id=?1 AND o.status='completed' AND DATE(o.created_at, 'localtime')=?2)
             FROM orders
             WHERE store_id=?1 AND status='completed' AND DATE(created_at, 'localtime')=?2",
            params![store_id, today],
            |r| Ok(DailySummary {
                revenue: r.get(0)?,
                transactions: r.get(1)?,
                avg_order: r.get(2)?,
                items_sold: r.get(3)?,
            })
        )
    }

    pub fn get_weekly_revenue(&self, store_id: &str) -> Result<Vec<DayRevenue>> {
        let mut days = Vec::new();
        for i in (0..7).rev() {
            let date = (chrono::Local::now() - chrono::Duration::days(i))
                .format("%Y-%m-%d")
                .to_string();
            let label = (chrono::Local::now() - chrono::Duration::days(i))
                .format("%a")
                .to_string();
            let revenue: f64 = self.conn.query_row(
                "SELECT COALESCE(SUM(total),0) FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at, 'localtime')=?2",
                params![store_id, date],
                |r| r.get(0),
            ).unwrap_or(0.0);
            days.push(DayRevenue { label, revenue });
        }
        Ok(days)
    }

    pub fn get_top_products(&self, store_id: &str) -> Result<Vec<TopProduct>> {
        let mut stmt = self.conn.prepare(
            "SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.price*oi.quantity) as revenue
             FROM order_items oi JOIN orders o ON o.id=oi.order_id
             WHERE o.store_id=?1 AND o.status='completed'
             GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5",
        )?;
        let items = stmt
            .query_map(params![store_id], |r| {
                Ok(TopProduct {
                    name: r.get(0)?,
                    qty: r.get(1)?,
                    revenue: r.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_low_stock(&self, store_id: &str) -> Result<Vec<LowStockItem>> {
        let mut stmt = self.conn.prepare("SELECT name, stock FROM products WHERE store_id=?1 AND stock <= 10 ORDER BY stock ASC LIMIT 10")?;
        let items = stmt
            .query_map(params![store_id], |r| {
                Ok(LowStockItem {
                    name: r.get(0)?,
                    stock: r.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_sales_by_payment_method(
        &self,
        date: &str,
        store_id: &str,
    ) -> Result<(f64, f64, f64)> {
        let get = |m: &str| -> f64 {
            self.conn.query_row(
                "SELECT COALESCE(SUM(total), 0) FROM orders WHERE store_id=?1 AND status='completed' AND payment_method=?2 AND DATE(created_at, 'localtime')=?3",
                params![store_id, m, date],
                |r| r.get(0),
            ).unwrap_or(0.0)
        };
        Ok((get("cash"), get("upi"), get("card")))
    }

    // ─── CSV ──────────────────────────────────────────────────────────────────

    pub fn export_products_csv(&self, store_id: &str) -> Result<String> {
        let products = self.get_products(store_id)?;
        let mut wtr = csv::Writer::from_writer(vec![]);

        // Header
        wtr.write_record(&[
            "id", "parent_id", "name", "price", "cost_price", "wholesale_price",
            "category", "subcategory", "stock", "barcode", "sku", "description",
            "tax", "status", "tags", "is_digital", "is_favorite", "image_url", "metadata", "variant_value"
        ]).map_err(|_| rusqlite::Error::InvalidQuery)?;

        for p in products {
            let metadata_str = p.metadata.as_ref()
                .and_then(|m| serde_json::to_string(m).ok())
                .unwrap_or_default();

            wtr.write_record(&[
                &p.id,
                "", // parent_id
                &p.name,
                &p.price.to_string(),
                &p.cost_price.to_string(),
                &p.wholesale_price.to_string(),
                &p.category,
                p.subcategory.as_deref().unwrap_or(""),
                &p.stock.to_string(),
                &p.barcode,
                p.sku.as_deref().unwrap_or(""),
                p.description.as_deref().unwrap_or(""),
                &p.tax.to_string(),
                &p.status,
                &p.tags,
                &p.is_digital.to_string(),
                &p.is_favorite.to_string(),
                p.image_url.as_deref().unwrap_or(""),
                &metadata_str,
                "", // variant_value
            ]).map_err(|_| rusqlite::Error::InvalidQuery)?;

            // Export variants
            if let Ok(variants) = self.get_product_variants(&p.id, store_id) {
                for v in variants {
                    wtr.write_record(&[
                        &v.id,
                        &p.id, // parent_id
                        &v.name,
                        &v.price.to_string(),
                        "0", // cost_price
                        "0", // wholesale_price
                        &p.category,
                        p.subcategory.as_deref().unwrap_or(""),
                        &v.stock.to_string(),
                        "", // barcode
                        &v.sku,
                        "", // description
                        &p.tax.to_string(),
                        "active", // status
                        "", // tags
                        "false", // is_digital
                        "false", // is_favorite
                        "", // image_url
                        "{}", // metadata
                        &v.value, // variant_value
                    ]).map_err(|_| rusqlite::Error::InvalidQuery)?;
                }
            }
        }

        let data = String::from_utf8(wtr.into_inner().unwrap_or_default())
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        Ok(data)
    }

    pub fn export_orders_csv(&self, store_id: &str) -> Result<String> {
        let orders = self.get_orders(store_id, None, None)?;
        let mut wtr = csv::Writer::from_writer(vec![]);

        wtr.write_record(&["id", "total", "payment_method", "customer", "status", "order_type", "created_at"])
            .map_err(|_| rusqlite::Error::InvalidQuery)?;

        for o in orders {
            wtr.write_record(&[
                &o.id,
                &o.total.to_string(),
                &o.payment_method,
                &o.customer_name,
                &o.status,
                &o.order_type,
                &o.created_at,
            ]).map_err(|_| rusqlite::Error::InvalidQuery)?;
        }

        let data = String::from_utf8(wtr.into_inner().unwrap_or_default())
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        Ok(data)
    }

    pub fn import_products_csv(&self, csv_data: &str, store_id: &str) -> Result<CsvImportResult> {
        let mut imported = 0;
        let mut errors = 0;
        let mut rdr = csv::Reader::from_reader(csv_data.as_bytes());

        for result in rdr.records() {
            let record = match result {
                Ok(r) => r,
                Err(_) => {
                    errors += 1;
                    continue;
                }
            };

            let len = record.len();
            if len < 4 { // Very basic validation
                errors += 1;
                continue;
            }

            // Map fields based on column count (backward compatibility)
            // Legacy (~2024): id, name, price, category, stock, barcode, tax (7 columns)
            // Intermediate (Early 2025): id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata (18 columns)
            // Current: id, parent_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, variant_value (20 columns)

            let (id, parent_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, variant_value);

            if len >= 19 {
                // New 20-column format or 19-column variant
                id = record.get(0).unwrap_or("").to_string();
                parent_id = record.get(1).unwrap_or("").to_string();
                name = record.get(2).unwrap_or("").to_string();
                price = record.get(3).unwrap_or("0").parse().unwrap_or(0.0);
                cost_price = record.get(4).unwrap_or("0").parse().unwrap_or(0.0);
                wholesale_price = record.get(5).unwrap_or("0").parse().unwrap_or(0.0);
                category = record.get(6).unwrap_or("General").to_string();
                subcategory = record.get(7).filter(|s| !s.is_empty()).map(|s| s.to_string());
                stock = record.get(8).unwrap_or("0").parse().unwrap_or(0);
                barcode = record.get(9).unwrap_or("").to_string();
                sku = record.get(10).filter(|s| !s.is_empty()).map(|s| s.to_string());
                description = record.get(11).filter(|s| !s.is_empty()).map(|s| s.to_string());
                tax = record.get(12).unwrap_or("0").parse().unwrap_or(0.0);
                status = record.get(13).unwrap_or("active").to_string();
                tags = record.get(14).unwrap_or("").to_string();
                is_digital = record.get(15).map(|s| s == "true").unwrap_or(false);
                is_favorite = record.get(16).map(|s| s == "true").unwrap_or(false);
                image_url = record.get(17).filter(|s| !s.is_empty()).map(|s| s.to_string());
                metadata = record.get(18).and_then(|s| serde_json::from_str(s).ok());
                variant_value = record.get(19).unwrap_or("").to_string();
            } else if len == 18 {
                // Intermediate 18-column format
                id = record.get(0).unwrap_or("").to_string();
                parent_id = String::new();
                name = record.get(1).unwrap_or("").to_string();
                price = record.get(2).unwrap_or("0").parse().unwrap_or(0.0);
                cost_price = record.get(3).unwrap_or("0").parse().unwrap_or(0.0);
                wholesale_price = record.get(4).unwrap_or("0").parse().unwrap_or(0.0);
                category = record.get(5).unwrap_or("General").to_string();
                subcategory = record.get(6).filter(|s| !s.is_empty()).map(|s| s.to_string());
                stock = record.get(7).unwrap_or("0").parse().unwrap_or(0);
                barcode = record.get(8).unwrap_or("").to_string();
                sku = record.get(9).filter(|s| !s.is_empty()).map(|s| s.to_string());
                description = record.get(10).filter(|s| !s.is_empty()).map(|s| s.to_string());
                tax = record.get(11).unwrap_or("0").parse().unwrap_or(0.0);
                status = record.get(12).unwrap_or("active").to_string();
                tags = record.get(13).unwrap_or("").to_string();
                is_digital = record.get(14).map(|s| s == "true").unwrap_or(false);
                is_favorite = record.get(15).map(|s| s == "true").unwrap_or(false);
                image_url = record.get(16).filter(|s| !s.is_empty()).map(|s| s.to_string());
                metadata = record.get(17).and_then(|s| serde_json::from_str(s).ok());
                variant_value = String::new();
            } else {
                // Legacy format (7-9 columns)
                id = record.get(0).unwrap_or("").to_string();
                parent_id = String::new();
                name = record.get(1).unwrap_or("").to_string();
                price = record.get(2).unwrap_or("0").parse().unwrap_or(0.0);
                category = record.get(3).unwrap_or("General").to_string();
                stock = record.get(4).unwrap_or("0").parse().unwrap_or(0);
                barcode = record.get(5).unwrap_or("").to_string();
                tax = record.get(6).unwrap_or("18").parse().unwrap_or(18.0);

                cost_price = 0.0;
                wholesale_price = 0.0;
                subcategory = None;
                sku = None;
                description = None;
                status = "active".to_string();
                tags = String::new();
                is_digital = false;
                is_favorite = false;
                image_url = None;
                metadata = None;
                variant_value = String::new();
            }

            if name.is_empty() {
                errors += 1;
                continue;
            }

            if parent_id.is_empty() {
                // Import as Product
                let p = Product {
                    id: if id.is_empty() { uuid::Uuid::new_v4().to_string() } else { id },
                    store_id: store_id.to_string(),
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
                    created_at: None,
                    metadata,
                };
                if self.upsert_product(&p, store_id).is_ok() {
                    imported += 1;
                } else {
                    errors += 1;
                }
            } else {
                // Import as Product Variant
                let v = ProductVariant {
                    id: if id.is_empty() { uuid::Uuid::new_v4().to_string() } else { id },
                    product_id: parent_id,
                    store_id: store_id.to_string(),
                    name,
                    value: variant_value,
                    sku: sku.unwrap_or_default(),
                    price,
                    stock,
                };
                if self.save_product_variant(&v, store_id).is_ok() {
                    imported += 1;
                } else {
                    errors += 1;
                }
            }
        }
        Ok(CsvImportResult { imported, errors })
    }

    pub fn get_sales_report(&self, start: &str, end: &str, store_id: &str) -> Result<SalesReport> {
        self.conn.query_row(
            "SELECT COALESCE(SUM(total),0), COUNT(*), COALESCE(AVG(total),0)
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at, 'localtime') BETWEEN ?2 AND ?3",
            params![store_id, start, end],
            |r| Ok(SalesReport {
                start_date: start.to_string(),
                end_date: end.to_string(),
                total_revenue: r.get(0)?,
                total_orders: r.get(1)?,
                avg_order: r.get(2)?,
            })
        )
    }

    // ─── Tables ───────────────────────────────────────────────────────────────

    pub fn get_tables(&self, store_id: &str) -> Result<Vec<Table>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, capacity, status, position_x, position_y FROM tables WHERE store_id=?1 ORDER BY name")?;
        let tables = stmt
            .query_map(params![store_id], |row| {
                Ok(Table {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    capacity: row.get(3)?,
                    status: row.get(4)?,
                    position_x: row.get(5)?,
                    position_y: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(tables)
    }

    pub fn save_table(&self, t: &Table, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO tables (id, store_id, name, capacity, status, position_x, position_y)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, capacity=excluded.capacity, status=excluded.status, position_x=excluded.position_x, position_y=excluded.position_y",
            params![t.id, store_id, t.name, t.capacity, t.status, t.position_x, t.position_y],
        )?;
        Ok(())
    }

    pub fn get_product_variants(&self, product_id: &str, store_id: &str) -> Result<Vec<ProductVariant>> {
        let mut stmt = self.conn.prepare("SELECT id, product_id, store_id, name, value, sku, price, stock FROM product_variants WHERE product_id=?1 AND store_id=?2")?;
        let variants = stmt.query_map(params![product_id, store_id], |row| {
            Ok(ProductVariant {
                id: row.get(0)?,
                product_id: row.get(1)?,
                store_id: row.get(2)?,
                name: row.get(3)?,
                value: row.get(4)?,
                sku: row.get(5)?,
                price: row.get(6)?,
                stock: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(variants)
    }

    pub fn save_product_variant(&self, v: &ProductVariant, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO product_variants (id, product_id, store_id, name, value, sku, price, stock)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, value=excluded.value, sku=excluded.sku, price=excluded.price, stock=excluded.stock",
            params![v.id, v.product_id, store_id, v.name, v.value, v.sku, v.price, v.stock],
        )?;
        Ok(())
    }

    pub fn delete_product_variant(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM product_variants WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn delete_table(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM tables WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn update_table_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tables SET status=?1 WHERE id=?2 AND store_id=?3",
            params![status, id, store_id],
        )?;
        Ok(())
    }

    // ─── Others (Simplified) ──────────────────────────────────────────────────

    pub fn get_customers(&self, store_id: &str) -> Result<Vec<Customer>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, phone, email, loyalty_points, total_spent, visits, group_name, notes, birthday, anniversary, credit_limit, price_tier, loyalty_tier, created_at FROM customers WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(Customer {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    phone: row.get(3)?,
                    email: row.get(4)?,
                    loyalty_points: row.get(5)?,
                    total_spent: row.get(6)?,
                    visits: row.get(7)?,
                    group_name: row.get(8)?,
                    notes: row.get(9)?,
                    birthday: row.get(10)?,
                    anniversary: row.get(11)?,
                    credit_limit: row.get(12)?,
                    price_tier: row.get(13)?,
                    loyalty_tier: row.get(14)?,
                    created_at: row.get(15)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_customer(&self, c: &Customer, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO customers (id, store_id, name, phone, email, group_name, notes, birthday, anniversary, credit_limit, price_tier, loyalty_tier)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET
                name=excluded.name, phone=excluded.phone, email=excluded.email,
                group_name=excluded.group_name, notes=excluded.notes,
                birthday=excluded.birthday, anniversary=excluded.anniversary,
                credit_limit=excluded.credit_limit, price_tier=excluded.price_tier,
                loyalty_tier=excluded.loyalty_tier",
            params![c.id, store_id, c.name, c.phone, c.email, c.group_name, c.notes, c.birthday, c.anniversary, c.credit_limit, c.price_tier, c.loyalty_tier],
        )?;
        Ok(())
    }

    pub fn delete_customer(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM customers WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_customer_by_phone(&self, phone: &str, store_id: &str) -> Result<Option<Customer>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, phone, email, loyalty_points, total_spent, visits, group_name, notes, birthday, anniversary, credit_limit, price_tier, loyalty_tier, created_at FROM customers WHERE phone=?1 AND store_id=?2")?;
        let res = stmt.query_row(params![phone, store_id], |row| {
            Ok(Customer {
                id: row.get(0)?,
                store_id: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                loyalty_points: row.get(5)?,
                total_spent: row.get(6)?,
                visits: row.get(7)?,
                group_name: row.get(8)?,
                notes: row.get(9)?,
                birthday: row.get(10)?,
                anniversary: row.get(11)?,
                credit_limit: row.get(12)?,
                price_tier: row.get(13)?,
                loyalty_tier: row.get(14)?,
                created_at: row.get(15)?,
            })
        });
        match res {
            Ok(c) => Ok(Some(c)),
            Err(_) => Ok(None),
        }
    }

    pub fn add_loyalty_points(
        &self,
        id: &str,
        points: i32,
        spent: f64,
        store_id: &str,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE customers SET loyalty_points = loyalty_points + ?1, total_spent = total_spent + ?2, visits = visits + 1 WHERE id=?3 AND store_id=?4",
            params![points, spent, id, store_id],
        )?;
        Ok(())
    }

    pub fn get_customer_addresses(&self, customer_id: &str) -> Result<Vec<CustomerAddress>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, customer_id, label, address, city, state, zip, phone FROM customer_addresses WHERE customer_id=?1"
        )?;
        let items = stmt
            .query_map(params![customer_id], |row| {
                Ok(CustomerAddress {
                    id: row.get(0)?,
                    customer_id: row.get(1)?,
                    label: row.get(2)?,
                    address: row.get(3)?,
                    city: row.get(4)?,
                    state: row.get(5)?,
                    zip: row.get(6)?,
                    phone: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_customer_address(&self, a: &CustomerAddress) -> Result<()> {
        self.conn.execute(
            "INSERT INTO customer_addresses (id, customer_id, label, address, city, state, zip, phone)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                label=excluded.label, address=excluded.address, city=excluded.city,
                state=excluded.state, zip=excluded.zip, phone=excluded.phone",
            params![a.id, a.customer_id, a.label, a.address, a.city, a.state, a.zip, a.phone],
        )?;
        Ok(())
    }

    pub fn delete_customer_address(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM customer_addresses WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn export_customers_csv(&self, store_id: &str) -> Result<String> {
        let customers = self.get_customers(store_id)?;
        let mut wtr = csv::Writer::from_writer(vec![]);

        wtr.write_record(&[
            "id", "name", "phone", "email", "loyalty_points", "total_spent", "visits",
            "group_name", "notes", "birthday", "anniversary", "credit_limit", "price_tier", "loyalty_tier"
        ]).map_err(|_| rusqlite::Error::InvalidQuery)?;

        for c in customers {
            wtr.write_record(&[
                &c.id, &c.name, &c.phone, &c.email,
                &c.loyalty_points.to_string(), &c.total_spent.to_string(), &c.visits.to_string(),
                c.group_name.as_deref().unwrap_or(""),
                c.notes.as_deref().unwrap_or(""),
                c.birthday.as_deref().unwrap_or(""),
                c.anniversary.as_deref().unwrap_or(""),
                &c.credit_limit.unwrap_or(0.0).to_string(),
                c.price_tier.as_deref().unwrap_or(""),
                c.loyalty_tier.as_deref().unwrap_or(""),
            ]).map_err(|_| rusqlite::Error::InvalidQuery)?;
        }

        let data = String::from_utf8(wtr.into_inner().unwrap_or_default())
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        Ok(data)
    }

    pub fn import_customers_csv(&self, csv_data: &str, store_id: &str) -> Result<CsvImportResult> {
        let mut imported = 0;
        let mut errors = 0;
        let mut rdr = csv::Reader::from_reader(csv_data.as_bytes());

        for result in rdr.records() {
            let record = match result {
                Ok(r) => r,
                Err(_) => { errors += 1; continue; }
            };

            if record.len() < 3 { errors += 1; continue; }

            let c = Customer {
                id: record.get(0).filter(|s| !s.is_empty()).map(|s| s.to_string()).unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
                store_id: store_id.to_string(),
                name: record.get(1).unwrap_or("").to_string(),
                phone: record.get(2).unwrap_or("").to_string(),
                email: record.get(3).unwrap_or("").to_string(),
                loyalty_points: record.get(4).and_then(|s| s.parse().ok()).unwrap_or(0),
                total_spent: record.get(5).and_then(|s| s.parse().ok()).unwrap_or(0.0),
                visits: record.get(6).and_then(|s| s.parse().ok()).unwrap_or(0),
                group_name: record.get(7).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                notes: record.get(8).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                birthday: record.get(9).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                anniversary: record.get(10).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                credit_limit: record.get(11).and_then(|s| s.parse().ok()),
                price_tier: record.get(12).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                loyalty_tier: record.get(13).filter(|s| !s.is_empty()).map(|s| s.to_string()),
                created_at: chrono::Local::now().to_rfc3339(),
            };

            if self.save_customer(&c, store_id).is_ok() {
                imported += 1;
            } else {
                errors += 1;
            }
        }
        Ok(CsvImportResult { imported, errors })
    }

    pub fn get_customer_statistics(&self, customer_id: &str) -> Result<CustomerStatistics> {
        self.conn.query_row(
            "SELECT total_spent, visits, CASE WHEN visits > 0 THEN total_spent / visits ELSE 0 END FROM customers WHERE id = ?1",
            params![customer_id],
            |row| Ok(CustomerStatistics {
                total_spent: row.get(0)?,
                visits: row.get(1)?,
                avg_order_value: row.get(2)?,
            })
        )
    }

    pub fn get_customer_orders(&self, phone: &str, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM orders WHERE delivery_phone=?1 AND store_id=?2")?;
        let ids: Vec<String> = stmt
            .query_map(params![phone, store_id], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;
        let mut res = Vec::new();
        for id in ids {
            if let Ok(o) = self.get_order_by_id(&id, store_id) {
                res.push(o);
            }
        }
        Ok(res)
    }

    fn get_order_by_id(&self, id: &str, store_id: &str) -> Result<Order> {
        self.conn.query_row(
            "SELECT id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, metadata, tip_amount, discount_type, created_at
             FROM orders WHERE id=?1 AND store_id=?2",
            params![id, store_id],
            |row| {
                let metadata_str: Option<String> = row.get(18)?;
                let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
                Ok(Order {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    items: vec![],
                    subtotal: row.get(2)?,
                    tax_amount: row.get(3)?,
                    discount_amount: row.get(4)?,
                    total: row.get(5)?,
                    payment_method: row.get(6)?,
                    amount_paid: row.get(7)?,
                    change_amount: row.get(8)?,
                    customer_name: row.get(9)?,
                    status: row.get(10)?,
                    order_type: row.get(11)?,
                    delivery_status: row.get(12)?,
                    delivery_address: row.get(13)?,
                    delivery_phone: row.get(14)?,
                    user_id: row.get(15)?,
                    user_name: row.get(16)?,
                    synced: Some(row.get::<_, i32>(17)? == 1),
                    metadata,
                    tip_amount: row.get(19)?,
                    discount_type: row.get(20)?,
                    created_at: row.get(21)?,
                })
            }
        )
    }

    pub fn clock_in(&self, user_id: &str, user_name: &str, store_id: &str) -> Result<()> {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let date = now[..10].to_string();
        self.conn.execute(
            "INSERT INTO staff_attendance (id, store_id, user_id, user_name, clock_in, date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![uuid::Uuid::new_v4().to_string(), store_id, user_id, user_name, now, date],
        )?;
        Ok(())
    }

    pub fn clock_out(&self, user_id: &str, store_id: &str) -> Result<()> {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        self.conn.execute(
            "UPDATE staff_attendance SET clock_out=?1 WHERE user_id=?2 AND store_id=?3 AND clock_out IS NULL",
            params![now, user_id, store_id],
        )?;
        Ok(())
    }

    pub fn get_today_attendance(&self, store_id: &str) -> Result<Vec<StaffAttendance>> {
        let date = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut stmt = self.conn.prepare("SELECT id, store_id, user_id, user_name, clock_in, clock_out, date FROM staff_attendance WHERE store_id=?1 AND date=?2")?;
        let items = stmt
            .query_map(params![store_id, date], |row| {
                Ok(StaffAttendance {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    user_id: row.get(2)?,
                    user_name: row.get(3)?,
                    clock_in: row.get(4)?,
                    clock_out: row.get(5)?,
                    date: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn is_clocked_in(&self, user_id: &str, store_id: &str) -> Result<bool> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM staff_attendance WHERE user_id=?1 AND store_id=?2 AND clock_out IS NULL",
            params![user_id, store_id],
            |r| r.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn get_activity_logs(&self, store_id: &str, limit: i64) -> Result<Vec<ActivityLog>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at FROM activity_logs WHERE store_id=?1 ORDER BY created_at DESC LIMIT ?2")?;
        let items = stmt
            .query_map(params![store_id, limit], |row| {
                Ok(ActivityLog {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    order_id: row.get(2)?,
                    action: row.get(3)?,
                    previous_data: row.get(4)?,
                    new_data: row.get(5)?,
                    reason: row.get(6)?,
                    user_id: row.get(7)?,
                    user_name: row.get(8)?,
                    created_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn export_backup(&self, store_id: &str) -> Result<String> {
        let products = self.get_products(store_id)?;
        let orders = self.get_orders(store_id, None, None)?;
        let settings = self.get_settings(store_id)?;
        let data = BackupData {
            products,
            orders,
            settings,
            exported_at: chrono::Local::now().to_rfc3339(),
        };
        let json = serde_json::to_string(&data).unwrap_or_default();

        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(json.as_bytes())
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let compressed = encoder.finish().map_err(|_| rusqlite::Error::InvalidQuery)?;

        use base64::{engine::general_purpose, Engine as _};
        Ok(general_purpose::STANDARD.encode(compressed))
    }

    pub fn import_backup(&self, backup: &str, store_id: &str) -> Result<ImportResult> {
        let data: BackupData =
            serde_json::from_str(backup).map_err(|_| rusqlite::Error::InvalidQuery)?;

        let mut products_imported = 0;
        let mut orders_imported = 0;

        for p in data.products {
            if self.upsert_product(&p, store_id).is_ok() {
                products_imported += 1;
            }
        }
        for o in data.orders {
            if self.save_order(&o, store_id).is_ok() {
                orders_imported += 1;
            }
        }
        Ok(ImportResult {
            products_imported,
            orders_imported,
        })
    }

    pub fn add_order_note(&self, order_id: &str, note: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO activity_logs (id, store_id, order_id, action, reason, user_id, user_name) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![uuid::Uuid::new_v4().to_string(), store_id, order_id, "note", note, "system", "System"],
        )?;
        Ok(())
    }

    pub fn get_order_notes(&self, order_id: &str, store_id: &str) -> Result<Vec<OrderNote>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, order_id, reason, created_at FROM activity_logs WHERE order_id=?1 AND store_id=?2 AND action='note'")?;
        let items = stmt
            .query_map(params![order_id, store_id], |row| {
                Ok(OrderNote {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    order_id: row.get(2)?,
                    note: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_inventory_alerts(&self, store_id: &str) -> Result<Vec<InventoryAlert>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, product_id, product_name, current_stock, threshold, alert_type, created_at FROM inventory_alerts WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(InventoryAlert {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    product_id: row.get(2)?,
                    product_name: row.get(3)?,
                    current_stock: row.get(4)?,
                    threshold: row.get(5)?,
                    alert_type: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn check_inventory_alerts(&self, store_id: &str) -> Result<Vec<InventoryAlert>> {
        let products = self.get_products(store_id)?;
        let mut alerts = Vec::new();
        for p in products {
            if p.stock <= 10 {
                let alert = InventoryAlert {
                    id: uuid::Uuid::new_v4().to_string(),
                    store_id: store_id.into(),
                    product_id: p.id,
                    product_name: p.name,
                    current_stock: p.stock as i32,
                    threshold: 10,
                    alert_type: "low_stock".into(),
                    created_at: chrono::Local::now().to_rfc3339(),
                };
                let _ = self.create_inventory_alert(&alert, store_id);
                alerts.push(alert);
            }
        }
        Ok(alerts)
    }

    pub fn create_inventory_alert(&self, a: &InventoryAlert, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO inventory_alerts (id, store_id, product_id, product_name, current_stock, threshold, alert_type) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![a.id, store_id, a.product_id, a.product_name, a.current_stock, a.threshold, a.alert_type],
        )?;
        Ok(())
    }

    pub fn clear_inventory_alert(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM inventory_alerts WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_hourly_sales(&self, date: &str, store_id: &str) -> Result<Vec<HourlySales>> {
        let mut stmt = self.conn.prepare(
            "SELECT strftime('%H', created_at) as hour, SUM(total) as revenue, COUNT(*) as orders
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) = ?2 GROUP BY hour"
        )?;
        let items = stmt
            .query_map(params![store_id, date], |row| {
                Ok(HourlySales {
                    hour: row.get::<_, String>(0)?.parse().unwrap_or(0),
                    revenue: row.get(1)?,
                    orders: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_staff_performance(
        &self,
        start: &str,
        end: &str,
        store_id: &str,
    ) -> Result<Vec<StaffPerformance>> {
        let mut stmt = self.conn.prepare(
            "SELECT user_id, user_name, COUNT(*) as orders, SUM(total) as revenue
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) BETWEEN ?2 AND ?3 GROUP BY user_id"
        )?;
        let items = stmt
            .query_map(params![store_id, start, end], |row| {
                Ok(StaffPerformance {
                    user_id: row.get(0)?,
                    user_name: row.get(1)?,
                    total_orders: row.get(2)?,
                    total_revenue: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_sales_by_item(
        &self,
        start: &str,
        end: &str,
        store_id: &str,
    ) -> Result<Vec<SalesByItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT oi.product_id, oi.product_name, SUM(oi.quantity), SUM(oi.price*oi.quantity)
             FROM order_items oi JOIN orders o ON o.id=oi.order_id
             WHERE o.store_id=?1 AND o.status='completed' AND DATE(o.created_at) BETWEEN ?2 AND ?3
             GROUP BY oi.product_id",
        )?;
        let items = stmt
            .query_map(params![store_id, start, end], |row| {
                Ok(SalesByItem {
                    product_id: row.get(0)?,
                    product_name: row.get(1)?,
                    quantity: row.get(2)?,
                    revenue: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn hold_order(&self, o: &Order, store_id: &str) -> Result<()> {
        let mut order = o.clone();
        order.status = "hold".into();
        self.save_order(&order, store_id)
    }

    pub fn get_held_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let all = self.get_orders(store_id, None, None)?;
        Ok(all.into_iter().filter(|o| o.status == "hold").collect())
    }

    pub fn cancel_order(
        &self,
        id: &str,
        reason: &str,
        user_id: &str,
        user_name: &str,
        store_id: &str,
    ) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        let current_status: String = tx
            .query_row(
                "SELECT status FROM orders WHERE id=?1 AND store_id=?2",
                params![id, store_id],
                |r| r.get(0),
            )
            .unwrap_or_else(|_| "pending".to_string());

        if current_status == "completed" {
            let items: Vec<(String, i64)> = tx
                .prepare("SELECT product_id, quantity FROM order_items WHERE order_id=?1")?
                .query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
                .collect::<Result<Vec<_>>>()?;

            for (product_id, qty) in items {
                Self::adjust_inventory(&tx, &product_id, store_id, qty)?;
            }
        }

        tx.execute(
            "UPDATE orders SET status='cancelled' WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        tx.execute(
            "INSERT INTO activity_logs (id, store_id, order_id, action, reason, user_id, user_name) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![uuid::Uuid::new_v4().to_string(), store_id, id, "cancel", reason, user_id, user_name],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn create_refund_request(
        &self,
        order_id: &str,
        amount: f64,
        reason: &str,
        store_id: &str,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO refund_requests (id, store_id, order_id, amount, reason) VALUES (?1,?2,?3,?4,?5)",
            params![id, store_id, order_id, amount, reason],
        )?;
        Ok(id)
    }

    pub fn get_refund_requests(&self, store_id: &str) -> Result<Vec<RefundRequest>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, order_id, amount, reason, status, created_at FROM refund_requests WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(RefundRequest {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    order_id: row.get(2)?,
                    amount: row.get(3)?,
                    reason: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn approve_refund(
        &self,
        id: &str,
        user_id: &str,
        user_name: &str,
        store_id: &str,
    ) -> Result<()> {
        let order_id: String = self.conn.query_row(
            "SELECT order_id FROM refund_requests WHERE id=?1",
            params![id],
            |r| r.get(0),
        )?;
        self.refund_order(&order_id, store_id, user_id, user_name)?;
        self.conn.execute(
            "UPDATE refund_requests SET status='approved' WHERE id=?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn reject_refund(&self, id: &str, _store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE refund_requests SET status='rejected' WHERE id=?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn get_unsynced_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM orders WHERE store_id=?1 AND synced=0")?;
        let ids: Vec<String> = stmt
            .query_map(params![store_id], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;
        let mut res = Vec::new();
        for id in ids {
            if let Ok(o) = self.get_order_by_id(&id, store_id) {
                res.push(o);
            }
        }
        Ok(res)
    }

    pub fn mark_orders_synced(&self, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE orders SET synced=1 WHERE store_id=?1",
            params![store_id],
        )?;
        Ok(())
    }

    pub fn get_ingredients(&self, store_id: &str) -> Result<Vec<Ingredient>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, stock, unit, reorder_level, created_at FROM ingredients WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(Ingredient {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    stock: row.get(3)?,
                    unit: row.get(4)?,
                    reorder_level: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_ingredient(&self, i: &Ingredient, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO ingredients (id, store_id, name, stock, unit, reorder_level) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET name=excluded.name, stock=excluded.stock, unit=excluded.unit, reorder_level=excluded.reorder_level",
            params![i.id, store_id, i.name, i.stock, i.unit, i.reorder_level],
        )?;
        Ok(())
    }

    pub fn delete_ingredient(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM ingredients WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_recipes(&self, store_id: &str) -> Result<Vec<Recipe>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, product_id, ingredient_id, quantity FROM recipes WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(Recipe {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    product_id: row.get(2)?,
                    ingredient_id: row.get(3)?,
                    quantity: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_recipe(&self, r: &Recipe, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO recipes (id, store_id, product_id, ingredient_id, quantity) VALUES (?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET quantity=excluded.quantity",
            params![r.id, store_id, r.product_id, r.ingredient_id, r.quantity],
        )?;
        Ok(())
    }

    pub fn get_suppliers(&self, store_id: &str) -> Result<Vec<Supplier>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, phone, email, address, created_at FROM suppliers WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(Supplier {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    name: row.get(2)?,
                    phone: row.get(3)?,
                    email: row.get(4)?,
                    address: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_supplier(&self, s: &Supplier, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO suppliers (id, store_id, name, phone, email, address) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address",
            params![s.id, store_id, s.name, s.phone, s.email, s.address],
        )?;
        Ok(())
    }

    pub fn delete_supplier(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM suppliers WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_purchase_orders(&self, store_id: &str) -> Result<Vec<PurchaseOrder>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, supplier_id, status, total, notes, created_at FROM purchase_orders WHERE store_id=?1")?;
        let items = stmt
            .query_map(params![store_id], |row| {
                Ok(PurchaseOrder {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    supplier_id: row.get(2)?,
                    supplier_name: "".into(),
                    status: row.get(3)?,
                    total: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                    items: vec![],
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_purchase_order(&self, po: &PurchaseOrder, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            "INSERT INTO purchase_orders (id, store_id, supplier_id, status, total, notes) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET status=excluded.status, total=excluded.total, notes=excluded.notes",
            params![po.id, store_id, po.supplier_id, po.status, po.total, po.notes],
        )?;
        tx.execute(
            "DELETE FROM purchase_order_items WHERE po_id=?1",
            params![po.id],
        )?;
        for item in &po.items {
            tx.execute(
                "INSERT INTO purchase_order_items (id, po_id, store_id, ingredient_id, quantity, unit_cost) VALUES (?1,?2,?3,?4,?5,?6)",
                params![uuid::Uuid::new_v4().to_string(), po.id, po.store_id, item.ingredient_id, item.quantity, item.unit_cost],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_po_status(&self, id: &str, status: &str, _store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE purchase_orders SET status=?1 WHERE id=?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn receive_purchase_order(&self, id: &str, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        let items: Vec<(String, f64)> = tx
            .prepare("SELECT ingredient_id, quantity FROM purchase_order_items WHERE po_id=?1")?
            .query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>>>()?;
        for (ing_id, qty) in items {
            tx.execute(
                "UPDATE ingredients SET stock = stock + ?1 WHERE id=?2 AND store_id=?3",
                params![qty, ing_id, store_id],
            )?;
        }
        tx.execute(
            "UPDATE purchase_orders SET status='received' WHERE id=?1",
            params![id],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn get_shifts(&self, date: &str, store_id: &str) -> Result<Vec<Shift>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, staff_id, staff_name, date, start_time, end_time, role, notes FROM shifts WHERE store_id=?1 AND date=?2")?;
        let items = stmt
            .query_map(params![store_id, date], |row| {
                Ok(Shift {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    staff_id: row.get(2)?,
                    staff_name: row.get(3)?,
                    date: row.get(4)?,
                    start_time: row.get(5)?,
                    end_time: row.get(6)?,
                    role: row.get(7)?,
                    notes: row.get(8)?,
                    created_at: None,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_shift(&self, s: &Shift, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO shifts (id, store_id, staff_id, staff_name, date, start_time, end_time, role, notes) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9) ON CONFLICT(id) DO UPDATE SET staff_id=excluded.staff_id, staff_name=excluded.staff_name, date=excluded.date, start_time=excluded.start_time, end_time=excluded.end_time, role=excluded.role, notes=excluded.notes",
            params![s.id, store_id, s.staff_id, s.staff_name, s.date, s.start_time, s.end_time, s.role, s.notes],
        )?;
        Ok(())
    }

    pub fn delete_shift(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM shifts WHERE id=?1 AND store_id=?2",
            params![id, store_id],
        )?;
        Ok(())
    }

    pub fn get_customer_wallet(&self, customer_id: &str) -> Result<CustomerWallet> {
        let mut stmt = self.conn.prepare("SELECT customer_id, balance, total_loaded, total_spent FROM wallet_transactions WHERE customer_id=?1")?;
        // Simplified: aggregate from wallet_transactions
        let balance: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE customer_id=?1",
            params![customer_id],
            |r| r.get(0),
        )?;
        Ok(CustomerWallet {
            customer_id: customer_id.into(),
            balance,
            total_loaded: 0.0,
            total_spent: 0.0,
        })
    }

    pub fn add_wallet_balance(&self, customer_id: &str, amount: f64, notes: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, notes) VALUES (?1,?2,?3,?4,?5)",
            params![uuid::Uuid::new_v4().to_string(), customer_id, amount, "load", notes],
        )?;
        Ok(())
    }

    pub fn deduct_wallet_balance(
        &self,
        customer_id: &str,
        amount: f64,
        order_id: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, order_id, notes) VALUES (?1,?2,?3,?4,?5,?6)",
            params![uuid::Uuid::new_v4().to_string(), customer_id, -amount, "spent", order_id, "Order payment"],
        )?;
        Ok(())
    }

    pub fn get_wallet_transactions(&self, customer_id: &str) -> Result<Vec<WalletTransaction>> {
        let mut stmt = self.conn.prepare("SELECT id, customer_id, amount, transaction_type, order_id, notes, created_at, store_id FROM wallet_transactions WHERE customer_id=?1 ORDER BY created_at DESC")?;
        let items = stmt
            .query_map(params![customer_id], |row| {
                Ok(WalletTransaction {
                    id: row.get(0)?,
                    customer_id: row.get(1)?,
                    amount: row.get(2)?,
                    transaction_type: row.get(3)?,
                    order_id: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                    store_id: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_gstr1_report(
        &self,
        start: &str,
        end: &str,
        store_id: &str,
    ) -> Result<Vec<GstReport>> {
        let mut stmt = self.conn.prepare(
            "SELECT o.id, o.created_at, o.customer_name, c.email, o.subtotal, 0, 0, 0, o.total, 'Local'
             FROM orders o LEFT JOIN customers c ON o.customer_name = c.name
             WHERE o.store_id=?1 AND o.status='completed' AND DATE(o.created_at) BETWEEN ?2 AND ?3"
        )?;
        let items = stmt
            .query_map(params![store_id, start, end], |row| {
                Ok(GstReport {
                    invoice_no: row.get(0)?,
                    date: row.get(1)?,
                    customer_name: row.get(2)?,
                    customer_gstin: None,
                    taxable_value: row.get(4)?,
                    cgst: row.get(5)?,
                    sgst: row.get(6)?,
                    igst: row.get(7)?,
                    total: row.get(8)?,
                    place_of_supply: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_gstr3b_report(
        &self,
        start: &str,
        end: &str,
        store_id: &str,
    ) -> Result<(f64, f64, f64, f64, f64, f64)> {
        self.conn.query_row(
            "SELECT SUM(subtotal), SUM(tax_amount), 0, 0, 0, 0 FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) BETWEEN ?2 AND ?3",
            params![store_id, start, end],
            |r| Ok((r.get(0)?, r.get(1)?, 0.0, 0.0, 0.0, 0.0))
        )
    }

    pub fn get_activity_logs_range(
        &self,
        start: &str,
        end: &str,
        limit: i32,
        store_id: &str,
    ) -> Result<Vec<ActivityLogEntry>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, action, user_id, user_name, created_at FROM activity_logs WHERE store_id=?1 AND DATE(created_at) BETWEEN ?2 AND ?3 ORDER BY created_at DESC LIMIT ?4")?;
        let items = stmt
            .query_map(params![store_id, start, end, limit], |row| {
                Ok(ActivityLogEntry {
                    id: row.get(0)?,
                    store_id: row.get(1)?,
                    action: row.get(2)?,
                    entity_type: None,
                    entity_id: None,
                    previous_value: None,
                    new_value: None,
                    reason: None,
                    user_id: row.get(3)?,
                    user_name: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn export_to_tally(&self, _start: &str, _end: &str, _store_id: &str) -> Result<String> {
        Ok("Tally XML export placeholder".into())
    }
    pub fn export_to_quickbooks(
        &self,
        _start: &str,
        _end: &str,
        _store_id: &str,
    ) -> Result<String> {
        Ok("Quickbooks CSV export placeholder".into())
    }
    pub fn add_activity_log(
        &self,
        store_id: &str,
        action: &str,
        reason: &str,
        user_id: &str,
        user_name: &str,
        order_id: Option<&str>,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT INTO activity_logs (id, store_id, order_id, action, reason, user_id, user_name) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![
                uuid::Uuid::new_v4().to_string(),
                store_id,
                order_id.unwrap_or(""),
                action,
                reason,
                user_id,
                user_name
            ],
        )?;
        Ok(())
    }

    pub fn get_batches(&self, product_id: &str, store_id: &str) -> Result<Vec<Batch>> {
        let mut stmt = self.conn.prepare("SELECT id, product_id, store_id, batch_number, expiry_date, cost_price, quantity, created_at FROM batches WHERE product_id=?1 AND store_id=?2")?;
        let batches = stmt.query_map(params![product_id, store_id], |row| {
            Ok(Batch {
                id: row.get(0)?,
                product_id: row.get(1)?,
                store_id: row.get(2)?,
                batch_number: row.get(3)?,
                expiry_date: row.get(4)?,
                cost_price: row.get(5)?,
                quantity: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(batches)
    }

    pub fn save_batch(&self, b: &Batch) -> Result<()> {
        self.conn.execute(
            "INSERT INTO batches (id, product_id, store_id, batch_number, expiry_date, cost_price, quantity)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET batch_number=excluded.batch_number, expiry_date=excluded.expiry_date, cost_price=excluded.cost_price, quantity=excluded.quantity",
            params![b.id, b.product_id, b.store_id, b.batch_number, b.expiry_date, b.cost_price, b.quantity],
        )?;
        Ok(())
    }

    pub fn get_serial_numbers(&self, product_id: &str, store_id: &str) -> Result<Vec<SerialNumber>> {
        let mut stmt = self.conn.prepare("SELECT id, product_id, store_id, serial_number, status, created_at FROM serial_numbers WHERE product_id=?1 AND store_id=?2")?;
        let serials = stmt.query_map(params![product_id, store_id], |row| {
            Ok(SerialNumber {
                id: row.get(0)?,
                product_id: row.get(1)?,
                store_id: row.get(2)?,
                serial_number: row.get(3)?,
                status: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(serials)
    }

    pub fn save_serial_number(&self, s: &SerialNumber) -> Result<()> {
        self.conn.execute(
            "INSERT INTO serial_numbers (id, product_id, store_id, serial_number, status)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET serial_number=excluded.serial_number, status=excluded.status",
            params![s.id, s.product_id, s.store_id, s.serial_number, s.status],
        )?;
        Ok(())
    }

    pub fn get_inventory_transactions(&self, product_id: &str, store_id: &str) -> Result<Vec<InventoryTransaction>> {
        let mut stmt = self.conn.prepare("SELECT id, product_id, store_id, transaction_type, qty_delta, batch_id, serial_number_id, reference_type, reference_id, user_id, created_at FROM inventory_transactions WHERE product_id=?1 AND store_id=?2 ORDER BY created_at DESC")?;
        let txs = stmt.query_map(params![product_id, store_id], |row| {
            Ok(InventoryTransaction {
                id: row.get(0)?,
                product_id: row.get(1)?,
                store_id: row.get(2)?,
                transaction_type: row.get(3)?,
                qty_delta: row.get(4)?,
                batch_id: row.get(5)?,
                serial_number_id: row.get(6)?,
                reference_type: row.get(7)?,
                reference_id: row.get(8)?,
                user_id: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(txs)
    }

    pub fn calculate_inventory_valuation(&self, store_id: &str, method: &str) -> Result<f64> {
        match method {
            "AVG" => {
                let val: f64 = self.conn.query_row(
                    "SELECT SUM(stock * cost_price) FROM products WHERE store_id=?1",
                    params![store_id],
                    |r| r.get(0)
                ).unwrap_or(0.0);
                Ok(val)
            }
            "FIFO" | "LIFO" => {
                let order = if method == "FIFO" { "ASC" } else { "DESC" };
                let sql = format!("SELECT cost_price, quantity FROM batches WHERE store_id=?1 ORDER BY created_at {}", order);
                let mut stmt = self.conn.prepare(&sql)?;
                let batches = stmt.query_map(params![store_id], |row| {
                    Ok((row.get::<_, f64>(0)?, row.get::<_, i64>(1)?))
                })?;
                let mut total = 0.0;
                for b in batches {
                    let (cp, qty) = b?;
                    total += cp * (qty as f64);
                }
                Ok(total)
            }
            _ => Ok(0.0)
        }
    }

    pub fn get_stock_counts(&self, store_id: &str) -> Result<Vec<StockCount>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, status, created_by, created_at FROM stock_counts WHERE store_id=?1 ORDER BY created_at DESC")?;
        let counts = stmt.query_map(params![store_id], |row| {
            let mut c = StockCount {
                id: row.get(0)?,
                store_id: row.get(1)?,
                status: row.get(2)?,
                created_by: row.get(3)?,
                created_at: row.get(4)?,
                items: vec![],
            };
            let mut item_stmt = self.conn.prepare("SELECT id, count_id, product_id, expected_qty, actual_qty FROM stock_count_items WHERE count_id=?1")?;
            c.items = item_stmt.query_map(params![c.id], |ir| {
                Ok(StockCountItem {
                    id: ir.get(0)?,
                    count_id: ir.get(1)?,
                    product_id: ir.get(2)?,
                    expected_qty: ir.get(3)?,
                    actual_qty: ir.get(4)?,
                })
            })?.collect::<Result<Vec<_>>>()?;
            Ok(c)
        })?.collect::<Result<Vec<_>>>()?;
        Ok(counts)
    }

    pub fn save_stock_count(&self, c: &StockCount) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            "INSERT INTO stock_counts (id, store_id, status, created_by) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET status=excluded.status",
            params![c.id, c.store_id, c.status, c.created_by],
        )?;

        tx.execute("DELETE FROM stock_count_items WHERE count_id=?1", params![c.id])?;
        for item in &c.items {
            tx.execute(
                "INSERT INTO stock_count_items (id, count_id, product_id, expected_qty, actual_qty)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![item.id, c.id, item.product_id, item.expected_qty, item.actual_qty],
            )?;

            if c.status == "completed" {
                let diff = item.actual_qty - item.expected_qty;
                if diff != 0 {
                    Self::adjust_inventory(&tx, &item.product_id, &c.store_id, diff, "adjustment", Some(&c.id), &c.created_by, None, None)?;
                }
            }
        }
        tx.commit()?;
        Ok(())
    }

    pub fn create_compressed_backup(&self, store_id: &str) -> Result<Vec<u8>> {
        let products = self.get_products(store_id)?;
        let orders = self.get_orders(store_id, None, None)?;
        let settings = self.get_settings(store_id)?;
        let data = BackupData {
            products,
            orders,
            settings,
            exported_at: chrono::Local::now().to_rfc3339(),
        };
        let json = serde_json::to_string(&data).unwrap_or_default();

        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(json.as_bytes())
            .map_err(|_| rusqlite::Error::InvalidQuery)?;
        let compressed = encoder.finish().map_err(|_| rusqlite::Error::InvalidQuery)?;
        Ok(compressed)
    }
}
