/**
 * @vitest-environment jsdom
 *
 * The reopen effect re-runs whenever firebaseUser changes — it is in the dep
 * array on purpose, so a fresh tab can rehydrate a session from the URL. But
 * a guest who signs in from the post-trial prompt IS a firebaseUser change,
 * on a page that already has the submitted session on screen. Without a
 * guard, the effect reloads the session, sees completedAt, toasts "Session
 * already submitted", and router.pushes to /sessions/{id} — yanking the
 * convert off the page in the middle of the migrate-then-stream handoff
 * they signed in for.
 *
 * The guard: when the page says this exact session's terminal state is
 * already displayed, the reopen cases are a no-op. The redirect must keep
 * working for real reopens (new tab, old link), pinned by the second test.
 */

import { renderHook, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }))
vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock("@/lib/stores", () => ({
  useInterviewStore: {
    getState: () => ({ setRealInterviewMode: vi.fn(), setStrictTimeLimit: vi.fn() }),
  },
}))
vi.mock("@/lib/scenarios/index", () => ({
  getScenarioById: vi.fn(async () => ({
    id: "dsa-two-sum",
    title: "Two Sum",
    type: "dsa",
    difficulty: "easy",
    tags: [],
  })),
}))
const getSessionState = vi.fn()
vi.mock("@/lib/firestore-helpers", () => ({
  getSessionState: (id: string) => getSessionState(id),
  findLatestSubmittedSession: vi.fn(async () => null),
}))
vi.mock("@/lib/bugfix", () => ({
  createBugfixEvidenceEvent: (e: unknown) => e,
}))

import { useSessionReopen } from "../useSessionReopen"

function buildOpts(overrides: Record<string, unknown> = {}) {
  return {
    router: { push: vi.fn() },
    searchParams: new URLSearchParams("session=sess-1&scenario=dsa-two-sum"),
    firebaseUser: { uid: "user-1" },
    authLoading: false,
    initialized: true,
    authCheckComplete: true,
    user: { id: "user-1" },
    selectedLanguage: "javascript",
    consoleLogs: [],
    canStartGuestTrial: () => true,
    enterGuestMode: vi.fn(() => "guest-1"),
    exitGuestMode: vi.fn(),
    refreshUsageLimit: vi.fn(async () => {}),
    startInterview: vi.fn(),
    resetBugfixSessionState: vi.fn(),
    setIsLoading: vi.fn(),
    setSelectedScenario: vi.fn(),
    setShowOptimalApproach: vi.fn(),
    setCurrentSessionId: vi.fn(),
    setShowScenarioBrowser: vi.fn(),
    setIsInterviewStarted: vi.fn(),
    setStartTime: vi.fn(),
    setSelectedLanguage: vi.fn(),
    setWorkspaceContext: vi.fn(),
    setActiveWorkspacePath: vi.fn(),
    setCode: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setChatMessages: vi.fn(),
    setElapsedTime: vi.fn(),
    setTestResults: vi.fn(),
    setTestSummary: vi.fn(),
    setConsoleLogs: vi.fn(),
    setBugfixEvidenceEvents: vi.fn(),
    setShowPostInterviewDiscussion: vi.fn(),
    recordedBugfixEditPathsRef: { current: new Set<string>() },
    isShowingCompletedSession: () => false,
    ...overrides,
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getSessionState.mockResolvedValue({ completedAt: "2026-08-25T12:41:37.000Z" })
})

describe("useSessionReopen when the submitted session is already on screen", () => {
  it("leaves the page alone instead of redirecting the fresh convert away", async () => {
    const opts = buildOpts({ isShowingCompletedSession: () => true })

    renderHook(() => useSessionReopen(opts as never))
    await flush()

    expect(opts.router.push).not.toHaveBeenCalled()
    expect(opts.setSelectedScenario).not.toHaveBeenCalled()
    expect(opts.setIsLoading).toHaveBeenCalledWith(false)
  })

  it("still redirects a genuine reopen of a submitted session to its results", async () => {
    const opts = buildOpts()

    renderHook(() => useSessionReopen(opts as never))
    await flush()

    expect(opts.router.push).toHaveBeenCalledWith("/sessions/sess-1")
  })
})
