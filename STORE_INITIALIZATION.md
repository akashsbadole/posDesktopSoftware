# Store Initialization & Configuration Guide

**Purpose**: Allow users to select or configure store at startup via UI, .env file, or configuration file.

---

## Overview

Three initialization methods:

1. **Interactive UI** - Select/create store on first launch
2. **.env Configuration** - Pre-configure store via environment variables
3. **Config File** - JSON/TOML configuration file

---

## Method 1: Interactive UI (First Launch)

### Store Selection Screen

```typescript
// components/StoreSelectionScreen.tsx
'use client';
import { useState, useEffect } from 'react';
import { Plus, Settings } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';

export function StoreSelectionScreen() {
  const [stores, setStores] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setStores: setStoresInStore, setActiveStore } = useMultiStoreStore();

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const result = await invoke('get_all_stores');
      setStores(result as any[]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load stores:', error);
      setLoading(false);
    }
  };

  const handleSelectStore = (storeId: string) => {
    setActiveStore(storeId);
    // Navigate to main app
    window.location.href = '/app';
  };

  const handleCreateStore = async (formData: any) => {
    try {
      const storeId = await invoke('create_store', { store: formData });
      setShowCreateForm(false);
      loadStores();
    } catch (error) {
      console.error('Failed to create store:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">POS Billing</h1>
          <p className="text-gray-400">Select a store to get started</p>
        </div>

        {/* Stores Grid */}
        {stores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelectStore(store.id)}
                className="bg-gray-800 border-2 border-gray-700 hover:border-blue-500 rounded-lg p-6 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition">
                      {store.name}
                    </h3>
                    <p className="text-sm text-gray-400 capitalize">{store.type}</p>
                    {store.address && (
                      <p className="text-xs text-gray-500 mt-1">{store.address}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center mb-6">
            <p className="text-gray-400 mb-4">No stores found. Create one to get started.</p>
          </div>
        )}

        {/* Create Store Button */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
        >
          <Plus size={20} />
          Create New Store
        </button>

        {/* Create Store Modal */}
        {showCreateForm && (
          <CreateStoreModal
            onSubmit={handleCreateStore}
            onClose={() => setShowCreateForm(false)}
          />
        )}
      </div>
    </div>
  );
}
```

### Create Store Modal

