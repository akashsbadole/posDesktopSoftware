# POS Billing - Restaurant POS System

A full-featured Point of Sale (POS) desktop application for restaurants, built with Tauri + Next.js + SQLite.

---

## Core POS Features ✅

- [x] Product grid with categories
- [x] Search by name/barcode
- [x] Cart management with quantity controls
- [x] Multiple payment methods (Cash, Card, UPI)
- [x] Customer name capture
- [x] Automatic stock deduction
- [x] Receipt generation and printing
- [x] Tax calculation per product

---

## Restaurant-Specific Features ✅

### Table Management
- [x] Add/Edit/Delete tables
- [x] Table capacity settings
- [x] Table status tracking (Available, Occupied, Reserved)
- [x] Visual table grid layout

### Order Management
- [x] **Hold Orders** - Save incomplete orders for later
- [x] **Order Notes** - Add special instructions to orders
- [x] Order modifiers per item
- [x] Order types (Dine In, Takeaway, Delivery)
- [x] Delivery address and phone capture
- [x] Delivery status tracking

---

## Staff Management ✅

- [x] **Clock In/Out** - Track staff attendance
- [x] Today's attendance report
- [x] Duty duration calculation
- [x] PIN-based authentication
- [x] Role-based access (Admin/Cashier)
- [x] Admin: 1234, Cashier: 0000

---

## Customer CRM ✅

- [x] Customer database
- [x] **Loyalty Points** - Automatic points on purchase
- [x] Visit tracking
- [x] Total spent tracking
- [x] Order history per customer
- [x] Phone-based customer lookup

---

## Inventory Management ✅

- [x] Product management (add/edit/delete)
- [x] Barcode support
- [x] Stock tracking
- [x] **Low Stock Alerts** - Warning when stock ≤ 10
- [x] **Out of Stock Alerts** - Notification when stock = 0
- [x] Automatic alert generation
- [x] Alert management (view/clear)

---

## Financial Features ✅

- [x] Per-item discounts
- [x] Global order discounts
- [x] **Refund System** - Full refund workflow
- [x] Refund request/approval process
- [x] Cancel orders with reason
- [x] Tax configuration (GST types)

---

## Reports & Analytics ✅

- [x] Today's revenue
- [x] Transaction count
- [x] Average order value
- [x] Items sold count
- [x] Weekly revenue chart
- [x] Top products
- [x] Sales by date range
- [x] **Hourly Sales** - Sales breakdown by hour
- [x] **Sales by Item** - Product-wise revenue
- [x] **Staff Performance** - Revenue and orders by staff

---

## Data Management ✅

- [x] CSV Export (products, orders)
- [x] CSV Import (products)
- [x] Full JSON Backup
- [x] Activity/Audit Logs
- [x] All actions logged with user tracking

---

## Receipt & Sharing ✅

- [x] Automatic receipt generation
- [x] Print to thermal printer
- [x] Save receipt to file
- [x] WhatsApp share
- [x] Email share

---

## Cloud Sync ✅

- [x] Neon PostgreSQL sync (upload)
- [x] Neon PostgreSQL sync (download)
- [x] Multi-device access
- [x] Cloud backup

---

## Reliability & Performance ✅

### Offline-First
- [x] **100% Offline** - No internet required
- [x] **Crash Recovery** - Pending order detection on startup
- [x] **WAL Mode** - SQLite Write-Ahead Logging
- [x] Auto-checkpoint for data safety
- [x] Foreign key constraints

### Performance
- [x] Instant search (client-side)
- [x] Database indexes on key fields
- [x] Memory-optimized temp storage
- [x] Lightweight Tauri binary

---

## Hardware Integration ✅

- [x] Receipt printing support
- [x] **Cash Drawer** - Auto-open on payment
- [x] USB barcode scanner support
- [x] Keyboard input handling

---

## User Experience ✅

- [x] **Dark Mode** - Default dark theme
- [x] **Touch Optimized** - 44px minimum buttons
- [x] Larger cart +/- buttons
- [x] Larger product cards
- [x] Keyboard shortcuts (F1-F7, ?, C, P, 1-3)
- [x] High contrast mode
- [x] Smooth animations

---

## Accessibility ✅

- [x] ARIA labels on all elements
- [x] Screen reader support
- [x] Skip link to main content
- [x] Focus indicators
- [x] Role attributes
- [x] Live regions for dynamic content

---

## Security ✅

- [x] PIN authentication
- [x] Role-based access control
- [x] Admin-only features (settings, reports, logs)
- [x] No transaction deletion
- [x] Audit trail for all changes
- [x] Refund approval workflow
- [x] GSTR-3B compliance ready

---

## Technical Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Rust, Tauri 1.x
- **Database**: SQLite (rusqlite) with WAL mode
- **Icons**: Lucide React
- **ID Generation**: UUID

---

## Building for Different Platforms

### Windows
```bash
npm run tauri:build
# Output: src-tauri/target/release/POS Billing.exe
```

### macOS (on Mac)
```bash
npm run tauri:build
# Output: src-tauri/target/release/POS Billing.app
```

### Linux (on Linux)
```bash
npm run tauri:build
# Output: src-tauri/target/release/POS Billing
```

---

## Data Storage Location

- **Windows**: `%APPDATA%/com.posbilling.app/pos.db`
- **macOS**: `~/Library/Application Support/com.posbilling.app/pos.db`
- **Linux**: `~/.local/share/com.posbilling.app/pos.db`

---

## Default Credentials

- **Admin PIN**: `1234` (Full access)
- **Cashier PIN**: `0000` (Limited access)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F1 | Go to POS |
| F2 | Go to Dashboard |
| F3 | Go to Orders |
| F4 | Go to Products |
| F5 | Go to Reports |
| F6 | Go to Logs |
| F7 | Go to Settings |
| ? | Show shortcuts help |
| C | Clear cart |
| P | Process checkout |
| 1 | Dine In order |
| 2 | Takeaway order |
| 3 | Delivery order |
| Enter | Search barcode |
| Escape | Clear search |

---

## Future Enhancements

- [ ] Kitchen Display System (KDS)
- [ ] Multi-branch support
- [ ] Real-time sync between devices
- [ ] SMS notifications
- [ ] Ingredient-based inventory
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Employee scheduling
- [ ] Loyalty program tiers
- [ ] Table reservations
- [ ] Voice input for notes

---

## Project Structure

```
pos-tauri/
├── app/                    # Next.js pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main app
│   └── globals.css        # Global styles
├── components/             # React components
│   ├── POSScreen.tsx     # Main POS
│   ├── Sidebar.tsx       # Navigation
│   ├── LoginScreen.tsx   # PIN login
│   ├── OrdersScreen.tsx  # Orders
│   ├── ProductsScreen.tsx # Products
│   ├── DashboardScreen.tsx # Dashboard
│   ├── ReportsScreen.tsx # Reports
│   ├── SettingsScreen.tsx # Settings
│   ├── TableManager.tsx  # Tables
│   ├── StaffAttendance.tsx # Staff clock
│   ├── CustomerCRM.tsx   # Customers
│   ├── EnhancedReports.tsx # Advanced reports
│   └── CrashRecovery.tsx # Pending orders
├── lib/                   # Utilities
│   ├── db.ts            # Database API
│   └── keyboard.ts      # Navigation
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs      # Commands
│   │   ├── db.rs       # SQLite
│   │   └── neon.rs     # Neon sync
│   └── tauri.conf.json # Config
└── package.json
```

