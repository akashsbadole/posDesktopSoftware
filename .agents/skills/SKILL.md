---
name: pos-billing
description: "Use this skill for all feature development, architecture decisions, schema design, and state management for the POS Billing desktop application. Triggers: any mention of 'POS', 'billing app', 'Tauri', 'restaurant POS', 'KDS', 'kitchen display', 'table management', 'inventory', 'loyalty points', 'cloud sync', 'Neon PostgreSQL', 'SQLite schema', 'Zustand store', 'Rust command', or any feature from the POS feature list. Also use when adding new screens, new Tauri invoke commands, new SQLite tables, new Zustand stores, or integrating new hardware. Do NOT use for generic Next.js, React, or Rust tasks unrelated to this POS application."
---

# POS Billing — Full Stack Desktop App Skill

## Project Identity

A fully offline-capable, restaurant-grade Point of Sale desktop application.
Built with **Tauri 1.x** (Rust backend) + **Next.js 16** (React frontend) + **SQLite** (local DB) + **Neon PostgreSQL** (cloud sync).

---

## Tech Stack Quick Reference

| Layer | Technology | Notes |
|-------|-----------|-------|
| Desktop shell | Tauri 1.x | Rust-powered, cross-platform |
| Frontend | Next.js 16, React, TypeScript | App Router |
| Styling | Tailwind CSS | Dark mode via CSS variables |
| Icons | Lucide React | |
| State | Zustand | Runtime cache over SQLite |
| Local DB | SQLite via rusqlite | WAL mode, FK constraints |
| Cloud DB | Neon PostgreSQL | Manual push/pull sync |
| ID generation | UUID | All primary keys |
| Receipt sharing | Print, File, WhatsApp, Email | via Tauri APIs |

---

## Project Structure

```
pos-tauri/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx                # Entry point, renders active screen
│   └── globals.css             # CSS variables for theming
├── components/                 # All React screens
│   ├── POSScreen.tsx           # Main POS checkout
│   ├── Sidebar.tsx             # Navigation + keyboard shortcuts
│   ├── LoginScreen.tsx         # PIN authentication
│   ├── OrdersScreen.tsx        # Order list + delivery status
│   ├── ProductsScreen.tsx      # Product CRUD
│   ├── DashboardScreen.tsx     # Revenue + alerts
│   ├── ReportsScreen.tsx       # Basic reports
│   ├── EnhancedReports.tsx     # Hourly, staff, item-wise reports
│   ├── SettingsScreen.tsx      # Tax, theme, sync settings
│   ├── TableManager.tsx        # Table grid + status
│   ├── StaffAttendance.tsx     # Clock in/out + scheduling
│   ├── CustomerCRM.tsx         # Customer DB + loyalty
│   └── CrashRecovery.tsx       # Pending order detection on startup
├── lib/
│   ├── db.ts                   # All Tauri invoke wrappers
│   ├── keyboard.ts             # Global keyboard shortcut handler
│   └── stores/                 # Zustand stores (see State Management)
│       ├── index.ts            # Re-exports all stores
│       ├── authStore.ts
│       ├── cartStore.ts
│       ├── productsStore.ts
│       ├── ordersStore.ts
│       ├── tablesStore.ts
│       ├── alertsStore.ts
│       ├── settingsStore.ts
│       └── staffStore.ts
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri command registrations
│   │   ├── db.rs               # All SQLite operations
│   │   └── neon.rs             # Neon PostgreSQL sync
│   └── tauri.conf.json
└── package.json
```

---

## Architecture Principles

### Data Flow
```
SQLite (source of truth)
    ↕ Tauri invoke (IPC)
Zustand stores (runtime cache)
    ↕ React hooks
React components (UI)
```

### Golden Rules
1. **SQLite is always source of truth** — Zustand is a cache, never the authority
2. **All DB calls go through Rust** — Never query SQLite from JS directly
3. **Tauri invoke wrappers live in `lib/db.ts`** — Components never call `invoke` directly
4. **Store actions own the invoke calls** — Components call store actions, not `lib/db.ts` directly
5. **Optimistic updates for cart** — Update store immediately, roll back on Rust error
6. **No transaction deletion** — Only refunds allowed; audit trail is immutable

---

## SQLite Schema

### Core Tables

