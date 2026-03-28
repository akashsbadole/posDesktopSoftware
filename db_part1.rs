// src-tauri/src/db.rs
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::Rng;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
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
    pub category: String,
    pub stock: i64,
    pub barcode: String,
    pub tax: f64,
    pub image_url: Option<String>,
    pub created_at: Option<String>,
    pub metadata: Option<serde_json::Value>,
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
    pub created_at: String,
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
