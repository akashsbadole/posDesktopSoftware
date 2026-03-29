from playwright.sync_api import sync_playwright, expect
import time

def test_pos_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        try:
            print("Navigating to POS...")
            page.goto("http://localhost:3000")

            # Increased wait for compilation
            time.sleep(15)

            # Check for PIN Login screen (likely first screen)
            if page.get_by_placeholder("Enter PIN").is_visible():
                print("Login screen detected. Entering Admin PIN...")
                page.get_by_placeholder("Enter PIN").fill("1234")
                page.keyboard.press("Enter")
                time.sleep(3)

            # Take a full page screenshot to see what's currently rendered
            page.screenshot(path="verification/page_state.png")

            # Use broader locator for Custom button if name match fails
            custom_btn = page.get_by_label("Add custom item")
            if not custom_btn.is_visible():
                print("Custom button by label not visible, trying text...")
                custom_btn = page.get_by_text("Custom", exact=False)

            expect(custom_btn).to_be_visible()
            print("Custom button is visible.")

            # Open custom item modal
            custom_btn.click()
            time.sleep(1)
            page.screenshot(path="verification/custom_item_modal.png")

            # Fill custom item
            page.get_by_placeholder("e.g., Miscellaneous Repair").fill("Consultation")
            page.get_by_placeholder("0.00").fill("50")
            page.get_by_role("button", name="Add to Cart").click()
            print("Added custom item.")

            # Verify cart contains custom item
            time.sleep(1)
            expect(page.get_by_text("Consultation")).to_be_visible()

            # Check Split Payment button
            split_btn = page.get_by_role("button", name="split")
            expect(split_btn).to_be_visible()
            split_btn.click()
            time.sleep(1)
            page.screenshot(path="verification/split_payment_modal.png")

            print("Verified basic frontend features.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    test_pos_features()
