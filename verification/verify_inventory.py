from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Go to the app
        page.goto("http://localhost:3002")

        # Login
        page.fill('input[type="password"]', "1234")
        page.click('button[type="submit"]')

        # Wait for page load
        time.sleep(5)

        # Look for Inventory button - checking by title since it is an icon button
        page.get_by_title("Inventory").click()
        time.sleep(2)

        # Screenshot Overview
        page.screenshot(path="verification/inventory_overview_v2.png")

        # Click on Batch & Serial tab
        page.get_by_role("button", name="Batch & Serial").click()
        time.sleep(1)
        page.screenshot(path="verification/batch_serial_tab.png")

        browser.close()

if __name__ == "__main__":
    run()
