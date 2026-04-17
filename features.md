# POS Billing - Complete Feature Reference

A production-ready Point of Sale (POS) desktop application for restaurants, cafes, retail shops, and small businesses. Built with Tauri + Next.js + SQLite + Neon PostgreSQL.

**Status**: ~95% Complete | **Total Screens**: 25+ | **Total Components**: 50+ | **Database Tables**: 37 | **Tauri Commands**: 100+

---

## Core Point of Sale (POS)

### Product Selection & Cart
- Product grid display with category filtering
- Barcode scanning support (keyboard wedge)
- Search by product name or barcode
- Cart management with +/- quantity controls
- Per-item discount (percentage/fixed amount)
- Global order discount
- Coupon code application
- Custom item creation (ad-hoc products)

### Payment Processing
- Multiple payment methods: Cash, Card, UPI, Wallet, Store Credit
- Split payment support (multiple methods in one order)
- Automatic change calculation
- Tip amount tracking
- Payment method breakdown on receipts

### Order Configuration
- Order types: Dine In, Takeaway, Delivery
- Customer name capture
- Delivery address & phone capture
- Delivery status tracking (Pending → Preparing → Ready → Delivered → Cancelled)
- Order notes/special instructions
- Tax calculation per product (configurable rates)
- Tax-inclusive / Tax-exclusive pricing modes

### Receipt & Print
- Receipt generation with customizable header/footer
- Print to thermal printer (ESC/POS compatible)
- Save receipt to file (PDF/MD format)
- WhatsApp share via API
- Email share (via client)
- Receipt QR code generation for digital access

### Advanced Features
- Auto-print KOT (Kitchen Order Ticket) setting
- Print KOT without completing payment
- **Hold Orders** - Save incomplete orders for later completion
- Resume held orders from dedicated panel
- Order cancellation with reason logging
- Order editing (add/remove items post-creation)
- Re-order from previous orders

---

## Table Management

### Table Configuration
- Visual table grid layout (drag-and-drop positioning)
- Add/Edit/Delete tables
- Table capacity settings (number of seats)
- Table status tracking: Available, Occupied, Reserved
- Table position tracking (X/Y coordinates)
- Industry-specific naming (Tables, Counters, Stations, Chairs, etc.)

### Operations
- Mark tables as Occupied/Available
- Start orders directly from table
- Real-time occupancy view
- Reservation integration

---

## Kitchen Display System (KDS)

### KDS Screen
- Dedicated KDS screen at `/kds` route
- Real-time order display with auto-refresh (10-second interval)
- Order cards with complete item details
- Color-coded order types (Dine-in=Green, Takeaway=Orange, Delivery=Blue)
- Time elapsed display on each order

### Order Management
- Mark individual items as "done"
- Start preparing item (status tracking)
- Cancel KDS items
- Recall/bump completed orders
- Sound notifications on new orders (toggleable)
- Filter by status (All, Pending, Preparing, Done)
- Touch-friendly interface for kitchen environment

---

## Order Management

### Order History
- Complete order history with pagination
- Order details expansion (view all items, notes, metadata)
- Search orders by ID, customer name, phone
- Filter by status: Completed, Cancelled, Refunded, Pending
- Filter by order type: Dine In, Takeaway, Delivery

### Order Actions
- Edit existing orders (add/remove items)
- Re-order from previous orders (duplicate functionality)
- Delivery status updates
- Add notes to orders
- View order notes history (audit trail)
- Cancel orders with required reason

### Refund System
- Full refund request creation
- Refund approval workflow (admin only)
- Stock restoration on refund
- Refund history tracking
- Reason logging for all refunds

---

## Product Management

### Core Functionality
- Full CRUD operations (Create, Read, Update, Delete)
- Category management (add/edit/delete categories)
- Subcategory support (hierarchical categories)
- Barcode support (scannable, printable)
- SKU support (stock keeping units)
- Favorites marking for quick access

### Product Details
- Product name & description
- Product images (URL with preview)
- Tags for organization
- Digital product flag (for non-physical goods)
- Product status: Active, Inactive, Discontinued
- Cost price & wholesale price
- Product variants (size, color, material, etc.)
- Variant-specific pricing & stock per variant

### Pricing & Tax
- Tax rate per product (0-100% configurable)
- Tax rate override per product (ignores global tax)
- Tax-inclusive pricing option
- Tax-exclusive pricing option

### Inventory Control
- Stock tracking with quantity
- Minimum stock level setting
- Product-specific reorder points

### Import/Export
- CSV export of products (all data)
- CSV import of products (bulk upload)
- Batch stock updates (increase/decrease multiple products)

### Combos & Deals
- Combo/deal creation with multiple products linked
- Combo pricing with discount display
- Combo activation/deactivation toggle
- Combos appear in POS grid like regular products

---

## Inventory Management

