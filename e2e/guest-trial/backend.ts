import type { Page } from "@playwright/test"
import { GuestSessionUpdateSchema } from "../../lib/validations/api-schemas"

interface Options {
  failCreation?: boolean
  failCheckpoint?: boolean
}

/** Only the guest persistence boundary is simulated; UI, hooks and code execution are real. */
export async function installGuestBackend(page: Page, options: Options = {}) {
  const sessionId = "e2e-guest-session"
  let guestId: string | null = null
  let savedState: Record<string, unknown> | null = null
  const writes: Array<ReturnType<typeof GuestSessionUpdateSchema.parse>> = []
  const acceptedCheckpoints: typeof writes = []

  await page.route(/\/api\/guest-session(?:\?|$)/, async (route) => {
    const request = route.request()
    if (request.method() === "POST") {
      const body: unknown = request.postDataJSON()
      const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
      if (typeof value.guestId !== "string" || !/^guest-[0-9a-f-]{36}$/i.test(value.guestId))
        return route.fulfill({ status: 400, json: { error: "Invalid guest identity" } })
      if (options.failCreation)
        return route.fulfill({ status: 503, json: { error: "Guest persistence unavailable" } })
      guestId = value.guestId
      return route.fulfill({
        json: { sessionId, message: "Session created", expiresAt: "2099-01-01T00:00:00Z" },
      })
    }
    if (request.method() === "GET") {
      const url = new URL(request.url())
      if (
        url.searchParams.get("sessionId") !== sessionId ||
        url.searchParams.get("guestId") !== guestId
      )
        return route.fulfill({ status: 404, json: { error: "Session not found" } })
      return route.fulfill({ json: { session: { id: sessionId, session_state: savedState } } })
    }
    if (request.method() !== "PUT")
      return route.fulfill({ status: 405, json: { error: "Method not allowed" } })
    const parsed = GuestSessionUpdateSchema.safeParse(request.postDataJSON())
    if (!parsed.success)
      return route.fulfill({ status: 400, json: { error: "Invalid guest checkpoint" } })
    const body = parsed.data
    if (!guestId || body.sessionId !== sessionId || body.guestId !== guestId)
      return route.fulfill({ status: 404, json: { error: "Session not found" } })
    writes.push(body)
    if (options.failCheckpoint && body.sessionState?.isPostInterviewDiscussion)
      return route.fulfill({ status: 503, json: { error: "Guest checkpoint unavailable" } })
    if (body.sessionState) {
      savedState = {
        code: body.sessionState.code,
        language: body.sessionState.language,
        elapsed_time: body.sessionState.elapsedTime,
        chat_messages: body.sessionState.chatMessages,
        interviewer_messages: body.sessionState.interviewerMessages,
        test_results: body.sessionState.testResults,
        test_summary: body.sessionState.testSummary,
        is_post_interview_discussion: body.sessionState.isPostInterviewDiscussion,
      }
      acceptedCheckpoints.push(body)
    }
    return route.fulfill({ json: { success: true } })
  })
  return { sessionId, writes, acceptedCheckpoints }
}
