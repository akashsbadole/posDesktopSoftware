// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod neon;
mod lan_sync;
mod license;

use db::Database;
use once_cell::sync::OnceCell;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

static DB: OnceCell<Mutex<Database>> = OnceCell::new();
static RATE_LIMITER: OnceCell<Mutex<HashMap<String, Vec<Instant>>>> = OnceCell::new();

fn get_db() -> &'static Mutex<Database> {
    DB.get().expect("DB not initialized")
}

fn check_rate_limit(key: &str, max_requests: usize, window: Duration) -> Result<(), String> {
    let limiter = RATE_LIMITER.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = limiter.lock().map_err(|e| e.to_string())?;
    let now = Instant::now();
    
    let requests = guard.entry(key.to_string()).or_insert_with(Vec::new);
    requests.retain(|&time| now.duration_since(time) < window);
    
    if requests.len() >= max_requests {
        return Err("Too many failed attempts. Please wait a moment before trying again.".to_string());
    }
    
    requests.push(now);
    Ok(())
}

fn safe_execute<F, T>(name: &str, f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + std::panic::UnwindSafe,
{
    std::panic::catch_unwind(|| f())
        .map_err(|_| format!("{} operation panicked", name))
        .and_then(|result| result)
}

// ─── Product Commands ────────────────────────────────────────────────────────

#[tauri::command]
fn get_products() -> Result<Vec<db::Product>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_products().map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_product(product: db::Product) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.upsert_product(&product).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_product(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_product(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_stock(id: String, delta: i64) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_stock(&id, delta).map_err(|e| e.to_string())
}

// ─── Order Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_orders() -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_orders().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_orders_paginated(page: i64, limit: i64) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let offset = (page - 1) * limit;
    db.get_orders_paginated(offset, limit).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_orders_count() -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_orders_count().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_order(order: db::Order) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_order(&order).map_err(|e| e.to_string())
}

#[tauri::command]
fn refund_order(id: String, user_id: String, user_name: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.refund_order(&id, &user_id, &user_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_delivery_status(id: String, status: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_delivery_status(&id, &status).map_err(|e| e.to_string())
}

// ─── Settings Commands ────────────────────────────────────────────────────────

#[tauri::command]
fn get_settings() -> Result<db::Settings, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_settings(settings: db::Settings) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_settings(&settings).map_err(|e| e.to_string())
}

// ─── Analytics Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn get_daily_summary() -> Result<db::DailySummary, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_daily_summary().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_weekly_revenue() -> Result<Vec<db::DayRevenue>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_weekly_revenue().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_top_products() -> Result<Vec<db::TopProduct>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_top_products().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_low_stock() -> Result<Vec<db::LowStockItem>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_low_stock().map_err(|e| e.to_string())
}

// ─── CSV Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn export_products_csv() -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_products_csv().map_err(|e| e.to_string())
}

#[tauri::command]
fn export_orders_csv() -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_orders_csv().map_err(|e| e.to_string())
}

#[tauri::command]
fn import_products_csv(csv_data: String) -> Result<(i64, i64), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.import_products_csv(&csv_data).map_err(|e| e.to_string())
}

// ─── Reports Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn get_sales_report(start_date: String, end_date: String) -> Result<db::SalesReport, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_sales_report(&start_date, &end_date).map_err(|e| e.to_string())
}

// ─── User Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn verify_pin(pin: String) -> Result<Option<db::User>, String> {
    check_rate_limit("verify_pin", 5, Duration::from_secs(60))?;
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.verify_pin(&pin).map_err(|e| e.to_string())
}

#[tauri::command]
fn change_pin(user_id: String, new_pin: String) -> Result<(), String> {
    validate_pin_strength(&new_pin)?;
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.change_pin(&user_id, &new_pin).map_err(|e| e.to_string())
}

