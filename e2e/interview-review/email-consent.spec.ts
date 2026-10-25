import { expect, test } from "@playwright/test"
import { DEFAULT_EMAIL_PREFERENCES } from "../../lib/email/consent/policy"

for (const width of [390, 1280]) {
  test(`email settings patch one field and preserve unrelated opt-outs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    let preferences = { ...DEFAULT_EMAIL_PREFERENCES }
    const changes: unknown[] = []
    await page.route("**/api/email/preferences", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON()
        changes.push(body)
        // An email-link unsubscribe landed after this account page loaded.
        preferences = { ...preferences, spaced_repetition_reminders: false, [body.key]: body.value }
      }
      return route.fulfill({ json: { preferences, marketingSyncPending: false } })
    })
    await page.goto("/?view=email-consent")
    const marketing = page.getByRole("switch", { name: "Product updates" })
    await expect(marketing).toBeEnabled()
    await marketing.click()
    await expect(marketing).toBeChecked()
    await expect(page.getByRole("switch", { name: "Review alerts" })).not.toBeChecked()
    expect(changes).toEqual([{ key: "marketing_emails", value: true }])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
test("lost save response reloads current consent instead of restoring old preferences", async ({
  page,
}) => {
  let preferences = { ...DEFAULT_EMAIL_PREFERENCES }
  let loads = 0
  await page.route("**/api/email/preferences", (route) => {
    if (route.request().method() === "PATCH") {
      preferences = { ...preferences, email_notifications_enabled: false }
      return route.fulfill({ status: 503, json: { error: "response lost" } })
    }
    loads++
    return route.fulfill({ json: { preferences } })
  })
  await page.goto("/?view=email-consent")
  const master = page.getByRole("switch", { name: "Optional emails" })
  await expect(master).toBeEnabled()
  await master.click()
  await expect(master).not.toBeChecked()
  expect(loads).toBe(2)
})
test("unavailable preferences disable changes and offer a working retry", async ({ page }) => {
  let failed = true
  await page.route("**/api/email/preferences", (route) =>
    failed
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({
          json: {
            preferences: { ...DEFAULT_EMAIL_PREFERENCES, email_notifications_enabled: false },
          },
        })
  )
  await page.goto("/?view=email-consent")
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(page.getByRole("switch", { name: "Optional emails" })).toBeDisabled()
  failed = false
  await page.getByRole("button", { name: "Retry" }).click()
  await expect(page.getByRole("switch", { name: "Optional emails" })).toBeEnabled()
  await expect(page.getByRole("switch", { name: "Optional emails" })).not.toBeChecked()
})
