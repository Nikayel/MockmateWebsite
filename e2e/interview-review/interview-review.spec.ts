import { expect, test, type Page } from "@playwright/test"

async function expectViewportFit(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewportWidth)
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewportHeight + 1)
  // Hidden overflow must not conceal a clipped action row.
  for (const button of await page.locator("header").first().getByRole("button").all()) {
    if (!(await button.isVisible())) continue
    const box = (await button.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(dimensions.viewportWidth)
    expect(box.y + box.height).toBeLessThanOrEqual(dimensions.viewportHeight)
  }
}

test("submit → bounded debrief → full feedback → dashboard uses the existing callbacks", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto("/?view=workspace")
  await expect(page.locator(".editor-panel-card .cm-editor")).toBeVisible()
  await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0)
  await expect(page.getByText(/reacting live/)).toHaveCount(0)
  await page.getByRole("button", { name: /submit/i }).click()
  await expect(page.getByRole("heading", { name: "Review your submission" })).toBeVisible()
  await expectViewportFit(page)
  await page
    .getByRole("textbox", { name: "Chat with interviewer" })
    .fill("Why did the refresh matter?")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(
    page.getByText("New reply: verify the state after both cleanup passes.")
  ).toBeVisible()
  await page.getByRole("button", { name: "View feedback" }).click()
  await expect(page.getByRole("heading", { name: "Interview feedback" })).toBeVisible()
  await expect(page.locator("header").getByText("73/100")).toBeVisible()
  await page.locator("summary", { hasText: "Scores & rubric" }).click()
  const content = page.getByRole("region", { name: "Interview feedback content" })
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true
  )
  const before = await page.getByRole("button", { name: "Done", exact: true }).boundingBox()
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect(await page.getByRole("button", { name: "Done", exact: true }).boundingBox()).toEqual(
    before
  )
  await expectViewportFit(page)
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Dashboard return" })).toBeVisible()
  expect(errors).toEqual([])
})

test("review fits desktop, mobile and landscape in both themes", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 375, height: 812 },
    { width: 812, height: 375 },
  ]) {
    await page.setViewportSize(viewport)
    for (const theme of ["dark", "light"]) {
      await page.goto(`/?theme=${theme}`)
      await expect(page.getByRole("button", { name: "View feedback" })).toBeVisible()
      await expectViewportFit(page)
      const log = page.getByRole("log", { name: "Post-interview discussion messages" })
      expect((await log.boundingBox())!.height).toBeGreaterThan(70)
      if (viewport.width < 768) {
        await page.getByRole("button", { name: "Submitted code", exact: true }).click()
        await expect(
          page.getByRole("region", { name: "Submitted code", exact: true })
        ).toBeVisible()
        await expect(page.getByRole("region", { name: "Interview discussion" })).toBeHidden()
        await page.getByRole("button", { name: "Discussion", exact: true }).click()
        await expect(page.getByRole("button", { name: "Discussion", exact: true })).toHaveAttribute(
          "aria-pressed",
          "true"
        )
        await expect(
          page.getByRole("button", { name: "Submitted code", exact: true })
        ).toHaveAttribute("aria-pressed", "false")
      }
      await page.screenshot({ path: testInfo.outputPath(`review-${theme}-${viewport.width}.png`) })
      await page.getByRole("button", { name: "View feedback" }).click()
      await page.screenshot({
        path: testInfo.outputPath(`feedback-${theme}-${viewport.width}.png`),
      })
      await expectViewportFit(page)
      const scores = page.locator("summary", { hasText: "Scores & rubric" })
      await scores.focus()
      await page.keyboard.press("Enter")
      await expect(scores.locator("..")).toHaveAttribute("open", "")
      await expectViewportFit(page)
    }
  }
})

test("larger text keeps mobile report actions and the last detail reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/?theme=light")
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "24px"
  })
  await expect(page.getByRole("button", { name: "View feedback" })).toBeVisible()
  await expectViewportFit(page)
  await page.getByRole("button", { name: "View feedback" }).click()
  const content = page.getByRole("region", { name: "Interview feedback content" })
  await content.focus()
  await page.keyboard.press("End")
  await expect(page.getByText("Graded on debugging process & fix quality")).toBeInViewport()
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeInViewport()
  await expectViewportFit(page)
})