### Ingredients & Stock
- Ingredients & supplies tracking
- Stock quantity management (supports decimal values)
- Unit of measurement (kg, liters, grams, pieces, boxes, etc.)
- Reorder level setting per ingredient
- Manual stock adjustment (add/remove)
- Inventory transaction log (complete audit trail)

### Advanced Tracking
- Batch tracking (expiry dates, cost tracking per batch)
- Serial number tracking for high-value items
- Stock count/audit functionality (physical verification)
- Inventory valuation methods:
  - Average Cost (AVG)
  - First In, First Out (FIFO)
  - Last In, First Out (LIFO)

### Recipe Management
- Recipe creation (link products to ingredients)
- Ingredient quantity specification per recipe
- Auto-deduct ingredients on sale (recipe-based)
- Recipe-by-product mapping
- Per-store recipe configuration

### Integration
- Purchase order receiving updates ingredient stock
- Transfer stock between stores (multi-store mode)
- Stock restoration on order cancellation/refund
- Comprehensive audit history (who changed what and when)

---

## Customer CRM

### Customer Database
- Customer CRUD operations
- Phone-based customer lookup (fast search on numeric input)
- Search by name or phone
- Customer profile view with detailed statistics

### Loyalty & Engagement
- Loyalty points system (auto-add on purchase, configurable rate)
- Visit tracking (total visits, last visit date)
- Total spent tracking (lifetime value)
- Loyalty tier assignment (Bronze, Silver, Gold)
- Birthday & anniversary tracking
- Auto-reminders for birthdays/anniversaries

### Customer Details
- Customer groups (e.g., Retail, Wholesale, VIP)
- Customer notes (internal remarks)
- Credit limit management
- Price tier assignment (Retail, Wholesale)
- Tax ID collection (GSTIN, VAT ID)
- Multiple addresses per customer
- Address labels (Home, Work, Delivery, etc.)

### Analytics
- Customer statistics (average order value, total visits)
- Order history per customer (full list with details)
- Export customers to CSV
- Import customers from CSV (bulk upload)

---

## Customer Wallet

### Wallet Operations
- Wallet balance tracking per customer
- Load money to wallet (manual credit)
- Payment from wallet balance at checkout
- Wallet transaction history (all credit/debit entries)
- Receipt-style transaction entries

### Financial Tracking
- Credit/debit tracking with timestamps
- Total loaded amount (lifetime)
- Total spent amount (lifetime)
- Current balance display

---

## Staff Management

### Staff Accounts
- Multi-role support: Admin, Cashier, Manager, Waiter, Kitchen, Technician
- PIN-based authentication (4-digit)
- Staff CRUD (add/edit/delete)
- Email & password authentication for admin
- Role-based access control (RBAC)

### Attendance & Time
- Clock In / Clock Out attendance tracking
- Today's attendance report (who's in/out)
- Duty duration calculation (hours worked)
- Staff attendance modal (quick clock in/out)

### Scheduling & Payroll
- Staff scheduling calendar
- Shift management (add/edit/delete shifts)
- Shift assignments (date, time, role)
- Shift notes (special instructions)
- Salary tracking (period-based records)
- Salary calculation from hours worked
- Salary status: Pending, Paid, Cancelled

### Security
- Rate limiting on failed PIN attempts (5 attempts → 30min lockout)
- Default credentials: Admin PIN=1234, Cashier PIN=0000
- PIN change functionality
- Session management
- Automatic logout on lock

---

## Coupons & Discounts

### Coupon Creation
- Create percentage-based coupons (e.g., 10% off)
- Create fixed-amount coupons (e.g., ₹500 off)
- Minimum order amount requirement
- Maximum discount cap
- Usage limits (max uses per coupon)
- Validity date range (from/to dates)
- Enable/disable coupons

### Coupon Management
- Coupon usage tracking (used count per coupon)
- Coupon validation at checkout
- Auto-apply coupon logic (find best coupon)
- Edit/Delete coupons
- Duplicate coupon codes prevented (unique per store)

---

## Expense Tracking

### Expense Recording
- Expense recording with amount, category, date, notes
- Expense categories: Rent, Utilities, Supplies, Wages, Maintenance, Marketing, Transport, Miscellaneous
- Custom category creation
- Category icons for visual identification
- Payment method tracking (cash, card, bank_transfer, upi)

### Expense Management
- Date-range filtering
- Total expenses summary
- Expense history with edit/delete
- Daily expense view

---

## Day-End Reconciliation

### Reconciliation Process
- Opening cash entry (start-of-day cash)
- Expected cash calculation (based on cash sales + opening cash - expenses)
- Actual cash counting (physical count)
- Variance/difference calculation (gain/loss)
- Payment method breakdown (cash, upi, card totals)
- Total expenses deduction
- Notes for observations (audit trail)

