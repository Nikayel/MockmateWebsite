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

test("Sparra tabs preserve the brief, task preview, conversation and draft", async ({
  page,
}, testInfo) => {
  await page.goto("/?view=workspace&theme=light")
  const sparra = page.getByRole("tab", { name: "Sparra coding partner" })
  const problem = page.getByRole("tab", { name: "Problem", exact: true })
  const task = page.getByRole("button", { name: "Open task.md", exact: true })
  await task.click()
  const preview = page.getByRole("article", { name: "task.md preview" })
  await expect(preview).toBeVisible()
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
  await expect(task).toBeVisible()
  await expect(preview).toBeVisible()
  await sparra.click()
  await expect(input).toHaveValue("Keep this draft")
  await expect(page.getByRole("log", { name: "Sparra messages" })).toContainText(
    "My working hypothesis"
  )
  await page.screenshot({ path: testInfo.outputPath("workspace-partner-light.png") })
  await input.press("Escape")
  await expect(problem).toBeFocused()
  await expect(task).toBeVisible()
  await expect(preview).toBeVisible()
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
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const theme of ["light", "dark"]) {
    await page.goto(`/?view=workspace&theme=${theme}`)
    const taskButton = page.getByRole("button", { name: "Open task.md", exact: true })
    await taskButton.hover()
    const taskHover = await taskButton.evaluate((button) => {
      const style = getComputedStyle(button)
      return { foreground: style.color, background: style.backgroundColor }
    })
    const micButton = page.getByRole("button", { name: "Start voice answer" })
    const hoverFill = await micButton.evaluate((button) => {
      const sample = document.createElement("span")
      sample.style.backgroundColor = "var(--muted)"
      button.appendChild(sample)
      const color = getComputedStyle(sample).backgroundColor
      sample.remove()
      return color
    })
    await micButton.hover()
    await expect(micButton).toHaveCSS("background-color", hoverFill)
    const ratios = await page
      .locator(".interview-workspace")
      .first()
      .evaluate((surface, taskHover) => {
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
          ["chat-incoming-text", "chat-incoming"],
          ["chat-outgoing-text", "chat-outgoing"],
          ["muted-foreground", "chat-canvas"],
        ]
        const contrast = (foreground: string, background: string) => {
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
          return (values[0] + 0.05) / (values[1] + 0.05)
        }
        const ratios = pairs.map(([foreground, background]) => {
          sample.style.color = `var(--${foreground})`
          sample.style.backgroundColor = `var(--${background})`
          const computed = getComputedStyle(sample)
          return {
            pair: `${foreground}/${background}`,
            ratio: contrast(computed.color, computed.backgroundColor),
          }
        })
        const mic = getComputedStyle(surface.querySelector('[aria-label="Start voice answer"]')!)
        ratios.push({ pair: "mic hover", ratio: contrast(mic.color, mic.backgroundColor) })
        ratios.push({
          pair: "task hover",
          ratio: contrast(taskHover.foreground, taskHover.background),
        })
        sample.remove()
        return ratios
      }, taskHover)
    for (const { pair, ratio } of ratios)
      expect(ratio, `${theme}: ${pair}`).toBeGreaterThanOrEqual(4.5)
  }
})

test("desktop controls live in the interviewer header and keep the code panel clear", async ({
  page,
}) => {
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/?view=workspace&theme=light")
    const editor = page.locator(".editor-panel-card")
    const bounds = (await editor.boundingBox())!
    expect(bounds.y).toBeLessThan(16)
    const interviewer = page.getByRole("complementary", { name: "Interviewer", exact: true })
    await expect(interviewer.getByRole("group", { name: "Interview controls" })).toBeVisible()
    await expect(editor.getByRole("group", { name: "Interview controls" })).toHaveCount(0)
    const code = (await page.locator(".workspace-code-surface").boundingBox())!
    expect(code.height).toBeGreaterThan(700)
    const controls = interviewer
      .getByRole("group", { name: "Interview controls" })
      .locator("button, select")
    const chatBounds = (await interviewer.boundingBox())!
    const conversation = (await page
      .getByRole("log", { name: "Interview messages" })
      .boundingBox())!
    for (const control of await controls.all()) {
      if (!(await control.isVisible())) continue
      const box = (await control.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(chatBounds.x)
      expect(box.x + box.width).toBeLessThanOrEqual(chatBounds.x + chatBounds.width)
      expect(box.y + box.height).toBeLessThanOrEqual(conversation.y)
    }
  }
})

test("session controls stay reachable when the interviewer is collapsed or focus mode is active", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/?view=workspace")
  const editor = page.locator(".editor-panel-card")
  await page.getByRole("button", { name: "Collapse interviewer panel" }).click()
  await expect(editor.getByRole("button", { name: "Workspace settings" })).toBeVisible()
  await expect(editor.getByRole("button", { name: "Close interview" })).toBeVisible()
  await page.getByRole("button", { name: "Expand interviewer panel" }).click()
  await expect(editor.getByRole("group", { name: "Interview controls" })).toHaveCount(0)
  await page.getByRole("button", { name: "Enable focus mode", exact: true }).click()
  await expect(editor.getByRole("button", { name: "Exit focus mode", exact: true })).toBeVisible()
  await expect(editor.getByRole("button", { name: "Close interview" })).toBeVisible()
  await editor.getByRole("button", { name: "Exit focus mode", exact: true }).click()
  await expect(
    page
      .getByRole("complementary", { name: "Interviewer", exact: true })
      .getByRole("button", { name: "Workspace settings" })
  ).toBeVisible()
})

