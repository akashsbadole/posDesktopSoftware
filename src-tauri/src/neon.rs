// src-tauri/src/neon.rs
// Syncs local SQLite data to/from Neon PostgreSQL via HTTP API
// Uses Neon's serverless driver HTTP endpoint

use serde::{Deserialize, Serialize};
use crate::db::{Order, Product, Customer, Ingredient, Supplier, Expense, ProductVariant, Table, Combo, Coupon, Reservation};

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct SyncResult {
    pub synced: i64,
    pub error: Option<String>,
    #[serde(skip)]
    pub orders: Option<Vec<Order>>,
}

#[derive(Serialize)]
#[allow(dead_code)]
struct NeonQuery {
    query: String,
    params: Vec<serde_json::Value>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
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
    use base64::{engine::general_purpose, Engine as _};
    let encoded = general_purpose::STANDARD.encode(credentials.as_bytes());
    Ok(format!("Basic {}", encoded))
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
    // Orders table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_orders (
            id              TEXT PRIMARY KEY,
            items           TEXT NOT NULL,
            subtotal        REAL NOT NULL,
            tax_amount      REAL NOT NULL,
            discount_amount REAL NOT NULL,
            total           REAL NOT NULL,
            payment_method  TEXT NOT NULL,
            amount_paid     REAL NOT NULL,
            change_amount   REAL NOT NULL,
            customer_name   TEXT NOT NULL DEFAULT '',
            payment_status  TEXT,
            status          TEXT NOT NULL DEFAULT 'completed',
            order_type      TEXT NOT NULL DEFAULT 'dine_in',
            delivery_status TEXT NOT NULL DEFAULT 'pending',
            delivery_address TEXT NOT NULL DEFAULT '',
            delivery_phone  TEXT NOT NULL DEFAULT '',
            user_id         TEXT,
            user_name       TEXT,
            tip_amount      REAL,
            discount_type   TEXT,
            metadata        TEXT,
            created_at      TEXT NOT NULL,
            device_id       TEXT NOT NULL DEFAULT 'local'
        )
    ", vec![]).await?;

    // Products table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_products (
            id                TEXT PRIMARY KEY,
            store_id          TEXT NOT NULL,
            name              TEXT NOT NULL,
            price             REAL NOT NULL,
            cost_price        REAL NOT NULL,
            wholesale_price   REAL NOT NULL,
            category          TEXT NOT NULL,
            subcategory       TEXT,
            stock             INTEGER NOT NULL,
            barcode           TEXT,
            sku               TEXT,
            description       TEXT,
            tax               REAL NOT NULL,
            status            TEXT NOT NULL,
            tags              TEXT,
            is_digital        BOOLEAN NOT NULL,
            is_favorite       BOOLEAN NOT NULL,
            image_url         TEXT,
            metadata          TEXT,
            base_unit         TEXT,
            conversion_factor REAL,
            created_at        TEXT
        )
    ", vec![]).await?;

    // Customers table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_customers (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            phone           TEXT,
            email           TEXT,
            loyalty_points  INTEGER NOT NULL,
            total_spent     REAL NOT NULL,
            visits          INTEGER NOT NULL,
            group_name      TEXT,
            notes           TEXT,
            birthday        TEXT,
            anniversary     TEXT,
            credit_limit    REAL,
            price_tier      TEXT,
            loyalty_tier    TEXT,
            tax_id          TEXT,
            created_at      TEXT NOT NULL
        )
    ", vec![]).await?;

    // Ingredients table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_ingredients (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            stock           REAL NOT NULL,
            unit            TEXT NOT NULL,
            reorder_level   REAL NOT NULL,
            created_at      TEXT
        )
    ", vec![]).await?;

    // Suppliers table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_suppliers (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            phone           TEXT,
            email           TEXT,
            address         TEXT,
            created_at      TEXT
        )
    ", vec![]).await?;

    // Expenses table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_expenses (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            category        TEXT NOT NULL,
            amount          REAL NOT NULL,
            description     TEXT,
            date            TEXT NOT NULL,
            payment_method  TEXT NOT NULL,
            created_at      TEXT
        )
    ", vec![]).await?;

    // Product Variants table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_product_variants (
            id              TEXT PRIMARY KEY,
            product_id      TEXT NOT NULL,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            value           TEXT NOT NULL,
            sku             TEXT NOT NULL,
            price           REAL NOT NULL,
            stock           INTEGER NOT NULL
        )
    ", vec![]).await?;

    // Tables table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_tables (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            capacity        INTEGER NOT NULL,
            status          TEXT NOT NULL,
            position_x      INTEGER NOT NULL,
            position_y      INTEGER NOT NULL
        )
    ", vec![]).await?;

    // Combos table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_combos (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            name            TEXT NOT NULL,
            description     TEXT,
            items           TEXT NOT NULL,
            combo_price     REAL NOT NULL,
            discount_amount REAL NOT NULL,
            discount_percent REAL NOT NULL,
            is_active       BOOLEAN NOT NULL,
            created_at      TEXT
        )
    ", vec![]).await?;

    // Coupons table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_coupons (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            code            TEXT NOT NULL,
            discount_type   TEXT NOT NULL,
            discount_value  REAL NOT NULL,
            min_order_amount REAL NOT NULL,
            max_uses        INTEGER NOT NULL,
            used_count      INTEGER NOT NULL,
            valid_from      TEXT NOT NULL,
            valid_until     TEXT NOT NULL,
            active          BOOLEAN NOT NULL,
            created_at      TEXT NOT NULL
        )
    ", vec![]).await?;

    // Reservations table
    neon_query(connection_string, "
        CREATE TABLE IF NOT EXISTS pos_reservations (
            id              TEXT PRIMARY KEY,
            store_id        TEXT NOT NULL,
            table_id        TEXT NOT NULL,
            customer_name   TEXT NOT NULL,
            phone           TEXT NOT NULL,
            date            TEXT NOT NULL,
            time            TEXT NOT NULL,
            party_size      INTEGER NOT NULL,
            status          TEXT NOT NULL,
            notes           TEXT,
            created_at      TEXT
        )
    ", vec![]).await?;

    Ok(())
}