### Features
- Save reconciliation record
- Prevent duplicate reconciliation per date (one per day)
- Daily summary integration
- Audit trail for changes

---

## Supplier Management

- Supplier database CRUD
- Contact details (phone, email, address)
- Supplier search functionality
- Supplier association with purchase orders

---

## Purchase Orders (PO)

### PO Workflow
- Create purchase orders
- Select supplier association
- Add items (ingredients) with quantity & unit cost
- Expected delivery date tracking
- PO status: Draft, Sent, Received, Cancelled
- Partial receipt tracking (receive some items)
- Receive PO (updates ingredient stock automatically)
- Delete POs (only in draft/cancelled status)
- PO total calculation (sum of items)

### PO Management
- PO notes field
- PO history (all past POs)
- Item-wise receipt tracking

---

## Reservations

### Reservation System
- Table reservation system
- Date and time selection (calendar picker)
- Party size tracking (number of guests)
- Customer name & phone capture
- Special notes (dietary requirements, etc.)
- Reservation status: Confirmed, Cancelled, Completed, No Show

### Reservation Management
- View reservations by date (calendar view)
- Conflict detection (table availability check)
- Reservation history with filtering

---

## Reports & Analytics

### Dashboard Metrics
- Today's revenue (real-time)
- Transaction count (orders today)
- Average order value
- Items sold count
- Weekly revenue chart (7-day trend line)
- Top products report (by quantity & revenue)

### Advanced Reports
- Sales by date range filter (custom start/end)
- Hourly sales breakdown (sales per hour of day)
- Sales by item report (product-wise revenue)
- Staff performance report (revenue & orders by staff member)
- Payment method breakdown (Cash, UPI, Card split)
- **GST Reports** (see dedicated section)
- Export products to CSV
- Export orders to CSV
- Export customers to CSV
- Full JSON backup/restore
- Export to Tally accounting software
- Export to QuickBooks
- On-screen report display with pagination

### Report Formatting
- CSV export (Excel-compatible)
- JSON export (full database dump)
- Compressed binary backup (`.backup` format)
- Premium report access gating (admin only)

---

## GST / Tax Reports (India-Focused)

### GSTR-1 Format
- Invoice-wise details export
- Taxable value calculation
- CGST/SGST/IGST breakdown
- Place of supply tracking
- Customer GSTIN collection field
- Export GSTR-1 to CSV

### GSTR-3B Summary
- Summary totals by tax rate
- Monthly/quarterly aggregation
- Export GSTR-3B to CSV

### Multi-Tax Support
- Multi-state support (place of supply tracking)
- Tax rate configuration for 40+ countries/regions
- Tax name customization (GST/VAT/Sales Tax/etc.)

---

## Activity Logs / Audit Trail

### Logging Features
- Comprehensive logging of all actions
- User tracking (who performed what action)
- Timestamp for every action
- Action type categorization
- Previous data & new data snapshots (before/after values)
- Reason/notes for sensitive actions
- Order-linked logs (trace all actions on an order)

### Log Management
- Date range filtering
- Search logs by user, action type, order ID
- Export audit logs to CSV
- Admin-only access

---

## Multi-Store Management

### Store Configuration
- Create multiple stores
- Store-specific data isolation
- Store industry types (Food, Retail, Pharmacy, Gift Shop, Salon/Spa, Repair Shop)
- Active/inactive store status
- Store selection dropdown (switch between stores)

### Multi-Store Features
- Transfer stock between stores
- Store-specific settings (per-store configuration)
- Store-specific product catalogs (products per store)
- Single organization across all stores (unified management)

---

## Cloud Sync (Neon PostgreSQL) — PREMIUM

### Neon Integration
- Neon PostgreSQL integration (hosted cloud database)
- Push local data to cloud (on-demand or auto 5-minute interval)
- Pull remote data from cloud to local
- Bidirectional sync capabilities
- Sync status indicator (online/offline/syncing)
- Last sync time tracking
- Sync error handling & automatic retry
- Conflict resolution modal for data conflicts

### Architecture
- Offline-first architecture (works without internet)
- Automatic re-sync on reconnection
- Data compression for sync efficiency
- Device ID tracking (local vs remote record identification)
- Sync status flag on orders
- 1000-row limit per sync batch (configurable)

### Data Synced
- Orders and order items (push & pull)
- Products (push & pull)
- Customers (push & pull)
- Ingredients (push & pull)
- Suppliers (push & pull)
- Expenses (push & pull)
- Variants (push & pull)
- Tables (push & pull)
- Combos (push & pull)
- Coupons (push & pull)
- Reservations (push & pull)

---

## LAN Sync — PREMIUM

### LAN Server
- Embedded HTTP server for local network sync
- Start/stop LAN server from UI
- Configurable port (default 8080, changeable in settings)
- Broadcast orders to other devices on same network
- Multi-device collaboration (real-time order sharing)

