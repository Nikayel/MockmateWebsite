import { expect, test } from "@playwright/test"
import { createValidatedChatStream } from "../../lib/interview/chat/validated-response-stream"

for (const width of [1440, 390]) {
  for (const mode of ["json", "stream"]) {
    test(`reaction attaches to the sent message and allows the next question (${width}px, ${mode})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      const requests: Array<{ message: string }> = []
      await page.route("**/api/chat", async (route) => {
        const body = route.request().postDataJSON()
        requests.push(body)
        const response =
          body.candidateMessage === "sure, let me inspect the files"
            ? { reply: "", provider: "local", reaction: "acknowledged" as const }
            : { reply: "The input contract is documented in task.md.", provider: "fixture" }
        if (mode === "stream") {
          await route.fulfill({
            contentType: "application/x-ndjson",
            body: await createValidatedChatStream(response, { chunkDelayMs: 0 }).text(),
          })
        } else await route.fulfill({ json: response })
      })
      await page.goto("/?view=workspace&handoff=1")
      if (width < 1024) await page.getByRole("button", { name: "Show interview chat" }).click()
      const log = page.getByRole("log", { name: "Interview messages" })
      const initial = await log.locator("article").count()
      const input = page.getByRole("textbox", { name: "Chat with interviewer" })
      const send = page.getByRole("button", { name: "Send message", exact: true })
      await input.fill("sure, let me inspect the files")
      await send.click()
      const sent = log.locator("article").last()
      await expect(sent).toContainText("sure, let me inspect the files")
      await expect(sent.getByRole("img", { name: "Sable acknowledged" })).toBeVisible()
      await expect(log.locator("article")).toHaveCount(initial + 1)
      await expect(input).toBeEnabled()
      await expect(page.getByText("Sable couldn’t reply")).toHaveCount(0)
      await input.fill("What is the input contract?")
      await send.click()
      await expect(log).toContainText("The input contract is documented in task.md.")
      await expect(log.locator("article")).toHaveCount(initial + 3)
      await expect(log.getByRole("img", { name: "Sable acknowledged" })).toHaveCount(1)
      expect(requests).toHaveLength(2)
    })
  }
}

test("a delayed acknowledgment cannot mutate a paused attempt", async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/chat", async (route) => {
    await pending
    await route
      .fulfill({ json: { reply: "", reaction: "acknowledged", provider: "local" } })
      .catch(() => {})
  })
  await page.goto("/?view=workspace&handoff=1")
  await page.getByRole("textbox", { name: "Chat with interviewer" }).fill("sure")
  const request = page.waitForRequest("**/api/chat")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await request
  await page.getByRole("button", { name: "Pause fixture session" }).click()
  release()
  await expect(page.getByRole("img", { name: "Sable acknowledged" })).toHaveCount(0)
})