fn validate_pin_strength(pin: &str) -> Result<(), String> {
    if pin.len() < 4 {
        return Err("PIN must be at least 4 digits".to_string());
    }
    if pin.len() > 8 {
        return Err("PIN must be at most 8 digits".to_string());
    }
    if !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("PIN must contain only digits".to_string());
    }
    let repeating = pin.chars().all(|c| c == pin.chars().next().unwrap_or('0'));
    if repeating {
        return Err("PIN cannot be all the same digit".to_string());
    }
    let is_sequence = pin.chars().zip(pin.chars().skip(1)).all(|(a, b)| {
        let diff = b.to_digit(10).unwrap_or(0) as i32 - a.to_digit(10).unwrap_or(0) as i32;
        diff.abs() == 1
    });
    if is_sequence && pin.len() >= 4 {
        return Err("PIN cannot be a sequence of numbers".to_string());
    }
    Ok(())
}

#[tauri::command]
fn get_users() -> Result<Vec<db::User>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_users().map_err(|e| e.to_string())
}

#[tauri::command]
fn reset_admin_pin(master_password: String) -> Result<(), String> {
    if master_password != "pos_master_key_2024" {
        return Err("Invalid master password".to_string());
    }
    
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.change_pin("admin", "1234").map_err(|e| e.to_string())
}

#[tauri::command]
fn export_backup() -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_backup().map_err(|e| e.to_string())
}

#[tauri::command]
fn import_backup(backup_json: String, mode: String) -> Result<db::FullImportResult, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.import_backup(&backup_json, &mode).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_backup_metadata(backup_json: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_backup_metadata(&backup_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_table_counts() -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_table_counts().map_err(|e| e.to_string())
}

// ─── Quick Sale Commands ─────────────────────────────────────────────────────

#[tauri::command]
fn get_quick_sale_presets() -> Result<Vec<db::QuickSalePreset>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_quick_sale_presets().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_quick_sale_preset(preset: db::QuickSalePreset) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_quick_sale_preset(&preset).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_quick_sale_preset(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_quick_sale_preset(&id).map_err(|e| e.to_string())
}

// ─── Cash Drawer Commands ───────────────────────────────────────────────────

#[tauri::command]
fn open_cash_drawer_session(date: String, balance: f64, user_name: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.open_cash_drawer(&date, balance, &user_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn close_cash_drawer_session(date: String, actual_balance: f64, notes: String, user_name: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.close_cash_drawer(&date, actual_balance, &notes, &user_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_cash_drawer_session(date: String) -> Result<Option<db::CashDrawerSession>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_cash_drawer_session(&date).map_err(|e| e.to_string())
}

// ─── Receipt Template Commands ──────────────────────────────────────────────

#[tauri::command]
fn get_receipt_templates() -> Result<Vec<db::ReceiptTemplate>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_receipt_templates().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_receipt_template(tpl: db::ReceiptTemplate) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_receipt_template(&tpl).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_receipt_template(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_receipt_template(&id).map_err(|e| e.to_string())
}

// ─── Bulk Operations ───────────────────────────────────────────────────────

#[tauri::command]
fn bulk_update_stock(updates: String) -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.bulk_update_stock(&updates).map_err(|e| e.to_string())
}

#[tauri::command]
fn bulk_update_price(updates: String) -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.bulk_update_price(&updates).map_err(|e| e.to_string())
}

#[tauri::command]
fn bulk_update_tax(category: String, new_tax: f64) -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.bulk_update_tax(&category, new_tax).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_activity_logs(limit: i64) -> Result<Vec<db::ActivityLog>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_activity_logs(limit).map_err(|e| e.to_string())
}

// ─── Table Commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_tables() -> Result<Vec<db::Table>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_tables().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_table(table: db::Table) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_table(&table).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_table(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_table(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_table_status(id: String, status: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_table_status(&id, &status).map_err(|e| e.to_string())
}

// ─── Staff Attendance Commands ─────────────────────────────────────────────────