test("incoming replies preserve the reader's position until they choose Latest reply", async ({
  page,
}) => {
  await page.goto("/")
  const log = page.getByRole("log", { name: "Post-interview discussion messages" })
  await expect(log).toBeVisible()
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  await log.evaluate((element) => {
    element.scrollTop = 0
    element.dispatchEvent(new Event("scroll"))
  })
  // Test-only arrival control calls setState; no server or AI call.
  await page
    .getByRole("button", { name: "Simulate incoming reply" })
    .evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.getByRole("button", { name: "Latest reply" })).toBeVisible()
  expect(await log.evaluate((element) => element.scrollTop)).toBe(0)
  await page.getByRole("button", { name: "Latest reply" }).click()
  await expect(page.getByText("Incoming reply while reading earlier messages.")).toBeVisible()
  await expectViewportFit(page)
})

test("Sparra occupies the left rail, never the code panel, and restores the problem", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/?view=workspace")
  const editor = page.locator(".editor-panel-card")
  await expect(editor.locator(".cm-editor")).toBeVisible()
  const before = await editor.boundingBox()
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  const partner = page.getByRole("region", { name: "Sparra partner", exact: true })
  await expect(partner).toBeVisible()
  const dock = (await partner.boundingBox())!
  const code = (await editor.boundingBox())!
  expect(dock.x + dock.width).toBeLessThanOrEqual(code.x)
  expect(code).toEqual(before)
  const input = partner.getByRole("textbox", { name: "Message Sparra" })
  await expect(page.getByRole("tab", { name: "Sparra coding partner" })).toBeFocused()
  await input.fill("Can you help me inspect the report?")
  await partner.getByRole("button", { name: "Send message to Sparra" }).click()
  await expect(
    partner.getByText("Which evidence would help you check that hypothesis?")
  ).toBeVisible()
  // Editor Escape (autocomplete, etc.) must not dismiss Sparra.
  await editor.locator(".cm-content").focus()
  await page.keyboard.press("Escape")
  await expect(partner).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath("workspace-sparra-desktop.png") })
  await input.focus()
  await page.keyboard.press("Escape")
  await expect(partner).toBeHidden()
  await expect(page.getByRole("tab", { name: "Problem", exact: true })).toBeFocused()
  await expectViewportFit(page)
})

test("Sparra remains accessible on mobile and when its desktop rail was collapsed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/?view=workspace&theme=light")
  await page.getByRole("button", { name: "Show problem", exact: true }).click()
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toBeVisible()
  await page.getByRole("tab", { name: "Problem", exact: true }).click()
  await expect(
    page
      .getByRole("complementary", { name: "Problem and partner" })
      .getByRole("heading", { name: /cache cleanup/i })
      .first()
  ).toBeVisible()
  await expectViewportFit(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole("button", { name: "Collapse problem panel" }).click()
  await expect(page.getByRole("button", { name: "Expand problem panel" })).toBeVisible()
  await page.getByRole("button", { name: "Expand problem panel" }).click()
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await expect(page.getByRole("region", { name: "Sparra partner", exact: true })).toBeVisible()
  expect((await page.locator(".editor-panel-card").boundingBox())!.width).toBeGreaterThan(300)
})

test("focus mode retains workspace navigation and opening Sparra exits focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/?view=workspace")
  await page.getByRole("button", { name: "Enable focus mode", exact: true }).click()
  const explorer = page.getByRole("tree", { name: "Workspace files" })
  await expect(explorer).toBeVisible()
  await expect(page.locator(".editor-panel-card .cm-editor")).toBeVisible()
  await explorer.getByRole("treeitem", { name: /log_reader\.py/ }).click()
  await expect(
    page.locator(".editor-panel-card").getByText("src/log_reader.py", { exact: true })
  ).toBeVisible()
  const rail = (await page
    .getByRole("complementary", { name: "Problem and partner" })
    .boundingBox())!
  const editor = (await page.locator(".editor-panel-card").boundingBox())!
  expect(rail.x + rail.width).toBeLessThanOrEqual(editor.x)
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await expect(page.getByRole("button", { name: "Enable focus mode", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Sparra partner", exact: true })).toBeVisible()
  await expectViewportFit(page)
})
