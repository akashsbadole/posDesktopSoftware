# Multi-Store POS System Architecture

**Purpose**: Transform the food-focused POS system into a flexible, multi-store platform supporting restaurants, garment stores, gift shops, and other retail businesses.

---

## Overview

The current system is tightly coupled to food/restaurant operations. This document outlines how to make it store-type agnostic while maintaining backward compatibility.

### Key Principle
**One codebase, infinite store types** — Configure store behavior through settings, not code changes.

---

## Store Types Supported

### 1. **Food & Beverage** (Current)
- Dine-in, Takeaway, Delivery
- Table management
- Kitchen Display System
- Ingredient tracking
- Recipe management
- Staff attendance (chefs, waiters)

### 2. **Garment Store**
- Size variants (XS, S, M, L, XL, XXL)
- Color variants
- Material tracking
- Stock by size/color combination
- Fitting room management
- Alteration tracking
- Return/exchange workflow
- Seasonal collections

### 3. **Gift Store**
- Gift wrapping options
- Personalization (engraving, custom messages)
- Gift cards
- Bundle deals
- Occasion-based filtering (Birthday, Wedding, Anniversary)
- Gift registry
- Bulk orders

### 4. **Pharmacy**
- Prescription management
- Expiry date tracking
- Batch number tracking
- Drug interactions checking
- Refill reminders
- Insurance integration

### 5. **Electronics Store**
- Warranty tracking
- Serial number management
- Trade-in valuation
- Extended warranty options
- Bundle deals
- Repair service tracking

### 6. **General Retail**
- Basic product management
- Stock tracking
- Discounts and promotions
- Customer loyalty
- Inventory management

---

## Architecture Changes Required

### 1. Store Configuration Model

```typescript
// lib/stores/storeConfigStore.ts
export interface StoreConfig {
  id: string;
  name: string;
  type: 'food' | 'garment' | 'gift' | 'pharmacy' | 'electronics' | 'retail';
  currency: string;
  timezone: string;
  
  // Feature flags
  features: {
    tableManagement: boolean;
    delivery: boolean;
    variants: boolean;
    customization: boolean;
    warranty: boolean;
    prescriptions: boolean;
    giftCards: boolean;
    giftWrapping: boolean;
    alteration: boolean;
    fittingRooms: boolean;
    bundleDeals: boolean;
    seasonalCollections: boolean;
    kitchenDisplay: boolean;
    ingredientTracking: boolean;
    recipeManagement: boolean;
  };
  
  // Store-specific settings
  settings: {
    // Garment store
    sizeChart?: SizeChart;
    colorPalette?: ColorOption[];
    alterationServices?: AlterationService[];
    
    // Gift store
    giftWrapOptions?: GiftWrapOption[];
    personalizationOptions?: PersonalizationOption[];
    occasionCategories?: OccasionCategory[];
    
    // Pharmacy
    insuranceProviders?: InsuranceProvider[];
    prescriptionRequired?: boolean;
    
    // Electronics
    warrantyOptions?: WarrantyOption[];
    tradeInEnabled?: boolean;
    
    // Food
    deliveryRadius?: number;
    kitchenDisplayEnabled?: boolean;
    tableCount?: number;
  };
}

export interface SizeChart {
  sizes: string[];
  measurements?: Record<string, Record<string, number>>;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface AlterationService {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
}

export interface GiftWrapOption {
  id: string;
  name: string;
  price: number;
  colors: string[];
}

export interface PersonalizationOption {
  id: string;
  name: string;
  type: 'engraving' | 'embroidery' | 'custom_message' | 'monogram';
  price: number;
}

export interface OccasionCategory {
  id: string;
  name: string;
  icon: string;
}

export interface WarrantyOption {
  id: string;
  name: string;
  months: number;
  price: number;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  code: string;
}
```

### 2. Enhanced Product Model

