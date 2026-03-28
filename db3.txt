                created_at: row.get(10)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(products)
    }

    pub fn upsert_product(&self, p: &Product, store_id: &str) -> Result<()> {
        let metadata_str = p.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok());
        self.conn.execute(
            "INSERT INTO products (id, store_id, name, price, category, stock, barcode, tax, image_url, metadata)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
               name=excluded.name, price=excluded.price, category=excluded.category,
               stock=excluded.stock, barcode=excluded.barcode, tax=excluded.tax, image_url=excluded.image_url, metadata=excluded.metadata",
            params![p.id, store_id, p.name, p.price, p.category, p.stock, p.barcode, p.tax, p.image_url, metadata_str],
        )?;
        Ok(())
    }

    pub fn delete_product(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM products WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn update_stock(&self, id: &str, delta: i64, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE products SET stock = MAX(0, stock + ?1) WHERE id = ?2 AND store_id=?3",
            params![delta, id, store_id],
        )?;
        Ok(())
    }

    // ─── Combos ────────────────────────────────────────────────────────────────

    pub fn get_combos(&self, store_id: &str) -> Result<Vec<Combo>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, name, description, items, combo_price, discount_amount, discount_percent, is_active, created_at FROM combos WHERE store_id=?1 ORDER BY name"
        )?;
        let combos = stmt.query_map(params![store_id], |row| {
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
        })?.collect::<Result<Vec<_>>>()?;
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
        self.conn.execute("DELETE FROM combos WHERE id=?1 AND store_id=?2", params![id, store_id])?;
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

    pub fn get_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, created_at
             FROM orders WHERE store_id=?1 ORDER BY created_at DESC LIMIT 500"
        )?;

        let mut orders: Vec<Order> = stmt.query_map(params![store_id], |row| {
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
                created_at: row.get(18)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        for order in &mut orders {
            let mut item_stmt = self.conn.prepare(
                "SELECT product_id, product_name, price, quantity, discount, tax, metadata FROM order_items WHERE order_id=?1"
            )?;
            order.items = item_stmt.query_map(params![order.id], |row| {
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
                })
            })?.collect::<Result<Vec<_>>>()?;
        }

        Ok(orders)
    }

    pub fn save_order(&self, o: &Order, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        tx.execute(
            "INSERT OR REPLACE INTO orders
             (id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, created_at)
              VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,0,?18)",
            params![
                o.id, store_id, o.subtotal, o.tax_amount, o.discount_amount, o.total,
                o.payment_method, o.amount_paid, o.change_amount,
                o.customer_name, o.status, o.order_type, o.delivery_status,
                o.delivery_address, o.delivery_phone, o.user_id, o.user_name, o.created_at
            ],
        )?;

        tx.execute("DELETE FROM order_items WHERE order_id=?1", params![o.id])?;

        for item in &o.items {
            let metadata_str = item.metadata.as_ref().and_then(|m| serde_json::to_string(m).ok());
            tx.execute(
                "INSERT INTO order_items (order_id, product_id, product_name, price, quantity, discount, tax, metadata)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![o.id, item.product_id, item.product_name, item.price, item.quantity, item.discount, item.tax, metadata_str],
            )?;

            if o.status == "completed" {
                tx.execute(
                    "UPDATE products SET stock = MAX(0, stock - ?1) WHERE id = ?2 AND store_id = ?3",
                    params![item.quantity, item.product_id, store_id],
                )?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    pub fn refund_order(&self, id: &str, store_id: &str, _user_id: &str, _user_name: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;

        let items: Vec<(String, i64)> = tx.prepare("SELECT product_id, quantity FROM order_items WHERE order_id=?1")?
            .query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>>>()?;

        for (product_id, qty) in items {
            tx.execute("UPDATE products SET stock = stock + ?1 WHERE id = ?2 AND store_id = ?3", params![qty, product_id, store_id])?;
        }

        tx.execute("UPDATE orders SET status='refunded' WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn update_delivery_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE orders SET delivery_status=?1 WHERE id=?2 AND store_id=?3", params![status, id, store_id])?;
        Ok(())
    }

    pub fn update_order_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE orders SET status=?1 WHERE id=?2 AND store_id=?3", params![status, id, store_id])?;
        Ok(())
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    pub fn get_settings(&self, store_id: &str) -> Result<Settings> {
        let value: String = self.conn.query_row(
            "SELECT value FROM settings_multi WHERE store_id=?1",
            params![store_id],
            |r| r.get(0),
        ).unwrap_or_else(|_| "{}".to_string());

        let mut s: Settings = serde_json::from_str(&value).unwrap_or_else(|_| self.default_settings());
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
            "SELECT COALESCE(SUM(total),0), COUNT(*), COALESCE(AVG(total),0)
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at, 'localtime')=?2",
            params![store_id, today],
            |r| Ok(DailySummary {
                revenue: r.get(0)?,
                transactions: r.get(1)?,
                avg_order: r.get(2)?,
                items_sold: 0,
            })
        )
    }

    pub fn get_weekly_revenue(&self, store_id: &str) -> Result<Vec<DayRevenue>> {
        let mut days = Vec::new();
        for i in (0..7).rev() {
            let date = (chrono::Local::now() - chrono::Duration::days(i)).format("%Y-%m-%d").to_string();
            let label = (chrono::Local::now() - chrono::Duration::days(i)).format("%a").to_string();
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
             GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5"
        )?;
        let items = stmt.query_map(params![store_id], |r| {
            Ok(TopProduct { name: r.get(0)?, qty: r.get(1)?, revenue: r.get(2)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_low_stock(&self, store_id: &str) -> Result<Vec<LowStockItem>> {
        let mut stmt = self.conn.prepare("SELECT name, stock FROM products WHERE store_id=?1 AND stock <= 10 ORDER BY stock ASC LIMIT 10")?;
        let items = stmt.query_map(params![store_id], |r| {
            Ok(LowStockItem { name: r.get(0)?, stock: r.get(1)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_sales_by_payment_method(&self, date: &str, store_id: &str) -> Result<(f64, f64, f64)> {
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
        let mut csv = "id,name,price,category,stock,barcode,tax\n".to_string();
        for p in products {
            csv.push_str(&format!("{},{},{},{},{},{},{}\n", p.id, p.name, p.price, p.category, p.stock, p.barcode, p.tax));
        }
        Ok(csv)
    }

    pub fn export_orders_csv(&self, store_id: &str) -> Result<String> {
        let orders = self.get_orders(store_id)?;
        let mut csv = "id,total,payment_method,customer,created_at\n".to_string();
        for o in orders {
            csv.push_str(&format!("{},{},{},{},{}\n", o.id, o.total, o.payment_method, o.customer_name, o.created_at));
        }
        Ok(csv)
    }

    pub fn import_products_csv(&self, csv_data: &str, store_id: &str) -> Result<(i64, i64)> {
        let mut imported = 0;
        let mut errors = 0;
        let lines: Vec<&str> = csv_data.split('\n').collect();
        for line in lines.iter().skip(1) {
            if line.trim().is_empty() { continue; }
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() < 7 { errors += 1; continue; }
            let p = Product {
                id: parts[0].to_string(),
                store_id: store_id.to_string(),
                name: parts[1].to_string(),
                price: parts[2].parse().unwrap_or(0.0),
                category: parts[3].to_string(),
                stock: parts[4].parse().unwrap_or(0),
                barcode: parts[5].to_string(),
                tax: parts[6].parse().unwrap_or(0.0),
                image_url: None,
                created_at: None,
            };
            if self.upsert_product(&p, store_id).is_ok() { imported += 1; } else { errors += 1; }
        }
        Ok((imported, errors))
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
        let tables = stmt.query_map(params![store_id], |row| {
            Ok(Table {
                id: row.get(0)?,
                store_id: row.get(1)?,
                name: row.get(2)?,
                capacity: row.get(3)?,
                status: row.get(4)?,
                position_x: row.get(5)?,
                position_y: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
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

    pub fn delete_table(&self, id: &str, store_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM tables WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn update_table_status(&self, id: &str, status: &str, store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE tables SET status=?1 WHERE id=?2 AND store_id=?3", params![status, id, store_id])?;
        Ok(())
    }

    // ─── Others (Simplified) ──────────────────────────────────────────────────

    pub fn get_customers(&self, store_id: &str) -> Result<Vec<Customer>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, phone, email, loyalty_points, total_spent, visits, created_at FROM customers WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(Customer {
                id: row.get(0)?, store_id: row.get(1)?, name: row.get(2)?, phone: row.get(3)?, email: row.get(4)?,
                loyalty_points: row.get(5)?, total_spent: row.get(6)?, visits: row.get(7)?, created_at: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_customer(&self, c: &Customer, store_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO customers (id, store_id, name, phone, email) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email",
            params![c.id, store_id, c.name, c.phone, c.email],
        )?;
        Ok(())
    }

    pub fn get_customer_by_phone(&self, phone: &str, store_id: &str) -> Result<Option<Customer>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, phone, email, loyalty_points, total_spent, visits, created_at FROM customers WHERE phone=?1 AND store_id=?2")?;
        let res = stmt.query_row(params![phone, store_id], |row| {
            Ok(Customer {
                id: row.get(0)?, store_id: row.get(1)?, name: row.get(2)?, phone: row.get(3)?, email: row.get(4)?,
                loyalty_points: row.get(5)?, total_spent: row.get(6)?, visits: row.get(7)?, created_at: row.get(8)?,
            })
        });
        match res { Ok(c) => Ok(Some(c)), Err(_) => Ok(None) }
    }

    pub fn add_loyalty_points(&self, id: &str, points: i32, spent: f64, store_id: &str) -> Result<()> {
        self.conn.execute(
            "UPDATE customers SET loyalty_points = loyalty_points + ?1, total_spent = total_spent + ?2, visits = visits + 1 WHERE id=?3 AND store_id=?4",
            params![points, spent, id, store_id],
        )?;
        Ok(())
    }

    pub fn get_customer_orders(&self, phone: &str, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare("SELECT id FROM orders WHERE delivery_phone=?1 AND store_id=?2")?;
        let ids: Vec<String> = stmt.query_map(params![phone, store_id], |r| r.get(0))?.collect::<Result<Vec<_>>>()?;
        let mut res = Vec::new();
        for id in ids {
            if let Ok(mut o) = self.get_order_by_id(&id, store_id) {
                res.push(o);
            }
        }
        Ok(res)
    }

    fn get_order_by_id(&self, id: &str, store_id: &str) -> Result<Order> {
        self.conn.query_row(
            "SELECT id, store_id, subtotal, tax_amount, discount_amount, total, payment_method, amount_paid, change_amount, customer_name, status, order_type, delivery_status, delivery_address, delivery_phone, user_id, user_name, synced, created_at
             FROM orders WHERE id=?1 AND store_id=?2",
            params![id, store_id],
            |row| {
