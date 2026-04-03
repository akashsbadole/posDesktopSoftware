# POS Billing System - Comprehensive Test Cases

This document outlines the test cases for all features and functionalities of the POS Billing System.

---

## 1. Authentication & Security
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| AUTH-01 | Admin Login | Login with PIN `1234` | Access to all screens, role "admin" displayed. |
| AUTH-02 | Cashier Login | Login with PIN `0000` | Restricted access, role "cashier" displayed. |
| AUTH-03 | Invalid Login | Enter incorrect PIN 3 times | Error message "Too many failed attempts", input disabled for 1 min. |
| AUTH-04 | Lock Screen | Press Ctrl+L or click Lock button | App returns to login screen, requires PIN to resume. |
| AUTH-05 | Logout | Click Logout button | App returns to login screen, session cleared. |

## 2. Onboarding Flow
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| ONB-01 | Initial Setup | Complete 6-step onboarding | Store details, tax, and currency configured; onboarding modal closed. |
| ONB-02 | License Agreement | Agree to MIT License | Proceed to next onboarding step. |

## 3. POS (Point of Sale)
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| POS-01 | Add to Cart | Click a product card | Item appears in cart with correct price and quantity 1. |
| POS-02 | Search Product | Type product name in search bar | Grid filters to show matching products. |
| POS-03 | Category Filter | Click a category tab | Grid filters to show products in that category. |
| POS-04 | Adjust Quantity | Click +/- buttons in cart | Quantity updates, total amount recalculates. |
| POS-05 | Item Discount | Apply % or fixed discount to item | Item total decreases, discount label shown. |
| POS-06 | Customer Lookup | Enter phone number in customer field | Customer details auto-populated from CRM. |
| POS-07 | Hold Order | Click "Hold" with items in cart | Cart cleared, order saved to "Held Orders". |
| POS-08 | Restore Order | Click "Restore" from Held Orders | Items return to cart, order removed from held list. |
| POS-09 | Split Payment | Select Multiple payment methods | Total balanced across Cash/Card/UPI/Wallet. |
| POS-10 | Checkout | Click "Pay & Finish" | Order saved to DB, stock deducted, receipt generated. |
| POS-11 | Print KOT | Click "KOT" button | Kitchen ticket generated without completing payment. |

## 4. Product Management
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| PROD-01 | Add Product | Fill form and save | Product appears in list and POS grid. |
| PROD-02 | Edit Product | Update price/stock | Changes reflected immediately in DB and UI. |
| PROD-03 | Delete Product | Delete an existing product | Product removed from list and POS. |
| PROD-04 | Variants | Add variants (Size/Color) | Variants saved and selectable in POS (if implemented). |
| PROD-05 | SKU/Barcode | Scan or enter barcode | Product identified in POS search. |

## 5. Inventory & Ingredients
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| INV-01 | Add Ingredient | Create a new stock item | Ingredient appears in inventory list. |
| INV-02 | Recipe Link | Link product to ingredients | Product sale auto-deducts ingredient quantities. |
| INV-03 | Low Stock Alert | Set stock below threshold | Warning icon appears in Alerts menu. |
| INV-04 | Stock Adjustment | Manually update stock levels | Audit log created, new level saved. |

## 6. Table & Reservation Management
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| TAB-01 | Add Table | Create new table with capacity | Table card appears in Tables screen. |
| TAB-02 | Change Status | Mark as Occupied/Available | Card color and status label update. |
| TAB-03 | Create Booking | Fill reservation form | Booking appears in Reservations list. |

## 7. Customer CRM & Wallet
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| CRM-01 | Add Customer | Create new customer record | Customer searchable in POS. |
| CRM-02 | Loyalty Points | Complete an order | Points added to customer profile based on total. |
| CRM-03 | Wallet Top-up | Add balance to customer wallet | New balance reflected in Wallet screen. |
| CRM-04 | Wallet Payment | Pay for order via Wallet | Balance deducted, transaction logged. |

## 8. Staff & Scheduling
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| STF-01 | Clock In/Out | Record attendance | Entry added to today's attendance report. |
| STF-02 | Shift Schedule | Assign staff to a shift | Schedule appears in calendar view. |

## 9. Finance & Reports
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| FIN-01 | Add Expense | Record a business expense | Total expenses updated in Dashboard. |
| FIN-02 | Create Coupon | Define % discount with code | Coupon valid for use in POS cart. |
| FIN-03 | Daily Summary | View Day End Reconciliation | Cash flow summary matches orders and expenses. |
| FIN-04 | GST Report | Generate GSTR-1 format | Report shows taxable value and tax collected. |
| FIN-05 | Revenue Chart | View Dashboard analytics | Weekly/Monthly charts show accurate data. |

## 10. Multi-Store Management
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| STR-01 | Create Store | Add a new store location | New store selectable in switcher. |
| STR-02 | Store Switcher | Switch between stores | Data (orders/products) updates to reflect active store. |

## 11. System & Logs
| ID | Test Case | Description | Expected Result |
|----|-----------|-------------|-----------------|
| SYS-01 | Audit Logs | Perform any action (delete, save) | Log entry created in Activity Logs screen. |
| SYS-02 | DB Backup | Click "Export Backup" | JSON/GZ file downloaded with all data. |
| SYS-03 | Settings Update | Change store name/tax rate | App adapts terminologies and calculations. |
