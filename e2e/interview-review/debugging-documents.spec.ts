import { expect, test } from "@playwright/test"

test("debugging release reveals the question and remembers dismissal", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?view=picker&track=debugging&theme=${theme}`)
      const banner = page.getByRole("complementary", { name: "New Python debugging question" })
      await expect(banner).toBeVisible()
      await expect(
        page
          .getByRole("region", { name: "Debugging problem browser" })
          .getByText("Beta", { exact: true })
      ).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`debugging-${theme}-${width}.png`) })
      await banner.getByRole("button", { name: "View question" }).click()
      await expect(banner).toBeHidden()
      await expect(page.getByRole("region", { name: "Practice problems" })).toBeFocused()
      await expect(page.getByPlaceholder("Search problems...")).toHaveValue(
        "Cache cleanup: reconcile the overnight report"
      )
      await expect(
        page.getByRole("button", {
          name: "Start practice: Cache cleanup: reconcile the overnight report",
          exact: true,
        })
      ).toHaveCount(1)
      // The picker remains open: viewing the question never starts a session.
      await expect(page.getByText("1 problem", { exact: true })).toBeVisible()
      await page.getByRole("button", { name: "Clear filters", exact: true }).click()
      await expect(banner).toBeVisible()
    }
  }
  await page.getByRole("button", { name: "Dismiss new question banner" }).click()
  await page.reload()
  await expect(
    page.getByRole("complementary", { name: "New Python debugging question" })
  ).toBeHidden()
  await expect(
    page
      .getByRole("region", { name: "Debugging problem browser" })
      .getByText("Beta", { exact: true })
  ).toBeVisible()
  await page.goto("/?view=picker&track=dsa&theme=light")
  await expect(
    page
      .getByRole("region", { name: "Debugging problem browser" })
      .getByText("Beta", { exact: true })
  ).toBeHidden()
  await expect(
    page.getByRole("complementary", { name: "New Python debugging question" })
  ).toBeHidden()
  expect(errors).toEqual([])
})

test("repository Markdown renders as a readable document and returns to source", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [1440, 375, 812]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 900 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?view=workspace&theme=${theme}`)
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page.getByRole("treeitem", { name: "Open documentation file: task.md" }).click()
      const surface = page.locator(".workspace-code-surface")
      await expect(surface.locator(".cm-content")).toContainText("# Cache cleanup")
      const readable = page.getByRole("button", { name: "Make readable" })
      expect((await readable.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await readable.focus()
      await page.keyboard.press("Enter")
      const preview = page.getByRole("article", { name: "task.md preview" })
      await expect(preview).toBeVisible()
      await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
        "Cache cleanup: reconcile the overnight report"
      )
      await expect(preview.getByRole("table")).toHaveCount(1)
      expect(await preview.evaluate((node) => getComputedStyle(node).fontSize)).toBe("16px")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`markdown-${theme}-${width}.png`) })
      await page.getByRole("button", { name: "View source" }).click()
      await expect(surface.locator(".cm-content")).toContainText("# Cache cleanup")
      await expect(preview).toBeHidden()
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page.getByRole("treeitem", { name: "Open editable file: src/cache_sweep.py" }).click()
      await expect(page.getByRole("button", { name: "Make readable" })).toBeHidden()
      await expect(surface.locator(".cm-editor")).toBeVisible()
    }
  }
  expect(errors).toEqual([])
})