```typescript
// lib/db.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  barcode: string;
  tax: number;
  created_at?: string;
  
  // Store-type specific
  storeType: string;
  
  // Variants (Garment, Gift, Electronics)
  variants?: ProductVariant[];
  
  // Garment-specific
  material?: string;
  sizeChart?: string;
  colors?: string[];
  
  // Gift-specific
  personalizationOptions?: string[];
  giftWrapEligible?: boolean;
  
  // Pharmacy-specific
  expiryDate?: string;
  batchNumber?: string;
  prescriptionRequired?: boolean;
  
  // Electronics-specific
  warrantyIncluded?: number; // months
  serialNumberRequired?: boolean;
  
  // Food-specific
  ingredients?: string[];
  preparationTime?: number; // minutes
  allergens?: string[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  type: 'size' | 'color' | 'material' | 'capacity' | 'custom';
  value: string;
  sku: string;
  stock: number;
  price_modifier: number;
  image_url?: string;
}
```

### 3. Enhanced Order Model

```typescript
// lib/db.ts
export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: "cash" | "card" | "upi" | "gift_card" | "wallet";
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  status: "completed" | "refunded" | "hold" | "cancelled" | "pending_alteration" | "ready_for_pickup";
  order_type: "dine_in" | "takeaway" | "delivery" | "in_store" | "online";
  created_at: string;
  synced?: boolean;
  user_id?: string;
  user_name?: string;
  
  // Store-type specific
  storeType: string;
  
  // Garment store
  alterations?: OrderAlteration[];
  fittingRoomId?: string;
  
  // Gift store
  giftWrap?: GiftWrapDetails;
  personalization?: PersonalizationDetails;
  giftMessage?: string;
  
  // Pharmacy
  prescriptionId?: string;
  refillOf?: string;
  
  // Electronics
  warranty?: WarrantyDetails;
  tradeIn?: TradeInDetails;
  serialNumbers?: Record<string, string>;
  
  // Food
  table_id?: string;
  delivery_address?: string;
  delivery_phone?: string;
  delivery_status?: string;
  notes?: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  discount: number;
  tax: number;
  
  // Variant selection
  selectedVariants?: Record<string, string>; // size, color, etc.
  
  // Customization
  customization?: Record<string, string>;
}

export interface OrderAlteration {
  id: string;
  serviceId: string;
  serviceName: string;
  status: "pending" | "in_progress" | "ready" | "completed";
  estimatedDate: string;
  completedDate?: string;
  notes?: string;
}

export interface GiftWrapDetails {
  optionId: string;
  color: string;
  price: number;
}

export interface PersonalizationDetails {
  optionId: string;
  type: string;
  text: string;
  price: number;
}

export interface WarrantyDetails {
  optionId: string;
  months: number;
  price: number;
  expiryDate: string;
}

export interface TradeInDetails {
  productName: string;
  condition: "excellent" | "good" | "fair" | "poor";
  estimatedValue: number;
  actualValue: number;
}
```

### 4. Database Schema Additions

```sql
-- Store configuration
CREATE TABLE store_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  features JSON,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product variants
CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  sku TEXT UNIQUE,
  stock INTEGER DEFAULT 0,
  price_modifier REAL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Garment-specific: Alterations
CREATE TABLE alterations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  estimated_date TEXT,
  completed_date TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Garment-specific: Fitting rooms
CREATE TABLE fitting_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  current_customer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift-specific: Gift cards
CREATE TABLE gift_cards (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  initial_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  customer_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Pharmacy-specific: Prescriptions
CREATE TABLE prescriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  doctor_name TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  items JSON,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Electronics-specific: Warranties
CREATE TABLE warranties (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  serial_number TEXT,
  warranty_months INTEGER,
  expiry_date TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Trade-in tracking
CREATE TABLE trade_ins (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_name TEXT,
  condition TEXT,
  estimated_value REAL,
  actual_value REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

---

## UI/Component Changes

### 1. Settings Screen Enhancements

```typescript
// components/SettingsScreen.tsx - New sections

// Store Type Selection
<StoreTypeSelector 
  currentType={storeConfig.type}
  onTypeChange={handleStoreTypeChange}
/>

// Feature Toggles
<FeatureTogglePanel
  features={storeConfig.features}
  onToggle={handleFeatureToggle}
/>

