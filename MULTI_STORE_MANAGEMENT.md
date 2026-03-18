# Multi-Store Management Implementation Guide

**Purpose**: Manage multiple stores (restaurants, garment shops, gift stores) from a single POS application.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    POS Application                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Store Selection / Switcher                   │  │
│  │  [Restaurant A] [Garment Store B] [Gift Shop C]     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Active Store Context (Zustand Store)             │  │
│  │  - Current Store ID                                 │  │
│  │  - Store Config (type, features, settings)          │  │
│  │  - Store-specific data (products, orders, etc)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Dynamic UI Rendering                             │  │
│  │  - Show/hide features based on store type           │  │
│  │  - Load store-specific components                   │  │
│  │  - Apply store-specific settings                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    Database Layer (SQLite)                          │  │
│  │  - All data scoped to store_id                       │  │
│  │  - Queries filtered by active store                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Database Schema for Multi-Store

### Core Tables with Store Scoping

```sql
-- Stores table (new)
CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store configuration
CREATE TABLE store_configs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  features JSON,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

-- Products (add store_id)
ALTER TABLE products ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_products_store ON products(store_id);

-- Orders (add store_id)
ALTER TABLE orders ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_orders_store ON orders(store_id);

-- Customers (add store_id)
ALTER TABLE customers ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_customers_store ON customers(store_id);

-- Users (add store_id for staff)
ALTER TABLE users ADD COLUMN store_id TEXT;
CREATE INDEX idx_users_store ON users(store_id);

-- Tables (add store_id)
ALTER TABLE tables ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_tables_store ON tables(store_id);

-- Staff Attendance (add store_id)
ALTER TABLE staff_attendance ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_staff_attendance_store ON staff_attendance(store_id);

-- Activity Logs (add store_id)
ALTER TABLE activity_logs ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_activity_logs_store ON activity_logs(store_id);

-- Settings (add store_id)
ALTER TABLE settings ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX idx_settings_store ON settings(store_id);
```

---

## 2. Zustand Store for Multi-Store Management

### Create Store Context

```typescript
// lib/stores/multiStoreStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Store {
  id: string;
  name: string;
  type: 'food' | 'garment' | 'gift' | 'pharmacy' | 'electronics' | 'retail';
  currency: string;
  timezone: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface StoreConfig {
  id: string;
  store_id: string;
  type: string;
  features: Record<string, boolean>;
  settings: Record<string, any>;
}

interface MultiStoreState {
  // Store management
  stores: Store[];
  activeStoreId: string | null;
  activeStore: Store | null;
  storeConfig: StoreConfig | null;

  // Actions
  setStores: (stores: Store[]) => void;
  setActiveStore: (storeId: string) => void;
  addStore: (store: Store) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => void;
  setStoreConfig: (config: StoreConfig) => void;
  updateStoreConfig: (config: Partial<StoreConfig>) => void;

  // Helpers
  isFeatureEnabled: (feature: string) => boolean;
  getStoreSetting: (key: string) => any;
  updateStoreSetting: (key: string, value: any) => void;
}

export const useMultiStoreStore = create<MultiStoreState>()(
  persist(
    (set, get) => ({
      stores: [],
      activeStoreId: null,
      activeStore: null,
      storeConfig: null,

      setStores: (stores) => set({ stores }),

      setActiveStore: (storeId) => {
        const store = get().stores.find((s) => s.id === storeId);
        if (store) {
          set({ activeStoreId: storeId, activeStore: store });
          // Trigger data reload for new store
          window.dispatchEvent(
            new CustomEvent('storeChanged', { detail: { storeId } })
          );
        }
      },

      addStore: (store) => {
        set((state) => ({
          stores: [...state.stores, store],
        }));
      },

      updateStore: (store) => {
        set((state) => ({
          stores: state.stores.map((s) => (s.id === store.id ? store : s)),
        }));
      },

      deleteStore: (storeId) => {
        set((state) => ({
          stores: state.stores.filter((s) => s.id !== storeId),
          activeStoreId:
            state.activeStoreId === storeId ? null : state.activeStoreId,
        }));
      },

      setStoreConfig: (config) => set({ storeConfig: config }),

      updateStoreConfig: (config) => {
        set((state) => ({
          storeConfig: state.storeConfig
            ? { ...state.storeConfig, ...config }
            : null,
        }));
      },

      isFeatureEnabled: (feature) => {
        const config = get().storeConfig;
        return config?.features?.[feature] ?? false;
      },

      getStoreSetting: (key) => {
        const config = get().storeConfig;
        return config?.settings?.[key];
      },

      updateStoreSetting: (key, value) => {
        set((state) => ({
          storeConfig: state.storeConfig
            ? {
                ...state.storeConfig,
                settings: {
                  ...state.storeConfig.settings,
                  [key]: value,
                },
              }
            : null,
        }));
      },
    }),
    {
      name: 'multi-store-storage',
      partialize: (state) => ({
        activeStoreId: state.activeStoreId,
      }),
    }
  )
);
```

