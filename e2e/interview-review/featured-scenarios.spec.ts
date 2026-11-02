import { expect, test } from "@playwright/test"

const featuredTitles = [
  "Rate Limiter: Requests Slip Through During an Outage",
  "Cache cleanup: reconcile the overnight report",
  "Editor Comments: Sidebar Over-Counts Unresolved Threads",
]

for (const width of [1440, 375]) {
  for (const density of ["cards", "rows"]) {
    test(`three featured rounds lead ${density} at ${width}px, including completed language variants`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: 900 })
      const completed =
        "bugfix-rate-limiter-error-handling,bugfix-rate-limiter-error-handling-python"
      await page.goto(
        `/?view=picker&track=debugging&completed=${completed}&theme=${width === 375 ? "light" : "dark"}`
      )
      await page
        .getByRole("button", { name: density === "rows" ? "List view" : "Card view", exact: true })
        .click()
      const results = page.getByRole("region", { name: "Practice problems" })
      await expect(results.getByRole("heading", { level: 3 }).first()).toHaveText(featuredTitles[0])
      expect(
        (await results.getByRole("heading", { level: 3 }).allTextContents()).slice(0, 3)
      ).toEqual(featuredTitles)
      await expect(results.getByText("Featured", { exact: true })).toHaveCount(3)
      const rateLimiter = results
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: featuredTitles[0], exact: true }) })
      await expect(rateLimiter.getByText("Solved", { exact: true })).toBeVisible()
      const language = rateLimiter.getByRole("combobox", { name: /^Practice language/ })
      await language.click()
      await page.getByRole("option", { name: "Python", exact: true }).click()
      await expect(rateLimiter.getByText("Featured", { exact: true })).toBeVisible()
      await expect(rateLimiter.getByText("Solved", { exact: true })).toBeVisible()
      await expect(results.getByText("Featured", { exact: true })).toHaveCount(3)
      await page.screenshot({ path: testInfo.outputPath(`featured-${density}-${width}.png`) })

      await page.getByRole("searchbox", { name: "Search problems" }).fill("webhook")
      await expect(results.getByRole("heading", { level: 3 }).first()).toContainText("Billing")
      await expect(results.getByText("Featured", { exact: true })).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      expect(errors).toEqual([])
    })
  }
}