pub async fn sync_orders_to_neon(connection_string: &str, orders: &[Order]) -> SyncResult {
    if let Err(e) = ensure_neon_schema(connection_string).await {
        return SyncResult { synced: 0, error: Some(e), data: None };
    }

    let mut synced = 0i64;

    for order in orders {
        let items_json = serde_json::to_string(&order.items).unwrap_or_default();
        let metadata_json = order.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok()).unwrap_or_default();

        let result = neon_query(
            connection_string,
            "INSERT INTO pos_orders
             (id, items, subtotal, tax_amount, discount_amount, total,
              payment_method, amount_paid, change_amount, customer_name, payment_status,
              status, order_type, delivery_status, delivery_address, delivery_phone,
              user_id, user_name, tip_amount, discount_type, metadata, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
             ON CONFLICT (id) DO UPDATE SET
               items=excluded.items, subtotal=excluded.subtotal, tax_amount=excluded.tax_amount,
               discount_amount=excluded.discount_amount, total=excluded.total, payment_method=excluded.payment_method,
               amount_paid=excluded.amount_paid, change_amount=excluded.change_amount, customer_name=excluded.customer_name,
               payment_status=excluded.payment_status, status=excluded.status, order_type=excluded.order_type,
               delivery_status=excluded.delivery_status, delivery_address=excluded.delivery_address,
               delivery_phone=excluded.delivery_phone, user_id=excluded.user_id, user_name=excluded.user_name,
               tip_amount=excluded.tip_amount, discount_type=excluded.discount_type, metadata=excluded.metadata,
               created_at=excluded.created_at",
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
                serde_json::json!(order.payment_status),
                serde_json::json!(order.status),
                serde_json::json!(order.order_type),
                serde_json::json!(order.delivery_status),
                serde_json::json!(order.delivery_address),
                serde_json::json!(order.delivery_phone),
                serde_json::json!(order.user_id),
                serde_json::json!(order.user_name),
                serde_json::json!(order.tip_amount),
                serde_json::json!(order.discount_type),
                serde_json::json!(metadata_json),
                serde_json::json!(order.created_at),
            ],
        ).await;

        match result {
            Ok(_) => synced += 1,
            Err(e) => return SyncResult { synced, error: Some(e), data: None },
        }
    }

    SyncResult { synced, error: None, data: None }
}

