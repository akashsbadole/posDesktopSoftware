# POS Billing - Features Documentation

A production-ready Point of Sale (POS) desktop application for restaurants, built with Tauri + Next.js + SQLite + Neon PostgreSQL.

---

## Core POS Features

- Product grid with categories
- Search by name/barcode
- Cart management with quantity controls (+/- buttons)
- Multiple payment methods (Cash, Card, UPI, Wallet)
- Customer name capture
- Automatic stock deduction
- Receipt generation and printing
- Tax calculation per product (configurable per product)
- Order item notes/special instructions
- Global order discounts
- Coupon code support
- **Print KOT** - Print Kitchen Order Ticket without completing payment
- Auto-print KOT setting

---

## Table Management

- Add/Edit/Delete tables
- Table capacity settings
- Table status tracking (Available, Occupied, Reserved)
- Visual table grid layout
- Mark table as Occupied/Available
- Table position tracking (X/Y coordinates)

---

## Order Management

- **Hold Orders** - Save incomplete orders for later
- **Order Notes** - Add special instructions to orders
- Order types (Dine In, Takeaway, Delivery)
- Delivery address and phone capture
- Delivery status tracking (Pending, Out for Delivery, Delivered, Cancelled)
- Print Kitchen Order Ticket (KOT) without completing payment
- Held orders panel with resume functionality
- Order cancellation with reason

---

## Kitchen Display System (KDS)

- Dedicated KDS screen (/kds route)
- Real-time order display
- Order cards with item details
- Mark items as done individually
- Bump/Complete orders
- Auto-refresh orders
- Time elapsed display
- Color-coded order types

---

## Staff Management

- **Clock In/Out** - Track staff attendance
- Today's attendance report
- Duty duration calculation
- PIN-based authentication (4-digit)
- Role-based access (Admin/Cashier)
- Admin PIN: `1234`, Cashier PIN: `0000`
- Staff scheduling calendar
- Shift management (add/edit/delete)
- Role assignment per shift (Cashier, Waiter, Kitchen, Manager)
- Shift notes

---

## Customer CRM

- Customer database (add/edit/delete)
- **Loyalty Points** - Automatic points on purchase
- Visit tracking
- Total spent tracking
- Order history per customer
- Phone-based customer lookup
- Search by name or phone
- Customer profile view with stats

---

## Customer Wallet

- Wallet balance tracking
- Load money to wallet
- Payment from wallet balance
- Wallet transaction history

---

## Coupons & Discounts

- Create percentage discounts
- Create fixed amount discounts
- Minimum order amount requirement
- Maximum discount cap
- Validity dates (from/to)
- Usage limits
- Enable/disable coupons
- Coupon usage tracking

---

## Product Management

- Product CRUD operations
- Category management (add/edit/delete)
- Barcode support
- Tax rate per product
- Stock tracking with quantity
- Low stock alerts
- Product search
- Product images (Image URL support with preview)
- **Combo/deal creation** - Create combo deals with multiple products
- Combo pricing with discount display
- Combo activation/deactivation
- Combos displayed in POS grid

---

## Inventory Management

- Ingredients/supplies tracking
- Stock quantity management
- Unit of measurement (kg, liters, pieces, etc.)
- Reorder level setting
- **Low Stock Alerts** - Warning when below threshold
- **Out of Stock Alerts** - Notification when stock = 0
- Alert management (view/clear)
- Manual stock adjustment
- Recipe linking (product → ingredients)
- Auto-deduct ingredients on sale

---

## Supplier Management

- Supplier database
- Add/Edit/Delete suppliers
- Supplier contact details (phone, email, address)
- Search suppliers

---

## Purchase Orders

- Create purchase orders
- Select supplier
- Add items with quantity and cost
- Expected delivery date
- Mark orders as received
- Partial receipt tracking
- Purchase order history
- Status tracking (Pending, Received, Partial)

---

## Reservations

- Table reservation system
- Date and time selection
- Party size tracking
- Customer name and phone
- Special notes
- Reservation status

---

## Financial Features

- Per-item discounts
- Global order discounts
- **Refund System** - Full refund workflow
- Refund request/approval process
- Cancel orders with reason
- **Multi-Country Tax Support** - Tax rates for 40+ countries/regions

---

## Worldwide Tax Support

| Region | Countries |
|--------|-----------|
| Americas | US (state-level), Canada (GST/HST/PST), Mexico, Brazil |
| Europe | UK, Germany, France, Italy, Spain, Netherlands, Belgium, Poland, Sweden |
| Asia Pacific | India, Australia, New Zealand, Singapore, Japan, Korea, Malaysia, Thailand, Philippines, Indonesia, Vietnam |
| Middle East | UAE, Saudi Arabia, Israel, Egypt |
| Africa | South Africa, Nigeria, Kenya |

