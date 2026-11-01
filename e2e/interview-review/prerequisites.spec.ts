import { expect, test } from "@playwright/test"

for (const width of [1440, 375, 320, 812]) {
  for (const theme of ["light", "dark"]) {
    test(`prerequisites stay separate from select and start at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.setViewportSize({ width, height: width === 812 ? 375 : 900 })
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto(`/?view=picker&track=debugging&theme=${theme}`)
      await page.getByRole("searchbox", { name: "Search problems" }).fill("adjustment matcher")
      const results = page.getByRole("region", { name: "Practice problems" })
      const disclosure = results.locator("details").filter({ hasText: "Prerequisites" })
      const trigger = disclosure.locator("summary")
      const select = results.getByRole("button", { name: /^Warm-up: the adjustment matcher/ })
      const start = results.getByRole("button", { name: /^Start practice:/ })

      await expect(trigger).toHaveText("Prerequisites2 topics")
      await expect(disclosure).not.toHaveAttribute("open", "")
      await expect(disclosure.getByText("Maps and dictionaries", { exact: true })).toBeHidden()
      const selectedBefore = await select.getAttribute("aria-pressed")
      expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await trigger.focus()
      await page.keyboard.press("Enter")
      await expect(disclosure).toHaveAttribute("open", "")
      await expect(disclosure.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
      await expect(disclosure).toContainText("Basic JavaScript syntax")
      await expect(select).toHaveAttribute("aria-pressed", selectedBefore!)
      await expect(start).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`card-${theme}-${width}.png`) })
      await page.keyboard.press("Space")
      await expect(disclosure).not.toHaveAttribute("open", "")

      await page.getByRole("button", { name: "List view", exact: true }).click()
      await expect(start).toHaveText("Start")
      await trigger.focus()
      await page.keyboard.press("Space")
      await expect(disclosure).toHaveAttribute("open", "")
      await expect(select).toHaveAttribute("aria-pressed", selectedBefore!)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`row-${theme}-${width}.png`) })
      await select.focus()
      await page.keyboard.press("Enter")
      await expect(select).toHaveAttribute("aria-pressed", "true")
      await start.click()
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      const workspaceDisclosure = page.locator("details").filter({ hasText: "Prerequisites" })
      await workspaceDisclosure.locator("summary").click()
      await expect(
        workspaceDisclosure.getByText("Maps and dictionaries", { exact: true })
      ).toBeVisible()
      expect(errors).toEqual([])
    })
  }
}

test("guided labs and feature questions reuse the same prerequisite disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto("/?view=guided-labs&track=debugging&theme=dark")
  const results = page.getByRole("region", { name: "Practice problems" })
  await results.locator("summary").filter({ hasText: "Prerequisites" }).click()
  await expect(results.getByText("Dates and time zones", { exact: true })).toBeVisible()
  await expect(results.getByText("Pagination basics", { exact: true })).toBeVisible()
  await expect(results.locator("summary").filter({ hasText: "View phases" })).toBeVisible()

  await page.goto("/?view=picker&track=debugging&theme=light")
  await page
    .getByRole("searchbox", { name: "Search problems" })
    .fill("Add Ranked Support Ticket Search")
  await results.locator("summary").filter({ hasText: "Prerequisites" }).click()
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
  const trigger = page.locator("summary").filter({ hasText: "Prerequisites" })
  await trigger.click()
  await expect(page.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Focus mode/i }).click()
  await expect(page.getByRole("button", { name: "Exit focus mode", exact: true })).toBeVisible()
  await expect(page.getByText("Maps and dictionaries", { exact: true })).toBeVisible()
  expect(requests.filter((url) => /hint|prerequisite|session-start/.test(url))).toEqual([])
})
