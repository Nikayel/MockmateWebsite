import { expect, test } from "@playwright/test"
import { createValidatedChatStream } from "../../lib/interview/chat/validated-response-stream"

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"]) {
    for (const mode of ["json", "stream"]) {
      test(`reaction attaches to the sent message and allows the next question (${width}px, ${theme}, ${mode})`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: "reduce" })
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
        await page.goto(`/?view=workspace&handoff=1&theme=${theme}`)
        if (width < 1024) await page.getByRole("button", { name: "Show interview chat" }).click()
        const log = page.getByRole("log", { name: "Interview messages" })
        const initial = await log.locator("article").count()
        const input = page.getByRole("textbox", { name: "Chat with interviewer" })
        const send = page.getByRole("button", { name: "Send message", exact: true })
        await input.fill("sure, let me inspect the files")
        await send.click()
        const sent = log.locator("article").last()
        await expect(sent).toContainText("sure, let me inspect the files")
        const reaction = sent.getByRole("img", { name: "Sable acknowledged" })
        await expect(reaction).toBeVisible()
        await expect(reaction).toHaveText("👍")
        await expect(reaction.locator("svg")).toHaveCount(0)
        await expect(reaction.locator("span")).toHaveCSS("font-family", /Apple Color Emoji/)
        const bubble = sent.locator(".workspace-message")
        const bubbleBounds = (await bubble.boundingBox())!
        const reactionBounds = (await reaction.boundingBox())!
        expect(reactionBounds.y).toBeGreaterThanOrEqual(bubbleBounds.y + bubbleBounds.height)
        expect(reactionBounds.x).toBeGreaterThanOrEqual(bubbleBounds.x)
        expect(reactionBounds.x + reactionBounds.width).toBeLessThanOrEqual(
          bubbleBounds.x + bubbleBounds.width + 1
        )
        expect(
          await reaction.evaluate((element) => getComputedStyle(element).backgroundColor)
        ).not.toBe(await bubble.evaluate((element) => getComputedStyle(element).backgroundColor))
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        )
        await log.screenshot({ path: testInfo.outputPath(`reaction-${theme}-${width}.png`) })
        await expect(log.locator("article")).toHaveCount(initial + 1)
        await expect(input).toBeEnabled()
        await expect(page.getByText("Sable couldn’t reply")).toHaveCount(0)
        await input.fill("What is the input contract?")
        await send.click()
        await expect(log).toContainText("The input contract is documented in task.md.")
        await expect(log.locator("article")).toHaveCount(initial + 3)
        await expect(log.getByRole("img", { name: "Sable acknowledged" })).toHaveCount(1)
        await expect(log.locator("article").last().getByRole("img")).toHaveCount(0)
        expect(requests).toHaveLength(2)
      })
    }
  }
}

test("reaction reflows with larger text and a theme change", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: { reply: "", reaction: "acknowledged", provider: "local" } })
  )
  await page.goto("/?view=workspace&handoff=1&theme=light")
  await page.getByRole("button", { name: "Show interview chat" }).click()
  await page
    .getByRole("textbox", { name: "Chat with interviewer" })
    .fill("sure, let me inspect the files")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  const reaction = page.getByRole("img", { name: "Sable acknowledged" })
  await expect(reaction).toBeVisible()
  const lightBackground = await reaction.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.style.fontSize = "24px"
  })
  await expect(reaction).not.toHaveCSS("background-color", lightBackground)
  await reaction.scrollIntoViewIfNeeded()
  await expect(reaction).toBeInViewport()
  const sent = page.getByRole("log", { name: "Interview messages" }).locator("article").last()
  const bubbleBounds = (await sent.locator(".workspace-message").boundingBox())!
  const reactionBounds = (await reaction.boundingBox())!
  expect(reactionBounds.y).toBeGreaterThanOrEqual(bubbleBounds.y + bubbleBounds.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

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
