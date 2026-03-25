// src-tauri/src/db.rs
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use rand::Rng;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

const ENCRYPTION_KEY: &[u8; 32] = b"POS_BILLING_SECURE_KEY_32BYTES!!";

fn encrypt_value(value: &str) -> String {
    if value.is_empty() {
        return String::new();
    }
    let cipher = Aes256Gcm::new(ENCRYPTION_KEY.into());
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
    let cipher = Aes256Gcm::new(ENCRYPTION_KEY.into());
    let nonce = Nonce::from_slice(&data[..12]);
    let ciphertext = &data[12..];
    String::from_utf8(
        cipher
            .decrypt(nonce, ciphertext)
            .unwrap_or_else(|_| ciphertext.to_vec()),
    )
    .unwrap_or_else(|_| encrypted.to_string())
}

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub price: f64,
    pub category: String,
    pub stock: i64,
    pub barcode: String,
    pub tax: f64,
    pub image_url: Option<String>,
    pub created_at: Option<String>,
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
    pub tax: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Order {
    pub id: String,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaxRate {
    pub id: String,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Table {
    pub id: String,
    pub name: String,
    pub capacity: i32,
    pub status: String,
    pub position_x: i32,
    pub position_y: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct TableOrder {
    pub id: String,
    pub table_id: String,
    pub order_id: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StaffAttendance {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub loyalty_points: i32,
    pub total_spent: f64,
    pub visits: i32,
    pub created_at: String,
}

#[allow(dead_code)]
pub struct OrderModifier {
    pub id: String,
    pub order_item_id: i64,
    pub name: String,
    pub price: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrderNote {
    pub id: String,
    pub order_id: String,
    pub note: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InventoryAlert {
    pub id: String,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActivityLog {
    pub id: String,
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
    pub name: String,
    pub stock: f64,
    pub unit: String,
    pub reorder_level: f64,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recipe {
    pub id: String,
    pub product_id: String,
    pub ingredient_id: String,
    pub quantity: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Supplier {
    pub id: String,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coupon {
    pub id: String,
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub min_order_amount: f64,
    pub max_uses: i32,
    pub used_count: i32,
    pub valid_from: String,
    pub valid_until: String,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DayEndReconciliation {
    pub id: String,
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

        // Enable WAL mode for better performance and data safety
        // WAL provides atomic writes and survives crashes better
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA foreign_keys=ON;
             PRAGMA synchronous=NORMAL;
             PRAGMA wal_autocheckpoint=1000;
             PRAGMA temp_store=MEMORY;
             PRAGMA mmap_size=268435456;
             PRAGMA page_size=4096;",
        )?;

        let db = Database { conn };
        db.init_schema()?;
        db.migrate_schema()?;
        db.seed_if_empty()?;
        db.seed_tables()?;
        db.seed_expense_categories()?;
        db.seed_tax_rates()?;
        db.init_users()?;

        // Perform initial checkpoint to ensure data is written
        db.checkpoint()?;

        Ok(db)
    }

    // Ensure all data is written to disk
    pub fn checkpoint(&self) -> Result<()> {
        self.conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)")?;
        Ok(())
    }

    fn migrate_schema(&self) -> Result<()> {
        // Add missing columns for existing databases
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine_in'",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending'",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN delivery_address TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN delivery_phone TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN user_id TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE orders ADD COLUMN user_name TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE shifts ADD COLUMN staff_name TEXT NOT NULL DEFAULT ''",
            [],
        );
        let _ = self.conn.execute(
            "ALTER TABLE order_items ADD COLUMN done INTEGER NOT NULL DEFAULT 0",
            [],
        );
        // Ensure tax_rates table exists for existing databases
        let _ = self.conn.execute(
            "CREATE TABLE IF NOT EXISTS tax_rates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                country TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        );
        Ok(())
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS products (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                price       REAL NOT NULL DEFAULT 0,
                category    TEXT NOT NULL DEFAULT 'General',
                stock       INTEGER NOT NULL DEFAULT 0,
                barcode     TEXT NOT NULL DEFAULT '',
                tax         REAL NOT NULL DEFAULT 18,
                image_url   TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS orders (
                id              TEXT PRIMARY KEY,
                subtotal        REAL NOT NULL,
                tax_amount      REAL NOT NULL,
                discount_amount REAL NOT NULL,
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
                synced          INTEGER NOT NULL DEFAULT 0,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id   TEXT NOT NULL,
                product_name TEXT NOT NULL,
                price        REAL NOT NULL,
                quantity     INTEGER NOT NULL,
                discount     REAL NOT NULL DEFAULT 0,
                tax          REAL NOT NULL DEFAULT 18,
                done         INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id   TEXT PRIMARY KEY,
                pin  TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cashier'
            );

            CREATE TABLE IF NOT EXISTS activity_logs (
                id              TEXT PRIMARY KEY,
                order_id        TEXT NOT NULL,
                action          TEXT NOT NULL,
                previous_data   TEXT,
                new_data        TEXT,
                reason          TEXT NOT NULL,
                user_id         TEXT NOT NULL,
                user_name       TEXT NOT NULL,
                created_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_order_id ON activity_logs(order_id);
            CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

            CREATE TABLE IF NOT EXISTS tables (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                capacity INTEGER NOT NULL DEFAULT 4,
                status TEXT NOT NULL DEFAULT 'available',
                position_x INTEGER NOT NULL DEFAULT 0,
                position_y INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS table_orders (
                id TEXT PRIMARY KEY,
                table_id TEXT NOT NULL REFERENCES tables(id),
                order_id TEXT NOT NULL REFERENCES orders(id),
                status TEXT NOT NULL DEFAULT 'occupied',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS staff_attendance (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                clock_in TEXT NOT NULL,
                clock_out TEXT,
                date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                loyalty_points INTEGER NOT NULL DEFAULT 0,
                total_spent REAL NOT NULL DEFAULT 0,
                visits INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS order_modifiers (
                id TEXT PRIMARY KEY,
                order_item_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS order_notes (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                note TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS inventory_alerts (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                current_stock INTEGER NOT NULL,
                threshold INTEGER NOT NULL,
                alert_type TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS refund_requests (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                amount REAL NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS ingredients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                stock REAL NOT NULL DEFAULT 0,
                unit TEXT NOT NULL DEFAULT 'pcs',
                reorder_level REAL NOT NULL DEFAULT 10,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                ingredient_id TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 1,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
                UNIQUE(product_id, ingredient_id)
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                address TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS purchase_orders (
                id TEXT PRIMARY KEY,
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
                ingredient_id TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_cost REAL NOT NULL,
                FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
                FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
            );

            CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
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
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                date TEXT NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'cash',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS expense_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT NOT NULL DEFAULT '📦'
            );

            CREATE TABLE IF NOT EXISTS tax_rates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 0,
                country TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS customer_wallets (
                customer_id TEXT PRIMARY KEY,
                balance REAL NOT NULL DEFAULT 0,
                total_loaded REAL NOT NULL DEFAULT 0,
                total_spent REAL NOT NULL DEFAULT 0,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id TEXT PRIMARY KEY,
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
                code TEXT UNIQUE NOT NULL,
                discount_type TEXT NOT NULL DEFAULT 'percentage',
                discount_value REAL NOT NULL,
                min_order_amount REAL NOT NULL DEFAULT 0,
                max_uses INTEGER NOT NULL DEFAULT 100,
                used_count INTEGER NOT NULL DEFAULT 0,
                valid_from TEXT NOT NULL,
                valid_until TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS day_end_reconciliations (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS combos (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                items TEXT NOT NULL,
                combo_price REAL NOT NULL,
                discount_amount REAL NOT NULL DEFAULT 0,
                discount_percent REAL NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_combos_active ON combos(is_active);
        ",
        )?;
        Ok(())
    }

    fn seed_if_empty(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0))?;

        if count == 0 {
            let seeds = vec![
                ("p1", "Coffee", 120.0, "Beverages", 100, "001", 5.0),
                ("p2", "Tea", 60.0, "Beverages", 150, "002", 5.0),
                ("p3", "Sandwich", 180.0, "Food", 50, "003", 12.0),
                ("p4", "Burger", 250.0, "Food", 40, "004", 12.0),
                ("p5", "Chips", 40.0, "Snacks", 200, "005", 18.0),
                ("p6", "Juice", 90.0, "Beverages", 80, "006", 5.0),
                ("p7", "Cake Slice", 150.0, "Bakery", 30, "007", 18.0),
                ("p8", "Pasta", 220.0, "Food", 45, "008", 12.0),
                ("p9", "Lemonade", 80.0, "Beverages", 60, "009", 5.0),
                ("p10", "Cookies", 70.0, "Bakery", 120, "010", 18.0),
                ("p11", "Pizza Slice", 200.0, "Food", 35, "011", 12.0),
                ("p12", "Water", 20.0, "Beverages", 300, "012", 0.0),
            ];
            for (id, name, price, cat, stock, barcode, tax) in seeds {
                self.conn.execute(
                    "INSERT OR IGNORE INTO products (id, name, price, category, stock, barcode, tax) VALUES (?1,?2,?3,?4,?5,?6,?7)",
                    params![id, name, price, cat, stock, barcode, tax],
                )?;
            }
        }
        Ok(())
    }

    // ─── Products ─────────────────────────────────────────────────────────────

    pub fn get_products(&self) -> Result<Vec<Product>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, price, category, stock, barcode, tax, image_url, created_at FROM products ORDER BY name"
        )?;
        let products = stmt
            .query_map([], |row| {
                Ok(Product {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    price: row.get(2)?,
                    category: row.get(3)?,
                    stock: row.get(4)?,
                    barcode: row.get(5)?,
                    tax: row.get(6)?,
                    image_url: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(products)
    }

    pub fn upsert_product(&self, p: &Product) -> Result<()> {
        let image_url = p.image_url.clone().unwrap_or_default();
        self.conn.execute(
            "INSERT INTO products (id, name, price, category, stock, barcode, tax, image_url)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, price=excluded.price, category=excluded.category,
               stock=excluded.stock, barcode=excluded.barcode, tax=excluded.tax, image_url=excluded.image_url",
            params![p.id, p.name, p.price, p.category, p.stock, p.barcode, p.tax, image_url],
        )?;
        Ok(())
    }

    pub fn delete_product(&self, id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM recipes WHERE product_id=?1", params![id])?;
        tx.execute("DELETE FROM products WHERE id=?1", params![id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn update_stock(&self, id: &str, delta: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE products SET stock = MAX(0, stock + ?1) WHERE id = ?2",
            params![delta, id],
        )?;
        Ok(())
    }

    // ─── Combos ────────────────────────────────────────────────────────────────

    pub fn get_combos(&self) -> Result<Vec<Combo>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, items, combo_price, discount_amount, discount_percent, is_active, created_at FROM combos ORDER BY name"
        )?;
        let combos = stmt
            .query_map([], |row| {
                let items_json: String = row.get(3)?;
                let items: Vec<ComboItem> = serde_json::from_str(&items_json).unwrap_or_default();
                Ok(Combo {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    items,
                    combo_price: row.get(4)?,
                    discount_amount: row.get(5)?,
                    discount_percent: row.get(6)?,
                    is_active: row.get::<_, i32>(7)? == 1,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(combos)
    }

    pub fn save_combo(&self, c: &Combo) -> Result<()> {
        let items_json = serde_json::to_string(&c.items).unwrap_or_default();
        let is_active: i32 = if c.is_active { 1 } else { 0 };
        self.conn.execute(
            "INSERT INTO combos (id, name, description, items, combo_price, discount_amount, discount_percent, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, description=excluded.description, items=excluded.items,
               combo_price=excluded.combo_price, discount_amount=excluded.discount_amount,
               discount_percent=excluded.discount_percent, is_active=excluded.is_active",
            params![c.id, c.name, c.description, items_json, c.combo_price, c.discount_amount, c.discount_percent, is_active],
        )?;
        Ok(())
    }

    pub fn delete_combo(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM combos WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn toggle_combo(&self, id: &str, active: bool) -> Result<()> {
        let is_active: i32 = if active { 1 } else { 0 };
        self.conn.execute(
            "UPDATE combos SET is_active=?1 WHERE id=?2",
            params![is_active, id],
        )?;
        Ok(())
    }

    // ─── Orders ───────────────────────────────────────────────────────────────

    pub fn get_orders(&self) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method,
                    amount_paid, change_amount, customer_name, status, order_type, delivery_status,
                    delivery_address, delivery_phone, user_id, user_name, synced, created_at
             FROM orders ORDER BY created_at DESC LIMIT 500",
        )?;

        let mut orders: Vec<Order> = stmt
            .query_map([], |row| {
                Ok(Order {
                    id: row.get(0)?,
                    items: vec![],
                    subtotal: row.get(1)?,
                    tax_amount: row.get(2)?,
                    discount_amount: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    amount_paid: row.get(6)?,
                    change_amount: row.get(7)?,
                    customer_name: row.get(8)?,
                    status: row.get(9)?,
                    order_type: row.get(10)?,
                    delivery_status: row.get(11)?,
                    delivery_address: row.get(12)?,
                    delivery_phone: row.get(13)?,
                    user_id: Some(row.get::<_, String>(14)?),
                    user_name: Some(row.get::<_, String>(15)?),
                    synced: Some(row.get::<_, i64>(16)? == 1),
                    created_at: row.get(17)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        // Load items for each order
        for order in &mut orders {
            let mut stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax FROM order_items WHERE order_id=?1"
            )?;
            order.items = stmt
                .query_map(params![order.id], |row| {
                    Ok(OrderItem {
                        product_id: row.get(0)?,
                        product_name: row.get(1)?,
                        price: row.get(2)?,
                        quantity: row.get(3)?,
                        discount: row.get(4)?,
                        tax: row.get(5)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    pub fn save_order(&self, o: &Order) -> Result<()> {
        // Validate order status
        let valid_statuses = [
            "completed",
            "refunded",
            "hold",
            "cancelled",
            "pending",
            "processing",
        ];
        if !valid_statuses.contains(&o.status.as_str()) {
            return Err(rusqlite::Error::InvalidParameterName(format!(
                "Invalid order status: {}",
                o.status
            )));
        }

        // Validate order type
        let valid_order_types = ["dine_in", "takeaway", "delivery"];
        if !valid_order_types.contains(&o.order_type.as_str()) {
            return Err(rusqlite::Error::InvalidParameterName(format!(
                "Invalid order type: {}",
                o.order_type
            )));
        }

        // Validate payment method
        let valid_payment_methods = ["cash", "card", "upi", "wallet"];
        if !valid_payment_methods.contains(&o.payment_method.as_str()) {
            return Err(rusqlite::Error::InvalidParameterName(format!(
                "Invalid payment method: {}",
                o.payment_method
            )));
        }

        // Check if this is a new order or update
        let is_new = self.conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE id = ?1",
            params![o.id],
            |row| row.get::<_, i32>(0),
        )? == 0;

        let user_id = o.user_id.clone().unwrap_or_else(|| "system".to_string());
        let user_name = o.user_name.clone().unwrap_or_else(|| "System".to_string());

        // Use transaction for atomicity
        let tx = self.conn.unchecked_transaction()?;

        tx.execute(
            "INSERT OR REPLACE INTO orders
             (id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, created_at)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,0,?17)",
            params![
                o.id, o.subtotal, o.tax_amount, o.discount_amount, o.total,
                o.payment_method, o.amount_paid, o.change_amount,
                o.customer_name, o.status, o.order_type, o.delivery_status,
                o.delivery_address, o.delivery_phone, user_id, user_name, o.created_at
            ],
        )?;

        // If updating an existing order, handle stock restoration for old items
        if !is_new {
            let old_items: Vec<(String, i64)> = {
                let mut stmt = tx.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?1")?;
                stmt.query_map(params![o.id], |row| Ok((row.get(0)?, row.get(1)?)))?
                    .filter_map(|r| r.ok())
                    .collect()
            };

            for (prod_id, qty) in old_items {
                tx.execute("UPDATE products SET stock = stock + ?1 WHERE id = ?2", params![qty, prod_id])?;

                // Restore ingredients
                let recipes: Vec<(String, f64)> = {
                    let mut stmt = tx.prepare("SELECT ingredient_id, quantity FROM recipes WHERE product_id = ?1")?;
                    stmt.query_map(params![prod_id], |row| Ok((row.get(0)?, row.get(1)?)))?
                        .filter_map(|r| r.ok())
                        .collect()
                };
                for (ing_id, ing_qty) in recipes {
                    tx.execute("UPDATE ingredients SET stock = stock + ?1 WHERE id = ?2", params![ing_qty * qty as f64, ing_id])?;
                }
            }

            tx.execute("DELETE FROM order_items WHERE order_id = ?1", params![o.id])?;
        }

        for item in &o.items {
            tx.execute(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, discount, tax)
                 VALUES (?1,?2,?3,?4,?5,?6,?7)",
                params![o.id, item.product_id, item.product_name, item.price, item.quantity, item.discount, item.tax],
            )?;

            // Deduct stock for new orders or updated orders (if order is active)
            let is_active = o.status == "completed" || o.status == "processing";
            if is_active {
                tx.execute(
                    "UPDATE products SET stock = MAX(0, stock - ?1) WHERE id = ?2",
                    params![item.quantity, item.product_id],
                )?;

                // Deduct ingredients based on recipes
                let recipes: Vec<(String, f64)> = {
                    let mut stmt = tx.prepare("SELECT ingredient_id, quantity FROM recipes WHERE product_id = ?1")?;
                    stmt.query_map(params![item.product_id], |row| Ok((row.get(0)?, row.get(1)?)))?
                        .filter_map(|r| r.ok())
                        .collect()
                };

                for (ing_id, ing_qty) in recipes {
                    tx.execute(
                        "UPDATE ingredients SET stock = MAX(0, stock - ?1) WHERE id = ?2",
                        params![ing_qty * item.quantity as f64, ing_id],
                    )?;
                }
            }
        }

        tx.commit()?;

        // Log activity (outside transaction)
        if is_new {
            self.log_activity(
                &o.id,
                "order_created",
                None,
                Some(&format!("{} - {}", o.order_type, o.payment_method)),
                &format!("New order: {}", o.customer_name),
                &user_id,
                &user_name,
            )?;
        } else {
            self.log_activity(
                &o.id,
                "order_modified",
                None,
                Some(&format!("Total: {}", o.total)),
                "Order updated",
                &user_id,
                &user_name,
            )?;
        }

        Ok(())
    }

    pub fn refund_order(&self, id: &str, user_id: &str, user_name: &str) -> Result<()> {
        // Get order details first
        let order_total: f64 = self.conn.query_row(
            "SELECT total FROM orders WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        let items = {
            let mut stmt = self
                .conn
                .prepare("SELECT product_id, quantity FROM order_items WHERE order_id=?1")?;
            let items: Vec<(String, i64)> = stmt
                .query_map(params![id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
                })?
                .collect::<Result<Vec<_>>>()?;
            items
        };

        for (product_id, qty) in items {
            self.conn.execute(
                "UPDATE products SET stock = stock + ?1 WHERE id = ?2",
                params![qty, product_id],
            )?;

            // Restore ingredients based on recipes
            let mut recipe_stmt = self.conn.prepare(
                "SELECT ingredient_id, quantity FROM recipes WHERE product_id = ?1",
            )?;
            let recipes: Vec<(String, f64)> = recipe_stmt
                .query_map(params![product_id], |row| {
                    Ok((row.get(0)?, row.get(1)?))
                })?
                .filter_map(|r| r.ok())
                .collect();

            for (ing_id, ing_qty) in recipes {
                self.conn.execute(
                    "UPDATE ingredients SET stock = stock + ?1 WHERE id = ?2",
                    params![ing_qty * qty as f64, ing_id],
                )?;
            }
        }

        self.conn.execute(
            "UPDATE orders SET status='refunded' WHERE id=?1 AND status='completed'",
            params![id],
        )?;

        // Log activity
        self.log_activity(
            id,
            "order_refunded",
            None,
            Some(&format!("Refund: {}", order_total)),
            "Order refunded",
            user_id,
            user_name,
        )?;

        Ok(())
    }

    pub fn update_delivery_status(&self, id: &str, status: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE orders SET delivery_status=?1 WHERE id=?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn get_unsynced_orders(&self) -> Result<Vec<Order>> {
        // Get orders where synced=0
        let mut stmt = self
            .conn
            .prepare("SELECT id FROM orders WHERE synced=0 AND status='completed'")?;
        let ids: Vec<String> = stmt
            .query_map([], |r| r.get(0))?
            .collect::<Result<Vec<_>>>()?;

        let all = self.get_orders()?;
        Ok(all.into_iter().filter(|o| ids.contains(&o.id)).collect())
    }

    pub fn mark_orders_synced(&self) -> Result<()> {
        self.conn
            .execute("UPDATE orders SET synced=1 WHERE status='completed'", [])?;
        Ok(())
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    pub fn get_settings(&self) -> Result<Settings> {
        let get = |key: &str, default: &str| -> String {
            self.conn
                .query_row(
                    "SELECT value FROM settings WHERE key=?1",
                    params![key],
                    |r| r.get(0),
                )
                .unwrap_or_else(|_| default.to_string())
        };

        Ok(Settings {
            store_name: get("store_name", "My POS Store"),
            currency: get("currency", "USD"),
            currency_symbol: get("currency_symbol", "$"),
            country: get("country", "US"),
            timezone: get("timezone", "America/New_York"),
            tax_rate: get("tax_rate", "10").parse().unwrap_or(10.0),
            tax_name: get("tax_name", "Tax"),
            tax_system: get("tax_system", "none"),
            address: get("address", "123 Main Street"),
            phone: get("phone", "+1 234 567 8900"),
            neon_url: decrypt_value(&get("neon_url", "")),
            business_name: get("business_name", ""),
            tax_id: get("tax_id", ""),
            receipt_save_path: get("receipt_save_path", ""),
            twilio_sid: decrypt_value(&get("twilio_sid", "")),
            twilio_token: decrypt_value(&get("twilio_token", "")),
            twilio_phone: decrypt_value(&get("twilio_phone", "")),
            lan_sync_enabled: get("lan_sync_enabled", "false") == "true",
            lan_server_port: get("lan_server_port", "8765").parse().unwrap_or(8765),
            dark_mode: get("dark_mode", "true") == "true",
            language: get("language", "en"),
            whatsapp_enabled: get("whatsapp_enabled", "false") == "true",
            whatsapp_api_url: decrypt_value(&get("whatsapp_api_url", "")),
            offline_mode: get("offline_mode", "false") == "true",
            logo_url: get("logo_url", ""),
            primary_color: get("primary_color", "#F5C842"),
            secondary_color: get("secondary_color", "#1E1E26"),
            accent_color: get("accent_color", "#2ECC71"),
            footer_text: get("footer_text", "Powered by POS Billing"),
            contact_email: get("contact_email", ""),
            contact_website: get("contact_website", ""),
            tax_inclusive: get("tax_inclusive", "false") == "true",
            tax_breakdown: get("tax_breakdown", "[]"),
            auto_print_kot: get("auto_print_kot", "false") == "true",
        })
    }

    pub fn save_settings(&self, s: &Settings) -> Result<()> {
        let pairs = vec![
            ("store_name", s.store_name.clone()),
            ("currency", s.currency.clone()),
            ("currency_symbol", s.currency_symbol.clone()),
            ("country", s.country.clone()),
            ("timezone", s.timezone.clone()),
            ("tax_rate", s.tax_rate.to_string()),
            ("tax_name", s.tax_name.clone()),
            ("tax_system", s.tax_system.clone()),
            ("address", s.address.clone()),
            ("phone", s.phone.clone()),
            ("neon_url", encrypt_value(&s.neon_url)),
            ("business_name", s.business_name.clone()),
            ("tax_id", s.tax_id.clone()),
            ("receipt_save_path", s.receipt_save_path.clone()),
            ("twilio_sid", encrypt_value(&s.twilio_sid)),
            ("twilio_token", encrypt_value(&s.twilio_token)),
            ("twilio_phone", encrypt_value(&s.twilio_phone)),
            ("lan_sync_enabled", s.lan_sync_enabled.to_string()),
            ("lan_server_port", s.lan_server_port.to_string()),
            ("dark_mode", s.dark_mode.to_string()),
            ("language", s.language.clone()),
            ("whatsapp_enabled", s.whatsapp_enabled.to_string()),
            ("whatsapp_api_url", encrypt_value(&s.whatsapp_api_url)),
            ("offline_mode", s.offline_mode.to_string()),
            ("logo_url", s.logo_url.clone()),
            ("primary_color", s.primary_color.clone()),
            ("secondary_color", s.secondary_color.clone()),
            ("accent_color", s.accent_color.clone()),
            ("footer_text", s.footer_text.clone()),
            ("contact_email", s.contact_email.clone()),
            ("contact_website", s.contact_website.clone()),
            ("tax_inclusive", s.tax_inclusive.to_string()),
            ("tax_breakdown", s.tax_breakdown.clone()),
            ("auto_print_kot", s.auto_print_kot.to_string()),
        ];
        for (k, v) in pairs {
            self.conn.execute(
                "INSERT INTO settings (key,value) VALUES (?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                params![k, v],
            )?;
        }
        Ok(())
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    pub fn get_daily_summary(&self) -> Result<DailySummary> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();

        let row = self.conn.query_row(
            "SELECT COALESCE(SUM(total),0), COUNT(*), COALESCE(AVG(total),0)
             FROM orders
             WHERE status='completed' AND DATE(created_at)=?1",
            params![today],
            |r| {
                Ok((
                    r.get::<_, f64>(0)?,
                    r.get::<_, i64>(1)?,
                    r.get::<_, f64>(2)?,
                ))
            },
        )?;

        let items_sold: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi
             JOIN orders o ON o.id=oi.order_id
             WHERE o.status='completed' AND DATE(o.created_at)=?1",
                params![today],
                |r| r.get(0),
            )
            .unwrap_or(0);

        Ok(DailySummary {
            revenue: row.0,
            transactions: row.1,
            avg_order: row.2,
            items_sold,
        })
    }

    pub fn get_weekly_revenue(&self) -> Result<Vec<DayRevenue>> {
        let mut days = Vec::new();
        for i in (0..7).rev() {
            let date = (chrono::Local::now() - chrono::Duration::days(i))
                .format("%Y-%m-%d")
                .to_string();
            let label = (chrono::Local::now() - chrono::Duration::days(i))
                .format("%a")
                .to_string();
            let revenue: f64 = self.conn.query_row(
                "SELECT COALESCE(SUM(total),0) FROM orders WHERE status='completed' AND DATE(created_at)=?1",
                params![date],
                |r| r.get(0),
            ).unwrap_or(0.0);
            days.push(DayRevenue { label, revenue });
        }
        Ok(days)
    }

    pub fn get_top_products(&self) -> Result<Vec<TopProduct>> {
        let mut stmt = self.conn.prepare(
            "SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.price*oi.quantity) as revenue
             FROM order_items oi
             JOIN orders o ON o.id=oi.order_id
             WHERE o.status='completed'
             GROUP BY oi.product_id, oi.product_name
             ORDER BY revenue DESC LIMIT 5",
        )?;
        let items = stmt
            .query_map([], |r| {
                Ok(TopProduct {
                    name: r.get(0)?,
                    qty: r.get(1)?,
                    revenue: r.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_low_stock(&self) -> Result<Vec<LowStockItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT name, stock FROM products WHERE stock <= 10 ORDER BY stock ASC LIMIT 10",
        )?;
        let items = stmt
            .query_map([], |r| {
                Ok(LowStockItem {
                    name: r.get(0)?,
                    stock: r.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_sales_by_payment_method(&self, date: &str) -> Result<(f64, f64, f64)> {
        let cash: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status='completed' AND payment_method='cash' AND DATE(created_at)=?1",
            params![date],
            |r| r.get(0),
        ).unwrap_or(0.0);

        let upi: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status='completed' AND payment_method='upi' AND DATE(created_at)=?1",
            params![date],
            |r| r.get(0),
        ).unwrap_or(0.0);

        let card: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(total), 0) FROM orders WHERE status='completed' AND payment_method='card' AND DATE(created_at)=?1",
            params![date],
            |r| r.get(0),
        ).unwrap_or(0.0);

        Ok((cash, upi, card))
    }

    // ─── CSV Export ─────────────────────────────────────────────────────────────

    pub fn export_products_csv(&self) -> Result<String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, price, category, stock, barcode, tax FROM products ORDER BY name",
        )?;
        let mut csv = String::from("id,name,price,category,stock,barcode,tax\n");
        let rows = stmt.query_map([], |row| {
            Ok(format!(
                "{},{},{},{},{},{},{}\n",
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, f64>(6)?
            ))
        })?;
        for row in rows {
            csv.push_str(&row?);
        }
        Ok(csv)
    }

    pub fn export_orders_csv(&self) -> Result<String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, created_at FROM orders ORDER BY created_at DESC"
        )?;
        let mut csv = String::from("id,subtotal,tax_amount,discount_amount,total,payment_method,amount_paid,change_amount,customer_name,status,created_at\n");
        let rows = stmt.query_map([], |row| {
            Ok(format!(
                "{},{},{},{},{},{},{},{},{},{},{}\n",
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, f64>(6)?,
                row.get::<_, f64>(7)?,
                row.get::<_, String>(8)?,
                row.get::<_, String>(9)?,
                row.get::<_, String>(10)?
            ))
        })?;
        for row in rows {
            csv.push_str(&row?);
        }
        Ok(csv)
    }

    pub fn import_products_csv(&self, csv_data: &str) -> Result<(i64, i64)> {
        let lines: Vec<&str> = csv_data.lines().collect();
        if lines.is_empty() {
            return Ok((0, 0));
        }
        let mut imported = 0i64;
        let mut errors = 0i64;
        for line in lines.iter().skip(1) {
            let fields: Vec<&str> = line.split(',').collect();
            if fields.len() >= 7 {
                let id = fields[0].trim();
                let name = fields[1].trim();
                let price: f64 = fields[2].trim().parse().unwrap_or(0.0);
                let category = fields[3].trim();
                let stock: i64 = fields[4].trim().parse().unwrap_or(0);
                let barcode = fields[5].trim();
                let tax: f64 = fields[6].trim().parse().unwrap_or(18.0);
                if !name.is_empty() {
                    self.conn.execute(
                        "INSERT OR REPLACE INTO products (id, name, price, category, stock, barcode, tax) VALUES (?1,?2,?3,?4,?5,?6,?7)",
                        params![id, name, price, category, stock, barcode, tax],
                    )?;
                    imported += 1;
                }
            } else {
                errors += 1;
            }
        }
        Ok((imported, errors))
    }

    // ─── Reports ─────────────────────────────────────────────────────────────

    pub fn get_sales_report(&self, start_date: &str, end_date: &str) -> Result<SalesReport> {
        let orders: Vec<Order> = {
            let mut stmt = self.conn.prepare(
                "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, created_at FROM orders WHERE status='completed' AND DATE(created_at) BETWEEN ?1 AND ?2 ORDER BY created_at DESC"
            )?;
            let rows: Vec<Order> = stmt
                .query_map(params![start_date, end_date], |row| {
                    Ok(Order {
                        id: row.get(0)?,
                        items: vec![],
                        subtotal: row.get(1)?,
                        tax_amount: row.get(2)?,
                        discount_amount: row.get(3)?,
                        total: row.get(4)?,
                        payment_method: row.get(5)?,
                        amount_paid: row.get(6)?,
                        change_amount: row.get(7)?,
                        customer_name: row.get(8)?,
                        status: row.get(9)?,
                        order_type: row.get(10)?,
                        delivery_status: row.get(11)?,
                        delivery_address: row.get(12)?,
                        delivery_phone: row.get(13)?,
                        created_at: row.get(14)?,
                        synced: None,
                        user_id: None,
                        user_name: None,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
            rows
        };

        let total_revenue: f64 = orders.iter().map(|o| o.total).sum();
        let total_orders = orders.len() as i64;
        let avg_order = if total_orders > 0 {
            total_revenue / total_orders as f64
        } else {
            0.0
        };

        Ok(SalesReport {
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
            total_revenue,
            total_orders,
            avg_order,
        })
    }

    // ─── Users ─────────────────────────────────────────────────────────────

    pub fn init_users(&self) -> Result<()> {
        let admin_hash = bcrypt::hash("1234", bcrypt::DEFAULT_COST).unwrap_or_default();
        let cashier_hash = bcrypt::hash("0000", bcrypt::DEFAULT_COST).unwrap_or_default();

        self.conn.execute(
            "INSERT OR IGNORE INTO users (id, pin, name, role) VALUES ('admin', ?1, 'Administrator', 'admin')",
            params![admin_hash],
        )?;
        self.conn.execute(
            "INSERT OR IGNORE INTO users (id, pin, name, role) VALUES ('cashier', ?1, 'Cashier', 'cashier')",
            params![cashier_hash],
        )?;
        Ok(())
    }

    pub fn verify_pin(&self, pin: &str) -> Result<Option<User>> {
        let mut stmt = self.conn.prepare("SELECT id, pin, name, role FROM users")?;
        let users: Vec<(String, String, String, String)> = stmt
            .query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

        for (id, stored_hash, name, role) in users {
            if bcrypt::verify(pin, &stored_hash).unwrap_or(false) {
                return Ok(Some(User { id, name, role }));
            }
        }
        Ok(None)
    }

    pub fn change_pin(&self, user_id: &str, new_pin: &str) -> Result<()> {
        let hashed = bcrypt::hash(new_pin, bcrypt::DEFAULT_COST)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        self.conn.execute(
            "UPDATE users SET pin = ?1 WHERE id = ?2",
            params![hashed, user_id],
        )?;
        Ok(())
    }

    pub fn get_users(&self) -> Result<Vec<User>> {
        let mut stmt = self.conn.prepare("SELECT id, name, role FROM users")?;
        let users = stmt
            .query_map([], |row| {
                Ok(User {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    role: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(users)
    }

    // ─── Backup ───────────────────────────────────────────────────────────────

    pub fn export_backup(&self) -> Result<String> {
        let products = self.get_products()?;
        let orders = self.get_orders()?;
        let settings = self.get_settings()?;

        let backup = BackupData {
            products,
            orders,
            settings,
            exported_at: chrono::Utc::now().to_rfc3339(),
        };

        let json = serde_json::to_string(&backup)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder
            .write_all(json.as_bytes())
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        let compressed = encoder
            .finish()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        Ok(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            compressed,
        ))
    }

    pub fn import_backup(&self, backup_data: &str) -> Result<ImportResult> {
        let json = if let Ok(decoded) =
            base64::Engine::decode(&base64::engine::general_purpose::STANDARD, backup_data)
        {
            let mut decoder = GzDecoder::new(&decoded[..]);
            let mut decompressed = String::new();
            use std::io::Read;
            decoder
                .read_to_string(&mut decompressed)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            decompressed
        } else {
            backup_data.to_string()
        };

        let backup: BackupData = serde_json::from_str(&json)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

        let mut products_imported = 0i64;
        let mut orders_imported = 0i64;

        for product in &backup.products {
            self.upsert_product(product)?;
            products_imported += 1;
        }

        for order in &backup.orders {
            self.save_order(order)?;
            orders_imported += 1;
        }

        self.save_settings(&backup.settings)?;

        Ok(ImportResult {
            products_imported,
            orders_imported,
        })
    }

    // ─── Activity Logging ─────────────────────────────────────────────────────

    #[allow(clippy::too_many_arguments)]
    pub fn log_activity(
        &self,
        order_id: &str,
        action: &str,
        previous_data: Option<&str>,
        new_data: Option<&str>,
        reason: &str,
        user_id: &str,
        user_name: &str,
    ) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let created_at = chrono::Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO activity_logs (id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at],
        )?;
        Ok(())
    }

    pub fn get_activity_logs(&self, limit: i64) -> Result<Vec<ActivityLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at 
             FROM activity_logs ORDER BY created_at DESC LIMIT ?1"
        )?;
        let logs = stmt
            .query_map(params![limit], |row| {
                Ok(ActivityLog {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    action: row.get(2)?,
                    previous_data: row.get(3)?,
                    new_data: row.get(4)?,
                    reason: row.get(5)?,
                    user_id: row.get(6)?,
                    user_name: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(logs)
    }

    #[allow(dead_code)]
    pub fn get_order_activity_logs(&self, order_id: &str) -> Result<Vec<ActivityLog>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at 
             FROM activity_logs WHERE order_id = ?1 ORDER BY created_at DESC"
        )?;
        let logs = stmt
            .query_map(params![order_id], |row| {
                Ok(ActivityLog {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    action: row.get(2)?,
                    previous_data: row.get(3)?,
                    new_data: row.get(4)?,
                    reason: row.get(5)?,
                    user_id: row.get(6)?,
                    user_name: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(logs)
    }

    // ─── Tables ───────────────────────────────────────────────────────────────

    pub fn get_tables(&self) -> Result<Vec<Table>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, capacity, status, position_x, position_y FROM tables ORDER BY name",
        )?;
        let tables = stmt
            .query_map([], |row| {
                Ok(Table {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    capacity: row.get(2)?,
                    status: row.get(3)?,
                    position_x: row.get(4)?,
                    position_y: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(tables)
    }

    pub fn save_table(&self, t: &Table) -> Result<()> {
        self.conn.execute(
            "INSERT INTO tables (id, name, capacity, status, position_x, position_y)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, capacity=excluded.capacity, status=excluded.status,
               position_x=excluded.position_x, position_y=excluded.position_y",
            params![
                t.id,
                t.name,
                t.capacity,
                t.status,
                t.position_x,
                t.position_y
            ],
        )?;
        Ok(())
    }

    pub fn delete_table(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM tables WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn update_table_status(&self, id: &str, status: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE tables SET status=?1 WHERE id=?2",
            params![status, id],
        )?;
        Ok(())
    }

    // ─── Staff Attendance ───────────────────────────────────────────────────

    pub fn clock_in(&self, user_id: &str, user_name: &str) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Local::now();
        let clock_in = now.format("%Y-%m-%d %H:%M:%S").to_string();
        let date = now.format("%Y-%m-%d").to_string();

        self.conn.execute(
            "INSERT INTO staff_attendance (id, user_id, user_name, clock_in, date)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, user_id, user_name, clock_in, date],
        )?;
        Ok(())
    }

    pub fn clock_out(&self, user_id: &str) -> Result<()> {
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let date = chrono::Local::now().format("%Y-%m-%d").to_string();

        self.conn.execute(
            "UPDATE staff_attendance SET clock_out=?1 WHERE user_id=?2 AND date=?3 AND clock_out IS NULL",
            params![now, user_id, date],
        )?;
        Ok(())
    }

    pub fn get_today_attendance(&self) -> Result<Vec<StaffAttendance>> {
        let date = chrono::Local::now().format("%Y-%m-%d").to_string();
        let mut stmt = self.conn.prepare(
            "SELECT id, user_id, user_name, clock_in, clock_out, date FROM staff_attendance WHERE date=?1 ORDER BY clock_in DESC"
        )?;
        let attendance = stmt
            .query_map(params![date], |row| {
                Ok(StaffAttendance {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    user_name: row.get(2)?,
                    clock_in: row.get(3)?,
                    clock_out: row.get(4)?,
                    date: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(attendance)
    }

    pub fn is_clocked_in(&self, user_id: &str) -> Result<bool> {
        let date = chrono::Local::now().format("%Y-%m-%d").to_string();
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM staff_attendance WHERE user_id=?1 AND date=?2 AND clock_out IS NULL",
            params![user_id, date],
            |r| r.get(0),
        )?;
        Ok(count > 0)
    }

    // ─── Customers ──────────────────────────────────────────────────────────

    pub fn get_customers(&self) -> Result<Vec<Customer>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, phone, email, loyalty_points, total_spent, visits, created_at FROM customers ORDER BY visits DESC"
        )?;
        let customers = stmt
            .query_map([], |row| {
                Ok(Customer {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    phone: row.get(2)?,
                    email: row.get(3)?,
                    loyalty_points: row.get(4)?,
                    total_spent: row.get(5)?,
                    visits: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(customers)
    }

    pub fn save_customer(&self, c: &Customer) -> Result<()> {
        self.conn.execute(
            "INSERT INTO customers (id, name, phone, email, loyalty_points, total_spent, visits, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, phone=excluded.phone, email=excluded.email,
               loyalty_points=excluded.loyalty_points, total_spent=excluded.total_spent, visits=excluded.visits",
            params![c.id, c.name, c.phone, c.email, c.loyalty_points, c.total_spent, c.visits, c.created_at],
        )?;
        Ok(())
    }

    pub fn get_customer_by_phone(&self, phone: &str) -> Result<Option<Customer>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, phone, email, loyalty_points, total_spent, visits, created_at FROM customers WHERE phone=?1"
        )?;
        let mut rows = stmt.query(params![phone])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Customer {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                loyalty_points: row.get(4)?,
                total_spent: row.get(5)?,
                visits: row.get(6)?,
                created_at: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn add_loyalty_points(&self, customer_id: &str, points: i32, spent: f64) -> Result<()> {
        self.conn.execute(
            "UPDATE customers SET loyalty_points = loyalty_points + ?1, total_spent = total_spent + ?2, visits = visits + 1 WHERE id=?3",
            params![points, spent, customer_id],
        )?;
        Ok(())
    }

    pub fn get_customer_orders(&self, customer_name: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method,
                    amount_paid, change_amount, customer_name, status, order_type, delivery_status,
                    delivery_address, delivery_phone, synced, created_at
             FROM orders WHERE customer_name LIKE ?1 ORDER BY created_at DESC LIMIT 50",
        )?;

        let search_pattern = format!("%{}%", customer_name);

        let mut orders: Vec<Order> = stmt
            .query_map(params![search_pattern], |row| {
                Ok(Order {
                    id: row.get(0)?,
                    items: vec![],
                    subtotal: row.get(1)?,
                    tax_amount: row.get(2)?,
                    discount_amount: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    amount_paid: row.get(6)?,
                    change_amount: row.get(7)?,
                    customer_name: row.get(8)?,
                    status: row.get(9)?,
                    order_type: row.get(10)?,
                    delivery_status: row.get(11)?,
                    delivery_address: row.get(12)?,
                    delivery_phone: row.get(13)?,
                    synced: Some(row.get::<_, i64>(14)? == 1),
                    created_at: row.get(15)?,
                    user_id: None,
                    user_name: None,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax FROM order_items WHERE order_id=?1"
            )?;
            order.items = stmt
                .query_map(params![order.id], |row| {
                    Ok(OrderItem {
                        product_id: row.get(0)?,
                        product_name: row.get(1)?,
                        price: row.get(2)?,
                        quantity: row.get(3)?,
                        discount: row.get(4)?,
                        tax: row.get(5)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    // ─── Order Notes ─────────────────────────────────────────────────────────

    pub fn add_order_note(&self, order_id: &str, note: &str) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO order_notes (id, order_id, note) VALUES (?1, ?2, ?3)",
            params![id, order_id, note],
        )?;
        Ok(())
    }

    pub fn get_order_notes(&self, order_id: &str) -> Result<Vec<OrderNote>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, note, created_at FROM order_notes WHERE order_id=?1 ORDER BY created_at DESC"
        )?;
        let notes = stmt
            .query_map(params![order_id], |row| {
                Ok(OrderNote {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    note: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(notes)
    }

    // ─── Inventory Alerts ───────────────────────────────────────────────────

    pub fn check_inventory_alerts(&self) -> Result<Vec<InventoryAlert>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, stock FROM products WHERE stock <= 10 ORDER BY stock ASC")?;
        let items: Vec<(String, String, i64)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })?
            .collect::<Result<Vec<_>>>()?;

        let mut alerts = Vec::new();
        for (id, name, stock) in items {
            let alert_type = if stock == 0 {
                "out_of_stock"
            } else {
                "low_stock"
            };
            let threshold = if stock == 0 { 0 } else { 10 };
            let alert = InventoryAlert {
                id: uuid::Uuid::new_v4().to_string(),
                product_id: id,
                product_name: name,
                current_stock: stock as i32,
                threshold,
                alert_type: alert_type.to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
            };

            // Persist the alert
            let _ = self.create_inventory_alert(&alert);
            alerts.push(alert);
        }
        Ok(alerts)
    }

    pub fn get_inventory_alerts(&self) -> Result<Vec<InventoryAlert>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, product_id, product_name, current_stock, threshold, alert_type, created_at 
             FROM inventory_alerts ORDER BY created_at DESC LIMIT 50",
        )?;
        let alerts = stmt
            .query_map([], |row| {
                Ok(InventoryAlert {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    product_name: row.get(2)?,
                    current_stock: row.get(3)?,
                    threshold: row.get(4)?,
                    alert_type: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(alerts)
    }

    pub fn create_inventory_alert(&self, alert: &InventoryAlert) -> Result<()> {
        self.conn.execute(
            "INSERT INTO inventory_alerts (id, product_id, product_name, current_stock, threshold, alert_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![alert.id, alert.product_id, alert.product_name, alert.current_stock, alert.threshold, alert.alert_type],
        )?;
        Ok(())
    }

    pub fn clear_inventory_alert(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM inventory_alerts WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Enhanced Reports ───────────────────────────────────────────────────

    pub fn get_hourly_sales(&self, date: &str) -> Result<Vec<HourlySales>> {
        let mut results = Vec::new();
        for hour in 0..24 {
            let revenue: f64 = self.conn.query_row(
                "SELECT COALESCE(SUM(total),0) FROM orders WHERE status='completed' AND DATE(created_at)=?1 AND CAST(strftime('%H', created_at) AS INTEGER)=?2",
                params![date, hour],
                |r| r.get(0),
            ).unwrap_or(0.0);

            let orders: i64 = self.conn.query_row(
                "SELECT COUNT(*) FROM orders WHERE status='completed' AND DATE(created_at)=?1 AND CAST(strftime('%H', created_at) AS INTEGER)=?2",
                params![date, hour],
                |r| r.get(0),
            ).unwrap_or(0);

            results.push(HourlySales {
                hour,
                revenue,
                orders: orders as i32,
            });
        }
        Ok(results)
    }

    pub fn get_staff_performance(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<StaffPerformance>> {
        let mut stmt = self.conn.prepare(
            "SELECT al.user_id, al.user_name, COUNT(DISTINCT al.order_id) as total_orders, 
                    COALESCE(SUM(o.total), 0) as total_revenue
             FROM activity_logs al
             LEFT JOIN orders o ON o.id = al.order_id AND o.status = 'completed'
             WHERE al.action = 'order_created' AND DATE(al.created_at) BETWEEN ?1 AND ?2
             GROUP BY al.user_id, al.user_name
             ORDER BY total_revenue DESC",
        )?;
        let perf = stmt
            .query_map(params![start_date, end_date], |row| {
                Ok(StaffPerformance {
                    user_id: row.get(0)?,
                    user_name: row.get(1)?,
                    total_orders: row.get(2)?,
                    total_revenue: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(perf)
    }

    pub fn get_sales_by_item(&self, start_date: &str, end_date: &str) -> Result<Vec<SalesByItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT oi.product_id, oi.product_name, SUM(oi.quantity) as qty, SUM(oi.price * oi.quantity) as revenue
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ?1 AND ?2
             GROUP BY oi.product_id, oi.product_name
             ORDER BY revenue DESC"
        )?;
        let items = stmt
            .query_map(params![start_date, end_date], |row| {
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

    // ─── Hold & Cancel Orders ──────────────────────────────────────────────

    pub fn hold_order(&self, o: &Order) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO orders
             (id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, synced, created_at)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,0,?15)",
            params![
                o.id, o.subtotal, o.tax_amount, o.discount_amount, o.total,
                o.payment_method, o.amount_paid, o.change_amount,
                o.customer_name, "hold", o.order_type, o.delivery_status,
                o.delivery_address, o.delivery_phone, o.created_at
            ],
        )?;

        for item in &o.items {
            self.conn.execute(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, discount, tax)
                 VALUES (?1,?2,?3,?4,?5,?6,?7)",
                params![o.id, item.product_id, item.product_name, item.price, item.quantity, item.discount, item.tax],
            )?;
        }

        Ok(())
    }

    pub fn get_held_orders(&self) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method,
                    amount_paid, change_amount, customer_name, status, order_type, delivery_status,
                    delivery_address, delivery_phone, synced, created_at
             FROM orders WHERE status='hold' ORDER BY created_at DESC",
        )?;

        let mut orders: Vec<Order> = stmt
            .query_map([], |row| {
                Ok(Order {
                    id: row.get(0)?,
                    items: vec![],
                    subtotal: row.get(1)?,
                    tax_amount: row.get(2)?,
                    discount_amount: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    amount_paid: row.get(6)?,
                    change_amount: row.get(7)?,
                    customer_name: row.get(8)?,
                    status: row.get(9)?,
                    order_type: row.get(10)?,
                    delivery_status: row.get(11)?,
                    delivery_address: row.get(12)?,
                    delivery_phone: row.get(13)?,
                    synced: Some(row.get::<_, i64>(14)? == 1),
                    created_at: row.get(15)?,
                    user_id: None,
                    user_name: None,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax FROM order_items WHERE order_id=?1"
            )?;
            order.items = stmt
                .query_map(params![order.id], |row| {
                    Ok(OrderItem {
                        product_id: row.get(0)?,
                        product_name: row.get(1)?,
                        price: row.get(2)?,
                        quantity: row.get(3)?,
                        discount: row.get(4)?,
                        tax: row.get(5)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    pub fn cancel_order(
        &self,
        id: &str,
        reason: &str,
        user_id: &str,
        user_name: &str,
    ) -> Result<()> {
        let (status,): (String,) = self.conn.query_row(
            "SELECT status FROM orders WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?,)),
        )?;

        // If order was active, restore stock
        if status == "completed" || status == "processing" {
            let items: Vec<(String, i64)> = {
                let mut stmt = self.conn.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?1")?;
                stmt.query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
                    .filter_map(|r| r.ok())
                    .collect()
            };

            for (prod_id, qty) in items {
                self.conn.execute("UPDATE products SET stock = stock + ?1 WHERE id = ?2", params![qty, prod_id])?;

                // Restore ingredients
                let recipes: Vec<(String, f64)> = {
                    let mut stmt = self.conn.prepare("SELECT ingredient_id, quantity FROM recipes WHERE product_id = ?1")?;
                    stmt.query_map(params![prod_id], |row| Ok((row.get(0)?, row.get(1)?)))?
                        .filter_map(|r| r.ok())
                        .collect()
                };
                for (ing_id, ing_qty) in recipes {
                    self.conn.execute("UPDATE ingredients SET stock = stock + ?1 WHERE id = ?2", params![ing_qty * qty as f64, ing_id])?;
                }
            }
        }

        self.conn.execute(
            "UPDATE orders SET status='cancelled' WHERE id=?1",
            params![id],
        )?;

        self.log_activity(
            id,
            "order_cancelled",
            None,
            Some(reason),
            reason,
            user_id,
            user_name,
        )?;

        Ok(())
    }

    // ─── Refund Requests ───────────────────────────────────────────────────

    pub fn create_refund_request(
        &self,
        order_id: &str,
        amount: f64,
        reason: &str,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO refund_requests (id, order_id, amount, reason) VALUES (?1, ?2, ?3, ?4)",
            params![id, order_id, amount, reason],
        )?;
        Ok(id)
    }

    pub fn get_refund_requests(&self) -> Result<Vec<RefundRequest>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, amount, reason, status, created_at FROM refund_requests ORDER BY created_at DESC"
        )?;
        let requests = stmt
            .query_map([], |row| {
                Ok(RefundRequest {
                    id: row.get(0)?,
                    order_id: row.get(1)?,
                    amount: row.get(2)?,
                    reason: row.get(3)?,
                    status: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(requests)
    }

    pub fn approve_refund(&self, id: &str, user_id: &str, user_name: &str) -> Result<()> {
        let (order_id, amount): (String, f64) = self.conn.query_row(
            "SELECT order_id, amount FROM refund_requests WHERE id=?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )?;

        self.refund_order(&order_id, user_id, user_name)?;

        self.conn.execute(
            "UPDATE refund_requests SET status='approved' WHERE id=?1",
            params![id],
        )?;

        self.log_activity(
            &order_id,
            "refund_approved",
            None,
            Some(&format!("{}: {}", amount, user_name)),
            "Refund approved",
            user_id,
            user_name,
        )?;

        Ok(())
    }

    pub fn reject_refund(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE refund_requests SET status='rejected' WHERE id=?1",
            params![id],
        )?;
        Ok(())
    }

    // ─── Seed default tables ────────────────────────────────────────────────

    pub fn seed_tables(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM tables", [], |r| r.get(0))?;
        if count == 0 {
            let tables = vec![
                ("t1", "Table 1", 4, 0, 0),
                ("t2", "Table 2", 4, 1, 0),
                ("t3", "Table 3", 6, 2, 0),
                ("t4", "Table 4", 2, 0, 1),
                ("t5", "Table 5", 4, 1, 1),
                ("t6", "Table 6", 8, 2, 1),
            ];
            for (id, name, capacity, x, y) in tables {
                self.conn.execute(
                    "INSERT INTO tables (id, name, capacity, status, position_x, position_y) VALUES (?1, ?2, ?3, 'available', ?4, ?5)",
                    params![id, name, capacity, x, y],
                )?;
            }
        }
        Ok(())
    }

    pub fn seed_expense_categories(&self) -> Result<()> {
        let count: i64 =
            self.conn
                .query_row("SELECT COUNT(*) FROM expense_categories", [], |r| r.get(0))?;
        if count == 0 {
            let categories = vec![
                ("cat1", "Rent", "🏠"),
                ("cat2", "Utilities", "💡"),
                ("cat3", "Supplies", "📦"),
                ("cat4", "Salaries", "👥"),
                ("cat5", "Marketing", "📢"),
                ("cat6", "Maintenance", "🔧"),
                ("cat7", "Other", "📝"),
            ];
            for (id, name, icon) in categories {
                self.conn.execute(
                    "INSERT INTO expense_categories (id, name, icon) VALUES (?1, ?2, ?3)",
                    params![id, name, icon],
                )?;
            }
        }
        Ok(())
    }

    pub fn seed_tax_rates(&self) -> Result<()> {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM tax_rates", [], |r| r.get(0))?;
        if count == 0 {
            let tax_rates = vec![
                // Americas
                ("tax_us_sales", "US Sales Tax (Average)", 8.25, 1, "US"),
                ("tax_us_ca", "US - California", 7.25, 0, "US"),
                ("tax_us_ny", "US - New York", 8.0, 0, "US"),
                ("tax_us_tx", "US - Texas", 6.25, 0, "US"),
                ("tax_us_fl", "US - Florida", 6.0, 0, "US"),
                ("tax_ca_gst", "Canada GST", 5.0, 0, "CA"),
                ("tax_ca_hst", "Canada HST (Ontario)", 13.0, 0, "CA"),
                ("tax_ca_pst", "Canada PST (BC)", 12.0, 0, "CA"),
                ("tax_mx_iva", "Mexico IVA", 16.0, 0, "MX"),
                ("tax_br_icms", "Brazil ICMS", 18.0, 0, "BR"),
                // Europe
                ("tax_uk_vat", "UK VAT", 20.0, 0, "GB"),
                ("tax_de_vat", "Germany VAT", 19.0, 0, "DE"),
                ("tax_fr_vat", "France VAT", 20.0, 0, "FR"),
                ("tax_it_vat", "Italy VAT", 22.0, 0, "IT"),
                ("tax_es_vat", "Spain VAT", 21.0, 0, "ES"),
                ("tax_nl_vat", "Netherlands VAT", 21.0, 0, "NL"),
                ("tax_be_vat", "Belgium VAT", 21.0, 0, "BE"),
                ("tax_pl_vat", "Poland VAT", 23.0, 0, "PL"),
                ("tax_se_vat", "Sweden VAT", 25.0, 0, "SE"),
                // Asia Pacific
                ("tax_in_gst", "India GST (Standard)", 18.0, 0, "IN"),
                ("tax_in_cgst", "India GST (CGST+SGST)", 18.0, 0, "IN"),
                ("tax_au_gst", "Australia GST", 10.0, 0, "AU"),
                ("tax_nz_gst", "New Zealand GST", 15.0, 0, "NZ"),
                ("tax_sg_gst", "Singapore GST", 9.0, 0, "SG"),
                ("tax_jp_consump", "Japan Consumption Tax", 10.0, 0, "JP"),
                ("tax_kr_vat", "Korea VAT", 10.0, 0, "KR"),
                ("tax_my_sst", "Malaysia SST", 6.0, 0, "MY"),
                ("tax_th_vat", "Thailand VAT", 7.0, 0, "TH"),
                ("tax_ph_vat", "Philippines VAT", 12.0, 0, "PH"),
                ("tax_id_vat", "Indonesia VAT", 11.0, 0, "ID"),
                ("tax_vn_vat", "Vietnam VAT", 10.0, 0, "VN"),
                // Middle East
                ("tax_ae_vat", "UAE VAT", 5.0, 0, "AE"),
                ("tax_sa_vat", "Saudi Arabia VAT", 15.0, 0, "SA"),
                ("tax_il_vat", "Israel VAT", 17.0, 0, "IL"),
                ("tax_eg_vat", "Egypt VAT", 14.0, 0, "EG"),
                // Africa
                ("tax_za_vat", "South Africa VAT", 15.0, 0, "ZA"),
                ("tax_ng_vat", "Nigeria VAT", 7.5, 0, "NG"),
                ("tax_ke_vat", "Kenya VAT", 16.0, 0, "KE"),
            ];
            for (id, name, rate, is_default, country) in tax_rates {
                self.conn.execute(
                    "INSERT INTO tax_rates (id, name, rate, is_default, country) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![id, name, rate, is_default, country],
                )?;
            }
        }
        Ok(())
    }

    // ─── Database Maintenance ────────────────────────────────────────────────

    #[allow(dead_code)]
    pub fn vacuum(&self) -> Result<()> {
        self.conn.execute_batch("VACUUM")?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn get_db_size(&self) -> Result<i64> {
        let page_count: i64 = self.conn.query_row("PRAGMA page_count", [], |r| r.get(0))?;
        let page_size: i64 = self.conn.query_row("PRAGMA page_size", [], |r| r.get(0))?;
        Ok(page_count * page_size)
    }

    // ─── Crash Recovery ───────────────────────────────────────────────────────

    pub fn get_pending_orders_count(&self) -> Result<i64> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM orders WHERE status='hold' OR status='pending'",
            [],
            |r| r.get(0),
        )?;
        Ok(count)
    }

    pub fn get_pending_orders(&self) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method,
                    amount_paid, change_amount, customer_name, status, order_type, delivery_status,
                    delivery_address, delivery_phone, synced, created_at
             FROM orders WHERE status='hold' OR status='pending' ORDER BY created_at DESC",
        )?;

        let mut orders: Vec<Order> = stmt
            .query_map([], |row| {
                Ok(Order {
                    id: row.get(0)?,
                    items: vec![],
                    subtotal: row.get(1)?,
                    tax_amount: row.get(2)?,
                    discount_amount: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    amount_paid: row.get(6)?,
                    change_amount: row.get(7)?,
                    customer_name: row.get(8)?,
                    status: row.get(9)?,
                    order_type: row.get(10)?,
                    delivery_status: row.get(11)?,
                    delivery_address: row.get(12)?,
                    delivery_phone: row.get(13)?,
                    synced: Some(row.get::<_, i64>(14)? == 1),
                    created_at: row.get(15)?,
                    user_id: None,
                    user_name: None,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax FROM order_items WHERE order_id=?1"
            )?;
            order.items = stmt
                .query_map(params![order.id], |row| {
                    Ok(OrderItem {
                        product_id: row.get(0)?,
                        product_name: row.get(1)?,
                        price: row.get(2)?,
                        quantity: row.get(3)?,
                        discount: row.get(4)?,
                        tax: row.get(5)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    pub fn delete_pending_order(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM order_items WHERE order_id=?1", params![id])?;
        self.conn
            .execute("DELETE FROM orders WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── KDS ─────────────────────────────────────────────────────────────────────

    pub fn get_kds_orders(&self) -> Result<Vec<KdsOrder>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_type, customer_name, created_at FROM orders 
             WHERE status IN ('completed', 'processing') AND order_type != 'takeaway'
             AND datetime(created_at) > datetime('now', '-2 hours')
             ORDER BY created_at DESC LIMIT 50",
        )?;

        let orders: Vec<KdsOrder> = stmt
            .query_map([], |row| {
                Ok(KdsOrder {
                    id: row.get(0)?,
                    items: vec![],
                    order_type: row.get(1)?,
                    customer_name: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        let mut result = Vec::new();
        for mut order in orders {
            let mut stmt = self.conn.prepare(
                "SELECT product_name, quantity, done FROM order_items WHERE order_id=?1",
            )?;
            let items: Vec<KdsItem> = stmt
                .query_map(params![order.id], |row| {
                    Ok(KdsItem {
                        product_name: row.get(0)?,
                        quantity: row.get(1)?,
                        done: row.get::<_, i32>(2)? == 1,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;
            order.items = items;
            result.push(order);
        }

        Ok(result)
    }

    pub fn mark_kds_item_done(&self, order_id: &str, item_index: usize) -> Result<()> {
        // Get the item at the given index for this order
        let item_id: i64 = self.conn.query_row(
            "SELECT id FROM order_items WHERE order_id=?1 ORDER BY id LIMIT 1 OFFSET ?2",
            params![order_id, item_index as i64],
            |row| row.get(0),
        )?;

        self.conn.execute(
            "UPDATE order_items SET done = 1 WHERE id = ?1",
            params![item_id],
        )?;
        Ok(())
    }

    // ─── Ingredients ───────────────────────────────────────────────────────────

    pub fn get_ingredients(&self) -> Result<Vec<Ingredient>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, stock, unit, reorder_level, created_at FROM ingredients ORDER BY name"
        )?;
        let ingredients = stmt
            .query_map([], |row| {
                Ok(Ingredient {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    stock: row.get(2)?,
                    unit: row.get(3)?,
                    reorder_level: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(ingredients)
    }

    pub fn save_ingredient(&self, i: &Ingredient) -> Result<()> {
        self.conn.execute(
            "INSERT INTO ingredients (id, name, stock, unit, reorder_level)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, stock=excluded.stock, unit=excluded.unit, reorder_level=excluded.reorder_level",
            params![i.id, i.name, i.stock, i.unit, i.reorder_level],
        )?;
        Ok(())
    }

    pub fn delete_ingredient(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM recipes WHERE ingredient_id=?1", params![id])?;
        self.conn
            .execute("DELETE FROM ingredients WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Recipes ─────────────────────────────────────────────────────────────

    pub fn get_recipes(&self) -> Result<Vec<Recipe>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, product_id, ingredient_id, quantity FROM recipes")?;
        let recipes = stmt
            .query_map([], |row| {
                Ok(Recipe {
                    id: row.get(0)?,
                    product_id: row.get(1)?,
                    ingredient_id: row.get(2)?,
                    quantity: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(recipes)
    }

    pub fn save_recipe(&self, r: &Recipe) -> Result<()> {
        self.conn.execute(
            "INSERT INTO recipes (id, product_id, ingredient_id, quantity)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(product_id, ingredient_id) DO UPDATE SET quantity=excluded.quantity",
            params![r.id, r.product_id, r.ingredient_id, r.quantity],
        )?;
        Ok(())
    }

    // ─── Suppliers ───────────────────────────────────────────────────────────

    pub fn get_suppliers(&self) -> Result<Vec<Supplier>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, phone, email, address, created_at FROM suppliers ORDER BY name",
        )?;
        let suppliers = stmt
            .query_map([], |row| {
                Ok(Supplier {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    phone: row.get(2)?,
                    email: row.get(3)?,
                    address: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(suppliers)
    }

    pub fn save_supplier(&self, s: &Supplier) -> Result<()> {
        self.conn.execute(
            "INSERT INTO suppliers (id, name, phone, email, address)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address",
            params![s.id, s.name, s.phone, s.email, s.address],
        )?;
        Ok(())
    }

    pub fn delete_supplier(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM suppliers WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Purchase Orders ─────────────────────────────────────────────────────

    pub fn get_purchase_orders(&self) -> Result<Vec<PurchaseOrder>> {
        let mut stmt = self.conn.prepare(
            "SELECT po.id, po.supplier_id, s.name, po.status, po.total, po.notes, po.created_at
             FROM purchase_orders po
             LEFT JOIN suppliers s ON po.supplier_id = s.id
             ORDER BY po.created_at DESC",
        )?;

        let pos: Vec<(String, String, String, String, f64, String, String)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            })?
            .collect::<Result<Vec<_>>>()?;

        let mut result = Vec::new();
        for (id, supplier_id, supplier_name, status, total, notes, created_at) in pos {
            let mut stmt = self.conn.prepare(
                "SELECT poi.id, poi.ingredient_id, i.name, poi.quantity, poi.unit_cost
                 FROM purchase_order_items poi
                 LEFT JOIN ingredients i ON poi.ingredient_id = i.id
                 WHERE poi.po_id=?1",
            )?;

            let items: Vec<PurchaseOrderItem> = stmt
                .query_map(params![id], |row| {
                    Ok(PurchaseOrderItem {
                        id: row.get(0)?,
                        ingredient_id: row.get(1)?,
                        ingredient_name: row.get::<_, String>(2).unwrap_or_default(),
                        quantity: row.get(3)?,
                        unit_cost: row.get(4)?,
                    })
                })?
                .collect::<Result<Vec<_>>>()?;

            result.push(PurchaseOrder {
                id,
                supplier_id,
                supplier_name,
                status,
                total,
                notes,
                items,
                created_at,
            });
        }

        Ok(result)
    }

    pub fn save_purchase_order(&self, po: &PurchaseOrder) -> Result<()> {
        self.conn.execute(
            "INSERT INTO purchase_orders (id, supplier_id, status, total, notes)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET supplier_id=excluded.supplier_id, status=excluded.status, total=excluded.total, notes=excluded.notes",
            params![po.id, po.supplier_id, po.status, po.total, po.notes],
        )?;

        self.conn.execute(
            "DELETE FROM purchase_order_items WHERE po_id=?1",
            params![po.id],
        )?;

        for item in &po.items {
            self.conn.execute(
                "INSERT INTO purchase_order_items (id, po_id, ingredient_id, quantity, unit_cost)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    item.id,
                    po.id,
                    item.ingredient_id,
                    item.quantity,
                    item.unit_cost
                ],
            )?;
        }

        Ok(())
    }

    pub fn update_po_status(&self, id: &str, status: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE purchase_orders SET status=?1 WHERE id=?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn receive_purchase_order(&self, id: &str) -> Result<()> {
        let mut stmt = self
            .conn
            .prepare("SELECT ingredient_id, quantity FROM purchase_order_items WHERE po_id=?1")?;

        let items: Vec<(String, f64)> = stmt
            .query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>>>()?;

        for (ingredient_id, quantity) in items {
            self.conn.execute(
                "UPDATE ingredients SET stock = stock + ?1 WHERE id = ?2",
                params![quantity, ingredient_id],
            )?;
        }

        self.conn.execute(
            "UPDATE purchase_orders SET status='received' WHERE id=?1",
            params![id],
        )?;
        Ok(())
    }

    // ─── Reservations ───────────────────────────────────────────────────────

    pub fn get_reservations(&self, date: &str) -> Result<Vec<Reservation>> {
        let mut stmt = self.conn.prepare(
            "SELECT r.id, r.table_id, t.name, r.customer_name, r.phone, r.date, r.time, r.party_size, r.status, r.notes, r.created_at
             FROM reservations r
             LEFT JOIN tables t ON r.table_id = t.id
             WHERE r.date=?1
             ORDER BY r.time"
        )?;

        let reservations = stmt
            .query_map(params![date], |row| {
                Ok(Reservation {
                    id: row.get(0)?,
                    table_id: row.get(1)?,
                    table_name: row.get::<_, String>(2).unwrap_or_default(),
                    customer_name: row.get(3)?,
                    phone: row.get(4)?,
                    date: row.get(5)?,
                    time: row.get(6)?,
                    party_size: row.get(7)?,
                    status: row.get(8)?,
                    notes: row.get(9)?,
                    created_at: row.get(10)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(reservations)
    }

    pub fn save_reservation(&self, r: &Reservation) -> Result<()> {
        self.conn.execute(
            "INSERT INTO reservations (id, table_id, customer_name, phone, date, time, party_size, status, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET table_id=excluded.table_id, customer_name=excluded.customer_name, phone=excluded.phone, date=excluded.date, time=excluded.time, party_size=excluded.party_size, status=excluded.status, notes=excluded.notes",
            params![r.id, r.table_id, r.customer_name, r.phone, r.date, r.time, r.party_size, r.status, r.notes],
        )?;
        Ok(())
    }

    pub fn delete_reservation(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM reservations WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Shifts ────────────────────────────────────────────────────────────────

    pub fn get_shifts(&self, date: &str) -> Result<Vec<Shift>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, staff_id, staff_name, date, start_time, end_time, role, notes, created_at
             FROM shifts
             WHERE date=?1
             ORDER BY start_time",
        )?;

        let shifts = stmt
            .query_map(params![date], |row| {
                Ok(Shift {
                    id: row.get(0)?,
                    staff_id: row.get(1)?,
                    staff_name: row.get(2)?,
                    date: row.get(3)?,
                    start_time: row.get(4)?,
                    end_time: row.get(5)?,
                    role: row.get(6)?,
                    notes: row.get(7)?,
                    created_at: row.get(8)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(shifts)
    }

    pub fn save_shift(&self, s: &Shift) -> Result<()> {
        self.conn.execute(
            "INSERT INTO shifts (id, staff_id, staff_name, date, start_time, end_time, role, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET staff_id=excluded.staff_id, staff_name=excluded.staff_name, date=excluded.date, start_time=excluded.start_time, end_time=excluded.end_time, role=excluded.role, notes=excluded.notes",
            params![s.id, s.staff_id, s.staff_name, s.date, s.start_time, s.end_time, s.role, s.notes],
        )?;
        Ok(())
    }

    pub fn delete_shift(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM shifts WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Expenses ────────────────────────────────────────────────────────────

    pub fn get_expenses(&self, date: &str) -> Result<Vec<Expense>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, category, amount, description, date, payment_method, created_at
             FROM expenses
             WHERE date=?1
             ORDER BY created_at DESC",
        )?;

        let expenses = stmt
            .query_map(params![date], |row| {
                Ok(Expense {
                    id: row.get(0)?,
                    category: row.get(1)?,
                    amount: row.get(2)?,
                    description: row.get(3)?,
                    date: row.get(4)?,
                    payment_method: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(expenses)
    }

    pub fn get_expenses_by_range(&self, start_date: &str, end_date: &str) -> Result<Vec<Expense>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, category, amount, description, date, payment_method, created_at
             FROM expenses
             WHERE date BETWEEN ?1 AND ?2
             ORDER BY date DESC",
        )?;

        let expenses = stmt
            .query_map(params![start_date, end_date], |row| {
                Ok(Expense {
                    id: row.get(0)?,
                    category: row.get(1)?,
                    amount: row.get(2)?,
                    description: row.get(3)?,
                    date: row.get(4)?,
                    payment_method: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(expenses)
    }

    pub fn save_expense(&self, e: &Expense) -> Result<()> {
        self.conn.execute(
            "INSERT INTO expenses (id, category, amount, description, date, payment_method)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET category=excluded.category, amount=excluded.amount, description=excluded.description, date=excluded.date, payment_method=excluded.payment_method",
            params![e.id, e.category, e.amount, e.description, e.date, e.payment_method],
        )?;
        Ok(())
    }

    pub fn delete_expense(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM expenses WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn get_expense_categories(&self) -> Result<Vec<ExpenseCategory>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, icon FROM expense_categories")?;
        let categories = stmt
            .query_map([], |row| {
                Ok(ExpenseCategory {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    icon: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(categories)
    }

    pub fn save_expense_category(&self, c: &ExpenseCategory) -> Result<()> {
        self.conn.execute(
            "INSERT INTO expense_categories (id, name, icon) VALUES (?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, icon=excluded.icon",
            params![c.id, c.name, c.icon],
        )?;
        Ok(())
    }

    // ─── Tax Rates ───────────────────────────────────────────────────────────────

    pub fn get_tax_rates(&self) -> Result<Vec<TaxRate>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, rate, is_default, country FROM tax_rates ORDER BY name")?;
        let rates = stmt
            .query_map([], |row| {
                Ok(TaxRate {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    rate: row.get(2)?,
                    is_default: row.get::<_, i32>(3)? == 1,
                    country: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;
        Ok(rates)
    }

    pub fn save_tax_rate(&self, t: &TaxRate) -> Result<()> {
        if t.is_default {
            self.conn
                .execute("UPDATE tax_rates SET is_default = 0", [])?;
        }
        self.conn.execute(
            "INSERT INTO tax_rates (id, name, rate, is_default, country)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET name=excluded.name, rate=excluded.rate, is_default=excluded.is_default, country=excluded.country",
            params![t.id, t.name, t.rate, if t.is_default { 1 } else { 0 }, t.country],
        )?;
        Ok(())
    }

    pub fn delete_tax_rate(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM tax_rates WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Customer Wallet ──────────────────────────────────────────────────────

    pub fn get_customer_wallet(&self, customer_id: &str) -> Result<CustomerWallet> {
        let wallet = self.conn.query_row(
            "SELECT customer_id, balance, total_loaded, total_spent FROM customer_wallets WHERE customer_id=?1",
            params![customer_id],
            |row| Ok(CustomerWallet {
                customer_id: row.get(0)?,
                balance: row.get(1)?,
                total_loaded: row.get(2)?,
                total_spent: row.get(3)?,
            }),
        ).unwrap_or(CustomerWallet {
            customer_id: customer_id.to_string(),
            balance: 0.0,
            total_loaded: 0.0,
            total_spent: 0.0,
        });
        Ok(wallet)
    }

    pub fn add_wallet_balance(&self, customer_id: &str, amount: f64, notes: &str) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();

        self.conn.execute(
            "INSERT INTO customer_wallets (customer_id, balance, total_loaded, total_spent)
             VALUES (?1, ?2, ?2, 0)
             ON CONFLICT(customer_id) DO UPDATE SET balance = balance + ?2, total_loaded = total_loaded + ?2",
            params![customer_id, amount],
        )?;

        self.conn.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, notes)
             VALUES (?1, ?2, ?3, 'credit', ?4)",
            params![id, customer_id, amount, notes],
        )?;

        Ok(())
    }

    pub fn deduct_wallet_balance(
        &self,
        customer_id: &str,
        amount: f64,
        order_id: &str,
    ) -> Result<()> {
        let id = uuid::Uuid::new_v4().to_string();

        let tx = self.conn.unchecked_transaction()?;

        let rows_updated = tx.execute(
            "UPDATE customer_wallets SET balance = balance - ?1, total_spent = total_spent + ?1 WHERE customer_id=?2 AND balance >= ?1",
            params![amount, customer_id],
        )?;

        if rows_updated == 0 {
            tx.rollback()?;
            return Err(rusqlite::Error::InvalidQuery);
        }

        tx.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, order_id)
             VALUES (?1, ?2, ?3, 'debit', ?4)",
            params![id, customer_id, amount, order_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn get_wallet_transactions(&self, customer_id: &str) -> Result<Vec<WalletTransaction>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, customer_id, amount, transaction_type, order_id, notes, created_at
             FROM wallet_transactions WHERE customer_id=?1 ORDER BY created_at DESC",
        )?;

        let transactions = stmt
            .query_map(params![customer_id], |row| {
                Ok(WalletTransaction {
                    id: row.get(0)?,
                    customer_id: row.get(1)?,
                    amount: row.get(2)?,
                    transaction_type: row.get(3)?,
                    order_id: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(transactions)
    }

    // ─── Coupons ──────────────────────────────────────────────────────────────

    pub fn get_coupons(&self) -> Result<Vec<Coupon>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active
             FROM coupons ORDER BY created_at DESC"
        )?;

        let coupons = stmt
            .query_map([], |row| {
                Ok(Coupon {
                    id: row.get(0)?,
                    code: row.get(1)?,
                    discount_type: row.get(2)?,
                    discount_value: row.get(3)?,
                    min_order_amount: row.get(4)?,
                    max_uses: row.get(5)?,
                    used_count: row.get(6)?,
                    valid_from: row.get(7)?,
                    valid_until: row.get(8)?,
                    active: row.get::<_, i32>(9)? == 1,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(coupons)
    }

    pub fn save_coupon(&self, c: &Coupon) -> Result<()> {
        self.conn.execute(
            "INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET code=excluded.code, discount_type=excluded.discount_type, discount_value=excluded.discount_value, min_order_amount=excluded.min_order_amount, max_uses=excluded.max_uses, used_count=excluded.used_count, valid_from=excluded.valid_from, valid_until=excluded.valid_until, active=excluded.active",
            params![c.id, c.code, c.discount_type, c.discount_value, c.min_order_amount, c.max_uses, c.used_count, c.valid_from, c.valid_until, if c.active { 1 } else { 0 }],
        )?;
        Ok(())
    }

    pub fn validate_coupon(&self, code: &str, order_amount: f64) -> Result<Coupon> {
        let coupon = self.conn.query_row(
            "SELECT id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active
             FROM coupons WHERE code=?1 AND active=1",
            params![code],
            |row| Ok(Coupon {
                id: row.get(0)?,
                code: row.get(1)?,
                discount_type: row.get(2)?,
                discount_value: row.get(3)?,
                min_order_amount: row.get(4)?,
                max_uses: row.get(5)?,
                used_count: row.get(6)?,
                valid_from: row.get(7)?,
                valid_until: row.get(8)?,
                active: row.get::<_, i32>(9)? == 1,
            }),
        ).map_err(|_| rusqlite::Error::InvalidQuery)?;

        let now = chrono::Local::now().format("%Y-%m-%d").to_string();
        if now < coupon.valid_from {
            return Err(rusqlite::Error::InvalidParameterName(
                "Coupon not yet valid".to_string(),
            ));
        }
        if now > coupon.valid_until {
            return Err(rusqlite::Error::InvalidParameterName(
                "Coupon has expired".to_string(),
            ));
        }

        if coupon.used_count >= coupon.max_uses {
            return Err(rusqlite::Error::InvalidParameterName(
                "Coupon usage limit reached".to_string(),
            ));
        }

        if order_amount < coupon.min_order_amount {
            return Err(rusqlite::Error::InvalidParameterName(format!(
                "Minimum order amount of {} not met",
                coupon.min_order_amount
            )));
        }

        Ok(coupon)
    }

    pub fn use_coupon(&self, code: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE coupons SET used_count = used_count + 1 WHERE code=?1",
            params![code],
        )?;
        Ok(())
    }

    pub fn delete_coupon(&self, id: &str) -> Result<()> {
        self.conn
            .execute("DELETE FROM coupons WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Day End Reconciliation ─────────────────────────────────────────────

    pub fn get_day_end_reconciliation(&self, date: &str) -> Result<Option<DayEndReconciliation>> {
        let result = self.conn.query_row(
            "SELECT id, date, opening_cash, expected_cash, actual_cash, difference, cash_sales, upi_sales, card_sales, total_expenses, notes, created_by, created_at
             FROM day_end_reconciliations WHERE date=?1",
            params![date],
            |row| Ok(DayEndReconciliation {
                id: row.get(0)?,
                date: row.get(1)?,
                opening_cash: row.get(2)?,
                expected_cash: row.get(3)?,
                actual_cash: row.get(4)?,
                difference: row.get(5)?,
                cash_sales: row.get(6)?,
                upi_sales: row.get(7)?,
                card_sales: row.get(8)?,
                total_expenses: row.get(9)?,
                notes: row.get(10)?,
                created_by: row.get(11)?,
                created_at: row.get(12)?,
            }),
        );

        match result {
            Ok(r) => Ok(Some(r)),
            Err(_) => Ok(None),
        }
    }

    pub fn save_day_end_reconciliation(&self, r: &DayEndReconciliation) -> Result<()> {
        self.conn.execute(
            "INSERT INTO day_end_reconciliations (id, date, opening_cash, expected_cash, actual_cash, difference, cash_sales, upi_sales, card_sales, total_expenses, notes, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(date) DO UPDATE SET opening_cash=excluded.opening_cash, expected_cash=excluded.expected_cash, actual_cash=excluded.actual_cash, difference=excluded.difference, cash_sales=excluded.cash_sales, upi_sales=excluded.upi_sales, card_sales=excluded.card_sales, total_expenses=excluded.total_expenses, notes=excluded.notes, created_by=excluded.created_by",
            params![r.id, r.date, r.opening_cash, r.expected_cash, r.actual_cash, r.difference, r.cash_sales, r.upi_sales, r.card_sales, r.total_expenses, r.notes, r.created_by],
        )?;
        Ok(())
    }

    // ─── GST Reports ──────────────────────────────────────────────────────────

    pub fn get_gstr1_report(&self, start_date: &str, end_date: &str) -> Result<Vec<GstReport>> {
        let mut stmt = self.conn.prepare(
            "SELECT o.id, o.created_at, o.customer_name, o.total, o.tax_amount
             FROM orders o
             WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ?1 AND ?2
             ORDER BY o.created_at",
        )?;

        let reports: Vec<GstReport> = stmt
            .query_map(params![start_date, end_date], |row| {
                let total: f64 = row.get(3)?;
                let tax_amount: f64 = row.get(4)?;
                let taxable_value = total - tax_amount;
                let half_tax = tax_amount / 2.0;

                Ok(GstReport {
                    invoice_no: row.get(0)?,
                    date: row.get::<_, String>(1)?[..10].to_string(),
                    customer_name: row.get(2)?,
                    customer_gstin: None,
                    taxable_value,
                    cgst: half_tax,
                    sgst: half_tax,
                    igst: 0.0,
                    total,
                    place_of_supply: "Local".to_string(),
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(reports)
    }

    pub fn get_gstr3b_report(
        &self,
        start_date: &str,
        end_date: &str,
    ) -> Result<(f64, f64, f64, f64, f64, f64)> {
        let (total_taxable, total_cgst, total_sgst, total_igst, total_liability, itc_claimed) =
            self.conn.query_row(
                "SELECT 
                COALESCE(SUM(total - tax_amount), 0) as taxable,
                COALESCE(SUM(tax_amount / 2), 0) as cgst,
                COALESCE(SUM(tax_amount / 2), 0) as sgst,
                0.0 as igst,
                COALESCE(SUM(tax_amount), 0) as liability,
                COALESCE(SUM(tax_amount), 0) as itc
             FROM orders
             WHERE status='completed' AND DATE(created_at) BETWEEN ?1 AND ?2",
                params![start_date, end_date],
                |row| {
                    Ok((
                        row.get::<_, f64>(0)?,
                        row.get::<_, f64>(1)?,
                        row.get::<_, f64>(2)?,
                        row.get::<_, f64>(3)?,
                        row.get::<_, f64>(4)?,
                        row.get::<_, f64>(5)?,
                    ))
                },
            )?;

        Ok((
            total_taxable,
            total_cgst,
            total_sgst,
            total_igst,
            total_liability,
            itc_claimed,
        ))
    }

    // ─── Activity Logs ───────────────────────────────────────────────────────

    pub fn get_activity_logs_range(
        &self,
        start_date: &str,
        end_date: &str,
        limit: i32,
    ) -> Result<Vec<ActivityLogEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, order_id, action, previous_data, new_data, reason, user_id, user_name, created_at
             FROM activity_logs
             WHERE DATE(created_at) BETWEEN ?1 AND ?2
             ORDER BY created_at DESC LIMIT ?3"
        )?;

        let logs = stmt
            .query_map(params![start_date, end_date, limit], |row| {
                Ok(ActivityLogEntry {
                    id: row.get(0)?,
                    action: row.get(1)?,
                    entity_type: Some(row.get::<_, String>(2)?),
                    entity_id: Some(row.get::<_, String>(3)?),
                    previous_value: row.get(4)?,
                    new_value: row.get(5)?,
                    reason: Some(row.get::<_, String>(6)?),
                    user_id: row.get(7)?,
                    user_name: row.get(8)?,
                    created_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(logs)
    }

    // ─── Accounting Export ──────────────────────────────────────────────────

    pub fn export_to_tally(&self, start_date: &str, end_date: &str) -> Result<String> {
        let orders = self.get_orders_by_date(start_date, end_date)?;
        let _expenses = self.get_expenses_by_range(start_date, end_date)?;

        let mut tally_xml = String::from("<ENVELOPE>\n<HEADER>\n<VERSION>1</VERSION>\n<TYPE>Data</TYPE>\n<CLASS>Export Vouchers</CLASS>\n</HEADER>\n<BODY>\n<DESC>\n<STATICVARIABLES>\n<SVCURRENTCOMPANY>My Company</SVCURRENTCOMPANY>\n</STATICVARIABLES>\n</DESC>\n");

        for _order in &orders {
            tally_xml.push_str(&format!(
                "<IMPORTDATA>\n<REQUESTDESC>\n<REPORTNAME>All Masters</REPORTNAME>\n</REQUESTDESC>\n<REQUESTDATA>\n< tann:{}  xmlns:tann=\"TallyVoucher\">\n",
                ""
            ));
        }

        tally_xml.push_str("</BODY>\n</ENVELOPE>");

        Ok(tally_xml)
    }

    pub fn export_to_quickbooks(&self, start_date: &str, end_date: &str) -> Result<String> {
        let orders = self.get_orders_by_date(start_date, end_date)?;

        let mut json = String::from("{\n  \"Invoice\": [\n");

        for (i, order) in orders.iter().enumerate() {
            if i > 0 {
                json.push_str(",\n");
            }
            json.push_str(&format!(
                "    {{\"Id\": \"{}\", \"TotalAmount\": {}, \"CustomerName\": \"{}\"}}",
                order.id, order.total, order.customer_name
            ));
        }

        json.push_str("\n  ]\n}");

        Ok(json)
    }

    fn get_orders_by_date(&self, start_date: &str, end_date: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, subtotal, tax_amount, discount_amount, total, payment_method,
                    amount_paid, change_amount, customer_name, status, order_type, delivery_status,
                    delivery_address, delivery_phone, user_id, user_name, synced, created_at
             FROM orders WHERE status='completed' AND DATE(created_at) BETWEEN ?1 AND ?2",
        )?;

        let orders: Vec<Order> = stmt
            .query_map(params![start_date, end_date], |row| {
                Ok(Order {
                    id: row.get(0)?,
                    items: vec![],
                    subtotal: row.get(1)?,
                    tax_amount: row.get(2)?,
                    discount_amount: row.get(3)?,
                    total: row.get(4)?,
                    payment_method: row.get(5)?,
                    amount_paid: row.get(6)?,
                    change_amount: row.get(7)?,
                    customer_name: row.get(8)?,
                    status: row.get(9)?,
                    order_type: row.get(10)?,
                    delivery_status: row.get(11)?,
                    delivery_address: row.get(12)?,
                    delivery_phone: row.get(13)?,
                    user_id: Some(row.get::<_, String>(14)?),
                    user_name: Some(row.get::<_, String>(15)?),
                    synced: Some(row.get::<_, i64>(16)? == 1),
                    created_at: row.get(17)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(orders)
    }

    // ─── Backup & Compression ────────────────────────────────────────────────

    pub fn create_compressed_backup(&self) -> Result<Vec<u8>> {
        let backup = self.export_backup()?;
        let compressed = compress_data(backup.as_bytes());
        Ok(compressed)
    }
}

fn compress_data(data: &[u8]) -> Vec<u8> {
    use std::io::Write;

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut result = Vec::new();
    let mut encoder = zip::ZipWriter::new(std::io::Cursor::new(&mut result));

    encoder.start_file("backup.json", options).unwrap();
    encoder.write_all(data).unwrap();
    encoder.finish().unwrap();

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let conn = rusqlite::Connection::open(&db_path).unwrap();
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .unwrap();
        let db = Database { conn };
        db.init_schema().unwrap();
        db.migrate_schema().unwrap();
        db.init_users().unwrap();
        (db, temp_dir)
    }

    #[test]
    fn test_products_crud() {
        let (db, _temp) = create_test_db();

        // Get initial product count
        let initial_count = db.get_products().unwrap().len();

        // Create a product
        let product = Product {
            id: "test-001".to_string(),
            name: "Test Coffee".to_string(),
            price: 150.0,
            category: "Beverages".to_string(),
            stock: 50,
            barcode: "123456789".to_string(),
            tax: 5.0,
            created_at: None,
        };

        // Insert product
        db.upsert_product(&product).unwrap();

        // Read product
        let products = db.get_products().unwrap();
        assert_eq!(products.len(), initial_count + 1);

        let added_product = products.iter().find(|p| p.id == "test-001").unwrap();
        assert_eq!(added_product.name, "Test Coffee");
        assert_eq!(added_product.price, 150.0);
        assert_eq!(added_product.stock, 50);

        // Update product
        let mut updated_product = product.clone();
        updated_product.price = 180.0;
        updated_product.stock = 30;
        db.upsert_product(&updated_product).unwrap();

        let products = db.get_products().unwrap();
        let updated = products.iter().find(|p| p.id == "test-001").unwrap();
        assert_eq!(updated.price, 180.0);
        assert_eq!(updated.stock, 30);

        // Delete product
        db.delete_product("test-001").unwrap();
        let products = db.get_products().unwrap();
        assert_eq!(products.len(), initial_count);
    }

    #[test]
    fn test_orders_crud() {
        let (db, _temp) = create_test_db();

        // First create a product
        let product = Product {
            id: "prod-001".to_string(),
            name: "Test Tea".to_string(),
            price: 50.0,
            category: "Beverages".to_string(),
            stock: 100,
            barcode: "987654321".to_string(),
            tax: 5.0,
            created_at: None,
        };
        db.upsert_product(&product).unwrap();

        // Get initial stock
        let initial_stock = db
            .get_products()
            .unwrap()
            .iter()
            .find(|p| p.id == "prod-001")
            .unwrap()
            .stock;

        // Create an order
        let order = Order {
            id: "order-001".to_string(),
            items: vec![OrderItem {
                product_id: "prod-001".to_string(),
                product_name: "Test Tea".to_string(),
                price: 50.0,
                quantity: 2,
                discount: 0.0,
                tax: 5.0,
            }],
            subtotal: 100.0,
            tax_amount: 5.0,
            discount_amount: 0.0,
            total: 105.0,
            payment_method: "cash".to_string(),
            amount_paid: 105.0,
            change_amount: 0.0,
            customer_name: "John Doe".to_string(),
            status: "completed".to_string(),
            order_type: "dine_in".to_string(),
            delivery_status: "delivered".to_string(),
            delivery_address: "".to_string(),
            delivery_phone: "".to_string(),
            created_at: "2024-01-01T10:00:00Z".to_string(),
            synced: Some(false),
        };

        db.save_order(&order).unwrap();

        // Verify order was saved
        let orders = db.get_orders().unwrap();
        assert_eq!(orders.len(), 1);
        assert_eq!(orders[0].total, 105.0);
        assert_eq!(orders[0].customer_name, "John Doe");
        assert_eq!(orders[0].items.len(), 1);
        assert_eq!(orders[0].items[0].quantity, 2);

        // Verify stock was deducted
        let products = db.get_products().unwrap();
        let updated_stock = products.iter().find(|p| p.id == "prod-001").unwrap().stock;
        assert_eq!(updated_stock, initial_stock - 2);
    }

    #[test]
    fn test_order_refund() {
        let (db, _temp) = create_test_db();

        // Create product
        let product = Product {
            id: "prod-002".to_string(),
            name: "Test Burger".to_string(),
            price: 200.0,
            category: "Food".to_string(),
            stock: 20,
            barcode: "111222333".to_string(),
            tax: 12.0,
            created_at: None,
        };
        db.upsert_product(&product).unwrap();

        // Get initial stock
        let initial_stock = db
            .get_products()
            .unwrap()
            .iter()
            .find(|p| p.id == "prod-002")
            .unwrap()
            .stock;

        // Create and save order
        let order = Order {
            id: "order-002".to_string(),
            items: vec![OrderItem {
                product_id: "prod-002".to_string(),
                product_name: "Test Burger".to_string(),
                price: 200.0,
                quantity: 1,
                discount: 0.0,
                tax: 12.0,
            }],
            subtotal: 200.0,
            tax_amount: 24.0,
            discount_amount: 0.0,
            total: 224.0,
            payment_method: "card".to_string(),
            amount_paid: 224.0,
            change_amount: 0.0,
            customer_name: "Jane Smith".to_string(),
            status: "completed".to_string(),
            order_type: "takeaway".to_string(),
            delivery_status: "delivered".to_string(),
            delivery_address: "".to_string(),
            delivery_phone: "".to_string(),
            created_at: "2024-01-02T12:00:00Z".to_string(),
            synced: Some(false),
        };

        db.save_order(&order).unwrap();

        // Verify stock after order
        let products = db.get_products().unwrap();
        let stock_after_order = products.iter().find(|p| p.id == "prod-002").unwrap().stock;
        assert_eq!(stock_after_order, initial_stock - 1);

        // Refund order
        db.refund_order("order-002", "admin", "Administrator")
            .unwrap();

        // Verify stock restored
        let products = db.get_products().unwrap();
        let stock_after_refund = products.iter().find(|p| p.id == "prod-002").unwrap().stock;
        assert_eq!(stock_after_refund, initial_stock);

        // Verify order status
        let orders = db.get_orders().unwrap();
        let refunded_order = orders.iter().find(|o| o.id == "order-002").unwrap();
        assert_eq!(refunded_order.status, "refunded");
    }

    #[test]
    fn test_settings_crud() {
        let (db, _temp) = create_test_db();

        // Get default settings
        let settings = db.get_settings().unwrap();
        assert_eq!(settings.store_name, "My POS Store");
        assert_eq!(settings.currency, "USD");
        assert_eq!(settings.tax_rate, 10.0);

        // Save new settings
        let new_settings = Settings {
            store_name: "Test Cafe".to_string(),
            currency: "$".to_string(),
            currency_symbol: "$".to_string(),
            country: "US".to_string(),
            timezone: "America/New_York".to_string(),
            tax_rate: 10.0,
            tax_name: "Sales Tax".to_string(),
            tax_system: "sales".to_string(),
            address: "123 Test St".to_string(),
            phone: "+1234567890".to_string(),
            neon_url: "".to_string(),
            business_name: "Test Business".to_string(),
            tax_id: "".to_string(),
            receipt_save_path: "".to_string(),
            twilio_sid: "".to_string(),
            twilio_token: "".to_string(),
            twilio_phone: "".to_string(),
            lan_sync_enabled: false,
            lan_server_port: 8765,
            dark_mode: true,
            language: "en".to_string(),
            whatsapp_enabled: false,
            whatsapp_api_url: "".to_string(),
            offline_mode: false,
            logo_url: "".to_string(),
            primary_color: "#F5C842".to_string(),
            secondary_color: "#1E1E26".to_string(),
            accent_color: "#2ECC71".to_string(),
            footer_text: "Powered by POS Billing".to_string(),
            contact_email: "".to_string(),
            contact_website: "".to_string(),
        };

        db.save_settings(&new_settings).unwrap();

        // Verify settings saved
        let settings = db.get_settings().unwrap();
        assert_eq!(settings.store_name, "Test Cafe");
        assert_eq!(settings.currency, "$");
        assert_eq!(settings.tax_rate, 10.0);
    }

    #[test]
    fn test_users_crud() {
        let (db, _temp) = create_test_db();

        // Verify default users exist
        let users = db.get_users().unwrap();
        assert!(users.len() >= 2);

        // Find admin user
        let admin = users.iter().find(|u| u.role == "admin");
        assert!(admin.is_some());
        assert_eq!(admin.unwrap().name, "Administrator");

        // Verify PIN
        let verified = db.verify_pin("1234").unwrap();
        assert!(verified.is_some());
        assert_eq!(verified.unwrap().role, "admin");

        // Verify cashier PIN
        let cashier = db.verify_pin("0000").unwrap();
        assert!(cashier.is_some());
        assert_eq!(cashier.unwrap().role, "cashier");

        // Verify invalid PIN
        let invalid = db.verify_pin("9999").unwrap();
        assert!(invalid.is_none());
    }

    #[test]
    fn test_analytics() {
        let (db, _temp) = create_test_db();

        // Create products
        let product1 = Product {
            id: "p1".to_string(),
            name: "Coffee".to_string(),
            price: 100.0,
            category: "Beverages".to_string(),
            stock: 100,
            barcode: "001".to_string(),
            tax: 10.0,
            created_at: None,
        };
        let product2 = Product {
            id: "p2".to_string(),
            name: "Tea".to_string(),
            price: 50.0,
            category: "Beverages".to_string(),
            stock: 100,
            barcode: "002".to_string(),
            tax: 10.0,
            created_at: None,
        };
        db.upsert_product(&product1).unwrap();
        db.upsert_product(&product2).unwrap();

        // Get initial order count
        let initial_order_count = db.get_orders().unwrap().len();

        // Create orders with current timestamp
        let order1 = Order {
            id: "o1".to_string(),
            items: vec![OrderItem {
                product_id: "p1".to_string(),
                product_name: "Coffee".to_string(),
                price: 100.0,
                quantity: 2,
                discount: 0.0,
                tax: 10.0,
            }],
            subtotal: 200.0,
            tax_amount: 20.0,
            discount_amount: 0.0,
            total: 220.0,
            payment_method: "cash".to_string(),
            amount_paid: 220.0,
            change_amount: 0.0,
            customer_name: "".to_string(),
            status: "completed".to_string(),
            order_type: "dine_in".to_string(),
            delivery_status: "delivered".to_string(),
            delivery_address: "".to_string(),
            delivery_phone: "".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            synced: Some(false),
        };

        let order2 = Order {
            id: "o2".to_string(),
            items: vec![OrderItem {
                product_id: "p2".to_string(),
                product_name: "Tea".to_string(),
                price: 50.0,
                quantity: 3,
                discount: 0.0,
                tax: 10.0,
            }],
            subtotal: 150.0,
            tax_amount: 15.0,
            discount_amount: 0.0,
            total: 165.0,
            payment_method: "upi".to_string(),
            amount_paid: 165.0,
            change_amount: 0.0,
            customer_name: "".to_string(),
            status: "completed".to_string(),
            order_type: "takeaway".to_string(),
            delivery_status: "delivered".to_string(),
            delivery_address: "".to_string(),
            delivery_phone: "".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            synced: Some(false),
        };

        db.save_order(&order1).unwrap();
        db.save_order(&order2).unwrap();

        // Test daily summary
        let summary = db.get_daily_summary().unwrap();
        let expected_count = initial_order_count + 2;
        assert_eq!(summary.transactions, expected_count as i64);
        assert!(summary.revenue > 0.0);

        // Test weekly revenue
        let weekly = db.get_weekly_revenue().unwrap();
        assert!(!weekly.is_empty());

        // Test top products
        let top = db.get_top_products().unwrap();
        assert!(!top.is_empty());
    }

    #[test]
    fn test_low_stock_alert() {
        let (db, _temp) = create_test_db();

        // Create products with different stock levels
        let low_stock = Product {
            id: "low-1".to_string(),
            name: "Low Stock Item".to_string(),
            price: 100.0,
            category: "Test".to_string(),
            stock: 5,
            barcode: "low1".to_string(),
            tax: 10.0,
            created_at: None,
        };
        let out_of_stock = Product {
            id: "out-1".to_string(),
            name: "Out of Stock Item".to_string(),
            price: 200.0,
            category: "Test".to_string(),
            stock: 0,
            barcode: "out1".to_string(),
            tax: 10.0,
            created_at: None,
        };
        let normal = Product {
            id: "normal-1".to_string(),
            name: "Normal Item".to_string(),
            price: 50.0,
            category: "Test".to_string(),
            stock: 50,
            barcode: "normal1".to_string(),
            tax: 10.0,
            created_at: None,
        };

        db.upsert_product(&low_stock).unwrap();
        db.upsert_product(&out_of_stock).unwrap();
        db.upsert_product(&normal).unwrap();

        // Get low stock items
        let low_stock_items = db.get_low_stock().unwrap();

        let names: Vec<&str> = low_stock_items.iter().map(|i| i.name.as_str()).collect();
        assert!(names.contains(&"Low Stock Item"));
        assert!(names.contains(&"Out of Stock Item"));
    }

    #[test]
    fn test_csv_export_import() {
        let (db, _temp) = create_test_db();

        // Get initial count
        let initial_count = db.get_products().unwrap().len();

        // Create products
        let product1 = Product {
            id: "csv-1".to_string(),
            name: "CSV Product 1".to_string(),
            price: 100.0,
            category: "Test".to_string(),
            stock: 10,
            barcode: "csv1".to_string(),
            tax: 10.0,
            created_at: None,
        };
        let product2 = Product {
            id: "csv-2".to_string(),
            name: "CSV Product 2".to_string(),
            price: 200.0,
            category: "Test".to_string(),
            stock: 20,
            barcode: "csv2".to_string(),
            tax: 5.0,
            created_at: None,
        };

        db.upsert_product(&product1).unwrap();
        db.upsert_product(&product2).unwrap();

        // Export products CSV
        let csv = db.export_products_csv().unwrap();
        assert!(csv.contains("csv-1"));
        assert!(csv.contains("csv-2"));
        assert!(csv.contains("CSV Product 1"));
        assert!(csv.contains("CSV Product 2"));

        // Delete products
        db.delete_product("csv-1").unwrap();
        db.delete_product("csv-2").unwrap();
        let products = db.get_products().unwrap();
        assert_eq!(products.len(), initial_count);

        // Import products from CSV
        let (imported, errors) = db.import_products_csv(&csv).unwrap();
        assert_eq!(imported, 2);
        assert_eq!(errors, 0);

        // Verify imported
        let products = db.get_products().unwrap();
        assert_eq!(products.len(), initial_count + 2);
    }

    #[test]
    fn test_delivery_orders() {
        let (db, _temp) = create_test_db();

        // Create product
        let product = Product {
            id: "del-prod".to_string(),
            name: "Delivery Item".to_string(),
            price: 300.0,
            category: "Food".to_string(),
            stock: 10,
            barcode: "del001".to_string(),
            tax: 12.0,
            created_at: None,
        };
        db.upsert_product(&product).unwrap();

        // Create delivery order
        let order = Order {
            id: "del-order-001".to_string(),
            items: vec![OrderItem {
                product_id: "del-prod".to_string(),
                product_name: "Delivery Item".to_string(),
                price: 300.0,
                quantity: 1,
                discount: 0.0,
                tax: 12.0,
            }],
            subtotal: 300.0,
            tax_amount: 36.0,
            discount_amount: 0.0,
            total: 336.0,
            payment_method: "upi".to_string(),
            amount_paid: 336.0,
            change_amount: 0.0,
            customer_name: "Delivery Customer".to_string(),
            status: "completed".to_string(),
            order_type: "delivery".to_string(),
            delivery_status: "pending".to_string(),
            delivery_address: "123 Delivery Street, City".to_string(),
            delivery_phone: "+9876543210".to_string(),
            created_at: "2024-01-15T14:00:00Z".to_string(),
            synced: Some(false),
        };

        db.save_order(&order).unwrap();

        // Verify order details
        let orders = db.get_orders().unwrap();
        assert_eq!(orders.len(), 1);
        assert_eq!(orders[0].order_type, "delivery");
        assert_eq!(orders[0].delivery_status, "pending");
        assert_eq!(orders[0].delivery_address, "123 Delivery Street, City");
        assert_eq!(orders[0].delivery_phone, "+9876543210");

        // Update delivery status
        db.update_delivery_status("del-order-001", "out_for_delivery")
            .unwrap();

        let orders = db.get_orders().unwrap();
        assert_eq!(orders[0].delivery_status, "out_for_delivery");

        // Mark as delivered
        db.update_delivery_status("del-order-001", "delivered")
            .unwrap();

        let orders = db.get_orders().unwrap();
        assert_eq!(orders[0].delivery_status, "delivered");
    }

    #[test]
    fn test_backup_export() {
        let (db, _temp) = create_test_db();

        // Create some data
        let product = Product {
            id: "backup-prod".to_string(),
            name: "Backup Product".to_string(),
            price: 500.0,
            category: "Test".to_string(),
            stock: 100,
            barcode: "backup001".to_string(),
            tax: 18.0,
            created_at: None,
        };
        db.upsert_product(&product).unwrap();

        let settings = Settings {
            store_name: "Backup Store".to_string(),
            currency: "€".to_string(),
            currency_symbol: "€".to_string(),
            country: "DE".to_string(),
            timezone: "Europe/Berlin".to_string(),
            tax_rate: 20.0,
            tax_name: "VAT".to_string(),
            tax_system: "vat".to_string(),
            address: "Backup Address".to_string(),
            phone: "+1111111111".to_string(),
            neon_url: "".to_string(),
            business_name: "".to_string(),
            tax_id: "".to_string(),
            receipt_save_path: "".to_string(),
            twilio_sid: "".to_string(),
            twilio_token: "".to_string(),
            twilio_phone: "".to_string(),
            lan_sync_enabled: false,
            lan_server_port: 8765,
            dark_mode: true,
            language: "en".to_string(),
            whatsapp_enabled: false,
            whatsapp_api_url: "".to_string(),
            offline_mode: false,
            logo_url: "".to_string(),
            primary_color: "#F5C842".to_string(),
            secondary_color: "#1E1E26".to_string(),
            accent_color: "#2ECC71".to_string(),
            footer_text: "Powered by POS Billing".to_string(),
            contact_email: "".to_string(),
            contact_website: "".to_string(),
        };
        db.save_settings(&settings).unwrap();

        // Export backup
        let backup = db.export_backup().unwrap();

        // Verify backup contains data
        assert!(backup.contains("backup-prod"));
        assert!(backup.contains("Backup Product"));
        assert!(backup.contains("Backup Store"));
        assert!(backup.contains("\"products\""));
        assert!(backup.contains("\"settings\""));
    }
}
