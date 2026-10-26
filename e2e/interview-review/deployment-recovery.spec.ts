import { expect, test } from "@playwright/test"

test("failed device and cloud backups block the recovery reload", async ({ page }) => {
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("interview_autosave_"))
        throw new DOMException("Quota exceeded", "QuotaExceededError")
      return write.call(this, key, value)
    }
  })
  await page.route("**/api/guest-session", (route) => route.abort("internetdisconnected"))
  await page.goto("/?view=lifecycle")
  let navigations = 0
  page.on("framenavigated", () => navigations++)
  await page.getByLabel("Code", { exact: true }).fill("copy this unsaved fix")
  await page.getByRole("button", { name: "Simulate missing deployment chunk" }).click()
  await expect(page.getByText("Reload paused to protect your work", { exact: true })).toBeVisible()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("copy this unsaved fix")
  expect(navigations).toBe(0)
})

test("the loaded chat client keeps its deployment pin across backend releases", async ({
  page,
}) => {
  const pins: Array<string | undefined> = []
  let backend = "A"
  await page.route("**/api/chat", async (route) => {
    pins.push(route.request().headers()["x-deployment-id"])
    await route.fulfill({ json: { reply: `Reply from ${backend}`, provider: "fixture" } })
  })
  await page.goto("/?view=workspace&handoff=1")
  const input = page.getByRole("textbox", { name: "Chat with interviewer" })
  await input.fill("What should I inspect?")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByRole("log", { name: "Interview messages" })).toContainText("Reply from A")
  backend = "B"
  await input.fill("I inspected the entry point. What next?")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByRole("log", { name: "Interview messages" })).toContainText("Reply from B")
  expect(pins).toEqual(["dpl_fixture_A", "dpl_fixture_A"])
  expect((await page.context().cookies()).some((cookie) => cookie.name === "__vdpl")).toBe(false)
})

test("a missing deployment chunk saves fresh work before reloading the same attempt", async ({
  page,
}) => {
  await page.route("**/api/guest-session", (route) => route.fulfill({ json: { ok: true } }))
  await page.goto("/?view=lifecycle")
  await page.getByLabel("Code", { exact: true }).fill("latest work before deploy recovery")
  await page.getByLabel("Sparra draft").fill("unsent question")
  // Start recovery before the debounce has time to flush. Reload is real browser navigation.
  const navigation = page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame())
  await page.getByRole("button", { name: "Simulate missing deployment chunk" }).click()
  await navigation
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue(
    "latest work before deploy recovery"
  )
  await expect(page.getByLabel("Sparra draft")).toHaveValue("unsent question")
  await expect(page.getByText("Attempt: lifecycle-attempt")).toBeVisible()
  await expect(page.getByRole("dialog")).not.toBeVisible()
})

test("local recovery works while cloud backup is offline", async ({ page }) => {
  await page.route("**/api/guest-session", (route) => route.abort("internetdisconnected"))
  await page.goto("/?view=lifecycle")
  await page.getByLabel("Code", { exact: true }).fill("offline fix")
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("interview_autosave_guest_lifecycle-task")
        return raw ? JSON.parse(raw).code : null
      })
    )
    .toBe("offline fix")
  await page.reload()
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("offline fix")
  await expect(page.getByRole("dialog")).not.toBeVisible()
})