---

## 3. Store Switcher Component

```typescript
// components/StoreSwitcher.tsx
'use client';
import { useEffect } from 'react';
import { ChevronDown, Plus, Settings } from 'lucide-react';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';
import { invoke } from '@tauri-apps/api/tauri';

export function StoreSwitcher() {
  const {
    stores,
    activeStoreId,
    activeStore,
    setStores,
    setActiveStore,
  } = useMultiStoreStore();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const storesList = await invoke('get_all_stores');
      setStores(storesList as any[]);

      // Set first store as active if none selected
      if (!activeStoreId && storesList.length > 0) {
        setActiveStore((storesList as any[])[0].id);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-900 border-b border-gray-800">
      {/* Store Selector */}
      <div className="relative group">
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            {activeStore?.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">
              {activeStore?.name}
            </div>
            <div className="text-xs text-gray-400 capitalize">
              {activeStore?.type}
            </div>
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        <div className="absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-50">
          <div className="p-2 max-h-64 overflow-y-auto">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => setActiveStore(store.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  activeStoreId === store.id
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <div className="font-semibold">{store.name}</div>
                <div className="text-xs text-gray-400 capitalize">
                  {store.type}
                </div>
              </button>
            ))}
          </div>

          {/* Add Store Button */}
          <div className="border-t border-gray-700 p-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 rounded-lg transition">
              <Plus size={16} />
              Add Store
            </button>
          </div>
        </div>
      </div>

      {/* Store Settings */}
      <button className="ml-auto p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white">
        <Settings size={20} />
      </button>
    </div>
  );
}
```

---

## 4. Backend Commands for Multi-Store

```rust
// src-tauri/src/main.rs

#[tauri::command]
fn get_all_stores() -> Result<Vec<Store>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_all_stores().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_store(store: Store) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_store(&store).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_store(store: Store) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_store(&store).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_store(store_id: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.delete_store(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_store_config(store_id: String) -> Result<StoreConfig, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_store_config(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_store_config(config: StoreConfig) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_store_config(&config).map_err(|e| e.to_string())
}

// All existing commands need store_id parameter
#[tauri::command]
fn get_products(store_id: String) -> Result<Vec<Product>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_products_by_store(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_orders(store_id: String) -> Result<Vec<Order>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_orders_by_store(&store_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_customers(store_id: String) -> Result<Vec<Customer>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_customers_by_store(&store_id).map_err(|e| e.to_string())
}
```



---

## 5. Database Layer Implementation (Rust)

