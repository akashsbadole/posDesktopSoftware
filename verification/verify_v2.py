
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the app (using port 3001 as detected in logs)
        await page.goto("http://localhost:3001")
        await asyncio.sleep(5)

        # Login
        await page.get_by_placeholder("Enter PIN").fill("1234")
        await page.get_by_text("Login").click()
        await asyncio.sleep(5)

        # 1. Verify Products Form enhancements
        await page.locator('nav >> text="Products"').first.click()
        await asyncio.sleep(3)
        await page.get_by_text("Add Product").click()
        await asyncio.sleep(2)

        # Fill some prices to see margin
        # The label might have currency symbol now, try to find input by name or placeholder
        await page.get_by_placeholder("Product name").fill("Test Margin Product")

        # Prices are in a grid, try to find by label text part
        await page.locator('div:has-text("Selling") > input').first.fill("100")
        await page.locator('div:has-text("Cost") > input').first.fill("60")
        await asyncio.sleep(1)

        # Add a custom attribute
        await page.get_by_text("Add Field").click()
        await page.get_by_placeholder("Key (e.g., Brand)").fill("Manufacturer")
        await page.get_by_placeholder("Value").fill("ACME POS Corp")

        # Screenshot product form (Margin and Custom Attributes)
        # Scroll to see bottom sections
        panel = page.locator('div:has(label:text("Name"))').last
        await panel.evaluate("el => el.scrollTop = 1500")
        await asyncio.sleep(1)
        await page.screenshot(path="verification/product_form_final.png")

        # 2. Verify POS
        await page.locator('nav >> text="POS"').first.click()
        await asyncio.sleep(3)
        await page.screenshot(path="verification/pos_screen.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
