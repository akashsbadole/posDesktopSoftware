// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod lan_sync;
mod neon;

use db::{Database, InventoryTransaction};
use once_cell::sync::Lazy;
use rusqlite::Error;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use urlencoding;

#[tauri::command]
fn check_camera_availability() -> CameraStatus {
    #[cfg(target_os = "windows")]
    {
        // On Windows, check if any camera is available using Windows Media Device API
        // Simplified check - in production, use windows::Media::Capture
        CameraStatus {
            available: true, // Assume available; actual check requires more complex code
            message: "Camera check not fully implemented - relies on webview".to_string(),
        }
    }
    #[cfg(target_os = "macos")]
    {
        CameraStatus {
            available: true,
            message: "macOS camera access via webview".to_string(),
        }
    }
    #[cfg(target_os = "linux")]
    {
        CameraStatus {
            available: true,
            message: "Linux camera access via webview".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CameraStatus {
    pub available: bool,
    pub message: String,
}

static DB: Lazy<Mutex<Database>> = Lazy::new(|| {
    let db_path = std::env::var("DATABASE_PATH")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| {
            let app_dir = dirs::data_dir()
                .map(|p| p.join("pos-tauri"))
                .expect("Failed to get app data dir");

            let _ = std::fs::create_dir_all(&app_dir);
            app_dir.join("pos.db")
        });

    eprintln!("[POS] Database path: {:?}", db_path);

    let database = match Database::new(&db_path) {
        Ok(db) => db,
        Err(e) => {
            eprintln!("[POS] Database init error: {:?}", e);
            panic!("Failed to initialize database: {:?}", e);
        }
    };
    Mutex::new(database)
});

fn get_db() -> &'static Mutex<Database> {
    &*DB
}

// ─── Seed Command ──────────────────────────────────────────────────────────────

#[cfg(debug_assertions)]
#[tauri::command]
fn seed_database() -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.seed_all().map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn seed_database() -> Result<(), String> {
    Err("Debug command not available in release builds".into())
}

#[tauri::command]
async fn get_all_inventory_transactions(
    store_id: String,
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<InventoryTransaction>, String> {
    db.lock()
        .map_err(|e: std::sync::PoisonError<std::sync::MutexGuard<'_, Database>>| e.to_string())?
        .get_all_inventory_transactions(&store_id)
        .map_err(|e: rusqlite::Error| e.to_string())
}

#[cfg(debug_assertions)]
#[tauri::command]
fn reset_database() -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.reset_all().map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn reset_database() -> Result<(), String> {
    Err("Debug command not available in release builds".into())
}

#[cfg(debug_assertions)]
#[tauri::command]
fn reset_and_seed_database() -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.reset_all().map_err(|e| e.to_string())?;
    db.seed_all().map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
#[tauri::command]
fn reset_and_seed_database() -> Result<(), String> {
    Err("Debug command not available in release builds".into())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PremiumStatus {
    pub enabled: bool,
    pub source: String, // "env", "license", "trial", "none"
    pub trial_days_left: i64,
    pub trial_expiry: Option<String>,
}

fn get_license_salt() -> String {
    std::env::var("LICENSE_SECRET_SALT")
        .unwrap_or_else(|_| "POS_BILLING_SECRET_SALT_2026".to_string())
}

fn get_license_file_path() -> std::path::PathBuf {
    let app_dir = dirs::data_dir()
        .map(|p| p.join("pos-tauri"))
        .expect("Failed to get app data dir");
    app_dir.join("license.txt")
}

fn verify_license_checksum(license: &str) -> bool {
    if !license.starts_with("PREM-") {
        return false;
    }
    let parts: Vec<&str> = license.split('-').collect();
    if parts.len() != 3 {
        return false;
    }

    let payload = format!("PREM-{}", parts[1]);
    let mut hasher = Sha256::new();
    hasher.update(payload.as_bytes());
    hasher.update(get_license_salt().as_bytes());
    let hash = format!("{:x}", hasher.finalize());

    // Check if the provided checksum matches the calculated one
    parts[2] == &hash[..8]
}

#[tauri::command]
fn send_notification(
    app_handle: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri::api::notification::Notification;

    let result = Notification::new(&app_handle.config().tauri.bundle.identifier)
        .title(&title)
        .body(&body)
        .show();

    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn check_printer_status(printer_name: String) -> Result<bool, String> {
    if printer_name.trim().is_empty() {
        return Ok(false);
    }
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args(&["-NoProfile", "-Command", &format!("(Get-Printer -Name '{}').PrinterStatus", printer_name)])
            .output()
            .map_err(|e| e.to_string())?;
        
        let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
        // Status 0 is usually Normal, but we check if it's not empty and doesn't contain error
        Ok(!status.is_empty() && output.status.success())
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Ok(true) // Fallback for other platforms
    }
}

#[tauri::command]
fn get_premium_status() -> PremiumStatus {
    // 1. Check build-time environment variable
    const BUILD_PREMIUM: Option<&'static str> = option_env!("ENABLE_PREMIUM_FEATURES");
    if let Some(v) = BUILD_PREMIUM {
        if v == "true" || v == "1" {
            return PremiumStatus {
                enabled: true,
                source: "env".into(),
                trial_days_left: 0,
                trial_expiry: None,
            };
        }
    }

    // 2. Check runtime environment variable
    if std::env::var("ENABLE_PREMIUM_FEATURES")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false)
    {
        return PremiumStatus {
            enabled: true,
            source: "env".into(),
            trial_days_left: 0,
            trial_expiry: None,
        };
    }

    // 3. Check license file
    let license_path = get_license_file_path();
    if license_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&license_path) {
            let key = content.trim();
            if verify_license_checksum(key) {
                return PremiumStatus {
                    enabled: true,
                    source: "license_file".into(),
                    trial_days_left: 0,
                    trial_expiry: None,
                };
            }
        }
    }

    // 4. Check license key in database for any store
    if let Ok(db) = get_db().lock() {
        if let Ok(stores) = db.get_stores() {
            for store in stores {
                if let Ok(settings) = db.get_settings(&store.id) {
                    if verify_license_checksum(&settings.license_key) {
                        return PremiumStatus {
                            enabled: true,
                            source: "license".into(),
                            trial_days_left: 0,
                            trial_expiry: None,
                        };
                    }
                }
            }
        }
    }

    // All features are free - no trial or payment needed
    PremiumStatus {
        enabled: true,
        source: "free".into(),
        trial_days_left: 0,
        trial_expiry: None,
    }
}

#[tauri::command]
fn is_premium_enabled() -> bool {
    get_premium_status().enabled
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn create_desktop_shortcut() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let exe_path =
            std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;

        let desktop_dir = dirs::desktop_dir().ok_or("Could not find desktop directory")?;

        let shortcut_path = desktop_dir.join("Appixen POS Billing.lnk");

        let script = format!(
            r#"$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut("{}"); $Shortcut.TargetPath = "{}"; $Shortcut.WorkingDirectory = "{}"; $Shortcut.Description = "Appixen POS Billing"; $Shortcut.Save"#,
            shortcut_path.to_string_lossy().replace("\\", "\\\\"),
            exe_path.to_string_lossy().replace("\\", "\\\\"),
            exe_path
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
                .replace("\\", "\\\\")
        );

        let output = Command::new("powershell")
            .args(["-ExecutionPolicy", "Bypass", "-Command", &script])
            .output()
            .map_err(|e| format!("Failed to create shortcut: {}", e))?;

        if output.status.success() {
            Ok(format!(
                "Shortcut created at: {}",
                shortcut_path.to_string_lossy()
            ))
        } else {
            Err(format!(
                "Failed to create shortcut: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::fs;
        use std::path::PathBuf;

        let exe_path =
            std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;

        let applications_dir = dirs::home_dir()
            .map(|h| h.join("Applications"))
            .ok_or("Could not find Applications directory")?;

        let app_dir = applications_dir.join("Appixen POS Billing.app");

        fs::create_dir_all(app_dir.join("Contents/MacOS"))
            .map_err(|e| format!("Failed to create app directory: {}", e))?;

        fs::write(app_dir.join("Contents/Info.plist"), r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>pos-tauri</string>
    <key>CFBundleIdentifier</key>
    <string>com.posbilling.app</string>
    <key>CFBundleName</key>
    <string>Appixen POS Billing</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
</dict>
</plist>"#)
            .map_err(|e| format!("Failed to write Info.plist: {}", e))?;

        Ok(format!(
            "App bundle created at: {}",
            app_dir.to_string_lossy()
        ))
    }

    #[cfg(target_os = "linux")]
    {
        use std::fs;

        let exe_path =
            std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;

        let desktop_file = std::path::PathBuf::from(std::env::var("HOME").unwrap_or_default())
            .join(".local/share/applications/appixen-pos.desktop");

        let desktop_entry = format!(
            r#"[Desktop Entry]
Type=Application
Name=Appixen POS Billing
Exec={}
Terminal=false
Categories=Office;Finance;
"#,
            exe_path.to_string_lossy()
        );

        if let Some(parent) = desktop_file.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        fs::write(&desktop_file, desktop_entry)
            .map_err(|e| format!("Failed to write desktop file: {}", e))?;

        Ok(format!(
            "Desktop entry created at: {}",
            desktop_file.to_string_lossy()
        ))
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

// ─── Product Commands ────────────────────────────────────────────────────────

#[tauri::command]
fn get_products(store_id: String) -> Result<Vec<db::Product>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_products(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_product_variants(
    product_id: String,
    store_id: String,
) -> Result<Vec<db::ProductVariant>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_product_variants(&product_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_product_variant(variant: db::ProductVariant, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_product_variant(&variant, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_product_variant(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_product_variant(&id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_product(product: db::Product, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.upsert_product(&product, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_product(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_product(&id, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_stock(id: String, delta: i64, store_id: String, user_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_stock(&id, delta, &store_id, &user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn transfer_stock(
    id: String,
    from_store: String,
    to_store: String,
    qty: i64,
    user_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.transfer_stock(&id, &from_store, &to_store, qty, &user_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_batches(product_id: String, store_id: String) -> Result<Vec<db::Batch>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_batches(&product_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_batch(batch: db::Batch) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_batch(&batch).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_serial_numbers(
    product_id: String,
    store_id: String,
) -> Result<Vec<db::SerialNumber>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_serial_numbers(&product_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_serial_number(serial: db::SerialNumber) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_serial_number(&serial).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_inventory_transactions(
    product_id: String,
    store_id: String,
) -> Result<Vec<db::InventoryTransaction>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_inventory_transactions(&product_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn calculate_inventory_valuation(store_id: String, method: String) -> Result<f64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.calculate_inventory_valuation(&store_id, &method)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_stock_counts(store_id: String) -> Result<Vec<db::StockCount>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_stock_counts(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_stock_count(count: db::StockCount) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_stock_count(&count).map_err(|e| e.to_string())
}

// ─── Combo Commands ───────────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn get_combos(store_id: String) -> Result<Vec<db::Combo>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_combos(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn save_combo(combo: db::Combo, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_combo(&combo, &store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn delete_combo(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_combo(&id, &store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn toggle_combo(id: String, active: bool, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.toggle_combo(&id, active, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Order Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn get_orders(
    store_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_orders(&store_id, limit, offset)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_order(order: db::Order, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_order(&order, &store_id).map_err(|e| {
        if matches!(e, rusqlite::Error::QueryReturnedNoRows) {
            "Order contains products that do not exist in the current store. Please refresh the product list and try again.".to_string()
        } else {
            e.to_string()
        }
    })
}

#[tauri::command]
fn refund_order(
    id: String,
    store_id: String,
    user_id: String,
    user_name: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.refund_order(&id, &store_id, &user_id, &user_name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_delivery_status(id: String, status: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_delivery_status(&id, &status, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_order_status(id: String, status: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_order_status(&id, &status, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Settings Commands ────────────────────────────────────────────────────────

#[tauri::command]
#[allow(non_snake_case)]
fn get_settings(store_id: String) -> Result<db::Settings, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_settings(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn save_settings(settings: db::Settings, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_settings(&settings, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Analytics Commands ───────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn get_daily_summary(store_id: String) -> Result<db::DailySummary, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_daily_summary(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_weekly_revenue(store_id: String) -> Result<Vec<db::DayRevenue>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_weekly_revenue(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_top_products(store_id: String) -> Result<Vec<db::TopProduct>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_top_products(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_low_stock(store_id: String) -> Result<Vec<db::LowStockItem>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_low_stock(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_sales_by_payment_method(date: String, store_id: String) -> Result<(f64, f64, f64), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_sales_by_payment_method(&date, &store_id)
        .map_err(|e| e.to_string())
}

// ─── CSV Commands ───────────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn export_products_csv(store_id: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_products_csv(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn export_orders_csv(store_id: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_orders_csv(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn import_products_csv(csvData: String, store_id: String) -> Result<db::CsvImportResult, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.import_products_csv(&csvData, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Reports Commands ───────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn get_sales_report(
    startDate: String,
    endDate: String,
    store_id: String,
) -> Result<db::SalesReport, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_sales_report(&startDate, &endDate, &store_id)
        .map_err(|e| e.to_string())
}

// ─── User Commands ───────────────────────────────────────────────────────────

#[tauri::command]
fn verify_pin(pin: String, organization_id: String) -> Result<Option<db::User>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.verify_pin(&pin, &organization_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn login_with_pin_offline(
    pin: String,
    organization_id: String,
) -> Result<Option<db::LoginResult>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.login_with_pin_offline(&pin, &organization_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_pin_offline(
    pin: String,
    organization_id: String,
) -> Result<Option<db::PinLoginResult>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.verify_pin_offline(&pin, &organization_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn find_organization_by_email(email: String) -> Result<Option<db::Organization>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.find_organization_by_email(&email)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_organization_by_id(id: String) -> Result<Option<db::Organization>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_organization_by_id(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn change_pin(user_id: String, new_pin: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.change_pin(&user_id, &new_pin).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_users() -> Result<Vec<db::User>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_users().map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_user(user: db::User) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.upsert_user(&user).map_err(|e| e.to_string())
}

#[tauri::command]
fn register(
    org_name: String,
    email: String,
    password: String,
    pin: String,
) -> Result<db::LoginResult, String> {
    // Trim inputs to remove whitespace
    let org_name = org_name.trim();
    let email = email.trim();
    let password = password.trim();
    let pin = pin.trim();

    // Basic validation
    if org_name.is_empty() {
        return Err("Organization name cannot be empty".to_string());
    }
    if email.is_empty() {
        return Err("Email cannot be empty".to_string());
    }
    if !email.contains('@') || !email.contains('.') {
        return Err("Invalid email format".to_string());
    }
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".to_string());
    }
    if !pin.is_empty() && (pin.len() < 4 || pin.len() > 6 || !pin.chars().all(|c| c.is_digit(10))) {
        return Err("PIN must be 4-6 digits".to_string());
    }

    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.register(org_name, &email, &password, pin)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn login(email: String, password: String) -> Result<Option<db::LoginResult>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.login(&email, &password).map_err(|e| e.to_string())
}

#[tauri::command]
fn forgot_password(email: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let email = email.trim();

    // Check if user exists
    let user = db.get_user_by_email(&email).map_err(|e| e.to_string())?;

    if user.is_none() {
        return Err("Email not found".to_string());
    }

    // Generate a reset code (6 digits)
    let reset_code: String = (0..6)
        .map(|_| (rand::random::<u8>() % 10).to_string())
        .collect();

    // Get user's documents folder for saving the reset code
    let documents_dir = dirs::document_dir().ok_or("Could not find documents directory")?;

    let reset_file_path = documents_dir.join("pos_reset_code.txt");

    // Create the reset code content
    let reset_content = format!(
        "POS Password Reset Code\n\nEmail: {}\nReset Code: {}\n\nThis code is valid for password reset.\nGenerated on: {}\n\nPlease keep this file safe and delete it after use.",
        email,
        reset_code,
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );

    // Write to file
    std::fs::write(&reset_file_path, &reset_content)
        .map_err(|e| format!("Failed to save reset code to file: {}", e))?;

    // Also try to open the file for the user
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(&["/c", "start", &reset_file_path.to_string_lossy()])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&reset_file_path)
            .spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&reset_file_path)
            .spawn();
    }

    // Try to open email client as backup (don't fail if it doesn't work)
    let subject = "Password Reset Code - POS System";
    let body = format!(
        "Your password reset code is: {}\n\nThis code will expire in 30 minutes.\n\nA copy has also been saved to: {}\n\nIf you didn't request this reset, please ignore this email.",
        reset_code,
        reset_file_path.display()
    );

    let subject_encoded = urlencoding::encode(subject);
    let body_encoded = urlencoding::encode(&body);
    let mailto_url = format!(
        "mailto:{}?subject={}&body={}",
        email, subject_encoded, body_encoded
    );

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(&["/c", "start", &mailto_url])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&mailto_url).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&mailto_url)
            .spawn();
    }

    // Store code in DB with 30 minute expiry
    let expiry = (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339();
    db.update_reset_code(&email, &reset_code, &expiry)
        .map_err(|e| e.to_string())?;

    // Return the reset code directly to display in the UI
    Ok(reset_code)
}

#[tauri::command]
fn reset_password(email: String, code: String, new_password: String) -> Result<bool, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let email = email.trim();

    if code.len() != 6 {
        return Err("Invalid reset code format".to_string());
    }

    // Verify code and expiry
    let is_valid = db
        .verify_reset_code(&email, &code)
        .map_err(|e| e.to_string())?;
    if !is_valid {
        return Err("Invalid or expired reset code".to_string());
    }

    // Check if user exists first
    let user = db.get_user_by_email(&email).map_err(|e| e.to_string())?;

    if user.is_none() {
        return Err("Email not found".to_string());
    }

    // Update password
    db.update_password(&email, &new_password)
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
fn forgot_user(email: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let email = email.trim();

    // Get user by email
    let user = db.get_user_by_email(&email).map_err(|e| e.to_string())?;

    if user.is_none() {
        return Err("Email not found".to_string());
    }

    let user = user.unwrap();
    let username = user.email.clone(); // Using email as username

    // Get user's documents folder for saving the username info
    let documents_dir = dirs::document_dir().ok_or("Could not find documents directory")?;

    let username_file_path = documents_dir.join("pos_username.txt");

    // Create the username content
    let username_content = format!(
        "POS Username Recovery\n\nEmail: {}\nUsername: {}\n\nThis information was requested on: {}\n\nPlease keep this file safe and delete it after use.",
        email,
        username,
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );

    // Write to file
    std::fs::write(&username_file_path, &username_content)
        .map_err(|e| format!("Failed to save username to file: {}", e))?;

    // Also try to open the file for the user
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(&["/c", "start", &username_file_path.to_string_lossy()])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&username_file_path)
            .spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&username_file_path)
            .spawn();
    }

    // Try to open email client as backup (don't fail if it doesn't work)
    let subject = "Your Username - POS System";
    let body = format!(
        "Your username is: {}\n\nThis information has also been saved to: {}\n\nIf you didn't request this information, please ignore this email.",
        username,
        username_file_path.display()
    );

    let subject_encoded = urlencoding::encode(subject);
    let body_encoded = urlencoding::encode(&body);
    let mailto_url = format!(
        "mailto:{}?subject={}&body={}",
        email, subject_encoded, body_encoded
    );

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd")
            .args(&["/c", "start", &mailto_url])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&mailto_url).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(&mailto_url)
            .spawn();
    }

    // Return the username directly to display in the UI
    Ok(username)
}

#[tauri::command]
fn export_backup(store_id: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_backup(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_backup(backup_json: String, store_id: String) -> Result<db::ImportResult, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.import_backup(&backup_json, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_activity_logs(store_id: String, limit: i64) -> Result<Vec<db::ActivityLog>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_activity_logs(&store_id, limit)
        .map_err(|e| e.to_string())
}

// ─── Table Commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_tables(store_id: String) -> Result<Vec<db::Table>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_tables(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_table(table: db::Table, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_table(&table, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_table(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_table(&id, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_table_status(id: String, status: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_table_status(&id, &status, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Staff Attendance Commands ─────────────────────────────────────────────────

#[tauri::command]
fn clock_in(user_id: String, user_name: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clock_in(&user_id, &user_name, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn clock_out(user_id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clock_out(&user_id, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_today_attendance(store_id: String) -> Result<Vec<db::StaffAttendance>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_today_attendance(&store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn is_clocked_in(user_id: String, store_id: String) -> Result<bool, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.is_clocked_in(&user_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_salaries(storeId: String) -> Result<Vec<db::StaffSalary>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_salaries(&storeId).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_salary(salary: db::StaffSalary, storeId: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_salary(&salary, &storeId).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_salary(id: String, storeId: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_salary(&id, &storeId).map_err(|e| e.to_string())
}

// ─── Customer Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_customers(store_id: String) -> Result<Vec<db::Customer>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customers(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_customer(customer: db::Customer, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_customer(&customer, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_customer(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_customer(&id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_addresses(customer_id: String) -> Result<Vec<db::CustomerAddress>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_addresses(&customer_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_customer_address(address: db::CustomerAddress) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_customer_address(&address)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_customer_address(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_customer_address(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_customers_csv(store_id: String) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_customers_csv(&store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn import_customers_csv(csv_data: String, store_id: String) -> Result<db::CsvImportResult, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.import_customers_csv(&csv_data, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_statistics(customer_id: String) -> Result<db::CustomerStatistics, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_statistics(&customer_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_by_phone(phone: String, store_id: String) -> Result<Option<db::Customer>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_by_phone(&phone, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_loyalty_points(
    customer_id: String,
    points: i32,
    spent: f64,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_loyalty_points(&customer_id, points, spent, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_orders(phone: String, store_id: String) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_orders(&phone, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customer_unpaid_orders(
    customer_id: String,
    store_id: String,
) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_unpaid_orders(&customer_id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn settle_order_payment(
    order_id: String,
    amount: f64,
    payment_method: String,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.settle_order_payment(&order_id, amount, &payment_method, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Order Notes Commands ─────────────────────────────────────────────────────

#[tauri::command]
fn add_order_note(
    #[allow(non_snake_case)] orderId: String,
    note: String,
    #[allow(non_snake_case)] storeId: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_order_note(&orderId, &note, &storeId)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_order_notes(
    #[allow(non_snake_case)] orderId: String,
    #[allow(non_snake_case)] storeId: String,
) -> Result<Vec<db::OrderNote>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_order_notes(&orderId, &storeId)
        .map_err(|e| e.to_string())
}

// ─── Inventory Alert Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_inventory_alerts(store_id: String) -> Result<Vec<db::InventoryAlert>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_inventory_alerts(&store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn check_inventory_alerts(
    app_handle: tauri::AppHandle,
    store_id: String,
) -> Result<Vec<db::InventoryAlert>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    let alerts = db.check_inventory_alerts(&store_id).map_err(|e| e.to_string())?;

    // Send notifications for new alerts
    for alert in &alerts {
        let _ = send_notification(
            app_handle.clone(),
            "Low Stock Alert".to_string(),
            format!("Product '{}' is low: {} remaining.", alert.product_name, alert.current_stock),
        );
    }

    Ok(alerts)
}

#[tauri::command]
fn create_inventory_alert(alert: db::InventoryAlert, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_inventory_alert(&alert, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_inventory_alert(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.clear_inventory_alert(&id, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Enhanced Reports Commands ────────────────────────────────────────────────

#[tauri::command]
fn get_hourly_sales(date: String, store_id: String) -> Result<Vec<db::HourlySales>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_hourly_sales(&date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_staff_performance(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<Vec<db::StaffPerformance>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_staff_performance(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sales_by_item(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<Vec<db::SalesByItem>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_sales_by_item(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Hold & Cancel Commands ───────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn hold_order(order: db::Order, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.hold_order(&order, &store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_held_orders(store_id: String) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_held_orders(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn cancel_order(
    id: String,
    reason: String,
    user_id: String,
    user_name: String,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.cancel_order(&id, &reason, &user_id, &user_name, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Refund Commands ─────────────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn create_refund_request(
    order_id: String,
    amount: f64,
    reason: String,
    store_id: String,
) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_refund_request(&order_id, amount, &reason, &store_id)
        .map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_refund_requests(store_id: String) -> Result<Vec<db::RefundRequest>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_refund_requests(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn approve_refund(
    id: String,
    user_id: String,
    user_name: String,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.approve_refund(&id, &user_id, &user_name, &store_id)
        .map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn reject_refund(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.reject_refund(&id, &store_id).map_err(|e| e.to_string())
}

// ─── Crash Recovery Commands ────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn get_pending_orders_count(store_id: String) -> Result<i64, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_pending_orders_count(&store_id)
        .map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn get_pending_orders(store_id: String) -> Result<Vec<db::Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_pending_orders(&store_id).map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn delete_pending_order(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_pending_order(&id, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Store Management Commands ────────────────────────────────────────────────

#[tauri::command]
fn get_stores() -> Result<Vec<db::Store>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_stores().map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_store(store: db::Store) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.upsert_store(&store).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_store(id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_store(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_image(app: tauri::AppHandle, data: Vec<u8>, filename: String) -> Result<String, String> {
    let app_dir = app
        .path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data dir")?;
    let path = app_dir.join("images").join(filename);
    std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn add_activity_log(
    store_id: String,
    action: String,
    reason: String,
    user_id: String,
    user_name: String,
    order_id: Option<String>,
    previous_data: Option<String>,
    new_data: Option<String>,
) -> Result<(), String> {
    let db = DB.lock().unwrap();
    db.add_activity_log(
        &store_id,
        &action,
        &reason,
        &user_id,
        &user_name,
        order_id.as_deref(),
        previous_data.as_deref(),
        new_data.as_deref(),
    )
    .map_err(|e: Error| e.to_string())
}

#[tauri::command]
async fn open_kds_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::WindowBuilder;

    let existing = app.get_window("kds");
    if existing.is_some() {
        return Ok(());
    }

    WindowBuilder::new(&app, "kds", tauri::WindowUrl::App("kds".into()))
        .title("Kitchen Display System")
        .inner_size(1024.0, 768.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_kds_orders(store_id: String) -> Result<Vec<db::KdsOrder>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_kds_orders(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn mark_kds_item_done(order_id: String, item_index: usize, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.mark_kds_item_done(&order_id, item_index, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_preparing_item(
    order_id: String,
    item_index: usize,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.start_preparing_item(&order_id, item_index, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn cancel_kds_item(order_id: String, item_index: usize, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.cancel_kds_item(&order_id, item_index, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn recall_kds_order(order_id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.recall_kds_order(&order_id, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Ingredient & Recipe Commands ───────────────────────────────────────────

#[tauri::command]
fn get_ingredients(store_id: String) -> Result<Vec<db::Ingredient>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_ingredients(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_ingredient(ingredient: db::Ingredient, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_ingredient(&ingredient, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_ingredient(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_ingredient(&id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recipes(store_id: String) -> Result<Vec<db::Recipe>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_recipes(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_recipe(recipe: db::Recipe, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_recipe(&recipe, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Supplier & PO Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_suppliers(store_id: String) -> Result<Vec<db::Supplier>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_suppliers(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_supplier(supplier: db::Supplier, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_supplier(&supplier, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_supplier(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_supplier(&id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_purchase_orders(store_id: String) -> Result<Vec<db::PurchaseOrder>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_purchase_orders(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_purchase_order(po: db::PurchaseOrder, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_purchase_order(&po, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_po_status(id: String, status: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_po_status(&id, &status, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn receive_purchase_order(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.receive_purchase_order(&id, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_purchase_order(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_purchase_order(&id, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Reservation Commands ─────────────────────────────────────────────────

#[allow(non_snake_case)]
#[tauri::command]
fn get_reservations(date: String, store_id: String) -> Result<Vec<db::Reservation>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_reservations(&date, &store_id)
        .map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn save_reservation(reservation: db::Reservation, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_reservation(&reservation, &store_id)
        .map_err(|e| e.to_string())
}

#[allow(non_snake_case)]
#[tauri::command]
fn delete_reservation(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_reservation(&id, &store_id)
        .map_err(|e| e.to_string())
}

// ─── SMS Notification Commands ─────────────────────────────────────────────

#[tauri::command]
async fn send_sms_notification(
    phone: String,
    message: String,
    store_id: String,
) -> Result<(), String> {
    let (twilio_sid, twilio_token, twilio_phone) = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings(&store_id).map_err(|e| e.to_string())?;

        if settings.twilio_sid.is_empty()
            || settings.twilio_token.is_empty()
            || settings.twilio_phone.is_empty()
        {
            return Err("Twilio not configured. Set credentials in Settings.".to_string());
        }

        (
            settings.twilio_sid.clone(),
            settings.twilio_token.clone(),
            settings.twilio_phone.clone(),
        )
    };

    let url = format!(
        "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
        twilio_sid
    );

    let client = reqwest::Client::new();
    let auth = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        format!("{}:{}", twilio_sid, twilio_token),
    );

    let params = [("To", phone), ("From", twilio_phone), ("Body", message)];

    client
        .post(&url)
        .header("Authorization", format!("Basic {}", auth))
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("SMS send failed: {}", e))?;

    Ok(())
}

// ─── LAN Sync Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn start_lan_server(port: Option<u16>, store_id: String) -> Result<String, String> {
    let port = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings(&store_id).map_err(|e| e.to_string())?;
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
fn get_shifts(date: String, store_id: String) -> Result<Vec<db::Shift>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_shifts(&date, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_shift(shift: db::Shift, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_shift(&shift, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_shift(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_shift(&id, &store_id).map_err(|e| e.to_string())
}

// ─── Expense Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_expenses(date: String, store_id: String) -> Result<Vec<db::Expense>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expenses(&date, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expenses_by_range(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<Vec<db::Expense>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expenses_by_range(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_expense(expense: db::Expense, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_expense(&expense, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_expense(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_expense(&id, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_expense_categories(store_id: String) -> Result<Vec<db::ExpenseCategory>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_expense_categories(&store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_expense_category(category: db::ExpenseCategory, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_expense_category(&category, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Wallet Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_customer_wallet(customer_id: String) -> Result<db::CustomerWallet, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customer_wallet(&customer_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_wallet_balance(customer_id: String, amount: f64, notes: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.add_wallet_balance(&customer_id, amount, &notes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn deduct_wallet_balance(customer_id: String, amount: f64, order_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.deduct_wallet_balance(&customer_id, amount, &order_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_wallet_transactions(customer_id: String) -> Result<Vec<db::WalletTransaction>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_wallet_transactions(&customer_id)
        .map_err(|e| e.to_string())
}

// ─── Coupon Commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn get_coupons(store_id: String) -> Result<Vec<db::Coupon>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_coupons(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_coupon(coupon: db::Coupon, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_coupon(&coupon, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn validate_coupon(
    code: String,
    order_amount: f64,
    store_id: String,
) -> Result<db::Coupon, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.validate_coupon(&code, order_amount, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn use_coupon(code: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.use_coupon(&code, &store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_coupon(id: String, store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_coupon(&id, &store_id).map_err(|e| e.to_string())
}

// ─── Day End Reconciliation Commands ────────────────────────────────────────

#[tauri::command]
fn get_day_end_reconciliation(
    date: String,
    store_id: String,
) -> Result<Option<db::DayEndReconciliation>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_day_end_reconciliation(&date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_day_end_reconciliation(
    reconciliation: db::DayEndReconciliation,
    store_id: String,
) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.save_day_end_reconciliation(&reconciliation, &store_id)
        .map_err(|e| e.to_string())
}

// ─── GST Report Commands ───────────────────────────────────────────────────

#[tauri::command]
fn get_gstr1_report(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<Vec<db::GstReport>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_gstr1_report(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_gstr3b_report(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<(f64, f64, f64, f64, f64, f64), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_gstr3b_report(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Activity Log Commands ─────────────────────────────────────────────────

#[tauri::command]
fn get_activity_logs_range(
    start_date: String,
    end_date: String,
    limit: i32,
    store_id: String,
) -> Result<Vec<db::ActivityLogEntry>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_activity_logs_range(&start_date, &end_date, limit, &store_id)
        .map_err(|e| e.to_string())
}

// ─── Export Commands ───────────────────────────────────────────────────────

#[tauri::command]
fn export_to_tally(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_to_tally(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn export_to_quickbooks(
    start_date: String,
    end_date: String,
    store_id: String,
) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.export_to_quickbooks(&start_date, &end_date, &store_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_compressed_backup(store_id: String) -> Result<Vec<u8>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_compressed_backup(&store_id)
        .map_err(|e| e.to_string())
}

// ─── Print Commands ──────────────────────────────────────────────────────────────

#[tauri::command]
fn save_receipt_to_file(receipt: String, file_name: String) -> Result<String, String> {
    let downloads_dir = dirs::download_dir().ok_or("Failed to get downloads directory")?;

    let path = downloads_dir.join(&file_name);
    std::fs::write(&path, receipt).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn print_receipt(_receipt: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn print_to_printer(_receipt: String, _printer_name: Option<String>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn open_cash_drawer() -> Result<(), String> {
    Ok(())
}

// ─── WhatsApp Commands ─────────────────────────────────────────────────────

#[tauri::command]
async fn send_whatsapp_message(
    phone: String,
    message: String,
    store_id: String,
) -> Result<(), String> {
    let whatsapp_api_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings(&store_id).map_err(|e| e.to_string())?;

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

    client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("WhatsApp send failed: {}", e))?;

    Ok(())
}

// ─── Neon Sync Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn sync_to_neon(store_id: String) -> Result<neon::SyncResult, String> {
    if !is_premium_enabled() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some(
                "Neon Cloud Sync is a premium feature. Please upgrade to enable.".to_string(),
            ),
            orders: None,
        });
    }

    let neon_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings(&store_id).map_err(|e| e.to_string())?;
        settings.neon_url
    };

    if neon_url.is_empty() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some("No Neon database URL configured. Set it in Settings.".to_string()),
            orders: None,
        });
    }

    let (
        orders,
        products,
        customers,
        ingredients,
        suppliers,
        expenses,
        variants,
        tables,
        combos,
        coupons,
        reservations,
    ) = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        (
            db.get_unsynced_orders(&store_id).unwrap_or_default(),
            db.get_products(&store_id).unwrap_or_default(),
            db.get_customers(&store_id).unwrap_or_default(),
            db.get_ingredients(&store_id).unwrap_or_default(),
            db.get_suppliers(&store_id).unwrap_or_default(),
            db.get_all_expenses(&store_id).unwrap_or_default(),
            db.get_all_product_variants(&store_id).unwrap_or_default(),
            db.get_tables(&store_id).unwrap_or_default(),
            db.get_combos(&store_id).unwrap_or_default(),
            db.get_coupons(&store_id).unwrap_or_default(),
            db.get_reservations("", &store_id).unwrap_or_default(), // Fetch all reservations
        )
    };

    let mut total_synced = 0i64;

    // Orchestrate all syncs
    let r_orders = neon::sync_orders_to_neon(&neon_url, &orders).await;
    if r_orders.error.is_none() {
        total_synced += r_orders.synced;
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let _ = db.mark_orders_synced(&store_id);
    } else {
        return Ok(r_orders);
    }

    total_synced += neon::sync_products_to_neon(&neon_url, &products).await?;
    total_synced += neon::sync_customers_to_neon(&neon_url, &customers).await?;
    total_synced += neon::sync_ingredients_to_neon(&neon_url, &ingredients).await?;
    total_synced += neon::sync_suppliers_to_neon(&neon_url, &suppliers).await?;
    total_synced += neon::sync_expenses_to_neon(&neon_url, &expenses).await?;
    total_synced += neon::sync_variants_to_neon(&neon_url, &variants).await?;
    total_synced += neon::sync_tables_to_neon(&neon_url, &tables).await?;
    total_synced += neon::sync_combos_to_neon(&neon_url, &combos).await?;
    total_synced += neon::sync_coupons_to_neon(&neon_url, &coupons).await?;
    total_synced += neon::sync_reservations_to_neon(&neon_url, &reservations).await?;

    Ok(neon::SyncResult {
        synced: total_synced,
        error: None,
        orders: None,
    })
}

#[tauri::command]
async fn sync_from_neon(store_id: String) -> Result<neon::SyncResult, String> {
    if !is_premium_enabled() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some(
                "Neon Cloud Sync is a premium feature. Please upgrade to enable.".to_string(),
            ),
            orders: None,
        });
    }

    let neon_url = {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        let settings = db.get_settings(&store_id).map_err(|e| e.to_string())?;
        settings.neon_url
    };

    if neon_url.is_empty() {
        return Ok(neon::SyncResult {
            synced: 0,
            error: Some("No Neon database URL configured. Set it in Settings.".to_string()),
            orders: None,
        });
    }

    let result = neon::sync_from_neon(&neon_url, &store_id).await;

    if let Some(data) = &result.data {
        let db = get_db().lock().map_err(|e| e.to_string())?;
        for order in &data.orders {
            let _ = db.save_order(order, &store_id);
        }
        for product in &data.products {
            let _ = db.upsert_product(product, &store_id);
        }
        for customer in &data.customers {
            let _ = db.save_customer(customer, &store_id);
        }
        for ingredient in &data.ingredients {
            let _ = db.save_ingredient(ingredient, &store_id);
        }
        for supplier in &data.suppliers {
            let _ = db.save_supplier(supplier, &store_id);
        }
        for expense in &data.expenses {
            let _ = db.save_expense(expense, &store_id);
        }
        for variant in &data.variants {
            let _ = db.save_product_variant(variant, &store_id);
        }
        for table in &data.tables {
            let _ = db.save_table(table, &store_id);
        }
        for combo in &data.combos {
            let _ = db.save_combo(combo, &store_id);
        }
        for coupon in &data.coupons {
            let _ = db.save_coupon(coupon, &store_id);
        }
        for res in &data.reservations {
            let _ = db.save_reservation(res, &store_id);
        }
    }

    Ok(neon::SyncResult {
        synced: result.synced,
        error: result.error,
        orders: None,
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_products,
            upsert_product,
            delete_product,
            get_product_variants,
            save_product_variant,
            delete_product_variant,
            update_stock,
            transfer_stock,
            get_combos,
            save_combo,
            delete_combo,
            toggle_combo,
            get_orders,
            save_order,
            refund_order,
            update_delivery_status,
            update_order_status,
            get_settings,
            save_settings,
            get_daily_summary,
            get_weekly_revenue,
            get_top_products,
            get_low_stock,
            get_sales_by_payment_method,
            export_products_csv,
            export_orders_csv,
            import_products_csv,
            get_sales_report,
            verify_pin,
            login_with_pin_offline,
            find_organization_by_email,
            get_organization_by_id,
            verify_pin_offline,
            change_pin,
            get_users,
            upsert_user,
            register,
            login,
            forgot_password,
            reset_password,
            forgot_user,
            export_backup,
            import_backup,
            add_activity_log,
            get_activity_logs,
            sync_to_neon,
            sync_from_neon,
            get_tables,
            save_table,
            delete_table,
            update_table_status,
            clock_in,
            clock_out,
            get_today_attendance,
            is_clocked_in,
            get_salaries,
            save_salary,
            delete_salary,
            get_customers,
            save_customer,
            delete_customer,
            get_customer_addresses,
            save_customer_address,
            delete_customer_address,
            export_customers_csv,
            import_customers_csv,
            get_customer_statistics,
            get_customer_by_phone,
            add_loyalty_points,
            get_customer_orders,
            get_customer_unpaid_orders,
            settle_order_payment,
            add_order_note,
            get_order_notes,
            get_inventory_alerts,
            check_inventory_alerts,
            create_inventory_alert,
            clear_inventory_alert,
            get_batches,
            save_batch,
            get_serial_numbers,
            save_serial_number,
            get_inventory_transactions,
            get_all_inventory_transactions,
            calculate_inventory_valuation,
            get_stock_counts,
            save_stock_count,
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
            get_stores,
            upsert_store,
            delete_store,
            open_kds_window,
            get_kds_orders,
            mark_kds_item_done,
            start_preparing_item,
            cancel_kds_item,
            recall_kds_order,
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
            delete_purchase_order,
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
            save_image,
            get_day_end_reconciliation,
            save_day_end_reconciliation,
            get_gstr1_report,
            get_gstr3b_report,
            get_activity_logs_range,
            export_to_tally,
            export_to_quickbooks,
            create_compressed_backup,
            send_whatsapp_message,
            save_receipt_to_file,
            print_receipt,
            print_to_printer,
            open_cash_drawer,
            check_camera_availability,
            seed_database,
            reset_database,
            reset_and_seed_database,
            send_notification,
            check_printer_status,
            get_premium_status,
            is_premium_enabled,
            get_app_version,
            create_desktop_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
