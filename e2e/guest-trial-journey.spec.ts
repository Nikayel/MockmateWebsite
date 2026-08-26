import { test, expect } from "@playwright/test"

/**
 * The pre-auth guest trial, end to end, as the persona that found every bug
 * this week: a signed-out visitor in a fresh browser.
 *
 * On 2026-08-25 the score-lock ship dead-ended in production while five green
 * unit-test suites watched: submitCode parked guests in a phase whose only
 * exit lived in the signed-in view, so the lock's CTA flipped state a gate
 * never read, and no prompt could ever open. Every step below is a seam
 * between hooks that unit tests are structurally blind to. This spec needs no
 * auth and no AI backend (guests are walled from both), and the guest session
 * POST failing against a dummy-credential backend is tolerated by design
 * ("Your progress will still be saved locally"), so it runs in CI with the
 * same structurally-valid dummy env the SEO-audit job already boots.
 *
 * The signed-in half (popup sign-in, migration, the deferred stream) needs a
 * seeded Firebase emulator user and stays out of scope here. TODO: cover it
 * once an auth emulator exists in CI.
 */

const TWO_SUM_SOLUTION = `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}`

test.describe("Guest trial journey (pre-auth)", () => {
  test("a guest reaches the score lock and the signup dialog actually opens", async ({ page }) => {
    // Dev-server first compile of /interview plus the in-browser test runner
    // make this journey legitimately slow on a cold start.
    test.setTimeout(300_000)

    // 1. A fresh browser context is a guest with an unused trial. The consent
    //    banner covers the footer; dismiss it so nothing intercepts clicks.
    await page.goto("/interview?track=dsa")
    await page
      .getByRole("button", { name: "Necessary Only" })
      .click({ timeout: 15_000 })
      .catch(() => {})

    // 2. The DSA track defaults to the roadmap. Open the first pattern node
    //    and start Two Sum from its problem row. The ROW itself must work:
    //    PostHog caught a real guest dead-clicking it when only the
    //    hover-revealed ghost button was wired.
    await page
      .getByText(/arrays/i)
      .first()
      .click()
    await page.getByText("Two Sum", { exact: true }).first().click()

    // 3. CompanyPicker: nothing is pre-selected. Picking the freeball option
    //    and starting exercises the picker that used to swallow clicks
    //    silently behind pointer-events-none.
    const picker = page.getByRole("dialog")
    await expect(picker).toBeVisible()
    await picker.getByRole("button", { name: /freeballing/i }).click()
    await picker.getByRole("button", { name: /^start interview$/i }).click()

    // 4. The CodeMirror editor loads with starter code; replace it with a
    //    passing solution.
    const editor = page.locator(".cm-content").first()
    await expect(editor).toBeVisible({ timeout: 120_000 })
    await editor.fill(TWO_SUM_SOLUTION)

    // 5. Run the tests in the in-browser runner, then submit. The console
    //    header reports "N/N tests" when every case passes (pass state is
    //    icon-only per row, so the all-passing header is the text signal).
    await page.getByRole("button", { name: "Run tests" }).click()
    await expect(page.getByText(/(\d+)\/\1 tests/).first()).toBeVisible({ timeout: 120_000 })
    await page.getByRole("button", { name: "Submit solution" }).click()

    // 6. THE SEAM THE P0 LIVED IN. The submission must land on the locked
    //    panel, never the signed-in feedback view or a dead workspace.
    const lockHeading = page.getByRole("heading", { name: /your interview is scored/i })
    await expect(lockHeading).toBeVisible({ timeout: 60_000 })
    const unlockButton = page.getByRole("button", { name: /unlock your results/i })
    await expect(unlockButton).toBeVisible()

    // 7. The signup dialog auto-opens (~2s timer armed by auto-finalization,
    //    which only exists because the hook finalizes the trial itself).
    const signupDialog = page.getByRole("dialog")
    await expect(signupDialog).toBeVisible({ timeout: 10_000 })
    await expect(signupDialog.getByText(/create your free account/i)).toBeVisible()

    // 8. The withheld score never leaks into the lock or the dialog.
    await expect(signupDialog.getByText(/\d+\s*%/)).toHaveCount(0)

    // 9. Dismiss, then the lock CTA must REOPEN the dialog. This exact click
    //    was the production dead click: showSignupPrompt flipped while the
    //    gate demanded a showFeedback nothing set for guests.
    await page.keyboard.press("Escape")
    await expect(signupDialog).toBeHidden()
    await unlockButton.click()
    await expect(page.getByRole("dialog")).toBeVisible()
  })
})