### Use Cases
- Restaurant kitchen/operations synchronization
- Multiple POS terminals in same location
- Real-time order pushing to kitchen screens
- No internet required (local network only)

---

## Security & Authentication

### Authentication Methods
- PIN-based login (4-digit)
- Email/password login for admin
- Default credentials: Admin PIN=1234, Cashier PIN=0000
- PIN change functionality (user-initiated)
- Password hashing (bcrypt for passwords, hashed PINs)

### Access Control
- Role-based access control (RBAC):
  - **Admin**: Full access to all features
  - **Manager**: Reports, staff, settings (except sensitive configs)
  - **Cashier**: POS, Orders, basic product view
  - **Waiter**: Table management, order taking
  - **Kitchen**: KDS view only
  - **Technician**: Limited support access
- All admin screens locked behind role check

### Security Features
- Rate limiting on failed attempts (max 5 attempts → 30min lockout)
- Lock screen (Ctrl+L shortcut)
- Session management
- Automatic logout on inactivity
- License key activation for premium features
- Trial period detection (6 months from install date)
- Premium status checking (env, license, trial)
- No transaction deletion (audit compliance)
- Encryption of sensitive data (SQLite encryption via AES-GCM)
- Organization-based multi-tenancy

---

## Settings & Configuration

### Store Information
- Store name, address, phone
- Logo upload (store on device, displayed on receipts)
- Brand colors (primary, secondary, accent)
- Receipt header text customization
- Footer text on receipts
- Show/hide logo on receipt
- Show/hide tax breakdown on receipt

### Regional Settings
- Currency selection (3-letter code + symbol, supports 150+ currencies)
- Country selection (40+ presets with state/province data)
- Timezone selection (automatic and manual)
- Language selection (6 languages supported)

### Tax Configuration
- Tax system selection: None, GST, VAT, Sales Tax, HST, PST, ICMS, KDV, SST, PPN, TVA, BTW, MOMS, MWST, IVA
- Tax rate configuration (0-100%)
- Tax name customization
- Tax-inclusive / Tax-exclusive toggle
- Per-product tax override enabled/disabled

### Feature Toggles
- Auto-reminders settings (enable/disable with day counts)
- Enable/disable rounding
- Receipt auto-print toggle
- KOT auto-print toggle
- LAN sync toggle
- Cloud sync toggle

### Integration Settings
- WhatsApp API configuration (token, phone number ID)
- SMS (Twilio) configuration (account SID, auth token, from number)
- Cloud sync settings (Neon PostgreSQL URL)
- License key management
- Backup/restore functions

### Onboarding
- First-time setup wizard
- Guided store creation
- Sample data import option

---

## Internationalization (i18n)

### Supported Languages
- English (default)
- Hindi (हिंदी)
- Marathi (मराठी)
- Telugu (తెలుగు)
- Tamil (தமிழ்)
- Gujarati (ગુજરાતી)

### Localization Features
- RTL/LTR awareness (automatic direction switching)
- Translation files in `/messages` directory
- Dynamic language switching (no restart required)
- Country-specific tax presets (40+ countries)
- Currency symbol auto-selection

---

## Accounting & Finance

### Inventory Valuation
- Multi-method inventory valuation:
  - Average Cost (weighted average)
  - FIFO (First In, First Out)
  - LIFO (Last In, First Out)
- Automatic stock deduction on sale
- Stock restoration on refund/cancel
- Transaction history in inventory (full audit trail)

### Pricing
- Price tiers (Retail, Wholesale custom pricing)
- GST-compliant invoicing
- Tax inclusion/exclusion per product
- Tax cap support (max tax amount)
- Round-off option (nearest integer)

### Additional
- Tip tracking (tips collected per order)
- Multi-currency support

---

## Accessibility

### WCAG Compliance
- ARIA labels on all interactive elements
- Screen reader support (NVDA, JAWS, VoiceOver)
- Skip link to main content (keyboard navigation)
- Focus indicators (visible outlines)
- Role attributes (semantic HTML)
- Live regions for dynamic content updates
- Keyboard navigation (Tab, Enter, Escape fully functional)
- Focus visible outlines for all interactive elements

### UI Features
- Header bar with keyboard shortcuts display
- Lock screen feature (Ctrl+L)
- Shortcuts modal (press ?)
- Color contrast compliance (AA standard)
- 44px minimum button size (touch-friendly)
- Larger cart +/- buttons (easy access)
- Larger product cards (clear visibility)

---

## Keyboard Shortcuts

### Global Navigation
| Key | Action |
|-----|--------|
| F1 | POS Screen |
| F2 | Dashboard |
| F3 | Orders |
| F4 | Products |
| F5 | Kitchen Display (KDS) |
| F6 | Reports |
| F7 | Activity Logs |
| F8 | Settings |
| F9 | Stores (Multi-Store Management) |
| ? | Show shortcuts help modal |
| Ctrl+L | Lock screen |
| Esc | Close modals / Clear search |

