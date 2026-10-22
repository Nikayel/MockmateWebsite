import { expect, type Page } from "@playwright/test"

export const TWO_SUM_SOLUTION = `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return [];
}`

export async function prepareGuestSubmission(page: Page) {
  await page.goto("/interview?track=dsa")
  const consent = page.getByRole("button", { name: "Necessary Only" })
  // The banner mounts after hydration; an immediate isVisible check races it.
  await consent.click({ timeout: 15_000 })
  await page
    .getByText(/arrays/i)
    .first()
    .click()
  await page.getByText("Two Sum", { exact: true }).first().click()
  const picker = page.getByRole("dialog")
  await expect(picker).toBeVisible()
  await picker.getByRole("button", { name: /freeballing/i }).click()
  await picker.getByRole("button", { name: /^start interview$/i }).click()
  const editor = page.locator(".cm-content").first()
  await expect(editor).toBeVisible({ timeout: 120_000 })
  await editor.fill(TWO_SUM_SOLUTION)
  await page.getByRole("button", { name: "Run tests", exact: true }).click()
  await expect(page.getByText(/(\d+)\/\1 tests/).first()).toBeVisible({ timeout: 120_000 })
}
