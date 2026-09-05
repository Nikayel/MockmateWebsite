/**
 * @vitest-environment jsdom
 *
 * The guest completion contract: the score is the thing a sign-in is traded
 * for, so a guest submit must not hand it to the UI, must not stamp it onto
 * analytics events, and must not start the paid AI feedback stream. What it
 * MUST do is stage everything sign-in needs: persist the score server-side
 * (the migrated session keeps it) and stash the fully-built feedback request
 * so the moment the guest authenticates, the normal streaming path can run
 * against their own session without rebuilding anything.
 *
 * The signed-in path is pinned alongside it because the two share one
 * function, and the guest change must not cost users their stream.
 */

import { renderHook, act } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

const trackEvent = vi.fn()
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, params?: Record<string, unknown>) => trackEvent(name, params),
}))

const markFreeTrialUsed = vi.fn()
const saveGuestSessionData = vi.fn()
vi.mock("@/lib/guest-session", () => ({
  markFreeTrialUsed: () => markFreeTrialUsed(),
  saveGuestSessionData: (data: unknown) => saveGuestSessionData(data),
}))

vi.mock("@/lib/firestore-helpers", () => ({
  markSessionEvaluating: vi.fn(() => Promise.resolve()),
  updateInterviewSession: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/interview", () => ({
  analyzeCodeEfficiency: () => ({
    efficiencyScore: 70,
    estimatedTimeComplexity: "O(n)",
    estimatedSpaceComplexity: "O(1)",
  }),
}))

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

import { useInterviewFeedback } from "../useInterviewFeedback"

const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))

function buildOpts(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    isGuestMode: true,
    guestId: "guest-12345678-1234-1234-1234-123456789abc",
    selectedScenario: {
      id: "dsa-two-sum",
      title: "Two Sum",
      type: "dsa",
      difficulty: "easy",
      tags: [],
    },
    code: "function twoSum() { return [0, 1] }",
    selectedLanguage: "javascript",
    elapsedTime: 180,
    chatMessages: [],
    interviewerMessages: [],
    testResults: [{ passed: true }, { passed: true }],
    testSummary: { passed: 2, total: 2, failed: 0, passRate: 100 },
    workspaceContext: [],
    activeWorkspacePath: null,
    consoleLogs: [],
    conversationTracker: {
      approachExplained: false,
      approachType: null,
      timeComplexityMentioned: false,
      spaceComplexityMentioned: false,
      complexityExplanationGiven: false,
      edgeCasesMentioned: false,
      hintsGiven: 0,
      silentNotes: [],
    },
    revealedHints: 0,
    revealedHintIndices: new Set<number>(),
    revealedAIHintIndices: new Set<number>(),
    isFromRoadmap: false,
    activeRoadmap: null,
    currentSessionId: "sess-guest-1",
    showFeedback: false,
    showPostInterviewDiscussion: false,
    streamingFeedback: { startStreaming: vi.fn(), state: {} },
    setScoreBreakdown: vi.fn(),
    setPerformanceScore: vi.fn(),
    setTechnicalScore: vi.fn(),
    setComprehensiveFeedback: vi.fn(),
    setStructuredFeedback: vi.fn(),
    setIsGeneratingFeedback: vi.fn(),
    setShowFeedback: vi.fn(),
    setShowPostInterviewDiscussion: vi.fn(),
    setShowSignupPrompt: vi.fn(),
    buildBugfixEvidencePayload: () => [],
    getBugfixExpectedTouchedFiles: () => [],
    getCurrentInterviewPhase: () => "coding",
    trackSessionCompletion: vi.fn(() => Promise.resolve()),
    markQuestionCompleted: vi.fn(),
    addActualTime: vi.fn(),
    applyFallbackFeedback: vi.fn(() => Promise.resolve()),
    lastFeedbackRequestRef: { current: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("proceedToFinalFeedback for a guest", () => {
  it("withholds the score from the UI and never starts the AI stream", async () => {
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    expect(opts.setPerformanceScore).not.toHaveBeenCalled()
    expect(opts.streamingFeedback.startStreaming).not.toHaveBeenCalled()
    // The feedback screen itself still opens (it hosts the locked panel).
    expect(opts.setShowFeedback).toHaveBeenCalledWith(true)
  })

  it("stages the feedback request so sign-in can stream it without rebuilding", async () => {
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    const staged = opts.lastFeedbackRequestRef.current as Record<string, unknown> | null
    expect(staged).not.toBeNull()
    expect(staged?.sessionId).toBe("sess-guest-1")
    expect(staged?.code).toBe("function twoSum() { return [0, 1] }")
    // No owner yet — the sign-in handler stamps the new uid before streaming.
    expect(staged?.userId).toBeNull()
  })

  it("keeps the score out of analytics and local guest data, but still persists it server-side", async () => {
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    const completedCall = trackEvent.mock.calls.find(([name]) => name === "guest_trial_completed")
    expect(completedCall).toBeTruthy()
    expect(completedCall?.[1]).not.toHaveProperty("score")
    expect(completedCall?.[1]).toMatchObject({ scenarioId: "dsa-two-sum" })

    const savedLocal = saveGuestSessionData.mock.calls[0]?.[0] as {
      feedback?: { score?: number }
    }
    expect(savedLocal?.feedback).toBeTruthy()
    expect(savedLocal?.feedback).not.toHaveProperty("score")

    // The server-side session document keeps the score: migration hands it to
    // the account, and the /sessions page renders it after sign-in.
    const guestPut = fetchMock.mock.calls.find(([url]) => url === "/api/guest-session")
    expect(guestPut).toBeTruthy()
    const body = JSON.parse((guestPut?.[1] as { body: string }).body)
    expect(body.performanceScore).toBe(100)
  })

  it("retries a failed completion PUT once and reports the loss", async () => {
    // Since the score lock, this PUT is the score's ONLY copy (localStorage
    // deliberately stores none). A silent 429 here means the migrated
    // account's session arrives empty, so the write gets one retry and a
    // failure event the funnel can see.
    const rejected = () => Promise.resolve({ ok: false, status: 429, json: async () => ({}) })
    fetchMock.mockImplementationOnce(rejected).mockImplementationOnce(rejected)
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    const putCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/guest-session")
    expect(putCalls).toHaveLength(2)
    const failure = trackEvent.mock.calls.find(([name]) => name === "guest_score_put_failed")
    expect(failure).toBeTruthy()
    expect(failure?.[1]).toMatchObject({ status: 429 })
  })

  it("treats an already-completed 409 as saved, not as a loss", async () => {
    // The server refuses duplicate completion writes with 409. That means
    // the score IS saved — retrying is pointless and a failure event would
    // be a false alarm in the funnel.
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 409, json: async () => ({}) })
    )
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    const putCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/guest-session")
    expect(putCalls).toHaveLength(1)
    expect(trackEvent.mock.calls.find(([name]) => name === "guest_score_put_failed")).toBeFalsy()
  })

  it("still schedules the signup prompt", async () => {
    vi.useFakeTimers()
    const opts = buildOpts()
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(opts.setShowSignupPrompt).toHaveBeenCalledWith(true)
  })
})