### POS Screen Specific
| Key | Action |
|-----|--------|
| Enter | Add scanned barcode to cart |
| Arrow Keys | Navigate product grid |
| 1-9 | Quick add product (when focused) |
| +/- | Increase/decrease quantity |
| Delete | Remove item from cart |
| C | Clear cart |
| P | Process payment |
| N | New order after checkout |
| 1 | Set order type to Dine In |
| 2 | Set order type to Takeaway |
| 3 | Set order type to Delivery |
| Alt+1-5 | Switch payment method (1=Cash, 2=Card, 3=UPI, 4=Wallet, 5=Credit) |
| Alt+Q | Toggle price tier (Retail/Wholesale) |
| F9 | Print KOT (Kitchen Order Ticket) |
| F10 | Hold Order |
| F12 | Process checkout |

---

## Premium Features

All premium features are locked behind role check and require license activation:

| Feature | Description | Without License |
|---------|-------------|-----------------|
| Cloud Sync (Neon) | Multi-device cloud backup & sync | Read-only demo mode |
| Multi-Store Management | Manage 3+ stores with stock transfer | 1 store only |
| Advanced Inventory | Ingredients, recipes, POs | Basic stock tracking only |
| Staff Scheduling & Payroll | Shift planning, salary management | Basic attendance only |
| Customer CRM & Loyalty | Full customer database, wallet | Basic customer name capture |
| Coupons & Promotions | Create & manage discount codes | Manual discounts only |
| Inventory Alerts | Low stock & out-of-stock notifications | Disabled |
| Inventory Management Screen | Dedicated inventory dashboard | Hidden |
| Refund Requests | Full refund workflow | Simple cancel only |
| Enhanced Reports | Hourly, Staff Performance, Items | Basic reports only |
| GST Reports | GSTR-1, GSTR-3B export | Disabled |
| Activity Logs | Full audit trail | Basic logging only |
| Expense Management | Full expense tracking | Disabled |
| All Admin Screens | Full administrative access | Locked |

### Trial Period
- 6-month trial period from installation date
- All premium features unlocked during trial
- After trial: premium features require license key
- Grace period option to purchase before full lock

---

## Reporting & Export

### Export Formats
- **CSV**: Products, orders, customers, audit logs, GST reports
- **JSON**: Full database backup/restore (complete data dump)
- **Tally import format**: XML/CSV compatible with Tally accounting
- **QuickBooks export**: CSV format for QuickBooks import
- **Compressed backup**: Binary format (`.backup` file)

### Reports Available
- Sales summary by date range
- Product-wise sales report
- Top products (quantity & revenue)
- Staff performance report
- Payment method breakdown
- Daily revenue & transaction count
- Hourly sales breakdown
- Customer statistics
- Inventory valuation report
- Tax summary report
- GST GSTR-1 & GSTR-3B
- Expense report
- Attendance report

---

## Offline & Recovery

### Offline-First Architecture
- Works 100% without internet connection
- LocalStorage fallback in browser dev mode
- All data stored locally on device (SQLite)
- No cloud dependency required

### Crash Recovery
- Crash recovery on startup (detects pending unsaved orders)
- Pending orders recovery modal
- Option to discard or keep pending orders after crash
- Auto-save during order creation (every 30 seconds)
- Network status detection (online/offline indicator)
- Graceful degradation without cloud (all features work locally)

---

## Hardware & Printer Support

### Thermal Printers
- ESC/POS compatible thermal printers
- Raw command printing for receipt printers
- Cash drawer trigger via printer (kick signal)
- Custom receipt formatting (logo, header, footer, tax breakdown)

### Barcode & QR
- Barcode scanner support (keyboard wedge mode, HID)
- QR code generation for receipts (digital share)
- QR code display on screen for mobile scanning

### Other Hardware
- Image saving to app data directory
- Receipt file saving to Downloads folder
- USB/HID device support for scanners

---

## Notifications & Alerts

### SMS Notifications
- SMS via Twilio (configurable)
- Triggered on order status changes
- Delivery status updates
- Reservation reminders

### WhatsApp Notifications
- External API integration (custom endpoint)
- Receipt sharing via WhatsApp
- Order confirmation messages

### In-App Alerts
- Low stock alerts (visual & modal)
- Out of stock alerts
- Inventory alerts dashboard
- Doorbell notification sound (optional)

---

## Auto-Updates

### Update System
- App version retrieval from Tauri
- Check for updates (Tauri auto-updater integration)
- Update metadata display (changelog, version)
- Download & install prompts
- Automatic restart after update

---

## Help & Training

