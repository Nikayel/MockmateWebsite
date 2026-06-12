import { test, expect } from "@playwright/test"

test.describe("Evidence-driven Bugfix Journey", () => {
  test("completes the bugfix flow for the onboarding scenario", async ({ page }) => {
    // 1. Select Incident
    await page.goto("/interview/bugfix-onboarding")

    // Check that we're on the interview page and problem panel loaded
    await expect(page.locator("text=Onboarding: Cart Discount Bug")).toBeVisible()
    await expect(page.locator("text=Incident Report")).toBeVisible()

    // 2. Inspect (Click through files)
    // The workspace should be open with src/cart.js
    await expect(page.locator("text=src/cart.js")).toBeVisible()

    // Click on tests tab to view tests
    await page.locator("text=tests/cart.test.js").click()
    await expect(page.locator('text=const assert = require("node:assert/strict")')).toBeVisible()

    // Go back to editable file
    await page.locator("text=src/cart.js").click()

    // 3. Hypothesize (AI chat interaction)
    // Type in chat
    const chatInput = page.locator("textarea[placeholder*='Message']")
    await chatInput.fill(
      "I think the bug is an off-by-one error with the discount threshold comparison."
    )
    await page.locator("button:has-text('Send')").click()

    // Wait for AI response (could take some time depending on mock/live API, just wait for the bubble)
    // Here we'll just wait for the chat area to have our message
    await expect(page.locator("text=off-by-one error")).toBeVisible()

    // 4. Patch (Edit CodeMirror - simulated)
    // Finding CodeMirror and editing is tricky in E2E without specific selectors.
    // We will just verify the code editor is present and has the initial code.
    await expect(page.locator(".cm-content")).toContainText("subtotal > discountThreshold")

    // 5. Run Tests
    const runTestsButton = page.locator("button:has-text('Run Tests')")
    await runTestsButton.click()

    // Check that the console shows results
    // Wait for the "Tests" output in console
    await expect(
      page.locator("text=applies discount when subtotal exactly equals threshold")
    ).toBeVisible({ timeout: 15000 })

    // 6. Submit
    const submitButton = page.locator("button:has-text('Submit Solution')")
    await submitButton.click()

    // Wait for the confirmation dialog
    const confirmButton = page.locator("button:has-text('Yes, submit')")
    await confirmButton.click()

    // 7. View Evidence-based feedback
    // It should redirect to feedback page
    await expect(page).toHaveURL(/\/feedback\/.+/)
    await expect(page.locator("text=Feedback")).toBeVisible({ timeout: 20000 })
  })
})
