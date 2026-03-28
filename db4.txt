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
        let items = stmt.query_map(params![store_id, date], |row| {
            Ok(StaffAttendance {
                id: row.get(0)?, store_id: row.get(1)?, user_id: row.get(2)?, user_name: row.get(3)?,
                clock_in: row.get(4)?, clock_out: row.get(5)?, date: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
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
        let items = stmt.query_map(params![store_id, limit], |row| {
            Ok(ActivityLog {
                id: row.get(0)?, store_id: row.get(1)?, order_id: row.get(2)?, action: row.get(3)?,
                previous_data: row.get(4)?, new_data: row.get(5)?, reason: row.get(6)?,
                user_id: row.get(7)?, user_name: row.get(8)?, created_at: row.get(9)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn export_backup(&self, store_id: &str) -> Result<String> {
        let products = self.get_products(store_id)?;
        let orders = self.get_orders(store_id)?;
        let settings = self.get_settings(store_id)?;
        let data = BackupData { products, orders, settings, exported_at: chrono::Local::now().to_rfc3339() };
        Ok(serde_json::to_string(&data).unwrap_or_default())
    }

    pub fn import_backup(&self, backup: &str, store_id: &str) -> Result<ImportResult> {
        let data: BackupData = serde_json::from_str(backup).map_err(|_| rusqlite::Error::InvalidQuery)?;
        for p in data.products { let _ = self.upsert_product(&p, store_id); }
        for o in data.orders { let _ = self.save_order(&o, store_id); }
        Ok(ImportResult { products_imported: 0, orders_imported: 0 })
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
        let items = stmt.query_map(params![order_id, store_id], |row| {
            Ok(OrderNote { id: row.get(0)?, store_id: row.get(1)?, order_id: row.get(2)?, note: row.get(3)?, created_at: row.get(4)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_inventory_alerts(&self, store_id: &str) -> Result<Vec<InventoryAlert>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, product_id, product_name, current_stock, threshold, alert_type, created_at FROM inventory_alerts WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(InventoryAlert {
                id: row.get(0)?, store_id: row.get(1)?, product_id: row.get(2)?, product_name: row.get(3)?,
                current_stock: row.get(4)?, threshold: row.get(5)?, alert_type: row.get(6)?, created_at: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn check_inventory_alerts(&self, store_id: &str) -> Result<Vec<InventoryAlert>> {
        let products = self.get_products(store_id)?;
        let mut alerts = Vec::new();
        for p in products {
            if p.stock <= 10 {
                let alert = InventoryAlert {
                    id: uuid::Uuid::new_v4().to_string(), store_id: store_id.into(), product_id: p.id,
                    product_name: p.name, current_stock: p.stock as i32, threshold: 10,
                    alert_type: "low_stock".into(), created_at: chrono::Local::now().to_rfc3339(),
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
        self.conn.execute("DELETE FROM inventory_alerts WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn get_hourly_sales(&self, date: &str, store_id: &str) -> Result<Vec<HourlySales>> {
        let mut stmt = self.conn.prepare(
            "SELECT strftime('%H', created_at) as hour, SUM(total) as revenue, COUNT(*) as orders
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) = ?2 GROUP BY hour"
        )?;
        let items = stmt.query_map(params![store_id, date], |row| {
            Ok(HourlySales { hour: row.get::<_, String>(0)?.parse().unwrap_or(0), revenue: row.get(1)?, orders: row.get(2)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_staff_performance(&self, start: &str, end: &str, store_id: &str) -> Result<Vec<StaffPerformance>> {
        let mut stmt = self.conn.prepare(
            "SELECT user_id, user_name, COUNT(*) as orders, SUM(total) as revenue
             FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) BETWEEN ?2 AND ?3 GROUP BY user_id"
        )?;
        let items = stmt.query_map(params![store_id, start, end], |row| {
            Ok(StaffPerformance { user_id: row.get(0)?, user_name: row.get(1)?, total_orders: row.get(2)?, total_revenue: row.get(3)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_sales_by_item(&self, start: &str, end: &str, store_id: &str) -> Result<Vec<SalesByItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT oi.product_id, oi.product_name, SUM(oi.quantity), SUM(oi.price*oi.quantity)
             FROM order_items oi JOIN orders o ON o.id=oi.order_id
             WHERE o.store_id=?1 AND o.status='completed' AND DATE(o.created_at) BETWEEN ?2 AND ?3
             GROUP BY oi.product_id"
        )?;
        let items = stmt.query_map(params![store_id, start, end], |row| {
            Ok(SalesByItem { product_id: row.get(0)?, product_name: row.get(1)?, quantity: row.get(2)?, revenue: row.get(3)? })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn hold_order(&self, o: &Order, store_id: &str) -> Result<()> {
        let mut order = o.clone();
        order.status = "hold".into();
        self.save_order(&order, store_id)
    }

    pub fn get_held_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let all = self.get_orders(store_id)?;
        Ok(all.into_iter().filter(|o| o.status == "hold").collect())
    }

    pub fn cancel_order(&self, id: &str, reason: &str, user_id: &str, user_name: &str, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("UPDATE orders SET status='cancelled' WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        tx.execute(
            "INSERT INTO activity_logs (id, store_id, order_id, action, reason, user_id, user_name) VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![uuid::Uuid::new_v4().to_string(), store_id, id, "cancel", reason, user_id, user_name],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn create_refund_request(&self, order_id: &str, amount: f64, reason: &str, store_id: &str) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO refund_requests (id, store_id, order_id, amount, reason) VALUES (?1,?2,?3,?4,?5)",
            params![id, store_id, order_id, amount, reason],
        )?;
        Ok(id)
    }

    pub fn get_refund_requests(&self, store_id: &str) -> Result<Vec<RefundRequest>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, order_id, amount, reason, status, created_at FROM refund_requests WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(RefundRequest {
                id: row.get(0)?, store_id: row.get(1)?, order_id: row.get(2)?, amount: row.get(3)?,
                reason: row.get(4)?, status: row.get(5)?, created_at: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn approve_refund(&self, id: &str, user_id: &str, user_name: &str, store_id: &str) -> Result<()> {
        let order_id: String = self.conn.query_row("SELECT order_id FROM refund_requests WHERE id=?1", params![id], |r| r.get(0))?;
        self.refund_order(&order_id, store_id, user_id, user_name)?;
        self.conn.execute("UPDATE refund_requests SET status='approved' WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn reject_refund(&self, id: &str, _store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE refund_requests SET status='rejected' WHERE id=?1", params![id])?;
        Ok(())
    }

    pub fn get_unsynced_orders(&self, store_id: &str) -> Result<Vec<Order>> {
        let mut stmt = self.conn.prepare("SELECT id FROM orders WHERE store_id=?1 AND synced=0")?;
        let ids: Vec<String> = stmt.query_map(params![store_id], |r| r.get(0))?.collect::<Result<Vec<_>>>()?;
        let mut res = Vec::new();
        for id in ids {
            if let Ok(o) = self.get_order_by_id(&id, store_id) { res.push(o); }
        }
        Ok(res)
    }

    pub fn mark_orders_synced(&self, store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE orders SET synced=1 WHERE store_id=?1", params![store_id])?;
        Ok(())
    }

    pub fn get_ingredients(&self, store_id: &str) -> Result<Vec<Ingredient>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, name, stock, unit, reorder_level, created_at FROM ingredients WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(Ingredient {
                id: row.get(0)?, store_id: row.get(1)?, name: row.get(2)?, stock: row.get(3)?,
                unit: row.get(4)?, reorder_level: row.get(5)?, created_at: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
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
        self.conn.execute("DELETE FROM ingredients WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn get_recipes(&self, store_id: &str) -> Result<Vec<Recipe>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, product_id, ingredient_id, quantity FROM recipes WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(Recipe {
                id: row.get(0)?, store_id: row.get(1)?, product_id: row.get(2)?, ingredient_id: row.get(3)?, quantity: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
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
        let items = stmt.query_map(params![store_id], |row| {
            Ok(Supplier {
                id: row.get(0)?, store_id: row.get(1)?, name: row.get(2)?, phone: row.get(3)?, email: row.get(4)?, address: row.get(5)?, created_at: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
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
        self.conn.execute("DELETE FROM suppliers WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn get_purchase_orders(&self, store_id: &str) -> Result<Vec<PurchaseOrder>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, supplier_id, status, total, notes, created_at FROM purchase_orders WHERE store_id=?1")?;
        let items = stmt.query_map(params![store_id], |row| {
            Ok(PurchaseOrder {
                id: row.get(0)?, store_id: row.get(1)?, supplier_id: row.get(2)?, supplier_name: "".into(), status: row.get(3)?, total: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?, items: vec![],
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn save_purchase_order(&self, po: &PurchaseOrder, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute(
            "INSERT INTO purchase_orders (id, store_id, supplier_id, status, total, notes) VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET status=excluded.status, total=excluded.total, notes=excluded.notes",
            params![po.id, store_id, po.supplier_id, po.status, po.total, po.notes],
        )?;
        tx.execute("DELETE FROM purchase_order_items WHERE po_id=?1", params![po.id])?;
        for item in &po.items {
            tx.execute(
                "INSERT INTO purchase_order_items (id, po_id, ingredient_id, quantity, unit_cost) VALUES (?1,?2,?3,?4,?5)",
                params![uuid::Uuid::new_v4().to_string(), po.id, item.ingredient_id, item.quantity, item.unit_cost],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn update_po_status(&self, id: &str, status: &str, _store_id: &str) -> Result<()> {
        self.conn.execute("UPDATE purchase_orders SET status=?1 WHERE id=?2", params![status, id])?;
        Ok(())
    }

    pub fn receive_purchase_order(&self, id: &str, store_id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        let items: Vec<(String, f64)> = tx.prepare("SELECT ingredient_id, quantity FROM purchase_order_items WHERE po_id=?1")?
            .query_map(params![id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>>>()?;
        for (ing_id, qty) in items {
            tx.execute("UPDATE ingredients SET stock = stock + ?1 WHERE id=?2 AND store_id=?3", params![qty, ing_id, store_id])?;
        }
        tx.execute("UPDATE purchase_orders SET status='received' WHERE id=?1", params![id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn get_shifts(&self, date: &str, store_id: &str) -> Result<Vec<Shift>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, staff_id, staff_name, date, start_time, end_time, role, notes FROM shifts WHERE store_id=?1 AND date=?2")?;
        let items = stmt.query_map(params![store_id, date], |row| {
            Ok(Shift {
                id: row.get(0)?, store_id: row.get(1)?, staff_id: row.get(2)?, staff_name: row.get(3)?,
                date: row.get(4)?, start_time: row.get(5)?, end_time: row.get(6)?, role: row.get(7)?, notes: row.get(8)?, created_at: None,
            })
        })?.collect::<Result<Vec<_>>>()?;
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
        self.conn.execute("DELETE FROM shifts WHERE id=?1 AND store_id=?2", params![id, store_id])?;
        Ok(())
    }

    pub fn get_customer_wallet(&self, customer_id: &str) -> Result<CustomerWallet> {
        let mut stmt = self.conn.prepare("SELECT customer_id, balance, total_loaded, total_spent FROM wallet_transactions WHERE customer_id=?1")?;
        // Simplified: aggregate from wallet_transactions
        let balance: f64 = self.conn.query_row("SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions WHERE customer_id=?1", params![customer_id], |r| r.get(0))?;
        Ok(CustomerWallet { customer_id: customer_id.into(), balance, total_loaded: 0.0, total_spent: 0.0 })
    }

    pub fn add_wallet_balance(&self, customer_id: &str, amount: f64, notes: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, notes) VALUES (?1,?2,?3,?4,?5)",
            params![uuid::Uuid::new_v4().to_string(), customer_id, amount, "load", notes],
        )?;
        Ok(())
    }

    pub fn deduct_wallet_balance(&self, customer_id: &str, amount: f64, order_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO wallet_transactions (id, customer_id, amount, transaction_type, order_id, notes) VALUES (?1,?2,?3,?4,?5,?6)",
            params![uuid::Uuid::new_v4().to_string(), customer_id, -amount, "spent", order_id, "Order payment"],
        )?;
        Ok(())
    }

    pub fn get_wallet_transactions(&self, customer_id: &str) -> Result<Vec<WalletTransaction>> {
        let mut stmt = self.conn.prepare("SELECT id, customer_id, amount, transaction_type, order_id, notes, created_at, store_id FROM wallet_transactions WHERE customer_id=?1 ORDER BY created_at DESC")?;
        let items = stmt.query_map(params![customer_id], |row| {
            Ok(WalletTransaction {
                id: row.get(0)?, customer_id: row.get(1)?, amount: row.get(2)?, transaction_type: row.get(3)?, order_id: row.get(4)?, notes: row.get(5)?, created_at: row.get(6)?, store_id: row.get(7)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_gstr1_report(&self, start: &str, end: &str, store_id: &str) -> Result<Vec<GstReport>> {
        let mut stmt = self.conn.prepare(
            "SELECT o.id, o.created_at, o.customer_name, c.email, o.subtotal, 0, 0, 0, o.total, 'Local'
             FROM orders o LEFT JOIN customers c ON o.customer_name = c.name
             WHERE o.store_id=?1 AND o.status='completed' AND DATE(o.created_at) BETWEEN ?2 AND ?3"
        )?;
        let items = stmt.query_map(params![store_id, start, end], |row| {
            Ok(GstReport {
                invoice_no: row.get(0)?, date: row.get(1)?, customer_name: row.get(2)?, customer_gstin: None,
                taxable_value: row.get(4)?, cgst: row.get(5)?, sgst: row.get(6)?, igst: row.get(7)?, total: row.get(8)?, place_of_supply: row.get(9)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn get_gstr3b_report(&self, start: &str, end: &str, store_id: &str) -> Result<(f64, f64, f64, f64, f64, f64)> {
        self.conn.query_row(
            "SELECT SUM(subtotal), SUM(tax_amount), 0, 0, 0, 0 FROM orders WHERE store_id=?1 AND status='completed' AND DATE(created_at) BETWEEN ?2 AND ?3",
            params![store_id, start, end],
            |r| Ok((r.get(0)?, r.get(1)?, 0.0, 0.0, 0.0, 0.0))
        )
    }

    pub fn get_activity_logs_range(&self, start: &str, end: &str, limit: i32, store_id: &str) -> Result<Vec<ActivityLogEntry>> {
        let mut stmt = self.conn.prepare("SELECT id, store_id, action, user_id, user_name, created_at FROM activity_logs WHERE store_id=?1 AND DATE(created_at) BETWEEN ?2 AND ?3 ORDER BY created_at DESC LIMIT ?4")?;
        let items = stmt.query_map(params![store_id, start, end, limit], |row| {
            Ok(ActivityLogEntry {
                id: row.get(0)?, store_id: row.get(1)?, action: row.get(2)?, entity_type: None, entity_id: None, previous_value: None, new_value: None, reason: None, user_id: row.get(3)?, user_name: row.get(4)?, created_at: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>>>()?;
        Ok(items)
    }

    pub fn export_to_tally(&self, _start: &str, _end: &str, _store_id: &str) -> Result<String> { Ok("Tally XML export placeholder".into()) }
    pub fn export_to_quickbooks(&self, _start: &str, _end: &str, _store_id: &str) -> Result<String> { Ok("Quickbooks CSV export placeholder".into()) }
    pub fn create_compressed_backup(&self, store_id: &str) -> Result<Vec<u8>> {
        let backup = self.export_backup(store_id)?;
        Ok(backup.as_bytes().to_vec())
    }
}
