import { expect, test } from "@playwright/test"

test("the compact task opens the complete assignment in readable mode", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport)
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?view=workspace&theme=${theme}`)
      if (viewport.width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      const panel = page.getByRole("complementary", { name: "Problem and partner" })
      const overview = panel.getByRole("region", { name: "Task overview" })
      const openTask = overview.getByRole("button", { name: "Open task.md", exact: true })
      await expect(openTask).toBeVisible()
      expect((await overview.innerText()).split(/\s+/).length).toBeLessThan(60)
      await expect(panel.getByText("Incident details", { exact: true })).toHaveCount(0)
      await expect(panel.getByRole("heading", { name: "Data contract" })).toHaveCount(0)
      await expect(panel.getByText("Done when", { exact: true })).toHaveCount(0)
      expect((await openTask.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      if (viewport.height >= 800)
        await expect(panel.getByRole("button", { name: "Request a signal" })).toBeInViewport({
          ratio: 1,
        })
      await page.screenshot({
        path: testInfo.outputPath(`task-overview-${theme}-${viewport.width}.png`),
      })
      await openTask.focus()
      await page.keyboard.press("Enter")
      const document = page.getByRole("article", { name: "task.md preview" })
      await expect(document).toBeVisible()
      await expect(document).toBeFocused()
      await expect(document.getByRole("heading", { name: "Data contract" })).toHaveCount(1)
      await expect(page.getByRole("button", { name: "View source", exact: true })).toBeVisible()
      expect(
        await page.evaluate(() => window.document.documentElement.scrollWidth <= innerWidth)
      ).toBe(true)
      await page.screenshot({
        path: testInfo.outputPath(`task-readable-${theme}-${viewport.width}.png`),
      })
      await page.getByRole("button", { name: "View source", exact: true }).click()
      await expect(page.locator(".workspace-code-surface .cm-content")).toContainText(
        "# Cache cleanup"
      )
      if (viewport.width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await openTask.click()
      await expect(document).toBeVisible()
    }
  }
  expect(errors).toEqual([])
})

test("task navigation preserves source edits in focus mode and an older saved workspace", async ({
  page,
}) => {
  await page.goto("/?view=workspace&scenario=bugfix-search-race&saved=1&theme=light")
  const editor = page.locator(".workspace-code-surface .cm-content")
  await expect(editor).toContainText("runReservationSearch")
  await editor.fill("// candidate work remains here")
  await page.getByRole("button", { name: "Enable focus mode", exact: true }).click()
  await page.getByRole("button", { name: "Open task.md", exact: true }).click()
  const document = page.getByRole("article", { name: "task.md preview" })
  await expect(document).toBeVisible()
  await expect(document.getByRole("heading", { name: "Done when" })).toHaveCount(1)
  await page.getByRole("treeitem", { name: "Open editable file: src/search-controller.js" }).click()
  await expect(editor).toHaveText("// candidate work remains here")
  await page.getByRole("button", { name: "Open task.md", exact: true }).click()
  await expect(document).toBeVisible()
  await expect(document).toBeFocused()
})

test("feature requirements are readable before starting the interview", async ({ page }) => {
  await page.goto(
    "/?view=workspace&scenario=add-feature-support-ticket-search&started=0&theme=light"
  )
  await expect(page.getByRole("heading", { name: "Ready to Start?" })).toBeVisible()
  await page.getByRole("button", { name: "Open task.md", exact: true }).click()
  const document = page.getByRole("article", { name: "task.md preview" })
  await expect(document).toBeVisible()
  await expect(page.getByRole("heading", { name: "Ready to Start?" })).toBeHidden()
  await expect(document.getByRole("heading", { name: "Requirements" })).toHaveCount(1)
  await expect(document).toContainText("Rank title matches above tag matches above body matches")
  await expect(document).toContainText("Existing unfiltered requests still return all tickets")
  await page.getByRole("button", { name: "View source", exact: true }).click()
  await expect(page.locator(".workspace-code-surface .cm-content")).toHaveAttribute(
    "contenteditable",
    "false"
  )
})
