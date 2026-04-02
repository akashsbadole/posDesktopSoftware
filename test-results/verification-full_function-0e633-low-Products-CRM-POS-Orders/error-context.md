# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verification/full_functionality.spec.ts >> POS System Full Functionality >> Admin Full Workflow: Products, CRM, POS, Orders
- Location: verification/full_functionality.spec.ts:29:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Discount')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Discount')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open Next.js Dev Tools" [ref=e8] [cursor=pointer]:
    - img [ref=e9]
  - alert [ref=e12]
  - application "POS Application" [ref=e13]:
    - banner [ref=e14]:
      - generic [ref=e16]: Point of Sale
      - generic [ref=e17]:
        - region "Keyboard shortcuts reference" [ref=e18]:
          - img [ref=e19]
          - generic [ref=e21]:
            - 'generic "F1: POS" [ref=e22]': F1
            - 'generic "F2: Dashboard" [ref=e23]': F2
            - 'generic "F3: Orders" [ref=e24]': F3
            - 'generic "F4: Products" [ref=e25]': F4
            - 'generic "F5: Kitchen" [ref=e26]': F5
            - 'generic "F6: Reports" [ref=e27]': F6
            - 'generic "F7: Logs" [ref=e28]': F7
            - 'generic "F8: Settings" [ref=e29]': F8
            - 'generic "Show Help: ?" [ref=e30]': "?"
        - button "Main Store" [ref=e32] [cursor=pointer]:
          - img [ref=e33]
          - generic [ref=e37]: Main Store
          - img [ref=e38]
        - button "Show keyboard shortcuts" [ref=e40] [cursor=pointer]:
          - img [ref=e41]
          - generic [ref=e43]: Shortcuts
        - button "Lock screen" [ref=e44] [cursor=pointer]:
          - img [ref=e45]
          - generic [ref=e48]: Lock
        - status "Logged in as Administrator" [ref=e49]:
          - generic [ref=e50]: A
          - generic [ref=e51]: Administrator
          - generic [ref=e52]: admin
    - generic [ref=e53]:
      - navigation "Main navigation" [ref=e54]:
        - button "Main Store" [ref=e56] [cursor=pointer]:
          - img [ref=e57]
        - generic [ref=e59]:
          - generic [ref=e60]: 01 Apr 2026
          - generic [ref=e61]: 08:05:55 pm
        - menubar "Navigation menu" [ref=e62]:
          - menuitem "POS" [ref=e63] [cursor=pointer]:
            - img [ref=e65]
            - generic [ref=e69]: POS
          - menuitem "Dashboard" [ref=e70] [cursor=pointer]:
            - img [ref=e71]
            - generic [ref=e72]: Dashboard
          - menuitem "Orders" [ref=e73] [cursor=pointer]:
            - img [ref=e74]
            - generic [ref=e77]: Orders
          - menuitem "Products" [ref=e78] [cursor=pointer]:
            - img [ref=e79]
            - generic [ref=e83]: Products
          - menuitem "Tables" [ref=e84] [cursor=pointer]:
            - img [ref=e85]
            - generic [ref=e89]: Tables
          - menuitem "Bookings" [ref=e90] [cursor=pointer]:
            - img [ref=e91]
            - generic [ref=e93]: Bookings
          - menuitem "Kitchen" [ref=e94] [cursor=pointer]:
            - img [ref=e95]
            - generic [ref=e97]: Kitchen
          - menuitem "Customers" [ref=e98] [cursor=pointer]:
            - img [ref=e99]
            - generic [ref=e104]: Customers
          - menuitem "Expenses" [ref=e105] [cursor=pointer]:
            - img [ref=e106]
            - generic [ref=e108]: Expenses
          - menuitem "Ingredients" [ref=e109] [cursor=pointer]:
            - img [ref=e110]
            - generic [ref=e119]: Ingredients
          - menuitem "Coupons" [ref=e120] [cursor=pointer]:
            - img [ref=e121]
            - generic [ref=e124]: Coupons
          - menuitem "Alerts" [ref=e125] [cursor=pointer]:
            - img [ref=e126]
            - generic [ref=e129]: Alerts
          - menuitem "Inventory" [ref=e130] [cursor=pointer]:
            - img [ref=e131]
            - generic [ref=e134]: Inventory
          - menuitem "Refunds" [ref=e135] [cursor=pointer]:
            - img [ref=e136]
            - generic [ref=e138]: Refunds
          - menuitem "Staff" [ref=e139] [cursor=pointer]:
            - img [ref=e140]
            - generic [ref=e145]: Staff
          - menuitem "Schedule" [ref=e146] [cursor=pointer]:
            - img [ref=e147]
            - generic [ref=e149]: Schedule
          - menuitem "Day End" [ref=e150] [cursor=pointer]:
            - img [ref=e151]
            - generic [ref=e153]: Day End
          - menuitem "Reports" [ref=e154] [cursor=pointer]:
            - img [ref=e155]
            - generic [ref=e158]: Reports
          - menuitem "GST" [ref=e159] [cursor=pointer]:
            - img [ref=e160]
            - generic [ref=e163]: GST
          - menuitem "Logs" [ref=e164] [cursor=pointer]:
            - img [ref=e165]
            - generic [ref=e169]: Logs
          - menuitem "Stores" [ref=e170] [cursor=pointer]:
            - img [ref=e171]
            - generic [ref=e176]: Stores
          - menuitem "Settings" [ref=e177] [cursor=pointer]:
            - img [ref=e178]
            - generic [ref=e181]: Settings
          - menuitem "Training" [ref=e182] [cursor=pointer]:
            - img [ref=e183]
            - generic [ref=e186]: Training
          - menuitem "Support Us" [ref=e187] [cursor=pointer]:
            - img [ref=e188]
            - generic [ref=e190]: Support Us
        - generic [ref=e191]:
          - button "Lock Screen" [ref=e192] [cursor=pointer]:
            - img [ref=e193]
            - generic [ref=e196]: Lock
          - button "Logout" [ref=e197] [cursor=pointer]:
            - img [ref=e198]
            - generic [ref=e201]: Logout
      - main "Main content" [ref=e202]:
        - main "POS Screen" [ref=e203]:
          - generic [ref=e204]:
            - search "Product search" [ref=e205]:
              - generic [ref=e206]:
                - img [ref=e207]
                - generic [ref=e210]: Search or scan barcode
                - textbox "Search or scan barcode" [ref=e211]:
                  - /placeholder: Search or scan barcode...
                - generic [ref=e212]: Press Enter to search by barcode, Escape to clear
              - group "Filter by category" [ref=e213]:
                - button "Add custom item" [ref=e214] [cursor=pointer]:
                  - img [ref=e215]
                  - text: Custom
                - button "All" [pressed] [ref=e216] [cursor=pointer]
                - button "Combos" [ref=e217] [cursor=pointer]:
                  - img [ref=e218]
                  - text: Combos
                - button "Beverages" [ref=e221] [cursor=pointer]
                - button "Food" [ref=e222] [cursor=pointer]
              - button "Refresh products" [ref=e223] [cursor=pointer]:
                - img [ref=e224]
            - grid "Product grid" [ref=e229]:
              - 'gridcell "Burger, Food, $250, Stock: 40" [ref=e230] [cursor=pointer]':
                - generic [ref=e231]: B
                - generic [ref=e232]: Burger
                - generic [ref=e233]: Food
                - generic [ref=e234]: $250
                - generic [ref=e235]: "Stock: 40"
              - 'gridcell "Coffee, Beverages, $120, Stock: 100" [ref=e236] [cursor=pointer]':
                - generic [ref=e237]: C
                - generic [ref=e238]: Coffee
                - generic [ref=e239]: Beverages
                - generic [ref=e240]: $120
                - generic [ref=e241]: "Stock: 100"
              - 'gridcell "Sandwich, Food, $180, Stock: 50" [ref=e242] [cursor=pointer]':
                - generic [ref=e243]: S
                - generic [ref=e244]: Sandwich
                - generic [ref=e245]: Food
                - generic [ref=e246]: $180
                - generic [ref=e247]: "Stock: 50"
              - 'gridcell "Tea, Beverages, $60, Stock: 150" [ref=e248] [cursor=pointer]':
                - generic [ref=e249]: T
                - generic [ref=e250]: Tea
                - generic [ref=e251]: Beverages
                - generic [ref=e252]: $60
                - generic [ref=e253]: "Stock: 150"
              - 'gridcell "Test Burger 340, Food, $150, Stock: 50, Quantity in cart: 2" [ref=e254] [cursor=pointer]':
                - generic [ref=e255]: "2"
                - generic [ref=e256]: T
                - generic [ref=e257]: Test Burger 340
                - generic [ref=e258]: Food
                - generic [ref=e259]: $150
                - generic [ref=e260]: "Stock: 50"
          - region "Shopping cart" [ref=e261]:
            - generic [ref=e262]:
              - generic [ref=e263]: Cart
              - generic [ref=e264]:
                - generic "2 items in cart" [ref=e265]: 2 items
                - button "Open cash drawer" [ref=e266] [cursor=pointer]:
                  - img [ref=e267]
                - button "Clear cart" [ref=e270] [cursor=pointer]:
                  - img [ref=e271]
                - button "View held orders" [ref=e274] [cursor=pointer]:
                  - img [ref=e275]
            - generic [ref=e278]:
              - generic [ref=e279]:
                - generic [ref=e280]: Price Tier
                - generic [ref=e281]:
                  - button "RETAIL" [ref=e282] [cursor=pointer]
                  - button "WHOLESALE" [ref=e283] [cursor=pointer]
              - group "Order type" [ref=e284]:
                - button "Dine-in" [pressed] [ref=e285] [cursor=pointer]
                - button "Takeaway" [ref=e286] [cursor=pointer]
                - button "Delivery" [ref=e287] [cursor=pointer]
              - generic [ref=e288]:
                - img [ref=e289]
                - generic [ref=e292]: Customer name (optional)
                - textbox "Customer name (optional)" [active] [ref=e293]:
                  - /placeholder: Walk-in Customer
                  - text: Test Customer
            - list "Cart items" [ref=e294]:
              - listitem [ref=e295]:
                - generic [ref=e296]:
                  - generic [ref=e297]:
                    - generic [ref=e298]: Test Burger 340
                    - generic [ref=e299]:
                      - button "$150" [ref=e300] [cursor=pointer]
                      - text: × 2 = $300.00
                      - button "RET" [ref=e301] [cursor=pointer]
                  - button "Remove Test Burger 340 from cart" [ref=e302] [cursor=pointer]:
                    - img [ref=e303]
                - generic [ref=e306]:
                  - group "Quantity for Test Burger 340" [ref=e307]:
                    - button "Decrease quantity of Test Burger 340" [ref=e308] [cursor=pointer]:
                      - img [ref=e309]
                    - 'generic "Quantity: 2" [ref=e310]': "2"
                    - button "Increase quantity of Test Burger 340" [ref=e311] [cursor=pointer]:
                      - img [ref=e312]
                  - generic [ref=e315]:
                    - spinbutton "Discount for Test Burger 340" [ref=e316]
                    - button "%" [ref=e317] [cursor=pointer]
            - region "Checkout" [ref=e318]:
              - generic [ref=e319]:
                - generic [ref=e320]: Order Disc
                - generic [ref=e321]:
                  - spinbutton "Order Disc" [ref=e322]
                  - button "%" [ref=e323] [cursor=pointer]
              - generic [ref=e324]:
                - generic [ref=e325]: Add Tip
                - generic [ref=e326]:
                  - generic [ref=e327]: $
                  - spinbutton "Add Tip" [ref=e328]
              - generic [ref=e329]:
                - img [ref=e330]
                - textbox "Coupon code" [ref=e333]
                - button "Apply" [disabled] [ref=e334]
              - status [ref=e335]:
                - generic [ref=e336]:
                  - generic [ref=e337]: Subtotal
                  - generic [ref=e338]: $300.00
                - generic [ref=e339]:
                  - generic [ref=e340]: Tax
                  - generic [ref=e341]: +$54.00
                - generic [ref=e342]:
                  - generic [ref=e343]: Total
                  - 'generic "Total amount: $354.00" [ref=e344]': $354.00
              - group "Payment method" [ref=e345]:
                - button "cash" [pressed] [ref=e346] [cursor=pointer]:
                  - img [ref=e347]
                  - text: cash
                - button "card" [ref=e350] [cursor=pointer]:
                  - img [ref=e351]
                  - text: card
                - button "upi" [ref=e353] [cursor=pointer]:
                  - img [ref=e354]
                  - text: upi
                - button "split" [ref=e356] [cursor=pointer]:
                  - img [ref=e357]
                  - text: split
              - generic [ref=e363]:
                - generic [ref=e364]: Amount tendered
                - spinbutton "Amount tendered" [ref=e365]: "0"
                - button "Copy total to amount tendered" [ref=e366] [cursor=pointer]: Copy Total
              - generic [ref=e367]:
                - button "Print Kitchen Order Ticket" [ref=e368] [cursor=pointer]:
                  - img [ref=e369]
                  - text: KOT
                - button "Hold order for later" [ref=e373] [cursor=pointer]: Hold
                - button "Complete order - Charge $354.00" [disabled] [ref=e374]:
                  - img [ref=e375]
                  - text: Charge $354.00
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   |
  3   | const ADMIN_PIN = '1234';
  4   | const CASHIER_PIN = '0000';
  5   | const APP_URL = 'http://localhost:3000';
  6   |
  7   | test.describe('POS System Full Functionality', () => {
  8   |
  9   |   test.beforeEach(async ({ page }) => {
  10  |     await page.goto(APP_URL);
  11  |   });
  12  |
  13  |   test('Authentication and Lockout Logic', async ({ page }) => {
  14  |     // Test Invalid Login
  15  |     await page.fill('input[type="password"]', '9999');
  16  |     await page.click('button:has-text("Login")');
  17  |     await expect(page.locator('text=Invalid PIN. 2 attempts remaining.')).toBeVisible();
  18  |
  19  |     await page.fill('input[type="password"]', '9998');
  20  |     await page.click('button:has-text("Login")');
  21  |     await expect(page.locator('text=Invalid PIN. 1 attempts remaining.')).toBeVisible();
  22  |
  23  |     await page.fill('input[type="password"]', '9997');
  24  |     await page.click('button:has-text("Login")');
  25  |     await expect(page.locator('text=Too many failed attempts')).toBeVisible();
  26  |     await expect(page.locator('input[type="password"]')).toBeDisabled();
  27  |   });
  28  |
  29  |   test('Admin Full Workflow: Products, CRM, POS, Orders', async ({ page }) => {
  30  |     test.setTimeout(60000);
  31  |     // Login as Admin
  32  |     await page.fill('input[type="password"]', ADMIN_PIN);
  33  |     await page.click('button:has-text("Login")');
  34  |     await expect(page.locator('div[role="status"]').filter({ hasText: 'admin' })).toBeVisible();
  35  |
  36  |     // 1. Product Management
  37  |     await page.click('button[role="menuitem"]:has-text("Products")');
  38  |     await page.click('button:has-text("Add Product")');
  39  |     const productName = 'Test Burger ' + Math.floor(Math.random() * 1000);
  40  |     await page.fill('input[name="name"]', productName);
  41  |     await page.fill('input[name="price"]', '150');
  42  |     await page.fill('input[name="stock"]', '50');
  43  |     await page.click('button:has-text("Save")');
  44  |     await expect(page.locator(`text=${productName}`)).toBeVisible();
  45  |
  46  |     // 2. CRM Setup
  47  |     await page.click('button[role="menuitem"]:has-text("Customers")');
  48  |     await page.click('button:has(svg.lucide-plus)');
  49  |     const customerPhone = '9000000001';
  50  |     await page.fill('input[placeholder="e.g. John Doe"]', 'Test Customer');
  51  |     await page.fill('input[placeholder="+1 234 567 8900"]', customerPhone);
  52  |     await page.selectOption('select:near(label:has-text("Price Tier"))', 'wholesale'); // Wholesale gives discount
  53  |     await page.click('button:has-text("Create Customer")');
  54  |     await expect(page.locator('text=Test Customer')).toBeVisible();
  55  |
  56  |     // Close CRM
  57  |     await page.click('div[role="dialog"] button:has(svg.lucide-x)');
  58  |
  59  |     // 3. POS Operations
  60  |     await page.click('button[role="menuitem"]:has-text("POS")');
  61  |
  62  |     // Add product to cart
  63  |     await page.locator(`button[role="gridcell"]`).filter({ hasText: productName }).click();
  64  |     await expect(page.getByRole('listitem').filter({ hasText: productName })).toBeVisible();
  65  |     await expect(page.locator('span:has-text("items")')).toBeVisible();
  66  |
  67  |     // Customer Lookup by Phone in Name field
  68  |     const customerNameInput = page.locator('#customer-name');
  69  |     await customerNameInput.fill(customerPhone);
  70  |     await page.waitForTimeout(2000); // Wait for lookup
  71  |     // Verify customer name is updated in the input
  72  |     await expect(customerNameInput).toHaveValue('Test Customer');
  73  |
  74  |     // Verify Wholesale discount applied
> 75  |     await expect(page.locator('text=Discount')).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  76  |
  77  |     // Add another item
  78  |     await page.locator('button[role="gridcell"]').filter({ hasText: 'Coffee' }).click();
  79  |
  80  |     // Hold Order
  81  |     await page.click('button:has-text("Hold")');
  82  |     await expect(page.locator('text=Cart is empty')).toBeVisible();
  83  |
  84  |     // View Held Orders
  85  |     await page.click('button[aria-label="View held orders"]');
  86  |     await expect(page.locator('#held-orders-title')).toBeVisible();
  87  |     await page.click('button:has-text("Restore")');
  88  |     await expect(page.getByRole('listitem').filter({ hasText: productName })).toBeVisible();
  89  |
  90  |     // Split Payment
  91  |     await page.getByRole('button', { name: 'split', exact: true }).click();
  92  |     await page.locator('div:has(> span:has-text("cash")) input').fill('50');
  93  |
  94  |     // The rest for card
  95  |     const totalText = await page.locator('[aria-label^="Total amount"]').innerText();
  96  |     const totalVal = parseFloat(totalText.replace(/[^0-9.]/g, ''));
  97  |     await page.locator('div:has(> span:has-text("card")) input').fill((totalVal - 50).toFixed(2));
  98  |     await page.getByRole('button', { name: 'Confirm Split' }).click();
  99  |
  100 |     // Complete Checkout
  101 |     await page.locator('button[data-checkout-button]').click();
  102 |     await expect(page.locator('text=Order Complete!')).toBeVisible();
  103 |     await page.click('button[aria-label="Close and start new order"]');
  104 |
  105 |     // 4. Verify in Orders
  106 |     await page.click('button[role="menuitem"]:has-text("Orders")');
  107 |     await expect(page.locator('.card').first()).toBeVisible();
  108 |
  109 |     // 5. Logout
  110 |     // Try both methods since button might be covered
  111 |     await page.evaluate(() => {
  112 |       const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Logout') || b.getAttribute('aria-label') === 'Logout');
  113 |       if (btn) btn.click();
  114 |     });
  115 |     await expect(page.locator('text=Welcome')).toBeVisible();
  116 |   });
  117 |
  118 |   test('Cashier Access Restrictions', async ({ page }) => {
  119 |     // Login as Cashier
  120 |     await page.fill('input[type="password"]', CASHIER_PIN);
  121 |     await page.click('button:has-text("Login")');
  122 |     await expect(page.locator('div[role="status"]').filter({ hasText: 'cashier' })).toBeVisible();
  123 |
  124 |     // Try to access Settings (should be hidden or restricted)
  125 |     const settingsItem = page.locator('button[role="menuitem"]:has-text("Settings")');
  126 |     await expect(settingsItem).not.toBeVisible();
  127 |
  128 |     // Try to access Logs
  129 |     const logsItem = page.locator('button[role="menuitem"]:has-text("Logs")');
  130 |     await expect(logsItem).not.toBeVisible();
  131 |
  132 |     // Verify POS works
  133 |     await page.click('button[role="menuitem"]:has-text("POS")');
  134 |     await expect(page.locator('#cart-title')).toBeVisible();
  135 |   });
  136 | });
  137 |
```