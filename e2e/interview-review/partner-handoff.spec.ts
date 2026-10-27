import { expect, test } from "@playwright/test"
import { createValidatedChatStream } from "../../lib/interview/chat/validated-response-stream"
import { PARTNER_HANDOFF_REPLY } from "../../lib/interview/partner-handoff/contract"

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`interviewer opens Sparra and sends only after candidate review (${viewport.width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const requests: Array<{ role: string; message: string; partnerAvailable: boolean }> = []
    await page.route("**/api/chat", async (route) => {
      const body = route.request().postDataJSON()
      requests.push(body)
      if (body.role === "partner") {
        await route.fulfill({
          json: { reply: "Let’s trace one sample through the parser.", provider: "fixture" },
        })
      } else {
        const response = createValidatedChatStream(
          { reply: PARTNER_HANDOFF_REPLY, provider: "fixture", action: { type: "open_sparra" } },
          { chunkDelayMs: 0 }
        )
        await route.fulfill({ contentType: "application/x-ndjson", body: await response.text() })
      }
    })
    await page.goto("/?view=workspace&handoff=1")
    if (viewport.width < 1024)
      await page.getByRole("button", { name: "Show interview chat" }).click()
    const question = "Can you walk me through monitor_eval.py with sample input?"
    await page.getByRole("textbox", { name: "Chat with interviewer" }).fill(question)
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByRole("tab", { name: "Sparra coding partner" })).toHaveAttribute(
      "data-state",
      "active"
    )
    const draft = page.getByRole("textbox", { name: "Message Sparra" })
    await expect(draft).toBeFocused()
    await expect(draft).toHaveValue(question)
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0)
    expect(requests).toHaveLength(1)
    expect(requests[0].partnerAvailable).toBe(true)
    await expect(page.getByRole("log", { name: "Sparra messages" })).not.toContainText(question)
    await page.getByRole("button", { name: "Send message to Sparra" }).click()
    await expect(page.getByRole("log", { name: "Sparra messages" })).toContainText(
      "trace one sample"
    )
    expect(requests).toHaveLength(2)
    expect(requests[1].role).toBe("partner")
    await draft.press("Escape")
    await expect(page.getByRole("tab", { name: "Problem", exact: true })).toBeFocused()
    await expect(page.getByRole("tab", { name: "Problem", exact: true })).toHaveAttribute(
      "data-state",
      "active"
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test("handoff preserves an existing Sparra draft and opens a collapsed rail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: { reply: PARTNER_HANDOFF_REPLY, provider: "fixture", action: { type: "open_sparra" } },
    })
  )
  await page.goto("/?view=workspace&handoff=1")
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await page.getByRole("textbox", { name: "Message Sparra" }).fill("My unsent debugging notes")
  await page.getByRole("button", { name: "Collapse problem panel" }).click()
  await page
    .getByRole("textbox", { name: "Chat with interviewer" })
    .fill("Walk me through the parser")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toHaveValue(
    "My unsent debugging notes"
  )
})

test("a late reply cannot open Sparra after the session pauses", async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/chat", async (route) => {
    await pending
    await route
      .fulfill({
        json: {
          reply: PARTNER_HANDOFF_REPLY,
          provider: "fixture",
          action: { type: "open_sparra" },
        },
      })
      .catch(() => {})
  })
  await page.goto("/?view=workspace&handoff=1")
  await page.getByRole("textbox", { name: "Chat with interviewer" }).fill("Explain this function")
  const request = page.waitForRequest("**/api/chat")
  await page.getByRole("button", { name: "Send message" }).click()
  await request
  await page.getByRole("button", { name: "Pause fixture session" }).click()
  release()
  await expect(page.getByRole("tab", { name: "Problem", exact: true })).toHaveAttribute(
    "data-state",
    "active"
  )
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toHaveCount(0)
})

test("a repeated mobile handoff focuses Sparra even when its tab was already selected", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: { reply: PARTNER_HANDOFF_REPLY, provider: "fixture", action: { type: "open_sparra" } },
    })
  )
  await page.goto("/?view=workspace&handoff=1")
  await page.getByRole("button", { name: "Show problem" }).click()
  await page.getByRole("tab", { name: "Sparra coding partner" }).click()
  await page.getByRole("textbox", { name: "Message Sparra" }).fill("Existing draft")
  await page.getByRole("button", { name: "Show interview chat" }).click()
  await page
    .getByRole("textbox", { name: "Chat with interviewer" })
    .fill("Walk through a sample input")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toBeFocused()
  await expect(page.getByRole("textbox", { name: "Message Sparra" })).toHaveValue("Existing draft")
})
