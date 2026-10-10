/** @vitest-environment jsdom */
import React from "react"
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UseInterviewSessionStartOptions } from "../useInterviewSessionStart"
import { scenarios } from "@/lib/scenarios"
import { selectNextPractice } from "@/lib/agents/recommendations/next-practice"
import { getNextPracticeEntry } from "@/lib/interview/next-practice-entry"
import { NextPracticeCard } from "@/components/practice/NextPracticeCard"
import { GET } from "@/app/api/recommendations/next-practice/route"
import { useInterviewMetrics } from "../useInterviewMetrics"

vi.unmock("next/server")

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  record: vi.fn(),
  track: vi.fn(),
  start: vi.fn(),
  error: vi.fn(),
  get: vi.fn(),
  advice: vi.fn(),
  complete: vi.fn(),
  user: { uid: "owner" },
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("@/lib/hooks/useAuthedFetch", () => ({ useAuthedFetch: () => ({ get: mocks.get }) }))
vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: async () => ({ authenticated: true, userId: "owner" }),
}))
vi.mock("@/lib/rate-limiting", () => ({ enforceRateLimitPolicy: async () => null }))
// The real service/database boundary is covered by next-practice.integration.test.ts.
vi.mock("@/lib/agents/recommendations/next-practice.server", () => ({
  getNextPractice: mocks.advice,
}))
vi.mock("@/lib/firestore-helpers", () => ({
  createInterviewSession: mocks.create,
  recordSessionStart: mocks.record,
}))
vi.mock("@/lib/analytics", () => ({
  trackEvent: mocks.track,
  trackSessionStart: mocks.start,
  trackSessionComplete: mocks.complete,
}))
vi.mock("@/lib/metrics/funnel-client", () => ({ reportFunnelEvent: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: mocks.error } }))
import { useInterviewSessionStart } from "../useInterviewSessionStart"

const source = scenarios.find((scenario) => scenario.id === "dsa-two-sum")!
const next = selectNextPractice(
  {
    id: "source",
    user_id: "owner",
    started_at: "today",
    scenario_id: source.id,
    type: source.type,
    difficulty: source.difficulty,
    topic: source.title,
    language: "python",
  },
  scenarios
)!
const target = scenarios.find((scenario) => scenario.id === next.scenarioId)!

