import { expect, test } from "@playwright/test"

test("a visible failure opens its read-only test and preserves the candidate's patch", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/?view=workspace&scenario=bugfix-onboarding&results=1&theme=${theme}`)
      const sourceEditor = page.locator(".editor-panel-card .cm-content[contenteditable=true]")
      await expect(sourceEditor).toBeVisible()
      await sourceEditor.click()
      await page.keyboard.press("ControlOrMeta+End")
      await page.keyboard.press("Enter")
      await page.keyboard.type("// preserve my investigation")

      const openTest = page.getByRole("button", {
        name: /^Open test file tests\/reconciliation\.test\.js:/,
      })
      await expect(openTest).toBeVisible()
      expect((await openTest.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await openTest.focus()
      await page.keyboard.press("Enter")
      await expect(
        page.locator('.editor-panel-card [title="tests/reconciliation.test.js"]')
      ).toBeVisible()
      await expect(
        page.locator(".editor-panel-card .cm-content[contenteditable=false]")
      ).toContainText("assert.deepEqual")
      await expect(page.getByRole("button", { name: /Open test file/ })).toHaveCount(1)
      await expect(page.getByRole("log", { name: "Console output" })).not.toContainText(
        "private hidden assertion"
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`test-source-${theme}-${width}.png`) })

      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page
        .getByRole("treeitem", { name: "Open editable file: src/reconciliation.js" })
        .click()
      await expect(
        page.locator(".editor-panel-card .cm-content[contenteditable=true]")
      ).toContainText("// preserve my investigation")
    }
  }
  expect(errors).toEqual([])
})