```rust
// src-tauri/src/db.rs

impl Database {
    // Store management
    pub fn get_all_stores(&self) -> Result<Vec<Store>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, type, currency, timezone, address, phone, email, logo_url, is_active, created_at 
             FROM stores WHERE is_active = 1 ORDER BY name"
        )?;
        
        let stores = stmt.query_map([], |row| {
            Ok(Store {
                id: row.get(0)?,
                name: row.get(1)?,
                type_: row.get(2)?,
                currency: row.get(3)?,
                timezone: row.get(4)?,
                address: row.get(5)?,
                phone: row.get(6)?,
                email: row.get(7)?,
                logo_url: row.get(8)?,
                is_active: row.get(9)?,
                created_at: row.get(10)?,
            })
        })?;

        let mut result = Vec::new();
        for store in stores {
            result.push(store?);
        }
        Ok(result)
    }

    pub fn create_store(&self, store: &Store) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT INTO stores (id, name, type, currency, timezone, address, phone, email, logo_url, is_active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                store.id,
                store.name,
                store.type_,
                store.currency,
                store.timezone,
                store.address,
                store.phone,
                store.email,
                store.logo_url,
                store.is_active,
            ],
        )?;
        Ok(())
    }

    // Scoped queries
    pub fn get_products_by_store(&self, store_id: &str) -> Result<Vec<Product>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, price, category, stock, barcode, tax, store_id, created_at 
             FROM products WHERE store_id = ?1 ORDER BY name"
        )?;
        
        let products = stmt.query_map([store_id], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                price: row.get(2)?,
                category: row.get(3)?,
                stock: row.get(4)?,
                barcode: row.get(5)?,
                tax: row.get(6)?,
                store_id: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;

        let mut result = Vec::new();
        for product in products {
            result.push(product?);
        }
        Ok(result)
    }

    pub fn get_orders_by_store(&self, store_id: &str) -> Result<Vec<Order>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, items, subtotal, tax_amount, discount_amount, total, payment_method, 
                    amount_paid, change_amount, customer_name, status, order_type, created_at, store_id
             FROM orders WHERE store_id = ?1 ORDER BY created_at DESC"
        )?;
        
        let orders = stmt.query_map([store_id], |row| {
            Ok(Order {
                id: row.get(0)?,
                items: serde_json::from_str(&row.get::<_, String>(1)?).unwrap_or_default(),
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
                created_at: row.get(12)?,
                store_id: row.get(13)?,
            })
        })?;

        let mut result = Vec::new();
        for order in orders {
            result.push(order?);
        }
        Ok(result)
    }

    pub fn upsert_product(&self, product: &Product) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT OR REPLACE INTO products 
             (id, name, price, category, stock, barcode, tax, store_id, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                product.id,
                product.name,
                product.price,
                product.category,
                product.stock,
                product.barcode,
                product.tax,
                product.store_id,
                product.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn save_order(&self, order: &Order) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "INSERT OR REPLACE INTO orders 
             (id, items, subtotal, tax_amount, discount_amount, total, payment_method, 
              amount_paid, change_amount, customer_name, status, order_type, created_at, store_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            rusqlite::params![
                order.id,
                serde_json::to_string(&order.items).unwrap_or_default(),
                order.subtotal,
                order.tax_amount,
                order.discount_amount,
                order.total,
                order.payment_method,
                order.amount_paid,
                order.change_amount,
                order.customer_name,
                order.status,
                order.order_type,
                order.created_at,
                order.store_id,
            ],
        )?;
        Ok(())
    }
}
```

---

## 6. Update Existing Components

### POSScreen.tsx - Add Store Context

```typescript
// components/POSScreen.tsx
'use client';
import { useEffect, useState } from 'react';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';
import { invoke } from '@tauri-apps/api/tauri';

export function POSScreen() {
  const { activeStoreId, storeConfig, isFeatureEnabled } = useMultiStoreStore();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (activeStoreId) {
      loadProducts();
    }
  }, [activeStoreId]);

  const loadProducts = async () => {
    try {
      const data = await invoke('get_products', { storeId: activeStoreId });
      setProducts(data as any[]);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleCheckout = async (order: any) => {
    try {
      await invoke('save_order', {
        order: {
          ...order,
          store_id: activeStoreId,
        },
      });
      // Handle success
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Store-specific UI */}
      {isFeatureEnabled('tableManagement') && <TableSelector />}
      {isFeatureEnabled('variants') && <VariantSelector />}
      {isFeatureEnabled('giftWrapping') && <GiftWrapSelector />}

      {/* Products Grid */}
      <div className="grid grid-cols-4 gap-4 flex-1 overflow-auto p-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Cart & Checkout */}
      <CartPanel onCheckout={handleCheckout} />
    </div>
  );
}
```

### OrdersScreen.tsx - Add Store Filtering

```typescript
// components/OrdersScreen.tsx
'use client';
import { useEffect, useState } from 'react';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';
import { invoke } from '@tauri-apps/api/tauri';

export function OrdersScreen() {
  const { activeStoreId } = useMultiStoreStore();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (activeStoreId) {
      loadOrders();
    }
  }, [activeStoreId]);

  const loadOrders = async () => {
    try {
      const data = await invoke('get_orders', { storeId: activeStoreId });
      setOrders(data as any[]);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <div className="space-y-2">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Store Management Screen

```typescript
// components/StoreManagementScreen.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';
import { invoke } from '@tauri-apps/api/tauri';

