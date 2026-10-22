import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/guest-session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  )
})

test("idle pause preserves full conversations and drafts, and reload continues directly", async ({
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
  await expect(page.getByRole("heading", { name: "Rollup debugging session" })).toBeVisible()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("changed rollup")
  await expect(page.getByLabel("Sparra draft")).toHaveValue("unsent partner question")
  await expect(page.getByText("Sparra messages: 26; Sable messages: 26")).toBeVisible()
  await page.clock.fastForward(60000)
  await expect(page.getByRole("dialog")).not.toBeVisible()
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
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByText("Attempt: lifecycle-attempt", { exact: false })).toBeVisible()
  await page.clock.fastForward(60000)
  await expect(page.getByRole("dialog")).not.toBeVisible()
})

test("brief tab switches and reopening a saved attempt never demand another resume", async ({
  page,
}) => {
  await page.clock.install()
  await page.goto("/?view=lifecycle&theme=light")
  await page.getByLabel("Code", { exact: true }).fill("keep this edit")
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await page.clock.fastForward(5000)
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
    document.dispatchEvent(new Event("visibilitychange"))
    window.dispatchEvent(new Event("focus"))
  })
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await page.getByRole("button", { name: "Save and exit", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Saved attempt" })).toBeVisible()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await page.clock.fastForward(20 * 60000)
  await page.getByRole("button", { name: "Reopen attempt" }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("keep this edit")
  await page.reload()
  await expect(page.getByRole("heading", { name: "Rollup debugging session" })).toBeVisible()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("keep this edit")
  await page.clock.fastForward(10 * 60000)
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Resume session", exact: true }).click()
  await expect(page.getByRole("dialog")).not.toBeVisible()
})

test("saving and exiting does not flash the pause dialog while cloud backup is pending", async ({
  page,
}) => {
  let releaseBackup: () => void = () => {}
  const backup = new Promise<void>((resolve) => {
    releaseBackup = resolve
  })
  await page.route("**/api/guest-session", async (route) => {
    await backup
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  })
  await page.goto("/?view=lifecycle&theme=light")
  await page.getByLabel("Code", { exact: true }).fill("saved during exit")
  const request = page.waitForRequest("**/api/guest-session")
  await page.getByRole("button", { name: "Save and exit", exact: true }).click()
  await request
  await expect(page.getByRole("heading", { name: "Rollup debugging session" })).toBeVisible()
  await expect(page.getByRole("dialog")).not.toBeVisible()
  releaseBackup()
  await expect(page.getByRole("heading", { name: "Saved attempt" })).toBeVisible()
})
