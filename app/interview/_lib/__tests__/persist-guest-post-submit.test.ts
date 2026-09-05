import { beforeEach, describe, expect, it, vi } from "vitest"
import { persistGuestPostSubmitState } from "../persist-guest-post-submit"

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
})

const state = {
  sessionId: "session-1",
  guestId: "guest-12345678-1234-1234-1234-123456789abc",
  code: "return 42",
  language: "javascript" as const,
  elapsedTime: 90,
  chatMessages: [{ type: "user" as const, message: "My approach" }],
  interviewerMessages: [{ type: "ai" as const, message: "Welcome" }],
  testResults: [
    { description: "works", passed: true, input: null, expected: 42, actual: 42, error: null },
  ],
  testSummary: { total: 1, passed: 1, failed: 0, passRate: 100 },
  workspaceContext: [],
  activeWorkspacePath: null,
  consoleLogs: [],
  bugfixEvidenceEvents: [],
  realInterviewMode: false,
  strictTimeLimit: null,
}

describe("persistGuestPostSubmitState", () => {
  it("marks the saved recovery point as post-interview without completing the session", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })

    await persistGuestPostSubmitState(state)

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body).toMatchObject({
      sessionId: "session-1",
      guestId: state.guestId,
      sessionState: {
        code: "return 42",
        testSummary: state.testSummary,
        isPostInterviewDiscussion: true,
      },
    })
    expect(body).not.toHaveProperty("performanceScore")
  })

  it("rejects when the recovery point was not accepted", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(persistGuestPostSubmitState(state)).rejects.toThrow(
      "Guest post-submit save failed (500)"
    )
  })
})
