import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/guest-session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  )
})

test("idle pause preserves both full conversations and drafts through reload and manual resume", async ({
  page,
}) => {
  await page.clock.install()
  await page.goto("/?view=lifecycle&theme=light")
  await page.getByLabel("Code", { exact: true }).fill("changed rollup")
  await page.getByLabel("Sparra draft").fill("Compare these boundaries")
  await page.getByRole("button", { name: "Ask Sparra", exact: true }).click()
  await page.getByLabel("Sable draft").fill("I reproduced the failure")
  await page.getByRole("button", { name: "Tell Sable", exact: true }).click()
  await page.getByLabel("Sparra draft").fill("unsent partner question")
  await page.clock.fastForward(9 * 60000)
  await expect(page.getByRole("status").filter({ hasText: "pause in one minute" })).toContainText(
    "pause in one minute"
  )
  await page.clock.fastForward(60000)
  await expect(page.getByRole("dialog")).toContainText("Session paused")
  const elapsed = await page.getByLabel("Elapsed time").textContent()
  await page.clock.fastForward(60000)
  await expect(page.getByLabel("Elapsed time")).toHaveText(elapsed!)
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("interview_autosave_guest_lifecycle-task")!)
  )
  expect(saved.sessionId).toBe("lifecycle-attempt")
  expect(saved.chatMessages).toHaveLength(26)
  expect(saved.interviewerMessages).toHaveLength(26)
  await page.reload()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("changed rollup")
  await expect(page.getByLabel("Sparra draft")).toHaveValue("unsent partner question")
  await page.getByRole("button", { name: "Resume session", exact: true }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByText("Sparra messages: 26; Sable messages: 26")).toBeVisible()
})

test("AI replies do not reset inactivity and save/exit keeps the attempt", async ({ page }) => {
  await page.clock.install()
  await page.goto("/?view=lifecycle&theme=dark")
  await page.clock.fastForward(8 * 60000)
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-ai-reply")))
  await page.clock.fastForward(2 * 60000)
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("dialog").getByRole("button", { name: "Save and exit" }).click()
  await expect(page.getByRole("heading", { name: "Saved attempt" })).toBeVisible()
  await page.getByRole("button", { name: "Reopen attempt" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Resume session" }).click()
  await expect(page.getByText("Attempt: lifecycle-attempt", { exact: false })).toBeVisible()
})
