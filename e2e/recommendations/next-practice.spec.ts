import { expect, test } from "@playwright/test"

// Isolated fixture, not the live Firebase/AI backend. See playwright.recommendations.config.ts.
test.describe("post-feedback recommendation", () => {
  test("shows feedback before the next task and keeps optional details collapsed", async ({
    page,
  }) => {
    await page.goto("/")
    const card = page.getByRole("region", { name: "Your next practice" })
    await expect(card.getByRole("button", { name: "Save for later" })).toBeEnabled()
    expect((await page.getByText("To Improve", { exact: true }).boundingBox())!.y).toBeLessThan(
      (await card.boundingBox())!.y
    )
    await expect(card.getByRole("button")).toHaveCount(1)
    await expect(card.getByText(/Opening uses no sessions/)).not.toBeVisible()
    await card.locator("summary").click()
    await expect(card.getByText(/Opening uses no sessions/)).toBeVisible()
  })
  test("opens the exact catalog task and language without consuming a start", async ({ page }) => {
    const browserErrors: string[] = []
    page.on("pageerror", (error) => browserErrors.push(error.message))
    await page.goto("/")
    const card = page.getByRole("region", { name: "Your next practice" })
    const link = card.getByRole("link", { name: /open practice/i })
    await expect(link).toBeVisible()
    const title = (await link.getAttribute("aria-label"))!.replace("Open practice: ", "")
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
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 })
    for (const theme of ["light", "dark"]) {
      await page.goto(`/?theme=${theme}`)
      await expect(page.getByRole("link", { name: /open practice/i })).toBeVisible()
      const action = page.getByRole("link", { name: /open practice/i })
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
      const card = page.getByRole("region", { name: "Your next practice" })
      await card.screenshot({ path: testInfo.outputPath(`next-practice-${theme}-mobile.png`) })
      if (await card.getByRole("button", { name: "Save for later" }).isVisible()) {
        await card.getByRole("button", { name: "Save for later" }).click()
      }
      await card.getByRole("button", { name: "Add reminder" }).click()
      await expect(card.getByLabel("Email me a reminder")).toBeFocused()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true)
      await card.screenshot({ path: testInfo.outputPath(`reminder-${theme}-mobile.png`) })
      await card.getByRole("button", { name: "Cancel", exact: true }).click()
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

test.describe("saved task return journey", () => {
  for (const saved of [false, true]) {
    test(`does not flash an unconfirmed saved-task card (saved: ${saved})`, async ({ page }) => {
      if (saved) {
        await page.goto("/")
        await page.getByRole("button", { name: "Save for later" }).click()
        await expect(page.getByText("Saved to dashboard", { exact: true })).toBeVisible()
      }
      await page.addInitScript(() => {
        new MutationObserver(() => {
          const card = document.querySelector('[aria-label="Saved next practice"]')
          if (card?.textContent?.includes("Loading your saved task")) {
            document.documentElement.setAttribute("data-saved-practice-loading-seen", "true")
          }
        }).observe(document, { childList: true, subtree: true })
      })
      let releaseRead!: () => void
      const pendingRead = new Promise<void>((resolve) => (releaseRead = resolve))
      await page.route("**/api/practice-plan?**", async (route) => {
        await pendingRead
        await route.continue()
      })
      await Promise.all([
        page.waitForRequest((request) => request.url().includes("/api/practice-plan")),
        page.goto("/dashboard"),
      ])
      await expect(page.getByText(/Local verification fixture/)).toBeVisible()
      try {
        await expect(page.getByRole("region", { name: "Saved next practice" })).toHaveCount(0)
      } finally {
        releaseRead()
      }
      if (saved) {
        await expect(page.getByRole("link", { name: "Open saved practice" })).toBeVisible()
      } else {
        await page.waitForResponse((response) => response.url().includes("/api/practice-plan"))
        await expect(page.getByRole("region", { name: "Saved next practice" })).toHaveCount(0)
      }
      expect(await page.locator("html").getAttribute("data-saved-practice-loading-seen")).toBeNull()
    })
  }

  test("ignoring the card performs no writes; saving survives navigation and opens the exact task", async ({
    page,
  }) => {
    const writes: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/practice-plan") && request.method() !== "GET")
        writes.push(request.method())
    })
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Save for later" })).toBeVisible()
    expect(writes).toEqual([])
    const href = await page.getByRole("link", { name: /open practice/i }).getAttribute("href")
    await page.getByRole("button", { name: "Save for later" }).click()
    await expect(page.getByText("Saved to dashboard", { exact: true })).toBeVisible()
    expect(writes).toEqual(["POST"])
    await page.goto("/dashboard")
    const link = page.getByRole("link", { name: "Open saved practice" })
    await expect(link).toHaveAttribute("href", `${href}&return=dashboard`)
    await link.click()
    await expect(page.getByText("Selected language: python")).toBeVisible()
    await expect(page.getByText(/has not started a session/)).toBeVisible()
  })
  test("shows a failed save without blocking practice and lets the user retry", async ({
    page,
  }) => {
    await page.goto("/?state=save_failure")
    await page.getByRole("button", { name: "Save for later" }).click()
    await expect(page.getByRole("alert")).toContainText("couldn't confirm")
    await expect(page.getByRole("link", { name: /open practice/i })).toBeVisible()
    await expect(page.getByText("Saved to dashboard", { exact: true })).not.toBeVisible()
    await page.goto("/")
    await page.getByRole("button", { name: "Save for later" }).click()
    await expect(page.getByText("Saved to dashboard", { exact: true })).toBeVisible()
  })
  test("requires an explicit reminder save and cancellation removes the schedule", async ({
    page,
  }, testInfo) => {
    const writes: unknown[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/practice-plan") && request.method() === "POST")
        writes.push(request.postDataJSON())
    })
    await page.goto("/")
    const card = page.getByRole("region", { name: "Your next practice" })
    await page.getByRole("button", { name: "Save for later" }).click()
    await expect(page.getByText("Saved to dashboard", { exact: true })).toBeVisible()
    expect(writes).toEqual([expect.objectContaining({ reminderAt: null })])
    await page.getByRole("button", { name: "Add reminder" }).click()
    await expect(page.getByLabel("Email me a reminder")).toBeFocused()
    expect(writes).toHaveLength(1)
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(page.getByRole("button", { name: "Add reminder" })).toBeFocused()
    expect(writes).toHaveLength(1)
    await page.getByRole("button", { name: "Add reminder" }).click()
    await page.getByRole("button", { name: "Set reminder" }).click()
    await expect(card.getByRole("status")).toContainText("Reminder set")
    expect(writes[1]).toMatchObject({ reminderAt: expect.any(String) })
    await expect(page.getByRole("form", { name: "Email reminder" })).not.toBeVisible()
    await expect(page.getByRole("button", { name: "Save without reminder" })).not.toBeVisible()
    await expect(page.getByRole("button", { name: "Remind me", exact: true })).not.toBeVisible()
    await expect(page.getByRole("button", { name: "Save for later" })).not.toBeVisible()
    await card.screenshot({ path: testInfo.outputPath("reminder-scheduled-desktop.png") })
    await page.reload()
    await expect(card.getByRole("status")).toContainText("Reminder set")
    await page.getByRole("button", { name: "Edit reminder" }).click()
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()
    expect(writes).toHaveLength(2)
    await page.getByRole("button", { name: "Cancel reminder" }).click()
    await expect(card.getByRole("status")).toContainText("No email reminder")
    expect(writes[2]).toMatchObject({ reminderAt: null })
    await expect(page.getByRole("button", { name: "Add reminder" })).toBeVisible()
  })
  test("preserves the saved task when removal fails and shows honest progress before Pro", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Save for later" }).click()
    await expect(page.getByText("Saved to dashboard", { exact: true })).toBeVisible()
    await page.goto("/dashboard?state=remove_failure")
    await page.getByRole("button", { name: "Remove saved task" }).click()
    await expect(page.getByRole("alert")).toContainText("couldn't confirm")
    await expect(page.getByRole("link", { name: "Open saved practice" })).toBeVisible()
    await expect(page.getByRole("link", { name: /Explore Pro/ })).not.toBeVisible()
    await page.goto("/dashboard?state=complete")
    await expect(page.getByText(/These were different exercises/)).toBeVisible()
    await expect(page.getByRole("link", { name: /Explore Pro/ })).toHaveAttribute(
      "href",
      "/upgrade?source=practice-plan"
    )
    await expect(page.getByRole("link", { name: /Review feedback/ })).toHaveAttribute(
      "href",
      "/sessions/completed"
    )
    await page.getByRole("button", { name: "Remove saved task" }).click()
    await expect(page.getByRole("region", { name: "Saved next practice" })).not.toBeVisible()
  })
})
