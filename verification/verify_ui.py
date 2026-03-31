from playwright.sync_api import sync_playwright, expect

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Login
        page.goto("http://localhost:3000")
        page.fill('input[type="password"]', "1234")
        page.click('button:has-text("Login")')

        # Look for the user role in the header
        expect(page.get_by_role("status", name="Logged in as Administrator")).to_contain_text("admin")

        # Screenshot Sidebar with new items
        page.screenshot(path="verification/screenshots/sidebar_updated.png")

        # Open Table Manager
        page.click('button[role="menuitem"]:has-text("Tables")')
        expect(page.locator('text=Table Manager')).to_be_visible()
        page.screenshot(path="verification/screenshots/table_manager.png")
        page.click('div[role="dialog"] button:has(svg.lucide-x)')

        # Open Expenses
        page.click('button[role="menuitem"]:has-text("Expenses")')
        expect(page.locator('text=Expense Tracking')).to_be_visible()
        page.screenshot(path="verification/screenshots/expenses_screen.png")

        # Open Ingredients
        page.click('button[role="menuitem"]:has-text("Ingredients")')
        expect(page.locator('text=Ingredients & Recipes')).to_be_visible()
        page.screenshot(path="verification/screenshots/ingredients_screen.png")

        # Open Coupons
        page.click('button[role="menuitem"]:has-text("Coupons")')
        expect(page.locator('text=Discount Coupons')).to_be_visible()
        page.screenshot(path="verification/screenshots/coupons_screen.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
