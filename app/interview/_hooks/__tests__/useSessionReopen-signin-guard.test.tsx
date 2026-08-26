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
    router: { push: vi.fn(), replace: vi.fn() },
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

/**
 * A guest's URL carries ?session&scenario once their trial starts (the page
 * writes them for everyone), but the guest branch used to return before Case
 * 1 ever ran — so a mid-trial refresh left ScenarioBrowser's resume notice
 * spinning forever while the work sat saved on the server. The guest branch
 * must rehydrate from /api/guest-session itself: the signed-in restore reads
 * Firestore, which denies guests.
 */
describe("useSessionReopen for a guest mid-trial refresh", () => {
  function buildGuestOpts(overrides: Record<string, unknown> = {}) {
    return buildOpts({
      firebaseUser: null,
      user: null,
      canStartGuestTrial: () => true,
      enterGuestMode: vi.fn(() => "guest-1"),
      ...overrides,
    })
  }

  it("rehydrates the trial from the saved server state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          session: {
            session_state: {
              code: "function twoSum() { /* my progress */ }",
              elapsed_time: 300,
              language: "javascript",
              interviewer_messages: [{ type: "ai", message: "Welcome" }],
              chat_messages: [],
            },
          },
        }),
      }))
    )
    const opts = buildGuestOpts()

    renderHook(() => useSessionReopen(opts as never))
    await flush()

    expect(opts.setSelectedScenario).toHaveBeenCalled()
    expect(opts.setCurrentSessionId).toHaveBeenCalledWith("sess-1")
    expect(opts.setShowScenarioBrowser).toHaveBeenCalledWith(false)
    expect(opts.setIsInterviewStarted).toHaveBeenCalledWith(true)
    expect(opts.setCode).toHaveBeenCalledWith("function twoSum() { /* my progress */ }")
    expect(opts.setElapsedTime).toHaveBeenCalledWith(300)
    expect(opts.router.push).not.toHaveBeenCalled()
    expect(opts.setIsLoading).toHaveBeenCalledWith(false)
  })

  it("starts the scenario fresh when nothing was saved yet", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ session: { session_state: null } }),
      }))
    )
    const opts = buildGuestOpts()

    renderHook(() => useSessionReopen(opts as never))
    await flush()

    expect(opts.setIsInterviewStarted).toHaveBeenCalledWith(true)
    const codeArg = (opts.setCode as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(codeArg).toMatch(/function solution/)
  })

  it("rehydrates a session only once, not on every searchParams identity change", async () => {
    // The page writes ?session&scenario into the URL right after a trial
    // starts, and Next syncs that into useSearchParams — which is in this
    // effect's dep array. Without a latch the guest branch re-ran seconds
    // into every trial and repainted the editor with the server's stale
    // autosave (or starter code), wiping whatever was just typed.
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ session: { session_state: null } }),
    }))
    vi.stubGlobal("fetch", fetchSpy)
    const opts = buildGuestOpts()

    const { rerender } = renderHook((props) => useSessionReopen(props as never), {
      initialProps: opts,
    })
    await flush()
    rerender({ ...opts, searchParams: new URLSearchParams("session=sess-1&scenario=dsa-two-sum") })
    await flush()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(opts.setCode).toHaveBeenCalledTimes(1)
  })

  it("drops the params of a submitted trial instead of spinning on them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          session: { completed_at: "2026-08-25T12:00:00.000Z", session_state: null },
        }),
      }))
    )
    const opts = buildGuestOpts()

    renderHook(() => useSessionReopen(opts as never))
    await flush()

    // The URL params drive ScenarioBrowser's resume notice; they must go.
    expect(opts.router.replace).toHaveBeenCalledWith("/interview")
    expect(opts.setIsInterviewStarted).not.toHaveBeenCalled()
    expect(opts.setIsLoading).toHaveBeenCalledWith(false)
  })
})