// Store-Specific Settings
{storeConfig.type === 'garment' && <GarmentSettings />}
{storeConfig.type === 'gift' && <GiftSettings />}
{storeConfig.type === 'pharmacy' && <PharmacySettings />}
{storeConfig.type === 'electronics' && <ElectronicsSettings />}
```

### 2. New Components by Store Type

#### Garment Store
- `components/GarmentProductForm.tsx` - Add size/color variants
- `components/FittingRoomManager.tsx` - Manage fitting rooms
- `components/AlterationTracker.tsx` - Track alterations
- `components/SizeChartManager.tsx` - Configure size charts

#### Gift Store
- `components/GiftWrapSelector.tsx` - Choose wrapping options
- `components/PersonalizationForm.tsx` - Engraving, embroidery, etc.
- `components/GiftCardManager.tsx` - Create and manage gift cards
- `components/OccasionFilter.tsx` - Filter by occasion

#### Pharmacy
- `components/PrescriptionManager.tsx` - Manage prescriptions
- `components/ExpiryTracker.tsx` - Track expiry dates
- `components/RefillReminder.tsx` - Refill notifications

#### Electronics
- `components/WarrantyManager.tsx` - Manage warranties
- `components/SerialNumberTracker.tsx` - Track serial numbers
- `components/TradeInCalculator.tsx` - Calculate trade-in value

### 3. Dynamic POS Screen

```typescript
// components/POSScreen.tsx - Conditional rendering

{storeConfig.type === 'food' && (
  <>
    <TableSelector />
    <OrderTypeSelector />
    <DeliveryAddressForm />
  </>
)}

{storeConfig.type === 'garment' && (
  <>
    <VariantSelector />
    <AlterationSelector />
    <FittingRoomAssignment />
  </>
)}

{storeConfig.type === 'gift' && (
  <>
    <GiftWrapSelector />
    <PersonalizationForm />
    <GiftMessageInput />
  </>
)}

{storeConfig.type === 'pharmacy' && (
  <>
    <PrescriptionSelector />
    <ExpiryDateDisplay />
    <RefillCheckbox />
  </>
)}

{storeConfig.type === 'electronics' && (
  <>
    <WarrantySelector />
    <SerialNumberInput />
    <TradeInOption />
  </>
)}
```

---

## Backend Changes (Rust)

### 1. Store Configuration Commands

```rust
// src-tauri/src/main.rs

#[tauri::command]
fn get_store_config() -> Result<StoreConfig, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_store_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_store_config(config: StoreConfig) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_store_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_store_type(store_type: String) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.set_store_type(&store_type).map_err(|e| e.to_string())
}
```

### 2. Variant Management Commands

```rust
#[tauri::command]
fn create_product_variant(variant: ProductVariant) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_product_variant(&variant).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_product_variants(product_id: String) -> Result<Vec<ProductVariant>, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.get_product_variants(&product_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_variant_stock(variant_id: String, delta: i64) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.update_variant_stock(&variant_id, delta).map_err(|e| e.to_string())
}
```

### 3. Store-Specific Commands

```rust
// Garment store
#[tauri::command]
fn create_alteration(alteration: OrderAlteration) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_alteration(&alteration).map_err(|e| e.to_string())
}

// Gift store
#[tauri::command]
fn create_gift_card(amount: f64) -> Result<String, String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_gift_card(amount).map_err(|e| e.to_string())
}

// Pharmacy
#[tauri::command]
fn create_prescription(prescription: Prescription) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_prescription(&prescription).map_err(|e| e.to_string())
}

// Electronics
#[tauri::command]
fn create_warranty(warranty: Warranty) -> Result<(), String> {
    let db = get_db().lock().map_err(|e| e.to_string())?;
    db.create_warranty(&warranty).map_err(|e| e.to_string())
}
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create `StoreConfig` model and database table
2. Add store type selection to settings
3. Create feature flag system
4. Update product model with variants

### Phase 2: Garment Store (Week 3-4)
1. Implement variant management
2. Create garment-specific components
3. Add alteration tracking
4. Implement fitting room management

### Phase 3: Gift Store (Week 5-6)
1. Implement gift wrapping options
2. Add personalization system
3. Create gift card management
4. Add occasion-based filtering

### Phase 4: Other Store Types (Week 7-8)
1. Pharmacy features (prescriptions, expiry tracking)
2. Electronics features (warranty, serial numbers, trade-in)
3. General retail enhancements

### Phase 5: Polish & Testing (Week 9-10)
1. Cross-store compatibility testing
2. Performance optimization
3. Documentation
4. User testing