#[tauri::command]
fn clock_in(user_id: String, user_name: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clock_in(&user_id, &user_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn clock_out(user_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clock_out(&user_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_today_attendance() -> Result<Vec<db::StaffAttendance>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_today_attendance().map_err(|e| e.to_string())
}

#[tauri::command]
fn is_clocked_in(user_id: String) -> Result<bool, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.is_clocked_in(&user_id).map_err(|e| e.to_string())
}

// ─── Customer Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_customers() -> Result<Vec<db::Customer>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customers().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_customer(customer: db::Customer) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_customer(&customer).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_by_phone(phone: String) -> Result<Option<db::Customer>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_by_phone(&phone).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_loyalty_points(customer_id: String, points: i32, spent: f64) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_loyalty_points(&customer_id, points, spent).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_orders(phone: String) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_orders(&phone).map_err(|e| e.to_string())
}

// ─── Order Notes Commands ─────────────────────────────────────────────────────

#[tauri::command]
fn add_order_note(order_id: String, note: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_order_note(&order_id, &note).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_order_notes(order_id: String) -> Result<Vec<db::OrderNote>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_order_notes(&order_id).map_err(|e| e.to_string())
}

// ─── Inventory Alert Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_inventory_alerts() -> Result<Vec<db::InventoryAlert>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_inventory_alerts().map_err(|e| e.to_string())
}

#[tauri::command]
fn check_inventory_alerts() -> Result<Vec<db::InventoryAlert>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.check_inventory_alerts().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_inventory_alert(alert: db::InventoryAlert) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_inventory_alert(&alert).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_inventory_alert(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clear_inventory_alert(&id).map_err(|e| e.to_string())
}

// ─── Enhanced Reports Commands ────────────────────────────────────────────────

#[tauri::command]
fn get_hourly_sales(date: String) -> Result<Vec<db::HourlySales>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_hourly_sales(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_staff_performance(start_date: String, end_date: String) -> Result<Vec<db::StaffPerformance>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_staff_performance(&start_date, &end_date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sales_by_item(start_date: String, end_date: String) -> Result<Vec<db::SalesByItem>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_sales_by_item(&start_date, &end_date).map_err(|e| e.to_string())
}

// ─── Hold & Cancel Commands ───────────────────────────────────────────────────

#[tauri::command]
fn hold_order(order: db::Order) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.hold_order(&order).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_held_orders() -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_held_orders().map_err(|e| e.to_string())
}

#[tauri::command]
fn cancel_order(id: String, reason: String, user_id: String, user_name: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.cancel_order(&id, &reason, &user_id, &user_name).map_err(|e| e.to_string())
}

// ─── Refund Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn create_refund_request(order_id: String, amount: f64, reason: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_refund_request(&order_id, amount, &reason).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_refund_requests() -> Result<Vec<db::RefundRequest>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_refund_requests().map_err(|e| e.to_string())
}

