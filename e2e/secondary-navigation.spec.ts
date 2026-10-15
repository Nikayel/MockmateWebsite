import { expect, test } from "@playwright/test"

// Run against a production build: Next disables automatic prefetch in dev.
// No sign-in, interview, allowance, or AI request is needed for this check.
for (const width of [1440, 375]) {
  test(`secondary links navigate without speculative requests at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const secondaryPrefetches: string[] = []
    const secondaryPaths = new Set([
      "/",
      "/careers",
      "/pricing",
      "/learn",
      "/why-codesparring",
      "/legal",
      "/blog",
      "/labs",
      "/referral-terms",
      "/learn/all",
      "/learn/python",
      "/learn/data-engineering",
      "/learn/system-design",
    ])
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname
      if (
        request.headers()["next-router-prefetch"] === "1" &&
        (secondaryPaths.has(path) || path.startsWith("/guides/"))
      ) {
        secondaryPrefetches.push(path)
      }
    })
    // Do not send QA pageviews to production analytics when checking a deployment.
    await page.route("**/ingest/**", (route) => route.abort())
    await page.goto("/")
    const consent = page.getByRole("button", { name: "Necessary Only" })
    if (await consent.isVisible()) await consent.click()
    if (width < 768) {
      await page.getByRole("button", { name: "Open menu" }).click()
      await expect(page.locator("#mobile-navigation")).toBeVisible()
      await page.getByRole("button", { name: "Close menu" }).click()
    }
    const footerPaths = await page
      .locator('footer a[href^="/"]')
      .evaluateAll((links) =>
        links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)
      )
    for (const path of footerPaths) {
      // Primary CTAs elsewhere may legitimately prefetch these destinations.
      if (path !== "/interview" && path !== "/login") secondaryPaths.add(path)
    }
    await page.locator("footer").scrollIntoViewIfNeeded()
    const pricing = page.locator("footer").getByRole("link", { name: "Pricing", exact: true })
    await pricing.hover()
    await page.waitForTimeout(1500)
    expect(secondaryPrefetches).toEqual([])
    await pricing.click()
    await expect(page).toHaveURL(/\/pricing$/)
    await expect(page.getByRole("heading", { name: "Choose Your Plan" })).toBeVisible()
  })
}
