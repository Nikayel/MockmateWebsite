import { expect, test } from "@playwright/test"

for (const width of [1440, 375, 320, 812]) {
  for (const theme of ["light", "dark"]) {
    test(`prerequisites stay separate from start at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: width === 812 ? 375 : 900 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto(`/?view=picker&track=debugging&theme=${theme}`)
      await page.getByRole("searchbox", { name: "Search problems" }).fill("adjustment matcher")
      const results = page.getByRole("region", { name: "Practice problems" })
      const trigger = results.getByRole("button", { name: /^Prerequisites for/ })
      const content = results.getByRole("region", { name: /^Prerequisites for/ })
      const start = results.getByRole("button", { name: /^Start practice:/ })
      const title = results.getByRole("heading", { name: /^Warm-up: the adjustment matcher/ })

      await expect(trigger).toHaveText("Prerequisites")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      await expect(content).toBeHidden()
      await expect(results.getByRole("button")).toHaveCount(2)
      await expect(results.getByText(/Two adjustments this week were explained/)).toHaveCount(0)
      await expect(results.getByText(/Real codebase|Feature codebase/)).toHaveCount(0)
      expect(await title.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true)
      expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: testInfo.outputPath(`card-closed-${theme}-${width}.png`) })
      const startY = await start.evaluate((node) => node.getBoundingClientRect().top + scrollY)
      await trigger.focus()
      await page.keyboard.press("Enter")
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await expect(content.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
      await expect(content).toContainText("Basic JavaScript syntax")
      await expect(start).toBeVisible()
      expect(
        await start.evaluate((node) => node.getBoundingClientRect().top + scrollY)
      ).toBeCloseTo(startY, 0)
      await page.screenshot({ path: testInfo.outputPath(`card-open-${theme}-${width}.png`) })
      await page.keyboard.press("Space")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")

      await page.getByRole("button", { name: "List view", exact: true }).click()
      await expect(start).toHaveText("Start")
      await trigger.focus()
      await page.keyboard.press("Space")
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`row-${theme}-${width}.png`) })
      await start.click()
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page.getByRole("button", { name: /^Prerequisites for/ }).click()
      await expect(
        page
          .getByRole("region", { name: /^Prerequisites for/ })
          .getByText("Maps and dictionaries", { exact: true })
      ).toBeVisible()
      expect(errors).toEqual([])
    })
  }
}

test("guided labs and feature questions reuse the prerequisite button", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto("/?view=guided-labs&track=debugging&theme=dark")
  const results = page.getByRole("region", { name: "Practice problems" })
  await results.getByRole("button", { name: /^Prerequisites for/ }).click()
  await expect(results.getByText("Dates and time zones", { exact: true })).toBeVisible()
  await expect(results.getByText("Pagination basics", { exact: true })).toBeVisible()
  await expect(results.locator("summary").filter({ hasText: "View phases" })).toBeVisible()

  await page.goto("/?view=picker&track=debugging&theme=light")
  await page
    .getByRole("searchbox", { name: "Search problems" })
    .fill("Add Ranked Support Ticket Search")
  await results.getByRole("button", { name: /^Prerequisites for/ }).click()
  await expect(results.getByText("API handlers", { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test("saved workspace and focus panel show prerequisites without task.md or a hint request", async ({
  page,
}) => {
  const requests: string[] = []
  page.on("request", (request) => {
    if (request.url().includes("/api/")) requests.push(request.url())
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/?view=workspace&scenario=bugfix-onboarding&saved=1&theme=dark")
  await page.getByRole("button", { name: /^Prerequisites for/ }).click()
  await expect(page.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Focus mode/i }).click()
  await expect(page.getByRole("button", { name: "Exit focus mode", exact: true })).toBeVisible()
  await expect(page.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
  expect(requests.filter((url) => /hint|prerequisite|session-start/.test(url))).toEqual([])
})

test("allowance appears once and exhausted sessions keep preparation available", async ({
  page,
}) => {
  await page.goto("/?view=picker&track=debugging&quota=available")
  await expect(page.getByText("94 sessions remaining", { exact: true })).toHaveCount(1)
  const results = page.getByRole("region", { name: "Practice problems" })
  await expect(results.getByText(/sessions remaining/)).toHaveCount(0)
  await expect(results.getByRole("button", { name: /^Start practice:/ }).first()).toBeVisible()

  await page.goto("/?view=picker&track=debugging&quota=exhausted")
  await expect(page.getByText(/Session limit reached/)).toHaveCount(1)
  await expect(results.getByRole("button", { name: /^Start practice:/ })).toHaveCount(0)
  await expect(results.getByRole("link", { name: "Upgrade", exact: true }).first()).toHaveAttribute(
    "href",
    "/limit-reached"
  )
  await results
    .getByRole("button", { name: /^Prerequisites for/ })
    .first()
    .click()
  await expect(results.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
})