```typescript
// components/CreateStoreModal.tsx
'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

const STORE_TYPES = [
  { value: 'food', label: 'Food & Beverage', icon: '🍔' },
  { value: 'garment', label: 'Garment Store', icon: '👕' },
  { value: 'gift', label: 'Gift Shop', icon: '🎁' },
  { value: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'retail', label: 'General Retail', icon: '🛍️' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export function CreateStoreModal({ onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'food',
    currency: 'USD',
    timezone: 'UTC',
    address: '',
    phone: '',
    email: '',
  });

  const [selectedType, setSelectedType] = useState('food');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Store name is required');
      return;
    }
    onSubmit({
      ...formData,
      id: `store_${Date.now()}`,
      is_active: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800">
          <h2 className="text-2xl font-bold text-white">Create New Store</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Store Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Main Restaurant, Downtown Boutique"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Store Type */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Store Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STORE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.value);
                    setFormData({ ...formData, type: type.value });
                  }}
                  className={`p-3 rounded-lg border-2 transition text-center ${
                    selectedType === type.value
                      ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-medium text-white">
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Currency & Timezone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Store address"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Phone number"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Email address"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
            >
              Create Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```



---

## Method 2: .env Configuration

### .env File Setup

```bash
# .env
# Store Configuration Mode
# Options: 'interactive' | 'env' | 'config_file'
STORE_INIT_MODE=env

# Pre-configured Store (when STORE_INIT_MODE=env)
STORE_ID=store_main
STORE_NAME=My Restaurant
STORE_TYPE=food
STORE_CURRENCY=USD
STORE_TIMEZONE=America/New_York
STORE_ADDRESS=123 Main St, New York, NY 10001
STORE_PHONE=+1-555-0123
STORE_EMAIL=info@myrestaurant.com

# Store Features (JSON string)
STORE_FEATURES={"tableManagement":true,"delivery":true,"kitchenDisplay":true,"ingredientTracking":true}

# Store Settings (JSON string)
STORE_SETTINGS={"deliveryRadius":5,"tableCount":20,"kitchenDisplayEnabled":true}

# Auto-login (optional)
AUTO_LOGIN_PIN=1234
AUTO_LOGIN_ROLE=admin
```

### .env.example

```bash
# Copy this to .env and configure for your store

# Store Initialization Mode
# 'interactive' - Show store selection screen on startup
# 'env' - Use environment variables
# 'config_file' - Use config.json file
STORE_INIT_MODE=interactive

# Pre-configured Store Settings (used when STORE_INIT_MODE=env)
STORE_ID=store_main
STORE_NAME=My Store
STORE_TYPE=food
STORE_CURRENCY=USD
STORE_TIMEZONE=UTC
STORE_ADDRESS=
STORE_PHONE=
STORE_EMAIL=

# Store Features (JSON)
STORE_FEATURES={}

# Store Settings (JSON)
STORE_SETTINGS={}

# Auto-login (optional)
AUTO_LOGIN_PIN=
AUTO_LOGIN_ROLE=
```

### Environment Variable Parser

```typescript
// lib/config/envConfig.ts
export interface EnvStoreConfig {
  initMode: 'interactive' | 'env' | 'config_file';
  store?: {
    id: string;
    name: string;
    type: string;
    currency: string;
    timezone: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  features?: Record<string, boolean>;
  settings?: Record<string, any>;
  autoLogin?: {
    pin: string;
    role: string;
  };
}

export function parseEnvConfig(): EnvStoreConfig {
  const initMode = (process.env.STORE_INIT_MODE || 'interactive') as any;

  if (initMode === 'env') {
    return {
      initMode,
      store: {
        id: process.env.STORE_ID || `store_${Date.now()}`,
        name: process.env.STORE_NAME || 'My Store',
        type: process.env.STORE_TYPE || 'food',
        currency: process.env.STORE_CURRENCY || 'USD',
        timezone: process.env.STORE_TIMEZONE || 'UTC',
        address: process.env.STORE_ADDRESS,
        phone: process.env.STORE_PHONE,
        email: process.env.STORE_EMAIL,
      },
      features: process.env.STORE_FEATURES
        ? JSON.parse(process.env.STORE_FEATURES)
        : {},
      settings: process.env.STORE_SETTINGS
        ? JSON.parse(process.env.STORE_SETTINGS)
        : {},
      autoLogin: process.env.AUTO_LOGIN_PIN
        ? {
            pin: process.env.AUTO_LOGIN_PIN,
            role: process.env.AUTO_LOGIN_ROLE || 'cashier',
          }
        : undefined,
    };
  }

  return { initMode };
}
```

---

## Method 3: Configuration File

### config.json

```json
{
  "initMode": "config_file",
  "store": {
    "id": "store_main",
    "name": "My Restaurant",
    "type": "food",
    "currency": "USD",
    "timezone": "America/New_York",
    "address": "123 Main St, New York, NY 10001",
    "phone": "+1-555-0123",
    "email": "info@myrestaurant.com"
  },
  "features": {
    "tableManagement": true,
    "delivery": true,
    "kitchenDisplay": true,
    "ingredientTracking": true,
    "recipeManagement": true
  },
  "settings": {
    "deliveryRadius": 5,
    "tableCount": 20,
    "kitchenDisplayEnabled": true
  },
  "autoLogin": {
    "pin": "1234",
    "role": "admin"
  }
}
```

### config.garment.json (Example for Garment Store)

```json
{
  "initMode": "config_file",
  "store": {
    "id": "store_garment",
    "name": "Fashion Boutique",
    "type": "garment",
    "currency": "USD",
    "timezone": "America/Los_Angeles",
    "address": "456 Fashion Ave, Los Angeles, CA 90001",
    "phone": "+1-555-0456",
    "email": "info@fashionboutique.com"
  },
  "features": {
    "variants": true,
    "customization": true,
    "alteration": true,
    "fittingRooms": true
  },
  "settings": {
    "sizeChart": {
      "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
      "measurements": {
        "M": {
          "chest": 38,
          "length": 28,
          "sleeve": 32
        }
      }
    },
    "colorPalette": [
      {
        "name": "Black",
        "hex": "#000000"
      },
      {
        "name": "White",
        "hex": "#FFFFFF"
      }
    ],
    "alterationServices": [
      {
        "id": "hem",
        "name": "Hemming",
        "price": 15,
        "estimatedDays": 3
      }
    ]
  }
}
```

### config.gift.json (Example for Gift Store)

```json
{
  "initMode": "config_file",
  "store": {
    "id": "store_gift",
    "name": "Gift Paradise",
    "type": "gift",
    "currency": "USD",
    "timezone": "America/Chicago",
    "address": "789 Gift Lane, Chicago, IL 60601",
    "phone": "+1-555-0789",
    "email": "info@giftparadise.com"
  },
  "features": {
    "customization": true,
    "giftCards": true,
    "giftWrapping": true,
    "bundleDeals": true
  },
  "settings": {
    "giftWrapOptions": [
      {
        "id": "wrap1",
        "name": "Premium Gold",
        "price": 5,
        "colors": ["Gold", "Silver"]
      },
      {
        "id": "wrap2",
        "name": "Eco-Friendly",
        "price": 3,
        "colors": ["Green", "Brown"]
      }
    ],
    "personalizationOptions": [
      {
        "id": "engrave",
        "name": "Engraving",
        "type": "engraving",
        "price": 10
      },
      {
        "id": "embroidery",
        "name": "Embroidery",
        "type": "embroidery",
        "price": 15
      }
    ],
    "occasionCategories": [
      {
        "id": "birthday",
        "name": "Birthday",
        "icon": "cake"
      },
      {
        "id": "wedding",
        "name": "Wedding",
        "icon": "ring"
      }
    ]
  }
}
```

### Configuration File Parser

```typescript
// lib/config/fileConfig.ts
import { readTextFile } from '@tauri-apps/api/fs';

export interface FileStoreConfig {
  initMode: 'config_file';
  store: {
    id: string;
    name: string;
    type: string;
    currency: string;
    timezone: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  features?: Record<string, boolean>;
  settings?: Record<string, any>;
  autoLogin?: {
    pin: string;
    role: string;
  };
}

export async function parseConfigFile(
  filePath: string = 'config.json'
): Promise<FileStoreConfig> {
  try {
    const content = await readTextFile(filePath);
    return JSON.parse(content) as FileStoreConfig;
  } catch (error) {
    console.error(`Failed to read config file: ${filePath}`, error);
    throw new Error(`Configuration file not found: ${filePath}`);
  }
}

export async function loadConfigByEnvironment(): Promise<FileStoreConfig> {
  const env = process.env.NODE_ENV || 'development';
  const configFile = `config.${env}.json`;

  try {
    return await parseConfigFile(configFile);
  } catch {
    // Fallback to default config.json
    return await parseConfigFile('config.json');
  }
}
```

---

## Initialization Flow

### Main App Entry Point

```typescript
// app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useMultiStoreStore } from '@/lib/stores/multiStoreStore';
import { parseEnvConfig } from '@/lib/config/envConfig';
import { parseConfigFile } from '@/lib/config/fileConfig';
import { StoreSelectionScreen } from '@/components/StoreSelectionScreen';
import { LoginScreen } from '@/components/LoginScreen';
import { POSScreen } from '@/components/POSScreen';
import { invoke } from '@tauri-apps/api/tauri';

export default function Home() {
  const [initState, setInitState] = useState<
    'loading' | 'store_selection' | 'login' | 'app'
  >('loading');
  const { setStores, setActiveStore, setStoreConfig } = useMultiStoreStore();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check initialization mode
      const envConfig = parseEnvConfig();

      if (envConfig.initMode === 'env' && envConfig.store) {
        // Use environment configuration
        await setupStoreFromEnv(envConfig);
      } else if (envConfig.initMode === 'config_file') {
        // Use configuration file
        const fileConfig = await parseConfigFile();
        await setupStoreFromConfig(fileConfig);
      } else {
        // Interactive mode - show store selection
        setInitState('store_selection');
        return;
      }

      // If auto-login is configured, skip login screen
      if (envConfig.autoLogin) {
        setInitState('app');
      } else {
        setInitState('login');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      setInitState('store_selection');
    }
  };

  const setupStoreFromEnv = async (config: any) => {
    try {
      // Create or get store
      let storeId = config.store.id;
      const existingStores = await invoke('get_all_stores');

      if (!(existingStores as any[]).find((s) => s.id === storeId)) {
        // Create new store
        await invoke('create_store', { store: config.store });
      }

      // Set active store
      setActiveStore(storeId);

      // Load store config
      const storeConfig = await invoke('get_store_config', { storeId });
      setStoreConfig(storeConfig as any);
    } catch (error) {
      console.error('Failed to setup store from env:', error);
      throw error;
    }
  };

  const setupStoreFromConfig = async (config: any) => {
    try {
      // Create or get store
      let storeId = config.store.id;
      const existingStores = await invoke('get_all_stores');

      if (!(existingStores as any[]).find((s) => s.id === storeId)) {
        // Create new store
        await invoke('create_store', { store: config.store });

        // Create store config
        await invoke('update_store_config', {
          config: {
            id: `config_${storeId}`,
            store_id: storeId,
            type: config.store.type,
            features: config.features || {},
            settings: config.settings || {},
          },
        });
      }

      // Set active store
      setActiveStore(storeId);

      // Load store config
      const storeConfig = await invoke('get_store_config', { storeId });
      setStoreConfig(storeConfig as any);
    } catch (error) {
      console.error('Failed to setup store from config:', error);
      throw error;
    }
  };

  // Render based on initialization state
  if (initState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  if (initState === 'store_selection') {
    return <StoreSelectionScreen />;
  }

  if (initState === 'login') {
    return <LoginScreen />;
  }

  return <POSScreen />;
}
```

---

## Deployment Scenarios

### Scenario 1: Single Store (Restaurant)

**Use .env configuration:**

```bash
STORE_INIT_MODE=env
STORE_NAME=My Restaurant
STORE_TYPE=food
STORE_CURRENCY=USD
STORE_TIMEZONE=America/New_York
AUTO_LOGIN_PIN=1234
AUTO_LOGIN_ROLE=admin
```

**Result**: App starts directly to POS screen with pre-configured restaurant.

---

### Scenario 2: Multi-Store Chain

**Use interactive mode:**

```bash
STORE_INIT_MODE=interactive
```

**Result**: Users see store selection screen on startup, can switch between stores.

---

### Scenario 3: Pre-configured Multi-Store

**Use config file:**

```bash
STORE_INIT_MODE=config_file
```

**config.json:**
```json
{
  "initMode": "config_file",
  "stores": [
    {
      "id": "store_main",
      "name": "Main Restaurant",
      "type": "food"
    },
    {
      "id": "store_boutique",
      "name": "Fashion Boutique",
      "type": "garment"
    }
  ]
}
```

---

## Backend Commands for Initialization

```rust
// src-tauri/src/main.rs

#[tauri::command]
fn get_init_mode() -> Result<String, String> {
    let mode = std::env::var("STORE_INIT_MODE")
        .unwrap_or_else(|_| "interactive".to_string());
    Ok(mode)
}

#[tauri::command]
fn get_env_store_config() -> Result<serde_json::Value, String> {
    let config = serde_json::json!({
        "id": std::env::var("STORE_ID").unwrap_or_default(),
        "name": std::env::var("STORE_NAME").unwrap_or_default(),
        "type": std::env::var("STORE_TYPE").unwrap_or_default(),
        "currency": std::env::var("STORE_CURRENCY").unwrap_or("USD"),
        "timezone": std::env::var("STORE_TIMEZONE").unwrap_or("UTC"),
        "address": std::env::var("STORE_ADDRESS").ok(),
        "phone": std::env::var("STORE_PHONE").ok(),
        "email": std::env::var("STORE_EMAIL").ok(),
    });
    Ok(config)
}

#[tauri::command]
fn load_config_file(file_path: String) -> Result<serde_json::Value, String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON in config file: {}", e))?;
    
    Ok(config)
}
```

---

## Implementation Checklist

- [ ] Create `StoreSelectionScreen` component
- [ ] Create `CreateStoreModal` component
- [ ] Create `envConfig.ts` parser
- [ ] Create `fileConfig.ts` parser
- [ ] Update app entry point with initialization logic
- [ ] Create example .env file
- [ ] Create example config.json files
- [ ] Add backend commands for initialization
- [ ] Test interactive mode
- [ ] Test .env mode
- [ ] Test config file mode
- [ ] Test auto-login
- [ ] Document deployment scenarios
- [ ] Create migration guide

---

## Configuration Priority

When multiple configuration methods are available:

1. **Environment Variables** (highest priority)
2. **Configuration File**
3. **Interactive UI** (lowest priority)

```typescript
// lib/config/configResolver.ts
export async function resolveStoreConfig() {
  // Check environment variables first
  if (process.env.STORE_INIT_MODE === 'env' && process.env.STORE_NAME) {
    return parseEnvConfig();
  }

  // Check configuration file
  if (process.env.STORE_INIT_MODE === 'config_file') {
    try {
      return await parseConfigFile();
    } catch (error) {
      console.warn('Config file not found, falling back to interactive mode');
    }
  }

  // Default to interactive mode
  return { initMode: 'interactive' };
}
```

---

## Security Considerations

⚠️ **Never commit sensitive data to version control:**

```bash
# .gitignore
.env
.env.local
config.local.json
config.production.json
```

✅ **Use environment variables for sensitive data:**

```bash
# .env (not committed)
STORE_INIT_MODE=env
STORE_NAME=My Store
DATABASE_PASSWORD=secret_password
API_KEY=secret_api_key
```

✅ **Use .env.example as template:**

```bash
# .env.example (committed)
STORE_INIT_MODE=interactive
STORE_NAME=
DATABASE_PASSWORD=
API_KEY=
```

