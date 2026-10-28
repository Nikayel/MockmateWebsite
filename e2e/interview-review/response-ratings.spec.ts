import { expect, test } from "@playwright/test"

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`partner and hint ratings save, recover and restore (${width}px ${theme})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 })
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      const generationId = "a136081b-2732-48b4-953b-acf8b2658703"
      const ratings = new Map<string, string>()
      let failNextChange = true
      const writes: Array<{ generationId: string; responseId: string; feedbackType: string }> = []
      await page.route("**/api/ai-response-feedback**", async (route) => {
        const request = route.request()
        const identity =
          request.method() === "POST"
            ? request.postDataJSON()
            : Object.fromEntries(new URL(request.url()).searchParams)
        const key = `${identity.generationId}:${identity.responseId}`
        if (request.method() === "POST") {
          writes.push(identity)
          if (identity.feedbackType === "unhelpful" && failNextChange) {
            failNextChange = false
            await route.fulfill({ status: 503, json: { error: "Temporary storage failure" } })
            return
          }
          ratings.set(key, identity.feedbackType)
        }
        await route.fulfill({ json: { feedbackType: ratings.get(key) ?? null } })
      })
      await page.route("**/api/chat", (route) =>
        route.fulfill({
          json: {
            generationId,
            feedbackAvailable: true,
            reply: "Trace one sample through the loop before changing it.",
            provider: "fixture",
          },
        })
      )
      const url = `/?view=workspace&handoff=1&ratings=1&theme=${theme}`
      await page.goto(url)
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page.getByRole("tab", { name: "Sparra coding partner" }).click()
      await page.getByRole("textbox", { name: "Message Sparra" }).fill("Help me inspect the loop")
      await page.getByRole("button", { name: "Send message to Sparra" }).click()
      const partner = page.getByRole("group", { name: "Rate partner response" })
      await expect(partner).toBeVisible()
      await expect(partner.getByRole("button", { name: "Helpful", exact: true })).toBeEnabled()
      await partner.getByRole("button", { name: "Helpful", exact: true }).press("Enter")
      await expect(partner.getByRole("button", { name: "Helpful", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      expect(writes[0]).toEqual({ generationId, responseId: generationId, feedbackType: "helpful" })
      await partner.getByRole("button", { name: "Not helpful" }).click()
      await expect(partner.getByRole("alert")).toContainText("Couldn’t save")
      await expect(partner.getByRole("button", { name: "Helpful", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await partner.getByRole("button", { name: "Not helpful" }).click()
      await expect(partner.getByRole("button", { name: "Not helpful" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await page.reload()
      if (width < 1024)
        await page.getByRole("button", { name: "Show problem", exact: true }).click()
      await page.getByRole("tab", { name: "Sparra coding partner" }).click()
      await expect(partner.getByRole("button", { name: "Not helpful" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await page.screenshot({ path: testInfo.outputPath(`partner-ratings-${theme}-${width}.png`) })
      await page.getByRole("tab", { name: "Problem", exact: true }).click()
      const hint = page.getByRole("group", { name: "Rate hint" })
      await hint.getByRole("button", { name: "Helpful", exact: true }).click()
      await expect(hint.getByRole("button", { name: "Helpful", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      expect(writes.at(-1)).toEqual({
        generationId: "a136081b-2732-48b4-953b-acf8b2658704",
        responseId: "fixture-hint",
        feedbackType: "helpful",
      })
      expect(ratings.get(`${generationId}:${generationId}`)).toBe("unhelpful")
      expect(errors).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: testInfo.outputPath(`hint-ratings-${theme}-${width}.png`) })
    })
  }
}
