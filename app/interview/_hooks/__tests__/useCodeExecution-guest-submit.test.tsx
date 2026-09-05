/**
 * @vitest-environment jsdom
 *
 * What submitCode hands off to after a guest's tests pass.
 *
 * The post-interview discussion is a signed-in feature twice over: its
 * complexity analysis and its /api/chat debrief are both auth-walled (401 for
 * guests), and since the score lock shipped, guests never see the wrap-up
 * view it feeds — GuestFeedbackLock replaces it and useInterviewFeedback
 * auto-finalizes the trial. Kicking the discussion off for a guest therefore
 * spends two doomed requests to build a conversation nobody can see. The
 * submit handoff must still flip showPostInterviewDiscussion (it drives the
 * lock and the auto-finalize effect) but skip the kickoff itself.
 */

import { renderHook, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const executeScenario = vi.fn()
vi.mock("../code-execution-helpers", () => ({
  executeScenario: (...args: unknown[]) => executeScenario(...args),
  applyExecutionApiError: vi.fn(),
  announceRunFailure: vi.fn(),
  classifyFailedRun: () => "user-code",
}))

vi.mock("@/lib/firestore-helpers", () => ({
  saveSessionState: vi.fn(() => Promise.resolve()),
}))

const persistGuestPostSubmitState = vi.fn(() => Promise.resolve())
vi.mock("../../_lib/persist-guest-post-submit", () => ({
  persistGuestPostSubmitState: (...args: unknown[]) => persistGuestPostSubmitState(...args),
}))

vi.mock("@/lib/interview", () => ({
  analyzeCodeEfficiency: () => ({
    efficiencyScore: 70,
    estimatedTimeComplexity: "O(n)",
    estimatedSpaceComplexity: "O(1)",
  }),
}))

vi.mock("@/lib/stores/guided-lab-store", () => ({
  useGuidedLabStore: { getState: () => ({ config: null, scenarioId: null }) },
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

import { useCodeExecution } from "../useCodeExecution"

function buildOpts(overrides: Record<string, unknown> = {}) {
  return {
    selectedScenario: { id: "dsa-two-sum", title: "Two Sum", type: "dsa" },
    code: "function twoSum() { return [0, 1] }",
    selectedLanguage: "javascript",
    workspaceContext: [],
    activeWorkspacePath: null,
    elapsedTime: 120,
    chatMessages: [],
    interviewerMessages: [],
    consoleLogs: [],
    realInterviewMode: false,
    strictTimeLimit: null,
    currentSessionId: "sess-guest-1",
    user: null,
    firebaseUser: null,
    isGuestMode: true,
    guestId: "guest-12345678-1234-1234-1234-123456789abc",
    isFromRoadmap: false,
    activeRoadmap: null,
    setTestResults: vi.fn(),
    setPackRun: vi.fn(),
    setConsoleLogs: vi.fn(),
    setIsRunningTests: vi.fn(),
    setTestSummary: vi.fn(),
    setEfficiencyMetrics: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setShowPostInterviewDiscussion: vi.fn(),
    playSound: vi.fn(),
    updateTrackerOnTestsRun: vi.fn(),
    recordBugfixEvidence: vi.fn(),
    buildBugfixEvidencePayload: () => [],
    syncHintAgentWithTestOutcome: vi.fn(),
    triggerPostInterviewDiscussion: vi.fn(),
    markQuestionEvaluating: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  executeScenario.mockResolvedValue({
    ok: true,
    data: {
      kind: "scenario",
      results: [{ passed: true }, { passed: true }],
      summary: { passed: 2, total: 2, failed: 0, passRate: 100 },
      consoleLogs: [],
    },
  })
})

describe("submitCode handoff for a guest", () => {
  it("saves the recovery point before entering the account-gated post-submit phase", async () => {
    const opts = buildOpts()
    const { result } = renderHook(() => useCodeExecution(opts as never))

    await act(async () => {
      await result.current.submitCode()
    })

    expect(persistGuestPostSubmitState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "sess-guest-1",
        guestId: "guest-12345678-1234-1234-1234-123456789abc",
        testSummary: { passed: 2, total: 2, failed: 0, passRate: 100 },
      })
    )
    expect(opts.setShowPostInterviewDiscussion).toHaveBeenCalledWith(true)
    expect(opts.triggerPostInterviewDiscussion).not.toHaveBeenCalled()
  })

  it("does not expose signup when the recovery point could not be saved", async () => {
    persistGuestPostSubmitState.mockRejectedValueOnce(new Error("offline"))
    const opts = buildOpts()
    const { result } = renderHook(() => useCodeExecution(opts as never))

    await act(async () => {
      await result.current.submitCode()
    })

    expect(opts.setShowPostInterviewDiscussion).not.toHaveBeenCalled()
  })
})

describe("submitCode handoff for a signed-in user", () => {
  it("still kicks off the post-interview discussion", async () => {
    const opts = buildOpts({
      user: { id: "user-1" },
      firebaseUser: { uid: "user-1" },
      isGuestMode: false,
    })
    const { result } = renderHook(() => useCodeExecution(opts as never))

    await act(async () => {
      await result.current.submitCode()
    })

    expect(opts.setShowPostInterviewDiscussion).toHaveBeenCalledWith(true)
    expect(opts.triggerPostInterviewDiscussion).toHaveBeenCalledTimes(1)
  })
})