test("workspace language is fixed metadata and switchable languages work on desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/?view=workspace&theme=light")
  await expect(page.getByRole("combobox", { name: "Editor language" })).toHaveCount(0)
  await expect(
    page.locator(".editor-panel-card").getByText("Fixed for this workspace", { exact: true })
  ).toHaveCount(1)
  await page.goto("/?view=workspace&scenario=dsa&theme=light")
  const picker = page.getByRole("combobox", { name: "Editor language" })
  await expect(picker).toBeEnabled()
  await picker.click()
  await expect(page.getByRole("option", { name: "Python", exact: true })).toBeInViewport()
  await page.screenshot({
    path: testInfo.outputPath("language-picker.png"),
    animations: "disabled",
  })
  await page.getByRole("option", { name: "Python", exact: true }).click()
  await expect(picker).toHaveText("Python")
  await expect(page.locator(".cm-content")).toContainText("def two_sum")
  expect(await page.evaluate(() => localStorage.getItem("mockmate_preferred_language"))).toBe(
    "python"
  )
  await picker.focus()
  await page.keyboard.press("Space")
  await expect(page.getByRole("option", { name: "Python", exact: true })).toBeFocused()
  await page.keyboard.press("Home")
  await expect(page.getByRole("option", { name: "JavaScript", exact: true })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("option", { name: "TypeScript", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(picker).toHaveText("TypeScript")
  await expect(page.locator(".cm-content")).toContainText("nums: number[]")
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(picker).toBeVisible()
  await picker.click()
  await page.getByRole("option", { name: "Python", exact: true }).click()
  await expect(page.locator(".cm-content")).toContainText("def two_sum")
  expect(await page.evaluate(() => localStorage.getItem("mockmate_preferred_language"))).toBe(
    "python"
  )
  await page.goto("/?view=workspace&theme=light")
  await expect(page.getByRole("combobox", { name: "Editor language" })).toHaveCount(0)
  await expect(
    page.locator(".editor-panel-card").getByText("Fixed for this workspace", { exact: true })
  ).toHaveCount(1)
})

test("submitted text restores the mic while reply progress stays in the conversation", async ({
  page,
}, testInfo) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?view=workspace&theme=${theme}`)
      if (width < 1024) await page.getByRole("button", { name: "Show interview chat" }).click()
      const mic = page.getByRole("button", { name: "Start voice answer" })
      await expect(mic).toBeEnabled()
      const input = page.getByRole("textbox", { name: "Chat with interviewer" })
      await input.fill("I reproduced the skipped entry at the checkpoint.")
      await expect(mic).toBeHidden()
      await expect(page.getByText("Transcribed", { exact: true })).toHaveCount(0)
      const send = page.getByRole("button", { name: "Send message", exact: true })
      await expect(send).toHaveCount(1)
      await send.click()
      await expect(input).toHaveValue("")
      await expect(mic).toBeDisabled()
      await expect(page.getByRole("status")).toContainText("Sable is replying")
      await expect(page.getByText(/Sending/)).toHaveCount(0)
      await expect(mic).toBeEnabled()
      await expect(page.getByRole("status")).toHaveCount(0)
      const log = page.getByRole("log", { name: "Interview messages" })
      await expect(log).toContainText("Compare the retained entries at the exact checkpoint")
      const colors = await log.evaluate((element) => {
        const incoming = getComputedStyle(element.querySelector('[data-speaker="ai"]')!)
        const outgoing = getComputedStyle(element.querySelector('[data-speaker="user"]')!)
        return [incoming.backgroundColor, outgoing.backgroundColor]
      })
      expect(colors[0]).not.toBe(colors[1])
      await log.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await page.screenshot({ path: testInfo.outputPath(`conversation-${theme}-${width}.png`) })
      if (width < 1024) {
        await expect(page.getByRole("button", { name: "Workspace settings" })).toBeVisible()
        await expect(page.getByRole("button", { name: "Close interview" })).toBeVisible()
      }
    }
  }
})

test("voice recording can be cancelled or submitted without leaving a sending state", async ({
  page,
}) => {
  await page.goto("/?view=workspace&theme=light")
  const mic = page.getByRole("button", { name: "Start voice answer" })
  await mic.click()
  await expect(page.getByText("Live transcription", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Cancel voice answer" }).click()
  await expect(mic).toBeEnabled()
  await expect(page.getByRole("textbox", { name: "Chat with interviewer" })).toHaveValue("")
  await mic.click()
  await page.getByRole("button", { name: "Send voice answer" }).click()
  await expect(mic).toBeDisabled()
  await expect(page.getByText(/Sending/)).toHaveCount(0)
  await expect(mic).toBeEnabled()
  await expect(page.getByRole("log", { name: "Interview messages" })).toContainText(
    "I traced the loop boundary"
  )
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
