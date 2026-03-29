import asyncio
from playwright.async_api import async_playwright
import time

async def verify_inventory():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Wait for dev server
        max_retries = 30
        for i in range(max_retries):
            try:
                await page.goto("http://localhost:3000")
                break
            except:
                if i == max_retries - 1:
                    print("Could not connect to dev server")
                    await browser.close()
                    return
                await asyncio.sleep(2)

        # Login (Admin PIN '1234')
        await page.wait_for_selector("input")
        await page.fill("input", "1234")
        await page.click("button:has-text('Login'), button:has-text('Submit')")

        # Wait for dashboard/POS
        await page.wait_for_timeout(3000)

        # Click Inventory in Sidebar
        inventory_link = page.locator("button[title='Inventory']")
        await inventory_link.click()
        await page.wait_for_timeout(2000)
        await page.screenshot(path="verification/inventory_overview_v2.png")
        print("Captured inventory overview v2")

        # Click Batch & Serial tab
        await page.click("button:has-text('Batch & Serial')")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="verification/batch_serial_tab.png")
        print("Captured batch & serial tab")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_inventory())