function options(overrides: Partial<UseInterviewSessionStartOptions> = {}) {
  return {
    router: { push: vi.fn(), replace: vi.fn() },
    user: { id: "owner", email: "owner@example.com" },
    firebaseUser: { uid: "owner", getIdToken: vi.fn(async () => "test-token") },
    isGuestMode: false,
    guestId: null,
    usageLimit: { allowed: false, used: 8, limit: 8 },
    refreshUsageLimit: vi.fn(async () => {}),
    nextPracticeEntry: getNextPracticeEntry(new URL(next.href, "https://example.com").searchParams),
    selectedScenario: target,
    targetCompany: "freeball",
    activeRoadmap: null,
    selectedLanguage: "python",
    setSelectedScenario: vi.fn(),
    setShowOptimalApproach: vi.fn(),
    setTargetCompany: vi.fn(),
    setLockedCompanyForPicker: vi.fn(),
    setShowCompanyPicker: vi.fn(),
    setCurrentSessionId: vi.fn(),
    setIsInterviewStarted: vi.fn(),
    setShowScenarioBrowser: vi.fn(),
    setStartTime: vi.fn(),
    setTestResults: vi.fn(),
    setTestSummary: vi.fn(),
    setEfficiencyMetrics: vi.fn(),
    setElapsedTime: vi.fn(),
    setRevealedHints: vi.fn(),
    setRevealedHintIndices: vi.fn(),
    setRevealedAIHintIndices: vi.fn(),
    setHintFeedback: vi.fn(),
    setWorkspaceContext: vi.fn(),
    setActiveWorkspacePath: vi.fn(),
    setComprehensiveFeedback: vi.fn(),
    setPerformanceScore: vi.fn(),
    setTechnicalScore: vi.fn(),
    setScoreBreakdown: vi.fn(),
    setSelectedLanguage: vi.fn(),
    setCode: vi.fn(),
    setStarterCode: vi.fn(),
    setBugfixEvidenceEvents: vi.fn(),
    setProtectedElements: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setRecentNudgeTopics: vi.fn(),
    setChatMessages: vi.fn(),
    hintAgent: { resetHints: vi.fn() },
    resetBugfixSessionState: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue("destination-session")
  mocks.record.mockResolvedValue({ success: true, freeRetry: true })
  mocks.advice.mockResolvedValue({ status: "ready", recommendation: next })
  mocks.get.mockImplementation(async (url: string) => {
    const response = await GET(new NextRequest(new URL(url, "https://example.com")))
    return {
      ok: response.ok,
      status: response.status,
      needsReauth: false,
      data: await response.json(),
    }
  })
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true }))
  )
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("recommended task start", () => {
  it("connects the real API/card/entry/start/completion contracts without spending on open", async () => {
    const card = render(<NextPracticeCard sessionId="source" />)
    const link = await screen.findByRole("link", { name: /open practice/i })
    expect(mocks.advice).toHaveBeenCalledWith("owner", "source")
    expect(mocks.record).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    // Keep navigation inside this test; parse the same href the browser follows.
    link.addEventListener("click", (event) => event.preventDefault(), { once: true })
    fireEvent.click(link)
    const entry = getNextPracticeEntry(
      new URL(link.getAttribute("href")!, "https://example.com").searchParams
    )
    const selected = scenarios.find((scenario) => scenario.id === entry?.scenarioId)!
    const opts = options({ selectedScenario: selected, nextPracticeEntry: entry })
    const start = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    expect(mocks.record).not.toHaveBeenCalled()
    await act(() => start.result.current.startInterview())
    expect(mocks.record).toHaveBeenCalledWith("owner", selected.id)
    const started = mocks.track.mock.calls.find(([event]) => event === "next_practice_started")?.[1]
    expect(started).toMatchObject({
      source_session_id: "source",
      scenario_id: selected.id,
      sessionId: "destination-session",
    })
    const metrics = renderHook(() =>
      useInterviewMetrics({
        firebaseUser:
          opts.firebaseUser as unknown as UseInterviewSessionStartOptions["firebaseUser"],
        selectedScenarioId: selected.id,
        userId: "owner",
        guestId: null,
        currentSessionId: "destination-session",
        ragHints: [],
      })
    )
    await act(() =>
      metrics.result.current.trackSessionCompletion({
        sessionId: "destination-session",
        finalCode: "private submitted code",
        language: "python",
        testsPassed: 2,
        testsTotal: 2,
        efficiencyScore: 90,
      })
    )
    expect(mocks.complete).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: started.sessionId, scenarioId: selected.id })
    )
    await waitFor(() =>
      expect(mocks.track.mock.calls.map(([event]) => event)).toEqual([
        "next_practice_impression",
        "next_practice_click",
        "next_practice_started",
      ])
    )
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("private submitted code")
    card.unmount()
    start.unmount()
    metrics.unmount()
  })

  it("does no work until explicit Start, then attributes the actual session after quota succeeds", async () => {
    const opts = options()
    const { result, unmount } = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
    await act(() => result.current.startInterview())
    expect(mocks.record).toHaveBeenCalledWith("owner", target.id)
    expect(mocks.track).toHaveBeenCalledWith("next_practice_started", {
      source_session_id: "source",
      scenario_id: target.id,
      scenario_type: target.type,
      session_id: "destination-session",
      sessionId: "destination-session",
      recommendation_source: "feedback",
      return_source: "feedback",
    })
    expect(opts.setIsInterviewStarted).toHaveBeenCalledWith(true)
    expect(opts.setCode).toHaveBeenCalledWith(
      target.type === "dsa" ? target.starterCode.python : expect.any(String)
    )
    expect(opts.setComprehensiveFeedback).toHaveBeenCalledWith("")
    expect(opts.setTestResults).toHaveBeenCalledWith([])
    expect(opts.setScoreBreakdown).toHaveBeenCalledWith(null)
    expect(mocks.start.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.record.mock.invocationCallOrder[0]
    )
    unmount()
  })

  it("does not start or attribute a denied quota request", async () => {
    mocks.record.mockRejectedValue(new Error("Session limit exceeded"))
    const opts = options()
    const { result, unmount } = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    await act(() => result.current.startInterview())
    expect(opts.setIsInterviewStarted).not.toHaveBeenCalled()
    expect(opts.setCurrentSessionId).not.toHaveBeenCalled()
    expect(mocks.track).not.toHaveBeenCalled()
    expect(mocks.start).not.toHaveBeenCalled()
    expect(result.current.isStarting).toBe(false)
    unmount()
  })

  it("allows a retry after failure and attributes only the first successful start", async () => {
    mocks.record.mockRejectedValueOnce(new Error("temporary error"))
    const opts = options()
    const { result, unmount } = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    await act(() => result.current.startInterview())
    await act(() => result.current.startInterview())
    await act(() => result.current.startInterview())
    expect(
      mocks.track.mock.calls.filter(([event]) => event === "next_practice_started")
    ).toHaveLength(1)
    unmount()
  })

  it("does not attribute another selected task to this recommendation", async () => {
    const opts = options({
      selectedScenario: source,
      usageLimit: { allowed: true, used: 0, limit: 8 },
    })
    const { result, unmount } = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    await act(() => result.current.startInterview())
    expect(mocks.track).not.toHaveBeenCalled()
    expect(opts.setIsInterviewStarted).toHaveBeenCalledWith(true)
    unmount()
  })

  it("deduplicates concurrent starts and quota writes", async () => {
    const opts = options()
    const { result, unmount } = renderHook(() =>
      useInterviewSessionStart(opts as unknown as UseInterviewSessionStartOptions)
    )
    await act(async () => {
      await Promise.all([result.current.startInterview(), result.current.startInterview()])
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.record).toHaveBeenCalledTimes(1)
    unmount()
  })
})