#[tauri::command]
fn approve_refund(id: String, user_id: String, user_name: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.approve_refund(&id, &user_id, &user_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn reject_refund(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.reject_refund(&id).map_err(|e| e.to_string())
}

// ─── Crash Recovery Commands ────────────────────────────────────────────────

#[tauri::command]
fn get_pending_orders_count() -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_pending_orders_count().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_pending_orders() -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_pending_orders().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_pending_order(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_pending_order(&id).map_err(|e| e.to_string())
}

// ─── Receipt Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn save_receipt_to_file(receipt: String, file_name: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let settings = db.get_settings().map_err(|e| e.to_string())?;
    
    let app_dir = if settings.receipt_save_path.is_empty() {
        dirs::document_dir().unwrap_or_else(|| std::path::PathBuf::from("."))
    } else {
        std::path::PathBuf::from(&settings.receipt_save_path)
    };
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    let file_path = app_dir.join(&file_name);
    std::fs::write(&file_path, &receipt).map_err(|e| e.to_string())?;
    
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_receipt_share_text(receipt: String) -> String {
    let encoded = urlencoding::encode(&receipt);
    format!("https://wa.me/?text={}", encoded)
}

#[tauri::command]
fn open_whatsapp_share(receipt: String) -> Result<(), String> {
    let encoded = urlencoding::encode(&receipt);
    let url = format!("https://wa.me/?text={}", encoded);
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_email_share(receipt: String, subject: String) -> Result<(), String> {
    let encoded = urlencoding::encode(&receipt);
    let url = format!("mailto:?subject={}&body={}", urlencoding::encode(&subject), encoded);
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
async fn send_email(to: String, subject: String, body: String) -> Result<(), String> {
    let smtp_settings = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        
        if !settings.smtp_enabled {
            return Err("SMTP is not enabled. Configure SMTP in Settings.".to_string());
        }
        if settings.smtp_host.is_empty() || settings.smtp_username.is_empty() || settings.smtp_password.is_empty() {
            return Err("SMTP is not configured. Please configure SMTP settings.".to_string());
        }
        settings
    };
    
    use lettre::{Message, SmtpTransport, Transport};
    
    let email = Message::builder()
        .from(format!("{} <{}>", smtp_settings.smtp_from_name, smtp_settings.smtp_from_email).parse().map_err(|e: lettre::address::AddressError| e.to_string())?)
        .to(to.parse().map_err(|e: lettre::address::AddressError| e.to_string())?)
        .subject(&subject)
        .body(body)
        .map_err(|e| e.to_string())?;
    
    let mailer = SmtpTransport::relay(&smtp_settings.smtp_host)
        .map_err(|e| format!("Failed to connect to SMTP server: {}", e))?
        .port(smtp_settings.smtp_port as u16)
        .credentials(lettre::transport::smtp::authentication::Credentials::new(
            smtp_settings.smtp_username.clone(),
            smtp_settings.smtp_password.clone(),
        ))
        .build();
    
    mailer.send(&email).map_err(|e| format!("Failed to send email: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn print_receipt(receipt: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("receipt_print.txt");
    std::fs::write(&file_path, &receipt).map_err(|e| e.to_string())?;
    open::that(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn print_to_printer(receipt: String, printer_name: Option<String>) -> Result<(), String> {
    // If no specific printer, open default print dialog
    if printer_name.is_none() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join("receipt_print.txt");
        std::fs::write(&file_path, &receipt).map_err(|e| e.to_string())?;
        open::that(&file_path).map_err(|e| e.to_string())?;
        return Ok(());
    }
    
    // For specific printer, we would need platform-specific code
    // For now, save to temp file as fallback
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("receipt_print.txt");
    std::fs::write(&file_path, &receipt).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn open_cash_drawer() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _drawer_code: [u8; 4] = [0x1B, 0x70, 0x00, 0x19];
        eprintln!("[POS] Cash drawer open command sent");
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        eprintln!("[POS] Cash drawer not supported on this platform");
    }
    
    Ok(())
}

#[tauri::command]
fn check_printer_status(printer_name: Option<String>) -> Result<String, String> {
    if printer_name.is_none() {
        return Ok("default".to_string());
    }
    
    let name = printer_name.unwrap();
    
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("powershell")
            .args([
                "-Command",
                &format!(
                    "Get-Printer | Where-Object {{ $_.Name -eq '{}' }} | Select-Object -ExpandProperty Status",
                    name.replace("'", "''")
                ),
            ])
            .output()
            .map_err(|e| format!("Failed to check printer status: {}", e))?;
        
        let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
        
        if status.is_empty() {
            return Err(format!("Printer '{}' not found", name));
        }
        
        if status == "Ready" {
            Ok("ready".to_string())
        } else {
            Ok(format!("error:{}", status.to_lowercase()))
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let output = std::process::Command::new("lpstat")
            .args(["-p", &name])
            .output()
            .map_err(|e| format!("Failed to check printer status: {}", e))?;
        
        if output.status.success() {
            Ok("ready".to_string())
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Err(format!("Printer error: {}", stderr))
        }
    }
}

// ─── KDS Commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn open_kds_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::WindowBuilder;
    
    let existing = app.get_window("kds");
    if existing.is_some() {
        return Ok(());
    }
    
    WindowBuilder::new(
        &app,
        "kds",
        tauri::WindowUrl::App("kds".into()),
    )
    .title("Kitchen Display System")
    .inner_size(1024.0, 768.0)
    .resizable(true)
    .build()
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn get_kds_orders() -> Result<Vec<db::KdsOrder>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_kds_orders().map_err(|e| e.to_string())
}

#[tauri::command]
fn mark_kds_item_done(order_id: String, item_index: usize) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.mark_kds_item_done(&order_id, item_index).map_err(|e| e.to_string())
}

// ─── Ingredient & Recipe Commands ───────────────────────────────────────────

#[tauri::command]
fn get_ingredients() -> Result<Vec<db::Ingredient>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_ingredients().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_ingredient(ingredient: db::Ingredient) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_ingredient(&ingredient).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_ingredient(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_ingredient(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recipes() -> Result<Vec<db::Recipe>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_recipes().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_recipe(recipe: db::Recipe) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_recipe(&recipe).map_err(|e| e.to_string())
}

// ─── Supplier & PO Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_suppliers() -> Result<Vec<db::Supplier>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_suppliers().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_supplier(supplier: db::Supplier) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_supplier(&supplier).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_supplier(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_supplier(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_purchase_orders() -> Result<Vec<db::PurchaseOrder>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_purchase_orders().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_purchase_order(po: db::PurchaseOrder) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_purchase_order(&po).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_po_status(id: String, status: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_po_status(&id, &status).map_err(|e| e.to_string())
}

#[tauri::command]
fn receive_purchase_order(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.receive_purchase_order(&id).map_err(|e| e.to_string())
}

// ─── Reservation Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_reservations(date: String) -> Result<Vec<db::Reservation>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_reservations(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_reservation(reservation: db::Reservation) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_reservation(&reservation).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_reservation(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_reservation(&id).map_err(|e| e.to_string())
}

// ─── SMS Notification Commands ─────────────────────────────────────────────

#[tauri::command]
async fn send_sms_notification(phone: String, message: String) -> Result<(), String> {
    let (twilio_sid, twilio_token, twilio_phone) = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        
        if settings.twilio_sid.is_empty() || settings.twilio_token.is_empty() || settings.twilio_phone.is_empty() {
            return Err("Twilio not configured. Set credentials in Settings.".to_string());
        }
        
        (settings.twilio_sid.clone(), settings.twilio_token.clone(), settings.twilio_phone.clone())
    };
    
    let url = format!("https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json", twilio_sid);
    
    let client = reqwest::Client::new();
    let auth = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, format!("{}:{}", twilio_sid, twilio_token));
    
    let params = [
        ("To", phone),
        ("From", twilio_phone),
        ("Body", message),
    ];
    
    client.post(&url)
        .header("Authorization", format!("Basic {}", auth))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("SMS send failed: {}", e))?;
    
    Ok(())
}

