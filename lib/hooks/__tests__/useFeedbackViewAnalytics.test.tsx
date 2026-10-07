/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const track = vi.hoisted(() => vi.fn())
vi.mock("@/lib/analytics", () => ({ trackEvent: track }))
import { useFeedbackViewAnalytics } from "../useFeedbackViewAnalytics"

beforeEach(() => vi.clearAllMocks())

describe("feedback view analytics", () => {
  it("reports a rendered report once despite rerenders", () => {
    const { rerender } = renderHook(() =>
      useFeedbackViewAnalytics({
        sessionId: "completed-session",
        feedbackReady: true,
        surface: "interview",
        problemType: "dsa",
        language: "python",
      })
    )
    rerender()
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith("feedback_viewed", {
      session_id: "completed-session",
      feedback_surface: "interview",
      scenario_type: "dsa",
      language: "python",
    })
  })

  it("waits for written feedback and a session identifier", () => {
    const { rerender } = renderHook(
      ({ sessionId, ready }: { sessionId?: string; ready: boolean }) =>
        useFeedbackViewAnalytics({
          sessionId,
          feedbackReady: ready,
          surface: "saved_session",
          language: "javascript",
        }),
      { initialProps: { sessionId: undefined, ready: true } }
    )
    expect(track).not.toHaveBeenCalled()
    rerender({ sessionId: "session", ready: false })
    expect(track).not.toHaveBeenCalled()
    rerender({ sessionId: "session", ready: true })
    expect(track).toHaveBeenCalledTimes(1)
    expect(track.mock.calls[0][1].feedback_surface).toBe("saved_session")
  })

  it("reports another session as another view", () => {
    const { rerender } = renderHook(
      ({ sessionId }) =>
        useFeedbackViewAnalytics({
          sessionId,
          feedbackReady: true,
          surface: "interview",
          language: "python",
        }),
      { initialProps: { sessionId: "first" } }
    )
    rerender({ sessionId: "second" })
    expect(track).toHaveBeenCalledTimes(2)
  })
})