```sql
-- Products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT,
  barcode TEXT,
  stock INTEGER DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  order_type TEXT CHECK(order_type IN ('dine_in','takeaway','delivery')),
  table_id TEXT,
  status TEXT DEFAULT 'pending',
  subtotal REAL,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total REAL,
  payment_method TEXT,
  delivery_address TEXT,
  delivery_status TEXT CHECK(delivery_status IN ('pending','out_for_delivery','delivered')),
  notes TEXT,
  staff_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(table_id) REFERENCES tables(id),
  FOREIGN KEY(staff_id) REFERENCES staff(id)
);

-- Order Items
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  modifiers TEXT,
  discount REAL DEFAULT 0,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Tables
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT CHECK(status IN ('available','occupied','reserved')) DEFAULT 'available'
);

-- Staff
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','cashier')) DEFAULT 'cashier',
  active INTEGER DEFAULT 1
);

-- Attendance
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  clock_in TEXT,
  clock_out TEXT,
  date TEXT,
  FOREIGN KEY(staff_id) REFERENCES staff(id)
);

-- Customers
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alerts
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  type TEXT CHECK(type IN ('low_stock','out_of_stock')),
  product_id TEXT,
  message TEXT,
  cleared INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs (IMMUTABLE — never delete)
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  staff_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Refunds
CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
  requested_by TEXT,
  approved_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

-- Hold Orders
CREATE TABLE held_orders (
  id TEXT PRIMARY KEY,
  cart_data TEXT NOT NULL,
  customer_name TEXT,
  table_id TEXT,
  order_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Upcoming Feature Tables

```sql
-- Ingredients (for ingredient-based inventory)
CREATE TABLE ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stock REAL DEFAULT 0,
  unit TEXT,
  reorder_level REAL DEFAULT 0
);

-- Recipe (product → ingredients mapping)
CREATE TABLE recipe (
  product_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  PRIMARY KEY(product_id, ingredient_id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
);

-- Reservations
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  customer_name TEXT,
  phone TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  party_size INTEGER,
  status TEXT CHECK(status IN ('confirmed','cancelled','seated')) DEFAULT 'confirmed',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(table_id) REFERENCES tables(id)
);

-- Suppliers
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('draft','sent','received','cancelled')) DEFAULT 'draft',
  total REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

-- Purchase Order Items
CREATE TABLE po_items (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost REAL NOT NULL,
  FOREIGN KEY(po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Shifts (employee scheduling)
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  role TEXT,
  notes TEXT,
  FOREIGN KEY(staff_id) REFERENCES staff(id)
);

-- Settings (key-value store)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes (Always Add These)

```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, date);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
```

---

## Zustand State Management

### Store Structure

All stores live in `lib/stores/`. Each store follows this pattern:
- State fields (data)
- Loading/error flags
- Actions (fetch from SQLite, mutations, derived computations)
- Selectors (computed values, never stored)

### Store Responsibilities

**authStore** — Current session
- Fields: `staff`, `role`, `sessionStart`, `isAuthenticated`
- Actions: `login(pin)`, `logout()`
- Persisted: yes (sessionStorage only)

**cartStore** — Active transaction (most critical store)
- Fields: `items`, `orderType`, `tableId`, `customerId`, `customerName`, `discount`, `notes`, `heldOrderId`
- Actions: `addItem`, `removeItem`, `updateQuantity`, `setDiscount`, `setOrderType`, `setTable`, `holdOrder`, `restoreHeldOrder`, `clearCart`, `checkout`
- Selectors: `subtotal`, `taxTotal`, `grandTotal`, `itemCount`
- Persisted: no (SQLite held_orders handles persistence)
- Update pattern: optimistic update → invoke Rust → rollback on error

**productsStore** — Product catalog cache
- Fields: `products`, `categories`, `loading`, `lastFetched`
- Actions: `fetchProducts()`, `addProduct`, `updateProduct`, `deleteProduct`, `searchProducts(query)`
- Invalidation: re-fetch after any mutation

**ordersStore** — Orders list
- Fields: `orders`, `filters` (date range, status, type), `selectedOrder`, `loading`
- Actions: `fetchOrders(filters)`, `updateDeliveryStatus`, `cancelOrder`, `requestRefund`

**tablesStore** — Table grid state
- Fields: `tables`, `loading`
- Actions: `fetchTables()`, `updateTableStatus`, `addTable`, `editTable`, `deleteTable`
- Keep in sync: when order assigned to table → update table status immediately

**alertsStore** — Stock notifications
- Fields: `alerts`, `unreadCount`
- Actions: `fetchAlerts()`, `clearAlert`, `clearAll`
- Polling: fetch every 60 seconds in background

**settingsStore** — App configuration
- Fields: `taxRate`, `gstType`, `darkMode`, `branchName`, `printerConfig`, `lowStockThreshold`
- Actions: `loadSettings()`, `updateSetting(key, value)`
- Persisted: yes (localStorage as backup to SQLite settings table)

**staffStore** — Staff and attendance
- Fields: `staff`, `todayAttendance`, `loading`
- Actions: `fetchStaff()`, `clockIn(staffId)`, `clockOut(staffId)`, `fetchTodayAttendance()`

### What NOT to Put in Zustand
- Modal open/close flags → local component state
- Form input values → local component state
- Receipt content → local component state
- Temporary UI hover/focus state → local component state

### Persistence Rules
- Use `zustand/middleware` `persist` ONLY for: `settingsStore`, `authStore`
- All other stores re-hydrate from SQLite on app start
- SQLite is always the source of truth

---

## Tauri Rust Commands

### Command Registration Pattern (main.rs)

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Products
            get_products, add_product, update_product, delete_product,
            // Orders
            get_orders, create_order, update_order_status, cancel_order,
            // Cart
            checkout, hold_order, get_held_orders, restore_held_order,
            // Tables
            get_tables, update_table_status,
            // Staff
            authenticate_staff, clock_in, clock_out, get_attendance,
            // Customers
            get_customers, upsert_customer, get_customer_by_phone,
            // Reports
            get_daily_report, get_sales_by_range, get_hourly_sales,
            // Alerts
            get_alerts, clear_alert,
            // Sync
            sync_to_neon, sync_from_neon,
            // Settings
            get_settings, update_setting,
            // Logs
            get_activity_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Invoke Wrapper Pattern (lib/db.ts)

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export const db = {
  products: {
    getAll: () => invoke<Product[]>('get_products'),
    add: (p: NewProduct) => invoke<Product>('add_product', { product: p }),
    update: (p: Product) => invoke<void>('update_product', { product: p }),
    delete: (id: string) => invoke<void>('delete_product', { id }),
  },
  orders: {
    getAll: (filters?: OrderFilters) => invoke<Order[]>('get_orders', { filters }),
    create: (order: NewOrder) => invoke<Order>('create_order', { order }),
    updateStatus: (id: string, status: string) =>
      invoke<void>('update_order_status', { id, status }),
  },
  // ... etc
};
```

### Rust DB Operation Pattern (db.rs)

```rust
#[tauri::command]
pub fn get_products(state: tauri::State<DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, price, category, barcode, stock, tax_rate FROM products ORDER BY category, name"
    ).map_err(|e| e.to_string())?;
    // ... map rows to structs
}
```

---

## Feature Implementation Guides

### KDS (Kitchen Display System)

**Approach**: Second Tauri window with IPC events

```rust
// Open KDS window
tauri::WindowBuilder::new(app, "kitchen", tauri::WindowUrl::App("kitchen".into()))
    .title("Kitchen Display")
    .always_on_top(true)
    .build()?;