---

## Backward Compatibility

### Existing Food Store Data
- Default `storeType: 'food'` for all existing records
- All food-specific features enabled by default
- Existing tables and orders remain unchanged
- Migration script to populate `store_config` table

### Migration Script

```sql
-- Initialize store config for existing installations
INSERT INTO store_config (id, name, type, features, settings)
VALUES (
  'default',
  'My Restaurant',
  'food',
  '{
    "tableManagement": true,
    "delivery": true,
    "variants": false,
    "customization": false,
    "kitchenDisplay": true,
    "ingredientTracking": true,
    "recipeManagement": true
  }',
  '{
    "deliveryRadius": 5,
    "kitchenDisplayEnabled": true,
    "tableCount": 10
  }'
);

-- Add storeType to existing products
ALTER TABLE products ADD COLUMN storeType TEXT DEFAULT 'food';

-- Add storeType to existing orders
ALTER TABLE orders ADD COLUMN storeType TEXT DEFAULT 'food';
```

---

## Configuration Examples

### Food & Beverage Restaurant
```json
{
  "type": "food",
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
  }
}
```

### Garment Store
```json
{
  "type": "garment",
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
        "M": {"chest": 38, "length": 28, "sleeve": 32}
      }
    },
    "colorPalette": [
      {"name": "Black", "hex": "#000000"},
      {"name": "White", "hex": "#FFFFFF"}
    ],
    "alterationServices": [
      {"id": "hem", "name": "Hemming", "price": 15, "estimatedDays": 3}
    ]
  }
}
```

### Gift Store
```json
{
  "type": "gift",
  "features": {
    "customization": true,
    "giftCards": true,
    "giftWrapping": true,
    "bundleDeals": true
  },
  "settings": {
    "giftWrapOptions": [
      {"id": "wrap1", "name": "Premium Gold", "price": 5, "colors": ["Gold", "Silver"]}
    ],
    "personalizationOptions": [
      {"id": "engrave", "name": "Engraving", "type": "engraving", "price": 10}
    ],
    "occasionCategories": [
      {"id": "birthday", "name": "Birthday", "icon": "cake"}
    ]
  }
}
```

### Pharmacy
```json
{
  "type": "pharmacy",
  "features": {
    "prescriptions": true,
    "customization": false
  },
  "settings": {
    "prescriptionRequired": true,
    "insuranceProviders": [
      {"id": "ins1", "name": "Blue Cross", "code": "BC"}
    ]
  }
}
```

### Electronics Store
```json
{
  "type": "electronics",
  "features": {
    "warranty": true,
    "customization": false,
    "variants": true
  },
  "settings": {
    "warrantyOptions": [
      {"id": "w1", "name": "1 Year", "months": 12, "price": 50}
    ],
    "tradeInEnabled": true
  }
}
```

---

## Benefits

✅ **Single Codebase** - One app for all store types  
✅ **Easy Configuration** - Switch store types in settings  
✅ **Scalable** - Add new store types without code changes  
✅ **Backward Compatible** - Existing food stores work as-is  
✅ **Feature Reusability** - Loyalty, reports, payments work for all types  
✅ **Reduced Maintenance** - One app to maintain, not multiple  
✅ **Faster Deployment** - New store types in days, not months  

---

## Implementation Checklist

- [ ] Create `StoreConfig` model and Zustand store
- [ ] Add `store_config` table to database
- [ ] Create store type selector in settings
- [ ] Implement feature flag system
- [ ] Add product variants support
- [ ] Create variant management UI
- [ ] Implement garment store features
- [ ] Implement gift store features
- [ ] Implement pharmacy features
- [ ] Implement electronics features
- [ ] Update POS screen with conditional rendering
- [ ] Create migration script
- [ ] Test backward compatibility
- [ ] Update documentation
- [ ] User testing and feedback
- [ ] Performance optimization
- [ ] Deploy to production

---

## Future Enhancements

- Multi-store management (manage multiple stores from one app)
- Store templates (pre-configured store types)
- Custom store types (user-defined store configurations)
- Store-specific reports and analytics
- Store-specific integrations (e.g., Shopify for retail)
- Store-specific workflows (e.g., approval chains)
- Store-specific permissions and roles