describe("guest post-submit pause", () => {
  it("does not finalize or calculate a score before the guest signs in", async () => {
    const opts = buildOpts({ showPostInterviewDiscussion: true, showFeedback: false })
    renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {})

    expect(opts.setShowFeedback).not.toHaveBeenCalled()
    expect(opts.lastFeedbackRequestRef.current).toBeNull()
    expect(markFreeTrialUsed).not.toHaveBeenCalled()
    const guestPut = fetchMock.mock.calls.find(([url]) => url === "/api/guest-session")
    expect(guestPut).toBeFalsy()
  })

  it("also waits for the explicit wrap-up action from signed-in users", async () => {
    const opts = buildOpts({
      user: { id: "user-1" },
      isGuestMode: false,
      guestId: null,
      showPostInterviewDiscussion: true,
      showFeedback: false,
    })
    renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {})

    expect(opts.setShowFeedback).not.toHaveBeenCalled()
    expect(opts.streamingFeedback.startStreaming).not.toHaveBeenCalled()
  })
})

describe("proceedToFinalFeedback for a signed-in user", () => {
  it("still streams feedback and sets the score", async () => {
    const opts = buildOpts({
      user: { id: "user-1" },
      isGuestMode: false,
      guestId: null,
      currentSessionId: "sess-user-1",
    })
    const { result } = renderHook(() => useInterviewFeedback(opts as never))

    await act(async () => {
      await result.current.proceedToFinalFeedback()
    })

    expect(opts.streamingFeedback.startStreaming).toHaveBeenCalledTimes(1)
    const request = (opts.streamingFeedback.startStreaming as ReturnType<typeof vi.fn>).mock
      .calls[0][0]
    expect(request.userId).toBe("user-1")
    expect(opts.setPerformanceScore).toHaveBeenCalledWith(100)
  })
})
