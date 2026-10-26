import { expect, test, type Page } from "@playwright/test"
const lab =
  "/interview?track=debugging&scenario=bugfix-bookclub-reading-streak-workspace&practice=true"
async function edit(page: Page, path: string, content: string) {
  await page.getByLabel("Workspace file").selectOption(path)
  const editor = page.locator(".cm-content[contenteditable=true]")
  await editor.click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.insertText(content)
}
async function run(page: Page) {
  await page.getByRole("button", { name: "Run tests", exact: true }).click()
  await expect(page.getByRole("button", { name: "Run tests", exact: true })).toBeEnabled({
    timeout: 80_000,
  })
}

test("discovers guided labs separately from rounds", async ({ page }) => {
  await page.goto("/interview?track=debugging")
  const entry = page.getByRole("navigation", { name: "Debugging practice format" })
  await expect(entry.getByText("Beta", { exact: true })).toBeVisible()
  await expect(
    page.getByText("BookClub: Repair the Reader Dashboard", { exact: true })
  ).toHaveCount(0)
  await entry.getByRole("link", { name: /^Guided labs/ }).click()
  await expect(page).toHaveURL(/view=guided-labs/)
  await expect(
    page.getByText("BookClub: Repair the Reader Dashboard", { exact: true })
  ).toBeVisible()
  await expect(entry.getByRole("link", { name: /^Guided labs/ })).toHaveAttribute(
    "aria-current",
    "page"
  )
  const preview = page.getByText("View phases", { exact: true })
  await preview.focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("list", { name: "Lab phase preview" }).getByRole("listitem")
  ).toHaveCount(6)
  await expect(
    page.getByText(/Complete the investigation checklist to open the first repair/)
  ).toBeVisible()
  await page.screenshot({ path: "test-results/bookclub-gallery-desktop.png", fullPage: true })
  await page.getByText("BookClub: Repair the Reader Dashboard", { exact: true }).click()
  await page
    .getByRole("button", {
      name: "Start practice: BookClub: Repair the Reader Dashboard",
      exact: true,
    })
    .click()
  await expect(page.getByRole("heading", { name: "Investigate", exact: true })).toBeVisible()
})

