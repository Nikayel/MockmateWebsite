// @vitest-environment jsdom
import { act, renderHook, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  useInterviewProactiveAI,
  type UseInterviewProactiveAIOptions,
} from "../useInterviewProactiveAI"

vi.mock("@/lib/firebase-lazy", () => ({ getCurrentUserToken: vi.fn(async () => "test-token") }))
vi.mock("@/lib/interview", () => ({ extractTopicsFromMessage: () => [] }))

function options(message: string): UseInterviewProactiveAIOptions {
  return {
    currentSessionId: "session-1",
    ownerId: "owner",
    activityRef: { current: Date.now() - 180000 },
    generationRef: { current: 1 },
    chatMessages: [],
    chatInput: "",
    isInterviewStarted: true,
    showFeedback: false,
    showPostInterviewDiscussion: false,
    isLoadingInterviewer: false,
    interviewerMessages: [
      { type: "user", message: "Reading", timestamp: Date.now() - 180000 },
      { type: "ai", message, timestamp: Date.now() - 170000 },
    ],
    interviewerInput: "",
    elapsedTime: 240,
    code: "starter",
    chatWorkspaceContext: [],
    selectedScenario: null,
    targetCompany: null,
    recentNudgeTopics: [],
    userAnsweredTopics: [],
    testResults: [],
    consoleLogs: [],
    experienceLevel: "beginner",
    usageLimit: null,
    user: null,
    setInterviewerMessages: vi.fn(),
    setIsLoadingInterviewer: vi.fn(),
    setRecentNudgeTopics: vi.fn(),
    updateTrackerOnMessage: vi.fn(),
    getInterviewerChatParams: () => ({}),
    getEdgeCasesForInterviewer: () => [],
    getCachedUserProfile: async () => null,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-17T12:00:00Z"))
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ reply: "Need a clarification?" }) }))
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("live Sable silence poll", () => {
  it("does not request or disable input for another question while one is unanswered", async () => {
    const opts = options("What evidence supports your hypothesis?")
    renderHook(() => useInterviewProactiveAI(opts))
    await act(() => vi.advanceTimersByTimeAsync(180000))
    expect(fetch).not.toHaveBeenCalled()
    expect(opts.setIsLoadingInterviewer).not.toHaveBeenCalled()
  })

  it("allows one check-in after a neutral acknowledgment and genuine inactivity", async () => {
    const opts = options("Take your time.")
    renderHook(() => useInterviewProactiveAI(opts))
    await act(() => vi.advanceTimersByTimeAsync(30000))
    expect(fetch).toHaveBeenCalledOnce()
    await act(() => vi.advanceTimersByTimeAsync(180000))
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("does not stack a second nudge even if code activity restarts the inactivity period", async () => {
    const opts = options("Take your time.")
    opts.interviewerMessages.push({ type: "ai", message: "I'm here if you need clarification." })
    renderHook(() => useInterviewProactiveAI(opts))
    await act(() => vi.advanceTimersByTimeAsync(30000))
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(["interviewerInput", "chatInput"] as const)(
    "never interrupts a draft in %s",
    async (field) => {
      const opts = options("Take your time.")
      opts[field] = "I think"
      renderHook(() => useInterviewProactiveAI(opts))
      await act(() => vi.advanceTimersByTimeAsync(30000))
      expect(fetch).not.toHaveBeenCalled()
    }
  )
})
