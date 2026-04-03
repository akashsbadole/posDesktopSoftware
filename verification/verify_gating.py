from playwright.sync_api import sync_playwright, expect
import os

def verify_settings_gating():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set env var for browser mode
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800}
        )
        page = context.new_page()

        # 1. Login as Admin
        page.goto("http://localhost:3000")
        page.fill('input[type="password"]', "1234")
        page.click('button:has-text("Login")')

        # 2. Go to Settings
        page.click('button[role="menuitem"]:has-text("Settings")')

        # 3. Wait for content
        sync_section = page.locator('text=Cloud Sync (Neon PostgreSQL)')
        sync_section.scroll_into_view_if_needed()

        # 4. Take screenshot of gated section
        page.screenshot(path="/home/jules/verification/settings_gating.png")
        print("Screenshot saved to /home/jules/verification/settings_gating.png")

        browser.close()

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    verify_settings_gating()
