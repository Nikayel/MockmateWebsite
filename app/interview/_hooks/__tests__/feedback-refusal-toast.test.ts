// @vitest-environment jsdom
/**
 * The toast that fires when post-interview feedback does not arrive.
 *
 * This is the ONLY place a feedback failure reaches the screen, and it used to
 * say "Feedback generation failed / Applying automated fallback scoring."
 * whatever had happened. So even once the hook below it started reading the
 * server's 429 and 503 bodies, a rate limit, a budget block, and a platform-wide
 * capacity pause still looked identical to a crash to the person who had just
 * spent 20 to 45 minutes on an interview.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: toastMocks }))
vi.mock("@/lib/firebase-lazy", () => ({ getCurrentUserToken: vi.fn(async () => "token") }))
vi.mock("@/lib/interview/fallback-feedback", () => ({
  computeFallbackScores: () => ({ scoreBreakdown: {}, performanceScore: 50 }),
}))

import { useFeedbackStreaming } from "../useFeedbackStreaming"
import type { FeedbackRefusal, StreamingFeedbackState } from "@/lib/hooks/use-streaming-feedback"

const GENERIC_ERROR = "Something went wrong generating feedback. Please try again."

function failedState(refusal: FeedbackRefusal | null): StreamingFeedbackState {
  return {
    isConnected: false,
    isComplete: false,
    isPersisted: false,
    phase: "error",
    phaseMessage: "",
    instantScores: null,
    refinedScores: null,
    flags: null,
    feedback: null,
    masteryScore: null,
    technicalScore: null,
    error: refusal?.message ?? GENERIC_ERROR,
    refusal,
  }
}

function renderWith(state: StreamingFeedbackState) {
  return renderHook(() =>
    useFeedbackStreaming({
      currentSessionId: null,
      streamingFeedback: { state } as never,
      setScoreBreakdown: vi.fn(),
      setPerformanceScore: vi.fn(),
      setTechnicalScore: vi.fn(),
      setComprehensiveFeedback: vi.fn(),
      setStructuredFeedback: vi.fn(),
      setIsGeneratingFeedback: vi.fn(),
    })
  )
}

describe("post-interview failure toast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a named refusal in the user's own words", () => {
    renderWith(
      failedState({
        code: "GLOBAL_CAPACITY_LIMIT",
        title: "We're at capacity right now",
        message:
          "AI feedback is paused for everyone right now because the platform hit its daily usage limit. Nothing is wrong with your session and it is saved. Please try again in an hour.",
      })
    )

    expect(toastMocks.error).toHaveBeenCalledTimes(1)
    const [title, options] = toastMocks.error.mock.calls[0] as [string, { description: string }]
    expect(title).toBe("We're at capacity right now")
    expect(options.description).toContain("saved")
    expect(options.description).not.toBe("Applying automated fallback scoring.")
  })

  it("keeps a daily budget block distinguishable from a capacity pause", () => {
    renderWith(
      failedState({
        code: "DAILY_BUDGET_EXCEEDED",
        title: "You've used today's AI allowance",
        message:
          "You've used today's AI allowance ($0.25). It resets at midnight UTC, and your monthly allowance is unaffected.",
      })
    )

    const [title, options] = toastMocks.error.mock.calls[0] as [string, { description: string }]
    expect(title).toBe("You've used today's AI allowance")
    expect(options.description).toContain("midnight UTC")
  })

  it("still says the generic thing for an unnamed failure", () => {
    // A genuine crash is genuinely unexplained, and the fallback-scoring line is
    // the useful part of that message. Nothing about it should change.
    renderWith(failedState(null))

    const [title, options] = toastMocks.error.mock.calls[0] as [string, { description: string }]
    expect(title).toBe("Feedback generation failed")
    expect(options.description).toBe("Applying automated fallback scoring.")
  })
})