// ─── LAN Sync Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn start_lan_server(port: Option<u16>) -> Result<String, String> {
    let port = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        port.unwrap_or(settings.lan_server_port as u16)
    };

    lan_sync::start_lan_server(port).await?;
    Ok(format!("LAN server started on port {}", port))
}

#[tauri::command]
fn stop_lan_server() -> Result<String, String> {
    lan_sync::stop_lan_server()?;
    Ok("LAN server stopped".to_string())
}

#[tauri::command]
fn get_lan_server_status() -> lan_sync::LanServerStatus {
    lan_sync::LanServerStatus {
        running: lan_sync::is_server_running(),
        port: 0,
        connected_clients: 0,
    }
}

// ─── Shift Management Commands ───────────────────────────────────────────────

#[tauri::command]
fn get_shifts(date: String) -> Result<Vec<db::Shift>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_shifts(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_shift(shift: db::Shift) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_shift(&shift).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_shift(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_shift(&id).map_err(|e| e.to_string())
}

// ─── Expense Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_expenses(date: String) -> Result<Vec<db::Expense>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expenses(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expenses_by_range(start_date: String, end_date: String) -> Result<Vec<db::Expense>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expenses_by_range(&start_date, &end_date).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_expense(expense: db::Expense) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_expense(&expense).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_expense(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_expense(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expense_categories() -> Result<Vec<db::ExpenseCategory>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expense_categories().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_expense_category(category: db::ExpenseCategory) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_expense_category(&category).map_err(|e| e.to_string())
}

// ─── Wallet Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_customer_wallet(customer_id: String) -> Result<db::CustomerWallet, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_wallet(&customer_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_wallet_balance(customer_id: String, amount: f64, notes: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_wallet_balance(&customer_id, amount, &notes).map_err(|e| e.to_string())
}

