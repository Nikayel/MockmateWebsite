import { expect, test, type Page } from "@playwright/test"

async function expectFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const name of ["Workspace settings", "Run tests", "Submit fix"]) {
    const button = page.getByRole("button", { name, exact: true })
    const bounds = await button.boundingBox()
    expect(bounds, name).not.toBeNull()
    expect(bounds!.height, name).toBeGreaterThanOrEqual(44)
    expect(bounds!.x, name).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width, name).toBeLessThanOrEqual(page.viewportSize()!.width)
    expect(bounds!.y + bounds!.height, name).toBeLessThanOrEqual(page.viewportSize()!.height)
  }
}

test("quiet workspace fits both themes on desktop, mobile and landscape", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
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
      await expect(page.locator(".editor-panel-card .cm-editor")).toBeVisible()
      await expect(page.getByRole("button", { name: "Expand console" })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
      await expect(page.getByRole("log", { name: "Console output" })).toBeHidden()
      await expect(page.getByRole("button", { name: "Reset workspace", exact: true })).toHaveCount(
        0
      )
      await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0)
      await expectFits(page)
      await page.screenshot({
        path: testInfo.outputPath(`workspace-${theme}-${viewport.width}.png`),
      })
    }
  }
  expect(errors).toEqual([])
})

test("console expands on execution and reopens a manually collapsed result on rerun", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=workspace")
  const editor = page.locator(".workspace-code-surface")
  const initialHeight = (await editor.boundingBox())!.height
  await page.getByRole("button", { name: "Run tests", exact: true }).click()
  const output = page.getByRole("log", { name: "Console output" })
  await expect(output).toContainText("checkpoint boundary: FAIL")
  await expect(page.getByText("oracle mismatch", { exact: true })).toBeVisible()
  expect((await editor.boundingBox())!.height).toBeLessThan(initialHeight)
  await page.getByRole("button", { name: "Collapse console" }).click()
  await expect(output).toBeHidden()
  await expect(page.getByText("oracle mismatch", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Run tests", exact: true }).click()
  await expect(output).toBeVisible()
  await expect(output).toContainText("checkpoint boundary: FAIL")
  await page.screenshot({ path: testInfo.outputPath("workspace-test-results.png") })
  await page.getByRole("button", { name: "Clear console" }).click()
  await expect(output).toBeHidden()
})

test("workspace settings remain keyboard accessible and restore focus after grading", async ({
  page,
}) => {
  await page.goto("/?view=workspace&theme=light")
  const settings = page.getByRole("button", { name: "Workspace settings" })
  await settings.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitemcheckbox", { name: "Show timer" }).click()
  await expect(page.getByText("15:00", { exact: true })).toBeHidden()
  await settings.click()
  await expect(page.getByRole("menuitemcheckbox", { name: "Show timer" })).toHaveAttribute(
    "aria-checked",
    "false"
  )
  await page.getByRole("menuitemcheckbox", { name: "Reduce distractions" }).click()
  await settings.click()
  await expect(page.getByRole("menuitemcheckbox", { name: "Reduce distractions" })).toHaveAttribute(
    "aria-checked",
    "true"
  )
  await page.getByRole("menuitem", { name: "Switch to dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await settings.click()
  await page.getByRole("menuitem", { name: "Grading criteria", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Grading criteria" })
  await expect(dialog).toContainText("Understanding")
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(settings).toBeFocused()
})

test("Sparra tabs preserve the brief, its checklist, conversation and draft", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=workspace&theme=light")
  const sparra = page.getByRole("tab", { name: "Sparra coding partner" })
  const problem = page.getByRole("tab", { name: "Problem", exact: true })
  const checkbox = page.getByRole("checkbox").first()
  await checkbox.check()
  // Tabs use manual activation: arrows move focus, Enter changes the panel.
  await problem.focus()
  await page.keyboard.press("ArrowRight")
  await expect(sparra).toBeFocused()
  await expect(problem).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Enter")
  const input = page.getByRole("textbox", { name: "Message Sparra" })
  await expect(sparra).toBeFocused()
  await input.fill("My working hypothesis")
  await page.getByRole("button", { name: "Send message to Sparra" }).click()
  await expect(page.getByRole("log", { name: "Sparra messages" })).toContainText(
    "My working hypothesis"
  )
  await input.fill("Keep this draft")
  await problem.click()
  await expect(checkbox).toBeChecked()
  await sparra.click()
  await expect(input).toHaveValue("Keep this draft")
  await expect(page.getByRole("log", { name: "Sparra messages" })).toContainText(
    "My working hypothesis"
  )
  await page.screenshot({ path: testInfo.outputPath("workspace-partner-light.png") })
  await input.press("Escape")
  await expect(problem).toBeFocused()
  await expect(checkbox).toBeChecked()
})

test("editor menu resets only the requested scope", async ({ page }) => {
  await page.goto("/?view=workspace")
  const code = page.locator(".editor-panel-card .cm-content")
  await code.fill("# changed cache store")
  await page.getByRole("button", { name: "Editor actions" }).click()
  await page.getByRole("menuitem", { name: "Reset active file", exact: true }).click()
  await expect(code).not.toContainText("# changed cache store")
  await expect(code).toContainText("def evict_expired")
  await page.getByRole("treeitem", { name: /expected_output.txt/ }).click()
  await page.getByRole("button", { name: "Editor actions" }).click()
  await expect(page.getByRole("menuitem", { name: "Reset active file", exact: true })).toHaveCount(
    0
  )
  await expect(page.getByRole("menuitem", { name: "Reset workspace", exact: true })).toBeVisible()
})

test("workspace color pairs meet text contrast in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto(`/?view=workspace&theme=${theme}`)
    const ratios = await page
      .locator(".interview-workspace")
      .first()
      .evaluate((surface) => {
        const sample = document.createElement("span")
        surface.appendChild(sample)
        const luminance = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const channel = value / 255
              return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
            })
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        }
        const pairs = [
          ["foreground", "card"],
          ["muted-foreground", "card"],
          ["accent-foreground", "accent"],
          ["code-comment", "editor-bg"],
          ["workspace-error", "card"],
          ["workspace-success", "card"],
          ["workspace-warning", "card"],
        ]
        const ratios = pairs.map(([foreground, background]) => {
          sample.style.color = `var(--${foreground})`
          sample.style.backgroundColor = `var(--${background})`
          const computed = getComputedStyle(sample)
          const values = [luminance(computed.color), luminance(computed.backgroundColor)].sort(
            (a, b) => b - a
          )
          return {
            pair: `${foreground}/${background}`,
            ratio: (values[0] + 0.05) / (values[1] + 0.05),
          }
        })
        sample.remove()
        return ratios
      })
    for (const { pair, ratio } of ratios)
      expect(ratio, `${theme}: ${pair}`).toBeGreaterThanOrEqual(4.5)
  }
})

test("larger text keeps workspace actions and partner navigation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/?view=workspace&theme=light")
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "24px"
  })
  await expectFits(page)
  await page.getByRole("button", { name: "Show problem", exact: true }).click()
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toBeInViewport()
  await expect(page.getByRole("button", { name: "Send message to Sparra" })).toBeInViewport()
})