### In-App Resources
- Comprehensive training guide (menu-by-menu walkthrough)
- Keyboard shortcuts reference modal (press `?`)
- Support screen with documentation
- Feature descriptions with examples
- Step-by-step instructions for each screen
- External links to online docs
- Version information display

---

## Data Models (Database Tables)

| Table | Description |
|-------|-------------|
| `stores` | Multi-store setup data |
| `products` | Product catalog |
| `product_variants` | SKU variations per product |
| `batches` | Batch tracking (expiry, cost) |
| `serial_numbers` | Serial tracking for high-value items |
| `inventory_transactions` | Stock movement audit trail |
| `stock_counts` | Physical stock take sessions |
| `stock_count_items` | Count results per session |
| `orders` | Transaction records |
| `order_items` | Line items per order (includes KDS status) |
| `settings_multi` | Per-store settings |
| `organizations` | Multi-tenant orgs |
| `users` | Staff accounts |
| `activity_logs` | Audit trail of all actions |
| `tables` | Table management |
| `staff_attendance` | Clock in/out logs |
| `staff_salaries` | Payroll records |
| `customers` | CRM profiles |
| `customer_addresses` | Address book per customer |
| `inventory_alerts` | Low stock notifications |
| `refund_requests` | Refund workflow |
| `ingredients` | Raw materials & supplies |
| `recipes` | Product-ingredient links |
| `suppliers` | Vendor management |
| `purchase_orders` | PO tracking |
| `purchase_order_items` | PO line items |
| `reservations` | Table bookings |
| `shifts` | Staff scheduling |
| `expenses` | Expense tracking |
| `expense_categories` | Expense types |
| `tax_rates` | Multi-tax support |
| `wallet_transactions` | Customer wallet ledger |
| `coupons` | Discount codes |
| `day_end_reconciliations` | Daily cash close |
| `combos` | Combo meals/deals |
| `schema_version` | Migration tracking |

**Total**: 37 database tables with full relational integrity.

---

## Rust Backend Commands (Tauri)

100+ Tauri commands registered, organized by module:

- **Product Commands** (8): Create, read, update, delete, list, search, low stock, toggle status
- **Combo Commands** (4): Create, update, delete, list combos
- **Order Commands** (5): Create order, get all, get by ID, update status, delete
- **Settings Commands** (2): Get settings, update settings
- **Analytics Commands** (5): Dashboard summary, sales by date, top products, weekly revenue, hourly breakdown
- **CSV Commands** (3): Export products, export orders, export customers
- **Reports Commands** (1): Get report data
- **User Commands** (8): Login, get profile, update PIN, list, create, update, delete, assign role
- **Table Commands** (4): List, create, update, delete tables
- **Staff Attendance Commands** (4): Clock in, clock out, get today, get history
- **Customer Commands** (9): List, create, update, delete, search, get by ID, get visits, get orders, get stats
- **Order Notes Commands** (2): Add note, get notes
- **Inventory Alert Commands** (4): Get alerts, mark as viewed, clear alert, clear all
- **Enhanced Reports Commands** (3): Get staff performance, get payment breakdown, get sales by item
- **Hold/Cancel Commands** (3): Hold order, resume order, cancel order
- **Refund Commands** (4): Create request, approve, reject, get all
- **Crash Recovery Commands** (3): Get pending orders, clear pending, check recovery needed
- **Store Management Commands** (3): List stores, create store, update store
- **Ingredient & Recipe Commands** (4): CRUD for ingredients, recipe CRUD
- **Supplier & PO Commands** (6): Supplier CRUD, PO CRUD, receive PO
- **Reservation Commands** (3): Create reservation, list reservations, update status
- **SMS Commands** (1): Send order notification
- **LAN Sync Commands** (3): Start server, stop server, get status
- **Shift Management Commands** (3): Create shift, list shifts, delete shift
- **Expense Commands** (4): Expense CRUD, get categories, get expenses with filter
- **Wallet Commands** (4): Wallet transaction CRUD, get balance, load wallet
- **Coupon Commands** (5): Coupon CRUD, validate, apply coupon
- **Day End Reconciliation Commands** (2): Create reconciliation, get history
- **GST Commands** (2): Get GSTR-1, get GSTR-3B
- **Activity Log Commands** (1): Get logs with filters
- **Export Commands** (3): JSON backup, JSON restore, get export options
- **Print Commands** (4): Print KOT, print receipt, save image, save receipt
- **WhatsApp Commands** (1): Send WhatsApp message
- **Neon Sync Commands** (2): Push to Neon, pull from Neon
- **Premium Status Commands** (2): Check premium status, activate license
- **App Info Commands** (1): Get app version

---

## Performance & Optimization

### Database Optimizations
- WAL (Write-Ahead Logging) journal mode for concurrent writes
- 30+ database indexes for fast queries
- Pagination for large datasets (orders, products, customers)
- Debounced search (500ms delay for typing)
- Memoized selectors (Zustand store)
- Lazy loading of modals (only when opened)
- Minimal re-renders (Zustand + React.memo)