#[tauri::command]
fn deduct_wallet_balance(customer_id: String, amount: f64, order_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.deduct_wallet_balance(&customer_id, amount, &order_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_wallet_transactions(customer_id: String) -> Result<Vec<db::WalletTransaction>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_wallet_transactions(&customer_id).map_err(|e| e.to_string())
}

// ─── Coupon Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_coupons() -> Result<Vec<db::Coupon>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_coupons().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_coupon(coupon: db::Coupon) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_coupon(&coupon).map_err(|e| e.to_string())
}

#[tauri::command]
fn validate_coupon(code: String, order_amount: f64) -> Result<db::Coupon, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.validate_coupon(&code, order_amount).map_err(|e| e.to_string())
}

#[tauri::command]
fn use_coupon(code: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.use_coupon(&code).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_coupon(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_coupon(&id).map_err(|e| e.to_string())
}

// ─── Day End Reconciliation Commands ────────────────────────────────────────

#[tauri::command]
fn get_day_end_reconciliation(date: String) -> Result<Option<db::DayEndReconciliation>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_day_end_reconciliation(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_day_end_reconciliation(reconciliation: db::DayEndReconciliation) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_day_end_reconciliation(&reconciliation).map_err(|e| e.to_string())
}

// ─── GST Report Commands ───────────────────────────────────────────────────

#[tauri::command]
fn get_gstr1_report(start_date: String, end_date: String) -> Result<Vec<db::GstReport>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_gstr1_report(&start_date, &end_date).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_gstr3b_report(start_date: String, end_date: String) -> Result<(f64, f64, f64, f64, f64, f64), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_gstr3b_report(&start_date, &end_date).map_err(|e| e.to_string())
}

// ─── Activity Log Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_activity_logs_range(start_date: String, end_date: String, limit: i32) -> Result<Vec<db::ActivityLogEntry>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_activity_logs_range(&start_date, &end_date, limit).map_err(|e| e.to_string())
}

// ─── Export Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn export_to_tally(start_date: String, end_date: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_to_tally(&start_date, &end_date).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_to_quickbooks(start_date: String, end_date: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_to_quickbooks(&start_date, &end_date).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_compressed_backup() -> Result<Vec<u8>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_compressed_backup().map_err(|e| e.to_string())
}

// ─── WhatsApp Commands ─────────────────────────────────────────────────────

#[tauri::command]
async fn send_whatsapp_message(phone: String, message: String) -> Result<(), String> {
    let whatsapp_api_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        
        if !settings.whatsapp_enabled || settings.whatsapp_api_url.is_empty() {
            return Err("WhatsApp not configured. Set API URL in Settings.".to_string());
        }
        
        settings.whatsapp_api_url.clone()
    };
    
    let url = format!("{}/send", whatsapp_api_url);
    
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "phone": phone,
        "message": message
    });
    
    client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("WhatsApp send failed: {}", e))?;
    
    Ok(())
}

// ─── License Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn validate_license(key: String) -> license::LicenseValidationResult {
    license::validate_license_key(&key)
}

#[tauri::command]
fn generate_license(tier: String, year: u32, month: u32, day: u32) -> Result<String, String> {
    if tier != "pro" && tier != "business" {
        return Err("Tier must be 'pro' or 'business'".to_string());
    }
    if year < 2024 || year > 2099 {
        return Err("Year must be between 2024 and 2099".to_string());
    }
    if month < 1 || month > 12 {
        return Err("Month must be between 1 and 12".to_string());
    }
    if day < 1 || day > 31 {
        return Err("Day must be between 1 and 31".to_string());
    }
    Ok(license::generate_license_key(&tier, year, month, day))
}

// ─── Neon Sync Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn sync_to_neon() -> Result<neon::SyncResult, String> {
    let neon_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        settings.neon_url
    };

    if neon_url.is_empty() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some("No Neon database URL configured. Set it in Settings.".to_string()),
            orders: None,
        });
    }

    let orders = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        db.get_unsynced_orders().map_err(|e| e.to_string())?
    };

    let result = neon::sync_orders_to_neon(&neon_url, &orders).await;

    if result.synced > 0 {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        db.mark_orders_synced().map_err(|e| e.to_string())?;
    }

    Ok(result)
}

