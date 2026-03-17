// src-tauri/src/neon.rs
// Syncs local SQLite data to/from Neon PostgreSQL via HTTP API
// Uses Neon's serverless driver HTTP endpoint

use serde::{Deserialize, Serialize};
use crate::db::Order;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub synced: i64,
    pub error: Option<String>,
    #[serde(skip)]
    pub orders: Option<Vec<Order>>,
}

#[derive(Serialize)]
struct NeonQuery {
    query: String,
    params: Vec<serde_json::Value>,
}

#[derive(Deserialize)]
struct NeonResponse {
    rows: Option<Vec<serde_json::Value>>,
    #[serde(rename = "rowCount")]
    row_count: Option<i64>,
    message: Option<String>,
}

/// Extract HTTP endpoint from Neon connection string
/// postgres://user:pass@host/db -> https://host/sql
fn neon_http_url(connection_string: &str) -> Result<String, String> {
    // Parse: postgres://user:password@ep-xxx.region.neon.tech/dbname
    let stripped = connection_string
        .trim_start_matches("postgres://")
        .trim_start_matches("postgresql://");

    let at_pos = stripped.find('@').ok_or("Invalid connection string: missing @")?;
    let _credentials = &stripped[..at_pos];
    let rest = &stripped[at_pos + 1..];

    let slash_pos = rest.find('/').unwrap_or(rest.len());
    let host = &rest[..slash_pos];

    // Neon HTTP API endpoint
    Ok(format!("https://{}/sql", host))
}

fn neon_auth(connection_string: &str) -> Result<String, String> {
    let stripped = connection_string
        .trim_start_matches("postgres://")
        .trim_start_matches("postgresql://");
    let at_pos = stripped.find('@').ok_or("Invalid connection string")?;
    let credentials = &stripped[..at_pos];

    // Base64 encode for Basic auth
    let encoded = base64_encode(credentials.as_bytes());
    Ok(format!("Basic {}", encoded))
}

fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut i = 0;
    while i < input.len() {
        let b0 = input[i] as usize;
        let b1 = if i + 1 < input.len() { input[i + 1] as usize } else { 0 };
        let b2 = if i + 2 < input.len() { input[i + 2] as usize } else { 0 };
        result.push(CHARS[b0 >> 2] as char);
        result.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        if i + 1 < input.len() { result.push(CHARS[((b1 & 0xf) << 2) | (b2 >> 6)] as char); } else { result.push('='); }
        if i + 2 < input.len() { result.push(CHARS[b2 & 0x3f] as char); } else { result.push('='); }
        i += 3;
    }
    result
}

async fn neon_query(
    connection_string: &str,
    query: &str,
    params: Vec<serde_json::Value>,
) -> Result<NeonResponse, String> {
    let url = neon_http_url(connection_string)?;
    let auth = neon_auth(connection_string)?;

    let client = reqwest::Client::new();
    let body = NeonQuery { query: query.to_string(), params };

    let resp = client
        .post(&url)
        .header("Authorization", auth)
        .header("Content-Type", "application/json")
        .header("Neon-Connection-String", connection_string)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Neon error {}: {}", status, text));
    }

    resp.json::<NeonResponse>().await.map_err(|e| format!("Parse error: {}", e))
}

/// Ensure Neon tables exist
async fn ensure_neon_schema(connection_string: &str) -> Result<(), String> {
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_orders (
            id              TEXT PRIMARY KEY,
            items_json      TEXT NOT NULL,
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
            created_at      TEXT NOT NULL,
            device_id       TEXT NOT NULL DEFAULT 'local'
        )
    ", vec![]).await?;
    Ok(())
}