// Emit new order to KDS window
app.get_window("kitchen")
    .unwrap()
    .emit("new_order", &order)?;
```

- KDS window listens for `new_order` Tauri events
- Chef marks items done → emits back `item_ready` event
- No internet required — pure local IPC

### Ingredient-Based Inventory

**Flow**: Order placed → Rust looks up recipe → deducts ingredient stock

```rust
// In create_order command, after saving order:
fn deduct_ingredients(conn: &Connection, order_items: &[OrderItem]) -> Result<(), String> {
    for item in order_items {
        let ingredients = get_recipe(conn, &item.product_id)?;
        for ing in ingredients {
            conn.execute(
                "UPDATE ingredients SET stock = stock - ?1 WHERE id = ?2",
                params![ing.quantity * item.quantity as f64, ing.ingredient_id],
            )?;
        }
    }
    Ok(())
}
```

### Table Reservations

**New screen**: Add `ReservationsScreen.tsx` component
**Flow**: Reservation created → shows on table grid with time indicator
**Table grid update**: tablesStore shows reservation badge when `reservations` table has entry for today

### Real-Time LAN Sync

**Approach**: One device runs embedded HTTP server (Axum/tiny-http in Rust), others poll

```rust
// Server device: expose local endpoint
// Client devices: poll http://192.168.x.x:8765/orders every 30s
// Fallback: continue with Neon PostgreSQL manual sync
```

### Multi-Branch

**Schema change**: Add `branch_id TEXT` column to `orders`, `products`, `inventory`

```sql
ALTER TABLE orders ADD COLUMN branch_id TEXT DEFAULT 'main';
```

- `branch_id` stored in settings table on each install
- Neon PostgreSQL uses separate schema per branch
- Cloud reports query across all schemas

---

## Security Model

| Role | PIN | Access |
|------|-----|--------|
| Admin | 1234 (configurable) | All features including settings, reports, logs, refund approval |
| Cashier | 0000 (configurable) | POS, orders, basic product view only |

### Rules
- No order/transaction deletion — only refunds
- All mutations logged to `activity_logs` with `reason` required
- `activity_logs` has no DELETE command registered in Rust
- Refunds require admin approval (two-step: request → approve)
- GSTR-3B compliance: tax stored per order item, not just order total

---

## GST / Tax Configuration

| Type | Rate | Use Case |
|------|------|----------|
| No GST | 0% | Exempt items |
| GST No ITC | 5% | Unregistered businesses |
| GST With ITC | 18% | Registered businesses |

- Global tax rate set in Settings → `settings` table
- Per-product override stored in `products.tax_rate`
- Tax calculated in Rust during checkout, stored in `orders.tax`

---

## Hardware Integration

| Hardware | Integration Method |
|----------|-------------------|
| Thermal printer | Tauri print API / system print dialog |
| Cash drawer | Serial command via Tauri shell plugin on payment |
| Barcode scanner | USB HID → keyboard input → search bar auto-capture |
| Second monitor (KDS) | Tauri second window |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F1 | POS screen |
| F2 | Dashboard |
| F3 | Orders |
| F4 | Products |
| F5 | Reports |
| F6 | Logs |
| F7 | Settings |
| ? | Shortcuts help |
| C | Clear cart |
| P | Process checkout |
| 1 | Dine In |
| 2 | Takeaway |
| 3 | Delivery |
| Enter | Search barcode |
| Escape | Clear search |

All shortcuts registered in `lib/keyboard.ts` and active when no input is focused.

---

## Cloud Sync (Neon PostgreSQL)

### Sync Direction
- **Upload**: Local SQLite orders → Neon (push on demand)
- **Download**: Neon orders → Local SQLite (pull on demand)
- **Conflict resolution**: Last-write-wins by `created_at` timestamp

### Sync Command (neon.rs)
```rust
#[tauri::command]
pub async fn sync_to_neon(state: tauri::State<'_, DbState>) -> Result<SyncResult, String> {
    // 1. Get unsynced orders from SQLite (no sync_at timestamp)
    // 2. Batch insert to Neon via postgres crate
    // 3. Mark orders as synced in SQLite
    // 4. Return count of synced records
}
```

---

## Receipt Format

```
[Restaurant Name]
[Address]
GST: [GSTIN]
------------------------
Receipt #: [order_id short]
Date: [datetime]
Staff: [staff_name]
Table: [table_name] | [order_type]
------------------------
[Item Name]     x[qty]  ₹[price]
...
------------------------
Subtotal:       ₹[subtotal]
Discount:       -₹[discount]
GST ([rate]%):  ₹[tax]
TOTAL:          ₹[total]
------------------------
Payment: [method]
------------------------
Thank you! Visit again.
```

---

## Performance Guidelines

- All product search is client-side (products cached in Zustand)
- SQLite WAL mode enabled — concurrent reads don't block writes
- `memory_temp_store = MEMORY` pragma set on connection init
- Indexes on: `orders.created_at`, `products.barcode`, `customers.phone`
- Never fetch all orders without date filter — always paginate or filter by date range

---

## Data Export

| Export Type | Format | Content |
|-------------|--------|---------|
| Products | CSV | All product fields |
| Orders | CSV | Orders with items flattened |
| Full backup | JSON | All tables serialized |

---

## Future Features Roadmap

| Feature | Effort | Approach |
|---------|--------|---------|
| Table Reservations | Low | New SQLite table + UI |
| Ingredient Inventory | Medium | recipe + ingredients tables |
| KDS Second Window | Medium | Tauri second window + IPC events |
| Supplier + PO | Medium | New SQLite tables + screen |
| Employee Scheduling | Low | shifts table + calendar UI |
| LAN Real-Time Sync | High | Embedded Axum HTTP server in Rust |
| Multi-Branch | High | branch_id column + Neon schema per branch |
| SMS Notifications | Medium | Tauri shell → Twilio HTTP API |
| Loyalty Tiers | Low | tier thresholds in settings + customer.tier field |
| Voice Input | High | Tauri plugin + OS speech API |

---

## Common Pitfalls

- **Never call `invoke` directly from components** — always go through store actions
- **Never delete from `activity_logs`** — no DELETE command should exist in Rust for this table
- **Always use UUID for IDs** — never use SQLite auto-increment integers
- **Wrap all Rust commands in Result<T, String>** — frontend needs the error string
- **Always check stock before adding to cart** — validate in both Rust and store
- **Persist settings to both SQLite and localStorage** — localStorage is fallback only
- **Cart total is always computed, never stored in Zustand** — derive from items array
- **Dark mode via CSS variables only** — never hardcode colors in components