- Tax-inclusive / Tax-exclusive pricing option
- Per-product tax rate configuration
- Default tax rate selection by country

---

## Expenses

- Expense tracking
- Expense categories (Rent, Utilities, Supplies, etc.)
- Add/Edit/Delete expenses
- Date-based filtering
- Payment method tracking
- Total expenses summary

---

## Day-End Reconciliation

- Opening cash entry
- Expected cash calculation
- Actual cash counting
- Variance/difference calculation
- Notes for observations
- Save reconciliation record
- Daily summary integration

---

## Reports & Analytics

- Today's revenue
- Transaction count
- Average order value
- Items sold count
- Weekly revenue chart
- Top products (by quantity and revenue)
- Sales by date range
- **Hourly Sales** - Sales breakdown by hour
- **Sales by Item** - Product-wise revenue
- **Staff Performance** - Revenue and orders by staff
- Payment method breakdown (Cash, UPI, Card)
- GST Reports (GSTR-1 format)
- Export reports to Excel

---

## Data Management

- CSV Export (products, orders)
- CSV Import (products)
- Full JSON Backup
- Activity/Audit Logs
- All actions logged with user tracking
- Date-filtered activity logs

---

## Receipt & Sharing

- Automatic receipt generation
- Print to thermal printer
- Save receipt to file
- WhatsApp share
- Email share

---

## Cloud Sync

- Neon PostgreSQL sync (upload)
- Neon PostgreSQL sync (download)
- Multi-device access
- Cloud backup
- Sync status with retry logic
- LAN Sync (server can start)

---

## UI/UX

- **Dark Mode** - Default dark theme
- **Touch Optimized** - 44px minimum buttons
- Larger cart +/- buttons
- Larger product cards
- Smooth animations
- Loading states
- Error handling with user-friendly messages
- Fade-in animations
- Responsive design

---

## Accessibility

- ARIA labels on all elements
- Screen reader support
- Skip link to main content
- Focus indicators
- Role attributes
- Live regions for dynamic content
- Keyboard navigation (Tab, Enter)
- Focus visible outlines
- Header bar with keyboard shortcuts display
- Lock screen feature (Ctrl+L)
- Shortcuts modal (press ?)

---

## Security

- PIN authentication (4-digit)
- Role-based access control
- Admin-only features (settings, reports, logs)
- No transaction deletion (audit trail)
- Audit trail for all changes
- Refund approval workflow

---

## Training & Help

- **Training Guide** - Comprehensive menu-by-menu guide
- Step-by-step instructions for each feature
- Keyboard shortcuts reference

---

## Screens/Menus Reference

| Screen | Description | Access |
|--------|-------------|--------|
| POS | Main point of sale | All |
| Dashboard | Business overview | All |
| Orders | Order history | All |
| Products | Product catalog | All |
| Tables | Table management | All |
| Bookings | Reservations | All |
| Kitchen | KDS display | All |
| Customers | CRM & loyalty | All |
| Wallet | Customer wallet | All |
| Coupons | Discount offers | All |
| Alerts | Inventory alerts | All |
| GST | Tax reports | Admin |
| Expenses | Expense tracking | Admin |
| Ingredients | Stock items | Admin |
| Suppliers | Vendor management | Admin |
| PO | Purchase orders | Admin |
| Schedule | Staff scheduling | Admin |
| Day End | Cash reconciliation | Admin |
| Staff | Attendance | Admin |
| Refunds | Refund requests | Admin |
| Reports | Analytics | Admin |
| Logs | Activity audit | Admin |
| Settings | Configuration | Admin |
| Training | Help guide | All |

---

## Keyboard Shortcuts

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
| ? | Show shortcuts help |
| Ctrl+L | Lock screen |

---

## Default Credentials

- **Admin PIN**: `1234` (Full access)
- **Cashier PIN**: `0000` (Limited access)

---

## Build Instructions

### Windows
```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/nsis/*.exe
```

### Data Storage

| OS | Path |
|----|------|
| Windows | `%APPDATA%/com.posbilling.app/` |
| macOS | `~/Library/Application Support/com.posbilling.app/` |
| Linux | `~/.local/share/com.posbilling.app/` |

---

## Project Status

**Overall Completion**: ~95%

| Category | Status |
|----------|--------|
| Core POS | 100% |
| Table Management | 100% |
| Order Management | 100% |
| Kitchen Display | 95% |
| Staff Management | 100% |
| Customer CRM | 100% |
| Inventory | 95% |
| Finance | 95% |
| Reports | 90% |
| Hardware | 60% |
| Cloud Sync | 50% |
| Multi-Store | 20% |
| Mobile App | 0% |

---

*Powered by AppIXEN*
*Last Updated: March 2026*