pub async fn sync_orders_to_neon(connection_string: &str, orders: &[Order]) -> SyncResult {
    if let Err(e) = ensure_neon_schema(connection_string).await {
        return SyncResult { synced: 0, error: Some(e), orders: None };
    }

    let mut synced = 0i64;

    for order in orders {
        let items_json = serde_json::to_string(&order.items).unwrap_or_default();
        let user_id = order.user_id.clone().unwrap_or_default();
        let user_name = order.user_name.clone().unwrap_or_default();
        let result = neon_query(
            connection_string,
            "INSERT INTO pos_orders
             (id, items_json, subtotal, tax_amount, discount_amount, total,
              payment_method, amount_paid, change_amount, customer_name, status,
              order_type, delivery_status, delivery_address, delivery_phone,
              user_id, user_name, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
             ON CONFLICT (id) DO NOTHING",
            vec![
                serde_json::json!(order.id),
                serde_json::json!(items_json),
                serde_json::json!(order.subtotal),
                serde_json::json!(order.tax_amount),
                serde_json::json!(order.discount_amount),
                serde_json::json!(order.total),
                serde_json::json!(order.payment_method),
                serde_json::json!(order.amount_paid),
                serde_json::json!(order.change_amount),
                serde_json::json!(order.customer_name),
                serde_json::json!(order.status),
                serde_json::json!(order.order_type),
                serde_json::json!(order.delivery_status),
                serde_json::json!(order.delivery_address),
                serde_json::json!(order.delivery_phone),
                serde_json::json!(user_id),
                serde_json::json!(user_name),
                serde_json::json!(order.created_at),
            ],
        ).await;

        match result {
            Ok(_) => synced += 1,
            Err(e) => return SyncResult { synced, error: Some(e), orders: None },
        }
    }

    SyncResult { synced, error: None, orders: None }
}

pub struct SyncFromResult {
    pub synced: i64,
    pub error: Option<String>,
    pub orders: Option<Vec<Order>>,
}

pub async fn sync_from_neon(connection_string: &str) -> SyncFromResult {
    if let Err(e) = ensure_neon_schema(connection_string).await {
        return SyncFromResult { synced: 0, error: Some(e), orders: None };
    }

    let result = neon_query(
        connection_string,
        "SELECT id, items_json, subtotal, tax_amount, discount_amount, total,
                payment_method, amount_paid, change_amount, customer_name, status,
                order_type, delivery_status, delivery_address, delivery_phone,
                user_id, user_name, created_at
         FROM pos_orders ORDER BY created_at DESC LIMIT 1000",
        vec![],
    ).await;

    match result {
        Err(e) => SyncFromResult { synced: 0, error: Some(e), orders: None },
        Ok(resp) => {
            let rows = resp.rows.unwrap_or_default();
            let mut orders = vec![];
            for row in &rows {
                if let (
                    Some(id), Some(items_json), Some(subtotal), Some(tax_amount),
                    Some(discount_amount), Some(total), Some(payment_method),
                    Some(amount_paid), Some(change_amount), Some(customer_name),
                    Some(status), Some(created_at)
                ) = (
                    row.get("id").and_then(|v| v.as_str()),
                    row.get("items_json").and_then(|v| v.as_str()),
                    row.get("subtotal").and_then(|v| v.as_f64()),
                    row.get("tax_amount").and_then(|v| v.as_f64()),
                    row.get("discount_amount").and_then(|v| v.as_f64()),
                    row.get("total").and_then(|v| v.as_f64()),
                    row.get("payment_method").and_then(|v| v.as_str()),
                    row.get("amount_paid").and_then(|v| v.as_f64()),
                    row.get("change_amount").and_then(|v| v.as_f64()),
                    row.get("customer_name").and_then(|v| v.as_str()),
                    row.get("status").and_then(|v| v.as_str()),
                    row.get("created_at").and_then(|v| v.as_str()),
                ) {
                    let items = serde_json::from_str(items_json).unwrap_or_default();
                    let order_type = row.get("order_type").and_then(|v| v.as_str()).unwrap_or("dine_in");
                    let delivery_status = row.get("delivery_status").and_then(|v| v.as_str()).unwrap_or("pending");
                    let delivery_address = row.get("delivery_address").and_then(|v| v.as_str()).unwrap_or("");
                    let delivery_phone = row.get("delivery_phone").and_then(|v| v.as_str()).unwrap_or("");
                    let user_id = row.get("user_id").and_then(|v| v.as_str());
                    let user_name = row.get("user_name").and_then(|v| v.as_str());
                    orders.push(Order {
                        id: id.to_string(),
                        items,
                        subtotal,
                        tax_amount,
                        discount_amount,
                        total,
                        payment_method: payment_method.to_string(),
                        amount_paid,
                        change_amount,
                        customer_name: customer_name.to_string(),
                        status: status.to_string(),
                        order_type: order_type.to_string(),
                        delivery_status: delivery_status.to_string(),
                        delivery_address: delivery_address.to_string(),
                        delivery_phone: delivery_phone.to_string(),
                        created_at: created_at.to_string(),
                        synced: Some(true),
                        user_id: user_id.map(|s| s.to_string()),
                        user_name: user_name.map(|s| s.to_string()),
                    });
                }
            }
            let count = orders.len() as i64;
            SyncFromResult { synced: count, error: None, orders: Some(orders) }
        }
    }
}
