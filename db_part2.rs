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
                id          TEXT PRIMARY KEY,
                store_id    TEXT NOT NULL DEFAULT 'default',
                name        TEXT NOT NULL,
                price       REAL NOT NULL DEFAULT 0,
                category    TEXT NOT NULL DEFAULT 'General',
                stock       INTEGER NOT NULL DEFAULT 0,
                barcode     TEXT NOT NULL DEFAULT '',
                tax         REAL NOT NULL DEFAULT 18,
                image_url   TEXT NOT NULL DEFAULT '',
                metadata    TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS orders (
                id              TEXT PRIMARY KEY,
                store_id        TEXT NOT NULL DEFAULT 'default',
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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
        "
        )?;
        Ok(())
    }

    pub fn transfer_stock(&self, id: &str, from_store: &str, to_store: &str, qty: i64) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            "UPDATE products SET stock = MAX(0, stock - ?1) WHERE id = ?2 AND store_id=?3",
            params![qty, id, from_store],
        )?;
        tx.execute(
            "UPDATE products SET stock = stock + ?1 WHERE id = ?2 AND store_id=?3",
            params![qty, id, to_store],
        )?;
        tx.commit()?;
        Ok(())
    }

    fn migrate_schema(&self) -> Result<()> {
        // Simple migration to ensure 'default' store exists
        self.conn.execute(
            "INSERT OR IGNORE INTO stores (id, name, industry, is_active) VALUES ('default', 'Main Store', 'food', 1)",
            [],
        )?;

        // Add metadata column to products if not exists
        let _ = self.conn.execute("ALTER TABLE products ADD COLUMN metadata TEXT", []);
        // Add metadata column to order_items if not exists
        let _ = self.conn.execute("ALTER TABLE order_items ADD COLUMN metadata TEXT", []);

        Ok(())
    }

    fn seed_if_empty(&self) -> Result<()> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0))?;
        if count == 0 {
            // No seeding for now to keep it clean
        }
        Ok(())
    }

    fn init_users(&self) -> Result<()> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
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
        let mut stmt = self.conn.prepare("SELECT id, name, industry, is_active, created_at FROM stores")?;
        let stores = stmt.query_map([], |row| {
            Ok(Store {
                id: row.get(0)?,
                name: row.get(1)?,
                industry: row.get(2)?,
                is_active: row.get::<_, i32>(3)? == 1,
                created_at: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(stores)
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
        self.conn.execute("DELETE FROM stores WHERE id=?1", params![id])?;
        Ok(())
    }

    // ─── Products ─────────────────────────────────────────────────────────────

    pub fn get_products(&self, store_id: &str) -> Result<Vec<Product>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, name, price, category, stock, barcode, tax, image_url, metadata, created_at FROM products WHERE store_id=?1 ORDER BY name"
        )?;
        let products = stmt.query_map(params![store_id], |row| {
            let metadata_str: Option<String> = row.get(9)?;
            let metadata = metadata_str.and_then(|s| serde_json::from_str(&s).ok());
            Ok(Product {
                id: row.get(0)?,
                store_id: row.get(1)?,
                name: row.get(2)?,
                price: row.get(3)?,
                category: row.get(4)?,
                stock: row.get(5)?,
                barcode: row.get(6)?,
                tax: row.get(7)?,
                image_url: row.get(8)?,
                metadata,