### Frontend Optimizations
- Next.js 14 App Router with optimized bundles
- Static assets cached locally
- Code splitting by route
- Tailwind CSS for minimal CSS payload
- Lazy-loaded components (dialog modals)
- Debounced API calls

---

## Development & Testing

### Code Quality
- TypeScript strict mode
- ESLint-ready with custom rules
- Prettier formatting (Preconfigured)
- Rust clippy for backend code
- Tauri security linting
- Comprehensive JSDoc comments

### Testing
- Playwright E2E tests (auth flow, backup/restore)
- Unit test support (Vitest configured)
- Hot reload in dev mode
- SQLite in-memory testing database
- Mock Tauri commands for UI testing

### Build System
- Build scripts for Windows (NSIS installer)
- Build scripts for Linux (AppImage, deb, rpm)
- Build scripts for macOS (DMG, App Store)
- Cross-platform packaging via Tauri CLI
- Automatic icon generation
- Code signing ready (certificate slots)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 14 (App Router) |
| UI Library | React 18 |
| Styling | Tailwind CSS 3.4 |
| Backend Shell | Tauri 2.x |
| Database Engine | SQLite 3 (via rusqlite) |
| Cloud Database | Neon PostgreSQL (optional) |
| Backend Language | Rust 1.75+ |
| Desktop Shell | Tauri WebView2 (Windows), WebKit (macOS/Linux) |
| State Management | Zustand |
| Validation | Zod schemas |
| Icons | Lucide React |
| Date Utils | date-fns |
| QR Code | qrcode |
| Print Receipts | @tauri-apps/plugin-clipboard-manager |
| OS APIs | Tauri system tray, dialogs, notifications |

---

## Project Structure

```
pos-tauri/
├── app/
│   ├── globals.css         # Tailwind + custom styles
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Screen router (SPA-like navigation)
├── components/
│   ├── Sidebar.tsx                 # Main navigation sidebar
│   ├── POSScreen.tsx               # Main billing screen
│   ├── DashboardScreen.tsx         # Analytics dashboard
│   ├── OrdersScreen.tsx            # Order history & management
│   ├── ProductsScreen.tsx          # Product catalog management
│   ├── TableManagementScreen.tsx   # Table layout & status
│   ├── KitchenDisplayScreen.tsx    # KDS view
│   ├── CustomersScreen.tsx         # CRM interface
│   ├── CustomerWalletScreen.tsx    # Wallet operations
│   ├── CouponsScreen.tsx           # Discount management
│   ├── AlertsScreen.tsx            # Inventory alerts
│   ├── IngredientsScreen.tsx       # Stock management
│   ├── SuppliersScreen.tsx         # Vendor management
│   ├── PurchaseOrdersScreen.tsx    # PO tracking
│   ├── ReservationsScreen.tsx      # Booking system
│   ├── StaffAttendanceScreen.tsx   # Clock in/out
│   ├── StaffSchedulingScreen.tsx   # Shift management
│   ├── SalaryManagementScreen.tsx  # Payroll
│   ├── StaffManagementScreen.tsx   # Staff CRUD
│   ├── ReportsScreen.tsx           # Analytics & exports
│   ├── GSTReportsScreen.tsx        # Tax reports
│   ├── ExpenseTrackingScreen.tsx   # Expense management
│   ├── DayEndReconciliationScreen.tsx  # Cash close
│   ├── ActivityLogsScreen.tsx      # Audit trail
│   ├── SettingsScreen.tsx          # Configuration
│   ├── MultiStoreScreen.tsx        # Store management
│   ├── CloudSyncScreen.tsx         # Neon sync
│   ├── LANSyncScreen.tsx           # LAN server
│   ├── TrainingGuideScreen.tsx     # Help & training
│   └── ui/                         # Reusable UI components
├── lib/
│   ├── db.ts               # DB abstraction (Tauri invoke + localStorage fallback)
│   ├── stores/             # Zustand state stores
│   ├── utils/              # Helper functions (dates, formatting, validation)
│   ├── validations/        # Zod schemas for all data models
│   ├── constants/          # App constants (tax configs, countries, currencies)
│   └── types/              # TypeScript type definitions
├── messages/
│   ├── en.json             # English translations
│   ├── hi.json             # Hindi translations
│   ├── mr.json             # Marathi translations
│   ├── te.json             # Telugu translations
│   ├── ta.json             # Tamil translations
│   └── gu.json             # Gujarati translations
├── src-tauri/
│   ├── src/
│   │   ├── main.rs         # Tauri commands registration & setup
│   │   ├── db.rs           # SQLite operations (rusqlite)
│   │   ├── neon.rs         # Neon PostgreSQL sync
│   │   ├── auth.rs         # Authentication & PIN handling
│   │   ├── users.rs        # Staff management logic
│   │   ├── settings.rs     # Settings CRUD
│   │   ├── audit.rs        # Activity logging
│   │   ├── premium.rs      # License & trial management
│   │   ├── export.rs       # CSV/JSON/Tally export
│   │   ├── print.rs        # Receipt & KOT printing
│   │   └── utils.rs        # Helper Rust functions
│   ├── Cargo.toml          # Rust dependencies
│   ├── build.rs
│   ├── tauri.conf.json     # Tauri configuration (permissions, windows)
│   └── icons/              # App icons for all platforms
├── package.json
├── next.config.js          # Next.js config (static export for Tauri)
├── tailwind.config.js
├── tsconfig.json
└── README.md               # Project overview & setup instructions
```

