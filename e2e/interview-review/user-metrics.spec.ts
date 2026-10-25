import { expect, test } from "@playwright/test"
import { aggregateMetricSessions } from "../../lib/user-metrics/aggregate"
import { normalizeMetricSession } from "../../lib/user-metrics/normalize"
import { metricsResponse } from "../../lib/user-metrics/response"

function payload(mode = "normal") {
  const now = Date.now()
  const rows = [
    { id: "bug", type: "bugfix", performance_score: mode === "zero" ? 0 : 81, technical_score: 0 },
    { id: "lab", type: "bugfix", is_guided_lab: true, performance_score: 100, mastery_score: 100 },
  ]
    .filter((row) => mode !== "labs-only" || row.id === "lab")
    .map(
      ({ id, ...row }) =>
        normalizeMetricSession(
          id,
          {
            ...row,
            feedback_status: "complete",
            completed_at: new Date(now).toISOString(),
            started_at: new Date(now - 30 * 60_000).toISOString(),
          },
          now
        )!
    )
  return {
    success: true,
    data: {
      ...metricsResponse(aggregateMetricSessions(rows, now), 7, now),
      mastery: null,
      usage: null,
    },
  }
}

for (const width of [390, 1280]) {
  test(`shared canonical scores and separate lab mastery at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    let requests = 0
    await page.route("**/api/user/metrics?*", (route) => {
      requests++
      return route.fulfill({ json: payload() })
    })
    await page.goto("/?view=user-metrics")
    await expect(page.getByText("Recent interview average: 81%")).toBeVisible()
    await expect(page.getByText("Average mastery 100%", { exact: false })).toBeVisible()
    await expect(page.getByText("Guided practice · 1 completed lab")).toBeVisible()
    await expect(page.getByText("Last 7 days", { exact: true })).toBeVisible()
    await expect(page.getByText("Tests Run", { exact: true }).locator("..")).toContainText("—")
    await expect(page.getByText("Last Score", { exact: true }).locator("..")).toContainText("81%")
    expect(requests).toBe(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true })
  })
}
test("zero scores stay zero when switching to technical", async ({ page }) => {
  await page.route("**/api/user/metrics?*", (route) => route.fulfill({ json: payload("zero") }))
  await page.goto("/?view=user-metrics")
  await expect(page.getByText("Last Score", { exact: true }).locator("..")).toContainText("0%")
  await page.getByRole("button", { name: "Switch to Technical Score" }).click()
  await expect(page.getByText("Technical Score", { exact: true })).toBeVisible()
  await expect(page.getByText("Recent interview average: 0%")).toBeVisible()
})
test("lab-only learners see mastery without an invented interview score", async ({ page }) => {
  await page.route("**/api/user/metrics?*", (route) =>
    route.fulfill({ json: payload("labs-only") })
  )
  await page.goto("/?view=user-metrics")
  await expect(page.getByText("Average mastery 100%", { exact: false })).toBeVisible()
  await expect(page.getByText("Recent interview average: —")).toBeVisible()
  await expect(
    page.getByText("Complete an interview to see interview insights.", { exact: false })
  ).toBeVisible()
})
test("API failures show a retry and never masquerade as no practice", async ({ page }) => {
  let fails = true
  await page.route("**/api/user/metrics?*", (route) =>
    fails
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: payload() })
  )
  await page.goto("/?view=user-metrics")
  await expect(page.getByText("Couldn't load your metrics.", { exact: true })).toBeVisible()
  fails = false
  await page.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(page.getByText("Recent interview average: 81%")).toBeVisible()
})