export function StoreManagementScreen() {
  const { stores, setStores, addStore, updateStore, deleteStore } = useMultiStoreStore();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const handleCreateStore = async (formData: any) => {
    try {
      const storeId = await invoke('create_store', { store: formData });
      addStore({ ...formData, id: storeId });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create store:', error);
    }
  };

  const handleUpdateStore = async (formData: any) => {
    try {
      await invoke('update_store', { store: formData });
      updateStore(formData);
      setEditingStore(null);
    } catch (error) {
      console.error('Failed to update store:', error);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (confirm('Are you sure you want to delete this store?')) {
      try {
        await invoke('delete_store', { storeId });
        deleteStore(storeId);
      } catch (error) {
        console.error('Failed to delete store:', error);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Store Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus size={20} />
          Add Store
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{store.name}</h3>
                <p className="text-sm text-gray-400 capitalize">{store.type}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingStore(store)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition text-gray-400 hover:text-white"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteStore(store.id)}
                  className="p-2 hover:bg-red-900 rounded-lg transition text-gray-400 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-400 mb-4">
              {store.address && <p>📍 {store.address}</p>}
              {store.phone && <p>📞 {store.phone}</p>}
              {store.email && <p>📧 {store.email}</p>}
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
              <Settings size={16} />
              Configure
            </button>
          </div>
        ))}
      </div>

      {/* Store Form Modal */}
      {(showForm || editingStore) && (
        <StoreFormModal
          store={editingStore}
          onSubmit={editingStore ? handleUpdateStore : handleCreateStore}
          onClose={() => {
            setShowForm(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
}
```

---

## 8. Data Isolation Strategy

### Query Wrapper Function

```typescript
// lib/db.ts
export async function withStoreContext<T>(
  storeId: string,
  callback: (storeId: string) => Promise<T>
): Promise<T> {
  if (!storeId) {
    throw new Error('Store ID is required');
  }
  return callback(storeId);
}

// Usage
const products = await withStoreContext(activeStoreId, async (storeId) => {
  return invoke('get_products', { storeId });
});
```

### Middleware for Store Validation

```rust
// src-tauri/src/main.rs
fn validate_store_access(store_id: &str, user_id: &str) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    
    // Check if user has access to this store
    let has_access = db.user_has_store_access(user_id, store_id)
        .map_err(|e| e.to_string())?;
    
    if !has_access {
        return Err("Access denied to this store".to_string());
    }
    
    Ok(())
}
```

---

## 9. Migration from Single Store to Multi-Store

```sql
-- Step 1: Create new tables
CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add store_id to existing tables
ALTER TABLE products ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE orders ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE customers ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE users ADD COLUMN store_id TEXT;
ALTER TABLE tables ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE staff_attendance ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE activity_logs ADD COLUMN store_id TEXT DEFAULT 'default';
ALTER TABLE settings ADD COLUMN store_id TEXT DEFAULT 'default';

-- Step 3: Create default store
INSERT INTO stores (id, name, type, currency, timezone)
VALUES ('default', 'Main Store', 'food', 'USD', 'UTC');

-- Step 4: Create indexes
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_users_store ON users(store_id);
CREATE INDEX idx_tables_store ON tables(store_id);
CREATE INDEX idx_staff_attendance_store ON staff_attendance(store_id);
CREATE INDEX idx_activity_logs_store ON activity_logs(store_id);
CREATE INDEX idx_settings_store ON settings(store_id);

-- Step 5: Verify data integrity
SELECT COUNT(*) FROM products WHERE store_id IS NULL;
SELECT COUNT(*) FROM orders WHERE store_id IS NULL;
```

---

## 10. Implementation Checklist

- [ ] Create `stores` table
- [ ] Add `store_id` to all relevant tables
- [ ] Create `multiStoreStore.ts` Zustand store
- [ ] Create `StoreSwitcher` component
- [ ] Update all backend commands to accept `store_id`
- [ ] Implement database layer for store scoping
- [ ] Update `POSScreen.tsx` with store context
- [ ] Update `OrdersScreen.tsx` with store filtering
- [ ] Create `StoreManagementScreen.tsx`
- [ ] Add store configuration UI
- [ ] Implement data isolation middleware
- [ ] Create migration script
- [ ] Test multi-store functionality
- [ ] Test data isolation
- [ ] Update documentation

---

## 11. Best Practices

✅ **Always include store_id in queries**
```typescript
// Good
const products = await invoke('get_products', { storeId: activeStoreId });

// Bad
const products = await invoke('get_products');
```

✅ **Validate store access on backend**
```rust
// Always check if user has access to store
validate_store_access(&store_id, &user_id)?;
```

✅ **Use indexes for performance**
```sql
CREATE INDEX idx_orders_store_date ON orders(store_id, created_at);
```

✅ **Scope all reports to active store**
```typescript
const revenue = await invoke('get_daily_revenue', { storeId: activeStoreId });
```

✅ **Handle store switching gracefully**
```typescript
useEffect(() => {
  if (activeStoreId) {
    reloadAllData();
  }
}, [activeStoreId]);
```

---

## 12. Security Considerations

- Validate `store_id` on every backend call
- Implement role-based access (admin can manage all stores, staff limited to assigned store)
- Audit log all store changes
- Encrypt sensitive store data (API keys, credentials)
- Implement store-level permissions
- Prevent data leakage between stores

