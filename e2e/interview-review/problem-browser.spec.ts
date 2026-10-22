import { expect, test } from "@playwright/test"

// Each viewport/theme journey gets an isolated page and its own timeout/report.
// Running all 14 journeys in one test exhausted the shared 30s budget in CI.
for (const width of [1440, 1280, 1024, 768, 375, 320, 812]) {
  for (const theme of ["light", "dark"]) {
    test(`debugging discovery preserves search, filters, and view preference at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: width === 812 ? 375 : 900 })
      await page.goto(`/?view=picker&track=debugging&theme=${theme}`)
      await page.screenshot({ path: testInfo.outputPath(`discovery-${theme}-${width}.png`) })
      const browser = page.getByRole("region", { name: "Debugging problem browser" })
      await expect(browser.getByRole("heading", { name: "Debugging", exact: true })).toBeVisible()
      await expect(browser.getByRole("searchbox", { name: "Search problems" })).toBeVisible()
      const listView = browser.getByRole("button", { name: "List view", exact: true })
      await expect(listView).toBeVisible()
      if (width === 1440) {
        expect(
          (await page.getByRole("region", { name: "Practice problems" }).boundingBox())!.y
        ).toBeLessThan(550)
      }
      expect((await listView.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await listView.focus()
      await page.keyboard.press("Enter")
      await expect(listView).toHaveAttribute("aria-pressed", "true")
      await expect(page.getByRole("button", { name: /^Start practice:/ }).first()).toHaveText(
        "Start"
      )
      await page.reload()
      await expect(listView).toHaveAttribute("aria-pressed", "true")
      await browser.getByRole("button", { name: "Card view", exact: true }).click()
      await expect(page.getByRole("button", { name: /^Start practice:/ }).first()).toHaveText(
        "Start practice"
      )
      await browser.getByRole("button", { name: /^Add Feature/ }).focus()
      await page.keyboard.press("Enter")
      await expect(browser.getByRole("button", { name: /^Add Feature/ })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await expect(page.getByRole("button", { name: /^Start practice:/ }).first()).toBeVisible()
      await browser.getByRole("button", { name: "Clear filters", exact: true }).click()
      await browser.getByRole("button", { name: "Filters", exact: true }).click()
      const companyTrigger = browser.getByRole("button", { name: "Filter by company", exact: true })
      await companyTrigger.click()
      await expect(browser.getByRole("textbox", { name: "Search companies" })).toBeFocused()
      const companyMenu = browser.getByRole("menu", { name: "Filter by company", exact: true })
      const companyBounds = (await companyMenu.boundingBox())!
      expect(companyBounds.x).toBeGreaterThanOrEqual(0)
      expect(companyBounds.x + companyBounds.width).toBeLessThanOrEqual(width)
      await page.keyboard.press("Escape")
      await expect(companyTrigger).toBeFocused()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await browser.getByRole("button", { name: "Python", exact: true }).click()
      await expect(browser.getByRole("button", { name: "Python", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await browser.getByRole("button", { name: "Filters active", exact: true }).click()
      await expect(browser.getByRole("button", { name: "Python", exact: true })).toBeHidden()
      await expect(browser.getByRole("button", { name: "Remove Python filter" })).toBeVisible()
      await browser.getByRole("button", { name: "Clear filters", exact: true }).click()
      await browser.getByRole("searchbox", { name: "Search problems" }).fill("not-a-real-problem")
      await expect(page.getByText("No problems match your filters", { exact: true })).toBeVisible()
      // Layout controls stay reachable even when the search has no results.
      await expect(browser.getByRole("button", { name: "List view", exact: true })).toBeVisible()
      await browser.getByRole("button", { name: "Clear search", exact: true }).click()
      await expect(page.getByRole("button", { name: /^Start practice:/ }).first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      expect(errors).toEqual([])
    })
  }
}

test("DSA all-problems keeps the integrated view control and progressive results", async ({
  page,
}) => {
  await page.goto("/?view=picker&track=dsa&theme=light")
  await page.getByRole("button", { name: "All problems", exact: true }).click()
  const results = page.getByRole("region", { name: "Practice problems" })
  await expect(results.getByRole("button", { name: /^Start practice:/ })).toHaveCount(18)
  await page.getByRole("button", { name: /^Show more/ }).click()
  await expect(results.getByRole("button", { name: /^Start practice:/ })).toHaveCount(36)
  await page.getByRole("button", { name: "List view", exact: true }).click()
  await expect(results.getByRole("button", { name: /^Start practice:/ }).first()).toHaveText(
    "Start"
  )
  await page.getByRole("searchbox", { name: "Search problems" }).fill("not-a-real-problem")
  await expect(page.getByText("No problems match your filters", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await expect(results.getByRole("button", { name: /^Start practice:/ })).toHaveCount(18)
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await expect(page.getByText("Beta", { exact: true })).toBeHidden()
})