---

## Supported Industries

| Industry | Special Features |
|----------|-----------------|
| **Restaurant / Cafe** | Table management, KDS, delivery tracking |
| **Quick Service** | Fast checkout, barcode scanning |
| **Retail Shop** | Variant support, serial tracking, barcode |
| **Pharmacy** | Batch tracking, expiry dates |
| **Salon / Spa** | Appointment-style reservations, service items |
| **Gift Shop** | Combo deals, gift wrapping notes |
| **Repair Shop** | Job cards, service tracking |

---

## Quick Start Demo

1. **First Launch** → Onboarding wizard creates admin account
2. **Add Products** → Products screen → + New → Fill details
3. **Add Tables** → Tables screen → + New → Set capacity & position
4. **Take Order** → POS screen → Select table → Add items → Process payment
5. **Print KOT** → Press F9 during order → Kitchen receives order
6. **View Reports** → Reports screen → Today's summary

---

## Default Credentials

- **Admin PIN**: `1234` (Full system access)
- **Cashier PIN**: `0000` (POS & Orders only)

Change PIN immediately after first login via Settings → Change PIN.

---

## Data Storage Locations

| OS | SQLite Database Path | App Config Path |
|----|----------------------|-----------------|
| Windows | `%APPDATA%\com.pos.billing\pos.db` | `%APPDATA%\com.pos.billing\` |
| macOS | `~/Library/Application Support/com.pos.billing/pos.db` | `~/Library/Application Support/com.pos.billing/` |
| Linux | `~/.local/share/com.pos.billing/pos.db` | `~/.local/share/com.pos.billing/` |

**Backup**: Simply copy the `pos.db` file to create a complete backup of all data.

---

## Build Instructions

### Windows
```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/nsis/*.exe
```

### macOS
```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/dmg/*.dmg
```

### Linux
```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/appimage/*.AppImage
```

### Development Mode (Web)
```bash
npm run dev
# Browser: http://localhost:3000
# Uses localStorage instead of SQLite
```

### Development Mode (Desktop)
```bash
npm run tauri:dev
# Opens desktop window with full SQLite support
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 / macOS 10.15 / Ubuntu 20.04 | Latest OS version |
| RAM | 2 GB | 4 GB+ |
| Storage | 100 MB app + database space | 1 GB+ for data |
| Screen | 1280x720 | 1920x1080+ |
| Printer | ESC/POS compatible (optional) | Any thermal printer |

---

## License

**License**: MIT License (Open Source)

This software is free to use, modify, and distribute. No attribution required, but appreciated.

---

## Support & Contribution

- **Documentation**: [Online Docs](https://github.com/posbilling/pos-tauri/wiki)
- **Issue Tracker**: [GitHub Issues](https://github.com/posbilling/pos-tauri/issues)
- **Community**: Discord/Telegram (link TBD)
- **Donations**: [Buy Me a Coffee](https://www.buymeacoffee.com/akashbadole)

---

## FAQ

**Q: Is this really free?**
A: Yes. 100% free, no hidden fees, no subscriptions, no limitations. All features included.

**Q: Does it work offline?**
A: Yes. All core POS functions work 100% offline. Cloud sync is optional.

**Q: Can I use multiple stores?**
A: Yes. Multi-store management is free (not a paid feature). Create unlimited stores.

**Q: Is my data safe?**
A: Your data stays on your device (SQLite). No cloud vendor has access. Optional encrypted cloud backup available.

**Q: What about taxes?**
A: Supports 40+ tax systems worldwide: GST (India), VAT (EU), Sales Tax (US), HST (Canada), and many more.

**Q: Can I customize it?**
A: Yes. Open source under MIT license. You can modify the code, add features, or self-host.

**Q: Is there hardware support?**
A: Yes. Works with ESC/POS thermal printers, barcode scanners (keyboard wedge), and cash drawers.

**Q: How do I get support?**
A: Free community support via GitHub Issues. Premium support plans available for businesses.

---

*Powered by AppIXEN*
*Last Updated: April 2026*
*Version: 2.0.0 (Production Ready)*