#[tauri::command]
async fn sync_from_neon() -> Result<neon::SyncResult, String> {
    let neon_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings().map_err(|e| e.to_string())?;
        settings.neon_url
    };

    if neon_url.is_empty() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some("No Neon database URL configured. Set it in Settings.".to_string()),
            orders: None,
        });
    }

    let result = neon::sync_from_neon(&neon_url).await;

    if let Some(orders) = &result.orders {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        for order in orders {
            let _ = db.save_order(order);
        }
    }

    Ok(neon::SyncResult {
        synced: result.synced,
        error: result.error,
        orders: result.orders,
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            let app_dir = dirs::data_dir()
                .map(|p| p.join("pos-tauri"))
                .expect("Failed to get app data dir");
            
            // Ensure directory exists
            std::fs::create_dir_all(&app_dir).expect("Failed to create app dir");
            
            // Log the database path for debugging
            let db_path = app_dir.join("pos.db");
            eprintln!("[POS] Database path: {:?}", db_path);

            let database = Database::new(&db_path).expect("Failed to initialize database");
            DB.set(Mutex::new(database)).expect("Failed to set DB");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_products,
            upsert_product,
            delete_product,
            update_stock,
            get_orders,
            get_orders_paginated,
            get_orders_count,
            save_order,
            refund_order,
            update_delivery_status,
            get_settings,
            save_settings,
            get_daily_summary,
            get_weekly_revenue,
            get_top_products,
            get_low_stock,
            export_products_csv,
            export_orders_csv,
            import_products_csv,
            get_sales_report,
            verify_pin,
            change_pin,
            get_users,
            reset_admin_pin,
            export_backup,
            import_backup,
            get_backup_metadata,
            get_table_counts,
            get_quick_sale_presets,
            save_quick_sale_preset,
            delete_quick_sale_preset,
            open_cash_drawer_session,
            close_cash_drawer_session,
            get_cash_drawer_session,
            get_receipt_templates,
            save_receipt_template,
            delete_receipt_template,
            bulk_update_stock,
            bulk_update_price,
            bulk_update_tax,
            get_activity_logs,
            sync_to_neon,
            sync_from_neon,
            save_receipt_to_file,
            get_receipt_share_text,
            open_whatsapp_share,
            open_email_share,
            print_receipt,
            get_tables,
            save_table,
            delete_table,
            update_table_status,
            clock_in,
            clock_out,
            get_today_attendance,
            is_clocked_in,
            get_customers,
            save_customer,
            get_customer_by_phone,
            add_loyalty_points,
            get_customer_orders,
            add_order_note,
            get_order_notes,
            get_inventory_alerts,
            check_inventory_alerts,
            create_inventory_alert,
            clear_inventory_alert,
            get_hourly_sales,
            get_staff_performance,
            get_sales_by_item,
            hold_order,
            get_held_orders,
            cancel_order,
            create_refund_request,
            get_refund_requests,
            approve_refund,
            reject_refund,
            get_pending_orders_count,
            get_pending_orders,
            delete_pending_order,
            print_to_printer,
            open_cash_drawer,
            check_printer_status,
            open_kds_window,
            get_kds_orders,
            mark_kds_item_done,
            get_ingredients,
            save_ingredient,
            delete_ingredient,
            get_recipes,
            save_recipe,
            get_suppliers,
            save_supplier,
            delete_supplier,
            get_purchase_orders,
            save_purchase_order,
            update_po_status,
            receive_purchase_order,
            get_reservations,
            save_reservation,
            delete_reservation,
            send_sms_notification,
            start_lan_server,
            stop_lan_server,
            get_lan_server_status,
            get_shifts,
            save_shift,
            delete_shift,
            get_expenses,
            get_expenses_by_range,
            save_expense,
            delete_expense,
            get_expense_categories,
            save_expense_category,
            get_customer_wallet,
            add_wallet_balance,
            deduct_wallet_balance,
            get_wallet_transactions,
            get_coupons,
            save_coupon,
            validate_coupon,
            use_coupon,
            delete_coupon,
            get_day_end_reconciliation,
            save_day_end_reconciliation,
            get_gstr1_report,
            get_gstr3b_report,
            get_activity_logs_range,
            export_to_tally,
            export_to_quickbooks,
            create_compressed_backup,
            send_whatsapp_message,
            send_email,
            validate_license,
            generate_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
