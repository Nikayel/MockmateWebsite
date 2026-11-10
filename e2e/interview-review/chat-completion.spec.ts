import { expect, test } from "@playwright/test"
import { buildInterviewCompletionResponse } from "../../lib/interview/completion/response"
import { INTERVIEW_COMPLETION_REPLY } from "../../lib/interview/completion/contract"
import { buildChatRequestContext } from "../../lib/interview/chat/request-context"
import { createValidatedChatStream } from "../../lib/interview/chat/validated-response-stream"

for (const mode of ["json", "stream"]) {
  test(`explicit close shows the acknowledgment across the scoring transition (${mode})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.route("**/api/chat", async (route) => {
      const request = buildChatRequestContext(route.request().postDataJSON())
      const response = buildInterviewCompletionResponse(request) ?? {
        reply: "Noted. Any questions about the problem?",
        provider: "fixture",
      }
      if (mode === "stream")
        await route.fulfill({
          contentType: "application/x-ndjson",
          body: await createValidatedChatStream(response, { chunkDelayMs: 0 }).text(),
        })
      else await route.fulfill({ json: response })
    })
    await page.goto("/?view=chat-completion")
    const input = page.getByRole("textbox", { name: "Chat with interviewer" })
    const send = page.getByRole("button", { name: "Send message", exact: true })
    await input.fill("two events same user 1801 seconds apart -> count 2")
    await send.click()
    await expect(page.getByRole("log")).toContainText("Noted. Any questions about the problem?")
    await expect(page.getByRole("heading", { name: "Scoring your interview" })).toHaveCount(0)
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0)
    await input.fill("How do I close this interview?")
    await send.click()
    await expect(page.getByRole("heading", { name: "Scoring your interview" })).toBeVisible()
    const acknowledgment = page.locator("[data-sonner-toast]")
    await expect(acknowledgment).toContainText(INTERVIEW_COMPLETION_REPLY)
    await expect(acknowledgment).toBeVisible()
    await page.waitForTimeout(300)
    await expect(acknowledgment).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