test("format links preserve back navigation and lab previews fit narrow screens", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/interview?track=debugging")
  await page.getByRole("button", { name: "List view", exact: true }).click()
  await page
    .getByRole("navigation", { name: "Debugging practice format" })
    .getByRole("link", { name: /^Guided labs/ })
    .click()
  await expect(
    page.getByRole("heading", { name: "BookClub: Repair the Reader Dashboard", exact: true })
  ).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("button", { name: "List view", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await page.goForward()
  await expect(
    page
      .getByRole("navigation", { name: "Debugging practice format" })
      .getByRole("link", { name: /^Guided labs/ })
  ).toHaveAttribute("aria-current", "page")
  for (const width of [1440, 375, 320, 812]) {
    await page.setViewportSize({ width, height: width === 812 ? 375 : 900 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/interview?track=debugging&view=guided-labs&theme=${theme}`)
      await page.emulateMedia({ reducedMotion: "reduce" })
      const preview = page.getByText("View phases", { exact: true })
      await preview.focus()
      await page.keyboard.press("Enter")
      await expect(
        page.getByRole("list", { name: "Lab phase preview" }).getByRole("listitem")
      ).toHaveCount(6)
      await expect(page.getByText("6 phases · 4 repairs", { exact: true })).toBeVisible()
      await expect(page.getByText("Beta", { exact: true })).toHaveCount(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({
        path: testInfo.outputPath(`labs-${theme}-${width}.png`),
        fullPage: true,
      })
    }
  }
  expect(errors).toEqual([])
})

test("explains unlocks, runs real Python repairs, resumes, and re-verifies edits", async ({
  page,
  request,
}) => {
  const errors: string[] = []
  const workerPins: Array<string | null> = []
  page.context().on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname === "/workers/python-sandbox-worker.js")
      workerPins.push(url.searchParams.get("dpl"))
  })
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(lab)
  const rail = page.getByRole("region", { name: "Guided debugging lab", exact: true })
  await expect(rail.getByText("Opens after Restore streaks passes.", { exact: true })).toBeVisible()
  const next = rail.getByRole("button", { name: "Continue to Restore streaks" })
  await expect(next).toBeDisabled()
  await rail
    .getByRole("button", { name: "I read task.md and can describe the expected streak." })
    .click()
  await rail
    .getByRole("button", { name: "I found the request entry point and the runnable service code." })
    .click()
  await next.click()
  await run(page)
  expect(workerPins).toContain("dpl_bookclub_fixture")
  await page
    .getByRole("textbox", { name: "Explain your diagnosis" })
    .fill(
      "The streak reads started_at. Completion days require finished_at; I will check that page totals stay unchanged."
    )
  await page.getByRole("button", { name: "Record explanation" }).click()
  await expect(rail.getByRole("heading", { name: "Restore streaks", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeDisabled()
  const response = await request.get("/__reference")
  const references = (await response.json()) as Array<{ path: string; content: string }>
  for (const reference of references) await edit(page, reference.path, reference.content)
  for (const phase of [
    "Repair history",
    "Reconcile calendars",
    "Refresh dashboards",
    "Release check",
  ]) {
    await run(page)
    await expect(rail.getByRole("heading", { name: phase, exact: true })).toBeVisible()
  }
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeDisabled()
  await run(page)
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeEnabled()
  await rail.getByRole("button", { name: "Restore streaks: completed, review phase" }).click()
  await expect(rail.getByRole("heading", { name: "Restore streaks · Completed" })).toBeVisible()
  await page.reload()
  await expect(rail.getByRole("heading", { name: "Release check", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeDisabled()
  await run(page)
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeEnabled()
  const reference = references[0]
  await edit(page, reference.path, reference.content + "\n# verified edit\n")
  await expect(page.getByRole("button", { name: "Submit fix" })).toBeDisabled()
  await expect(rail.getByRole("heading", { name: "Release check", exact: true })).toBeVisible()
  await run(page)
  await page.getByRole("button", { name: "Submit fix" }).click()
  await expect(page.getByText("Guided practice · excluded from interview readiness")).toBeVisible()
  await expect(page.getByText("Scores & rubric", { exact: true })).toHaveCount(0)
  await page.getByText("2. Restore streaks", { exact: true }).click()
  const feedback = page.getByRole("region", { name: "Phase feedback" })
  const streakPhase = feedback
    .locator("details")
    .filter({ has: page.getByText("2. Restore streaks", { exact: true }) })
  await streakPhase.getByText("Review recorded evidence", { exact: true }).click()
  await expect(feedback.getByText("The streak reads started_at.", { exact: false })).toBeVisible()
  await expect(
    feedback.getByText("app/services/stats_service.py", { exact: false }).first()
  ).toBeVisible()
  const assessment = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("bookclub-assessment")!)
  )
  expect(assessment.phases[1].reproducedFailure).toBe(true)
  expect(assessment.phases[1].evidence.some((e: { kind: string }) => e.kind === "checkpoint")).toBe(
    true
  )
  expect(assessment.phases[1].verification).toBe("passed")
  expect(assessment.phases[1].review.communication.status).toBe("not_observed")
  await page.goto(`${lab}&review=1`)
  await expect(page.getByText("Guided practice · excluded from interview readiness")).toBeVisible()
  await page.screenshot({ path: "test-results/bookclub-phase-feedback.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByText("2. Restore streaks", { exact: true }).click()
  await page
    .getByRole("region", { name: "Phase feedback" })
    .locator("details")
    .filter({ has: page.getByText("2. Restore streaks", { exact: true }) })
    .getByText("Review recorded evidence", { exact: true })
    .click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "test-results/bookclub-phase-feedback-mobile.png", fullPage: true })
  expect(errors).toEqual([])
})

test("keeps unlock explanations readable on narrow screens in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const theme of ["light", "dark"]) {
    await page.goto(`${lab}&theme=${theme}`)
    await expect(
      page.getByText("Opens after Restore streaks passes.", { exact: true })
    ).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/bookclub-${theme}-mobile.png`, fullPage: true })
  }
})