pub async fn sync_products_to_neon(connection_string: &str, products: &[Product]) -> Result<i64, String> {
    let mut synced = 0i64;
    for p in products {
        let metadata_json = p.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok()).unwrap_or_default();
        neon_query(
            connection_string,
            "INSERT INTO pos_products (id, store_id, name, price, cost_price, wholesale_price, category, subcategory, stock, barcode, sku, description, tax, status, tags, is_digital, is_favorite, image_url, metadata, base_unit, conversion_factor, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, price=excluded.price, cost_price=excluded.cost_price, wholesale_price=excluded.wholesale_price,
               category=excluded.category, subcategory=excluded.subcategory, stock=excluded.stock, barcode=excluded.barcode, sku=excluded.sku,
               description=excluded.description, tax=excluded.tax, status=excluded.status, tags=excluded.tags, is_digital=excluded.is_digital,
               is_favorite=excluded.is_favorite, image_url=excluded.image_url, metadata=excluded.metadata,
               base_unit=excluded.base_unit, conversion_factor=excluded.conversion_factor, created_at=excluded.created_at",
            vec![
                serde_json::json!(p.id), serde_json::json!(p.store_id), serde_json::json!(p.name), serde_json::json!(p.price),
                serde_json::json!(p.cost_price), serde_json::json!(p.wholesale_price), serde_json::json!(p.category), serde_json::json!(p.subcategory),
                serde_json::json!(p.stock), serde_json::json!(p.barcode), serde_json::json!(p.sku), serde_json::json!(p.description),
                serde_json::json!(p.tax), serde_json::json!(p.status), serde_json::json!(p.tags), serde_json::json!(p.is_digital),
                serde_json::json!(p.is_favorite), serde_json::json!(p.image_url), serde_json::json!(metadata_json),
                serde_json::json!(p.base_unit), serde_json::json!(p.conversion_factor), serde_json::json!(p.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_combos_to_neon(connection_string: &str, combos: &[Combo]) -> Result<i64, String> {
    let mut synced = 0i64;
    for c in combos {
        let items_json = serde_json::to_string(&c.items).unwrap_or_default();
        neon_query(
            connection_string,
            "INSERT INTO pos_combos (id, store_id, name, description, items, combo_price, discount_amount, discount_percent, is_active, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, description=excluded.description, items=excluded.items,
               combo_price=excluded.combo_price, discount_amount=excluded.discount_amount,
               discount_percent=excluded.discount_percent, is_active=excluded.is_active, created_at=excluded.created_at",
            vec![
                serde_json::json!(c.id), serde_json::json!(c.store_id), serde_json::json!(c.name), serde_json::json!(c.description),
                serde_json::json!(items_json), serde_json::json!(c.combo_price), serde_json::json!(c.discount_amount),
                serde_json::json!(c.discount_percent), serde_json::json!(c.is_active), serde_json::json!(c.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_coupons_to_neon(connection_string: &str, coupons: &[Coupon]) -> Result<i64, String> {
    let mut synced = 0i64;
    for c in coupons {
        neon_query(
            connection_string,
            "INSERT INTO pos_coupons (id, store_id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, active, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, code=excluded.code, discount_type=excluded.discount_type,
               discount_value=excluded.discount_value, min_order_amount=excluded.min_order_amount,
               max_uses=excluded.max_uses, used_count=excluded.used_count, valid_from=excluded.valid_from,
               valid_until=excluded.valid_until, active=excluded.active, created_at=excluded.created_at",
            vec![
                serde_json::json!(c.id), serde_json::json!(c.store_id), serde_json::json!(c.code), serde_json::json!(c.discount_type),
                serde_json::json!(c.discount_value), serde_json::json!(c.min_order_amount), serde_json::json!(c.max_uses),
                serde_json::json!(c.used_count), serde_json::json!(c.valid_from), serde_json::json!(c.valid_until),
                serde_json::json!(c.active), serde_json::json!(c.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_reservations_to_neon(connection_string: &str, reservations: &[Reservation]) -> Result<i64, String> {
    let mut synced = 0i64;
    for r in reservations {
        neon_query(
            connection_string,
            "INSERT INTO pos_reservations (id, store_id, table_id, customer_name, phone, date, time, party_size, status, notes, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, table_id=excluded.table_id, customer_name=excluded.customer_name,
               phone=excluded.phone, date=excluded.date, time=excluded.time, party_size=excluded.party_size,
               status=excluded.status, notes=excluded.notes, created_at=excluded.created_at",
            vec![
                serde_json::json!(r.id), serde_json::json!(r.store_id), serde_json::json!(r.table_id), serde_json::json!(r.customer_name),
                serde_json::json!(r.phone), serde_json::json!(r.date), serde_json::json!(r.time), serde_json::json!(r.party_size),
                serde_json::json!(r.status), serde_json::json!(r.notes), serde_json::json!(r.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_customers_to_neon(connection_string: &str, customers: &[Customer]) -> Result<i64, String> {
    let mut synced = 0i64;
    for c in customers {
        neon_query(
            connection_string,
            "INSERT INTO pos_customers (id, store_id, name, phone, email, loyalty_points, total_spent, visits, group_name, notes, birthday, anniversary, credit_limit, price_tier, loyalty_tier, tax_id, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, phone=excluded.phone, email=excluded.email, loyalty_points=excluded.loyalty_points,
               total_spent=excluded.total_spent, visits=excluded.visits, group_name=excluded.group_name, notes=excluded.notes,
               birthday=excluded.birthday, anniversary=excluded.anniversary, credit_limit=excluded.credit_limit,
               price_tier=excluded.price_tier, loyalty_tier=excluded.loyalty_tier, tax_id=excluded.tax_id, created_at=excluded.created_at",
            vec![
                serde_json::json!(c.id), serde_json::json!(c.store_id), serde_json::json!(c.name), serde_json::json!(c.phone),
                serde_json::json!(c.email), serde_json::json!(c.loyalty_points), serde_json::json!(c.total_spent), serde_json::json!(c.visits),
                serde_json::json!(c.group_name), serde_json::json!(c.notes), serde_json::json!(c.birthday), serde_json::json!(c.anniversary),
                serde_json::json!(c.credit_limit), serde_json::json!(c.price_tier), serde_json::json!(c.loyalty_tier), serde_json::json!(c.tax_id),
                serde_json::json!(c.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_ingredients_to_neon(connection_string: &str, ingredients: &[Ingredient]) -> Result<i64, String> {
    let mut synced = 0i64;
    for i in ingredients {
        neon_query(
            connection_string,
            "INSERT INTO pos_ingredients (id, store_id, name, stock, unit, reorder_level, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, stock=excluded.stock, unit=excluded.unit, reorder_level=excluded.reorder_level, created_at=excluded.created_at",
            vec![
                serde_json::json!(i.id), serde_json::json!(i.store_id), serde_json::json!(i.name), serde_json::json!(i.stock),
                serde_json::json!(i.unit), serde_json::json!(i.reorder_level), serde_json::json!(i.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_suppliers_to_neon(connection_string: &str, suppliers: &[Supplier]) -> Result<i64, String> {
    let mut synced = 0i64;
    for s in suppliers {
        neon_query(
            connection_string,
            "INSERT INTO pos_suppliers (id, store_id, name, phone, email, address, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address, created_at=excluded.created_at",
            vec![
                serde_json::json!(s.id), serde_json::json!(s.store_id), serde_json::json!(s.name), serde_json::json!(s.phone),
                serde_json::json!(s.email), serde_json::json!(s.address), serde_json::json!(s.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_expenses_to_neon(connection_string: &str, expenses: &[Expense]) -> Result<i64, String> {
    let mut synced = 0i64;
    for e in expenses {
        neon_query(
            connection_string,
            "INSERT INTO pos_expenses (id, store_id, category, amount, description, date, payment_method, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, category=excluded.category, amount=excluded.amount, description=excluded.description,
               date=excluded.date, payment_method=excluded.payment_method, created_at=excluded.created_at",
            vec![
                serde_json::json!(e.id), serde_json::json!(e.store_id), serde_json::json!(e.category), serde_json::json!(e.amount),
                serde_json::json!(e.description), serde_json::json!(e.date), serde_json::json!(e.payment_method), serde_json::json!(e.created_at),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_variants_to_neon(connection_string: &str, variants: &[ProductVariant]) -> Result<i64, String> {
    let mut synced = 0i64;
    for v in variants {
        neon_query(
            connection_string,
            "INSERT INTO pos_product_variants (id, product_id, store_id, name, value, sku, price, stock)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO UPDATE SET
               product_id=excluded.product_id, store_id=excluded.store_id, name=excluded.name, value=excluded.value,
               sku=excluded.sku, price=excluded.price, stock=excluded.stock",
            vec![
                serde_json::json!(v.id), serde_json::json!(v.product_id), serde_json::json!(v.store_id), serde_json::json!(v.name),
                serde_json::json!(v.value), serde_json::json!(v.sku), serde_json::json!(v.price), serde_json::json!(v.stock),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

pub async fn sync_tables_to_neon(connection_string: &str, tables: &[Table]) -> Result<i64, String> {
    let mut synced = 0i64;
    for t in tables {
        neon_query(
            connection_string,
            "INSERT INTO pos_tables (id, store_id, name, capacity, status, position_x, position_y)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (id) DO UPDATE SET
               store_id=excluded.store_id, name=excluded.name, capacity=excluded.capacity, status=excluded.status,
               position_x=excluded.position_x, position_y=excluded.position_y",
            vec![
                serde_json::json!(t.id), serde_json::json!(t.store_id), serde_json::json!(t.name), serde_json::json!(t.capacity),
                serde_json::json!(t.status), serde_json::json!(t.position_x), serde_json::json!(t.position_y),
            ]
        ).await?;
        synced += 1;
    }
    Ok(synced)
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct FullSyncData {
    pub orders: Vec<Order>,
    pub products: Vec<Product>,
    pub customers: Vec<Customer>,
    pub ingredients: Vec<Ingredient>,
    pub suppliers: Vec<Supplier>,
    pub expenses: Vec<Expense>,
    pub variants: Vec<ProductVariant>,
    pub tables: Vec<Table>,
    pub combos: Vec<Combo>,
    pub coupons: Vec<Coupon>,
    pub reservations: Vec<Reservation>,
}

pub struct SyncFromResult {
    pub synced: i64,
    pub error: Option<String>,
    pub data: Option<FullSyncData>,
}

pub async fn sync_from_neon(connection_string: &str, store_id: &str) -> SyncFromResult {
    if let Err(e) = ensure_neon_schema(connection_string).await {
        return SyncFromResult { synced: 0, error: Some(e), data: None };
    }

    let mut data = FullSyncData::default();
    let mut total_synced = 0i64;

    // 1. Sync Orders
    match neon_query(connection_string, "SELECT * FROM pos_orders WHERE device_id != 'local' LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    let mut r = row.clone();
                    // Fix items/metadata from String to Value
                    if let Some(items_str) = r.get("items").and_then(|v| v.as_str()) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(items_str) {
                            r["items"] = val;
                        }
                    }
                    if let Some(meta_str) = r.get("metadata").and_then(|v| v.as_str()) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(meta_str) {
                            r["metadata"] = val;
                        }
                    }
                    if let Ok(mut order) = serde_json::from_value::<Order>(r) {
                        order.store_id = store_id.to_string();
                        order.synced = Some(true);
                        data.orders.push(order);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Orders sync failed: {}", e)), data: None },
    }

    // 2. Sync Products
    match neon_query(connection_string, "SELECT * FROM pos_products LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    let mut r = row.clone();
                    if let Some(meta_str) = r.get("metadata").and_then(|v| v.as_str()) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(meta_str) {
                            r["metadata"] = val;
                        }
                    }
                    if let Ok(p) = serde_json::from_value::<Product>(r) {
                        data.products.push(p);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Products sync failed: {}", e)), data: None },
    }

    // 3. Sync Customers
    match neon_query(connection_string, "SELECT * FROM pos_customers LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(c) = serde_json::from_value::<Customer>(row) {
                        data.customers.push(c);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Customers sync failed: {}", e)), data: None },
    }

    // 4. Sync Ingredients
    match neon_query(connection_string, "SELECT * FROM pos_ingredients LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(i) = serde_json::from_value::<Ingredient>(row) {
                        data.ingredients.push(i);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Ingredients sync failed: {}", e)), data: None },
    }

    // 5. Sync Suppliers
    match neon_query(connection_string, "SELECT * FROM pos_suppliers LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(s) = serde_json::from_value::<Supplier>(row) {
                        data.suppliers.push(s);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Suppliers sync failed: {}", e)), data: None },
    }

    // 6. Sync Expenses
    match neon_query(connection_string, "SELECT * FROM pos_expenses LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(ex) = serde_json::from_value::<Expense>(row) {
                        data.expenses.push(ex);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Expenses sync failed: {}", e)), data: None },
    }

    // 7. Sync Variants
    match neon_query(connection_string, "SELECT * FROM pos_product_variants LIMIT 5000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(v) = serde_json::from_value::<ProductVariant>(row) {
                        data.variants.push(v);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Variants sync failed: {}", e)), data: None },
    }

    // 8. Sync Tables
    match neon_query(connection_string, "SELECT * FROM pos_tables LIMIT 500", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(t) = serde_json::from_value::<Table>(row) {
                        data.tables.push(t);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Tables sync failed: {}", e)), data: None },
    }

    // 9. Sync Combos
    match neon_query(connection_string, "SELECT * FROM pos_combos LIMIT 500", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    let mut r = row.clone();
                    if let Some(items_str) = r.get("items").and_then(|v| v.as_str()) {
                        if let Ok(val) = serde_json::from_str::<serde_json::Value>(items_str) {
                            r["items"] = val;
                        }
                    }
                    if let Ok(c) = serde_json::from_value::<Combo>(r) {
                        data.combos.push(c);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Combos sync failed: {}", e)), data: None },
    }

    // 10. Sync Coupons
    match neon_query(connection_string, "SELECT * FROM pos_coupons LIMIT 500", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(c) = serde_json::from_value::<Coupon>(row) {
                        data.coupons.push(c);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Coupons sync failed: {}", e)), data: None },
    }

    // 11. Sync Reservations
    match neon_query(connection_string, "SELECT * FROM pos_reservations LIMIT 1000", vec![]).await {
        Ok(resp) => {
            if let Some(rows) = resp.rows {
                for row in rows {
                    if let Ok(r) = serde_json::from_value::<Reservation>(row) {
                        data.reservations.push(r);
                        total_synced += 1;
                    }
                }
            }
        }
        Err(e) => return SyncFromResult { synced: total_synced, error: Some(format!("Reservations sync failed: {}", e)), data: None },
    }

    SyncFromResult { synced: total_synced, error: None, data: Some(data) }
}
