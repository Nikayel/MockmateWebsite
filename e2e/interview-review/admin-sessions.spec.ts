import { expect, test } from "@playwright/test"
import { toSessionDetail } from "../../lib/admin/session-rows"
import { sessionWork } from "../../lib/admin/session-review/work"
import { sessionConversations } from "../../lib/admin/session-review/conversation"

const source = {
  topic: "Cache expiry investigation",
  user_id: "learner",
  type: "bugfix",
  difficulty: "medium",
  created_at: "2026-10-22T12:00:00Z",
  completed_at: "2026-10-22T12:20:00Z",
  feedback_status: "complete",
  final_code: "return expiresAt <= now;",
  language: "typescript",
  tests_passed: 4,
  tests_total: 5,
  session_state: {
    code: "old",
    workspace_context: [{ path: "src/cache.ts", role: "editable", content: "const fixed = true;" }],
  },
}
const detail = toSessionDetail("sess1", source, "learner@example.com")
const messages = [
  { role: "user", content: "I reproduced the exact expiry boundary." },
  { role: "model", content: "What regression case proves the fix?" },
  { role: "ai_partner", content: "<script>window.transcriptExecuted = true</script>" },
]
const inspection = {
  success: true,
  session: detail,
  conversations: sessionConversations(
    { messages, truncated: true, original_message_count: 10 },
    null
  ),
  work: sessionWork(source),
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/admin/**", async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith("/user-profile")) {
      return route.fulfill({
        json: {
          success: true,
          user: {
            id: "learner",
            email: "learner@example.com",
            fullName: "Learner",
            subscriptionTier: "free",
            createdAt: "2026-10-01",
          },
          recentSessions: [
            {
              id: "sess1",
              inspectionSessionId: "sess1",
              problemId: "cache",
              problemTitle: detail.scenarioTitle,
              timestamp: "2026-10-22",
              performance: 80,
            },
            {
              id: "summary1",
              inspectionSessionId: null,
              problemId: "legacy",
              problemTitle: "Legacy summary",
              timestamp: "2026-08-01",
            },
          ],
          enhancedProfile: null,
          interviewReadiness: null,
          learningState: null,
          insights: [],
          misconceptions: null,
        },
      })
    }
    if (url.pathname.endsWith("/sessions")) {
      return route.fulfill({
        json: url.searchParams.has("sessionId")
          ? inspection
          : {
              success: true,
              canInspect: true,
              sessions: [detail],
              pagination: { returned: 1, total: 1, hasMore: false, nextCursor: null },
              scan: { capped: false },
            },
      })
    }
    return route.fulfill({ json: { success: true, learners: [], totals: {} } })
  })
})

test("Sessions inspector renders archived conversation, saved code and metadata on mobile", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/?view=admin-sessions")
  await page.getByRole("button", { name: "Inspect", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("I reproduced the exact expiry boundary.")).toBeVisible()
  await expect(dialog.getByText("This transcript is shortened.", { exact: false })).toBeVisible()
  await expect(
    dialog.getByText("<script>window.transcriptExecuted = true</script>", { exact: true })
  ).toBeVisible()
  await dialog.screenshot({ path: testInfo.outputPath("admin-session-mobile.png") })
  await dialog.getByRole("tab", { name: "Saved work", exact: true }).click()
  await expect(dialog.getByText("4 / 5 passed")).toBeVisible()
  await dialog.getByText("Final saved code", { exact: true }).click()
  await expect(dialog.getByText(source.final_code, { exact: true })).toBeVisible()
  await dialog.getByText("src/cache.ts", { exact: true }).click()
  await expect(dialog.getByText("const fixed = true;", { exact: true })).toBeVisible()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await page.evaluate(() => "transcriptExecuted" in window)).toBe(false)
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Inspect", exact: true })).toBeFocused()
})

test("Users recent sessions open the same inspector and return to the profile", async ({
  page,
}) => {
  await page.goto("/?view=admin-sessions")
  await page.getByRole("button", { name: "Open learner profile" }).click()
  await page.getByRole("button", { name: "Recent Sessions" }).click()
  await expect(page.getByRole("button", { name: /Legacy summary/ })).toBeDisabled()
  await page.getByRole("button", { name: /Cache expiry investigation.*View conversation/ }).click()
  await expect(
    page.getByRole("dialog").getByText("I reproduced the exact expiry boundary.")
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("heading", { name: "User Profile" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Cache expiry investigation.*View conversation/ })
  ).toBeFocused()
})

test("failed inspection can retry and an unavailable transcript has an explicit empty state", async ({
  page,
}) => {
  let calls = 0
  await page.route("**/api/admin/sessions?sessionId=*", async (route) => {
    calls += 1
    await route.fulfill(
      calls === 1
        ? { status: 500, json: { success: false, error: "Failed to load session" } }
        : { json: { ...inspection, conversations: [] } }
    )
  })
  await page.goto("/?view=admin-sessions")
  await page.getByRole("button", { name: "Inspect", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Failed to load session")
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(
    page
      .getByRole("dialog")
      .getByText("No transcript or saved conversation is available for this session.")
  ).toBeVisible()
})

test("closing a loading inspection cannot overwrite the next inspection", async ({ page }) => {
  let calls = 0
  await page.route("**/api/admin/sessions?sessionId=*", async (route) => {
    calls += 1
    if (calls === 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.fulfill({
        json: { ...inspection, session: { ...detail, scenarioTitle: "Stale response" } },
      })
    } else await route.fulfill({ json: inspection })
  })
  await page.goto("/?view=admin-sessions")
  await page.getByRole("button", { name: "Inspect", exact: true }).click()
  await expect(page.getByRole("status")).toContainText("Loading session")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Inspect", exact: true }).click()
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: detail.scenarioTitle })
  ).toBeVisible()
  await page.waitForTimeout(1100)
  await expect(page.getByRole("dialog")).not.toContainText("Stale response")
})
