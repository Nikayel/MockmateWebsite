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
  const entry = page.getByRole("region", { name: "Guided debugging labs" })
  await expect(entry.getByText("New & improved")).toBeVisible()
  await expect(entry.getByText("Beta", { exact: true })).toBeVisible()
  await expect(
    page.getByText("BookClub: Repair the Reader Dashboard", { exact: true })
  ).toHaveCount(0)
  await entry.getByRole("link", { name: "Explore guided labs" }).click()
  await expect(page).toHaveURL(/view=guided-labs/)
  await expect(
    page.getByText("BookClub: Repair the Reader Dashboard", { exact: true })
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

test("explains unlocks, runs real Python repairs, resumes, and re-verifies edits", async ({
  page,
  request,
}) => {
  const errors: string[] = []
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
  await expect(page.getByText("Verified fix submitted in browser fixture")).toBeVisible()
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
