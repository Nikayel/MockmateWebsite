import { expect, test } from "@playwright/test"

// Isolated fixture, not the live Firebase/AI backend. See playwright.recommendations.config.ts.
test.describe("post-feedback recommendation", () => {
  test("opens the exact catalog task and language without consuming a start", async ({ page }) => {
    const browserErrors: string[] = []
    page.on("pageerror", (error) => browserErrors.push(error.message))
    await page.goto("/")
    const card = page.getByRole("region", { name: "Your next practice" })
    const link = card.getByRole("link", { name: /open practice/i })
    await expect(link).toBeVisible()
    const title = await card.getByRole("heading", { level: 3 }).textContent()
    const href = await link.getAttribute("href")
    const destination = new URL(href!, "http://127.0.0.1:3101")
    expect(destination.searchParams.get("language")).toBe("python")
    expect(destination.searchParams.get("fromSession")).toBe("source")
    expect(destination.searchParams.has("practice")).toBe(false)
    await link.click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title!)
    await expect(page.getByText("Selected language: python")).toBeVisible()
    await expect(page.getByText(/has not started a session/)).toBeVisible()
    const events = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("recommendation-fixture-events") ?? "[]")
    )
    expect(events.map((entry: { event: string }) => entry.event)).toEqual([
      "next_practice_impression",
      "next_practice_click",
    ])
    expect(browserErrors).toEqual([])
  })

  test("recovers automatically while feedback is being saved", async ({ page }) => {
    await page.goto("/?state=saving")
    await expect(
      page.getByRole("region", { name: "Your next practice" }).getByRole("status")
    ).toHaveText(/feedback is still being saved/i)
    await expect(page.getByRole("link", { name: /open practice/i })).toBeVisible()
  })

  test("fits a narrow screen in both themes and keeps error recovery accessible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?theme=${theme}`)
      await expect(page.getByRole("link", { name: /open practice/i })).toBeVisible()
      const action = page.getByRole("link", { name: /open practice/i })
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
    }
    await page.goto("/?state=error")
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible()
    await page.getByRole("button", { name: "Try again" }).focus()
    await expect(page.getByRole("button", { name: "Try again" })).toBeFocused()
    expect(
      (await page.getByRole("button", { name: "Try again" }).boundingBox())!.height
    ).toBeGreaterThanOrEqual(44)
  })

  test("keeps long feedback readable with larger text and keyboard disclosure", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 812, height: 375 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto("/?theme=light&state=long")
      const card = page.getByRole("region", { name: "Your next practice" })
      await expect(card.getByRole("link", { name: /open practice/i })).toBeVisible()
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "24px"
      })
      const disclosure = card.locator("summary")
      await disclosure.focus()
      await expect(disclosure).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(card.locator("details")).toHaveAttribute("open", "")
      await expect(card.locator("blockquote")).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
      await expect(card.getByRole("link", { name: /open practice/i })).toBeVisible()
    }
  })
})
