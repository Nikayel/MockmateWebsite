/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthedFetchResult } from "@/lib/api/authed-fetch"
import type { NextPracticeResponse } from "@/lib/agents/recommendations/next-practice-types"

const mocks = vi.hoisted(() => ({
  user: { uid: "owner" } as { uid: string } | null,
  get: vi.fn(),
  track: vi.fn(),
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("../useAuthedFetch", () => ({ useAuthedFetch: () => ({ get: mocks.get }) }))
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))
import { useNextPractice } from "../useNextPractice"

const ready: NextPracticeResponse = {
  status: "ready",
  recommendation: {
    scenarioId: "next",
    title: "Next task",
    type: "dsa",
    difficulty: "easy",
    estimatedMinutes: 15,
    href: "/interview?scenario=next&source=next-practice&fromSession=source",
    reason: "Same pattern",
    focus: "Explain your reasoning",
    focusSource: "transfer",
  },
}
const response = (data: NextPracticeResponse): AuthedFetchResult<NextPracticeResponse> => ({
  ok: true,
  status: 200,
  needsReauth: false,
  data,
})
const flush = () =>
  act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = { uid: "owner" }
  mocks.get.mockResolvedValue(response(ready))
})
afterEach(() => {
  vi.useRealTimers()
})

describe("next-practice lifecycle", () => {
  it("rejects malformed API data and external recommendation links", async () => {
    for (const data of [
      { status: "ready" },
      { ...ready, recommendation: { ...ready.recommendation, href: "https://untrusted.example/" } },
    ]) {
      mocks.get.mockResolvedValue({ ok: true, status: 200, needsReauth: false, data })
      const { result, unmount } = renderHook(() => useNextPractice("source"))
      await flush()
      expect(result.current.result.status).toBe("error")
      unmount()
    }
    expect(mocks.track).not.toHaveBeenCalled()
  })
  it("fetches the owned session and reports one impression despite retries", async () => {
    const { result, unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    expect(result.current.result.status).toBe("ready")
    expect(mocks.get).toHaveBeenCalledWith("/api/recommendations/next-practice?sessionId=source", {
      signal: expect.any(AbortSignal),
    })
    act(() => result.current.retry())
    await flush()
    expect(mocks.track).toHaveBeenCalledTimes(1)
    expect(mocks.track).toHaveBeenCalledWith("next_practice_impression", {
      source_session_id: "source",
      scenario_id: "next",
      scenario_type: "dsa",
      focus_source: "transfer",
      recommendation_source: "feedback",
    })
    unmount()
  })

  it("waits through the feedback persistence race and stops polling when ready", async () => {
    vi.useFakeTimers()
    mocks.get.mockResolvedValueOnce(response({ status: "not_ready" }))
    const { result, unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    expect(result.current.result.status).toBe("not_ready")
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(result.current.result.status).toBe("ready")
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(mocks.get).toHaveBeenCalledTimes(2)
    unmount()
  })

  it("bounds polling and cancels the timer when unmounted", async () => {
    vi.useFakeTimers()
    mocks.get.mockResolvedValue(response({ status: "not_ready" }))
    const { unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(mocks.get).toHaveBeenCalledTimes(6)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("aborts stale requests and never exposes the previous user's response", async () => {
    let resolveOld!: (value: AuthedFetchResult<NextPracticeResponse>) => void
    mocks.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        })
    )
    const { result, rerender, unmount } = renderHook(({ id }) => useNextPractice(id), {
      initialProps: { id: "old" },
    })
    const oldSignal = mocks.get.mock.calls[0][1].signal as AbortSignal
    mocks.user = { uid: "other" }
    mocks.get.mockResolvedValue(response({ status: "no_match" }))
    rerender({ id: "new" })
    await flush()
    expect(oldSignal.aborted).toBe(true)
    await act(async () => resolveOld(response(ready)))
    expect(result.current.result.status).toBe("no_match")
    expect(mocks.track).not.toHaveBeenCalled()
    unmount()
  })

  it.each([
    [404, false, "not_found"],
    [401, true, "reauth_required"],
    [503, false, "error"],
  ] as const)("maps HTTP %i to %s", async (status, needsReauth, expected) => {
    mocks.get.mockResolvedValue({ ok: false, status, needsReauth })
    const { result, unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    expect(result.current.result.status).toBe(expected)
    unmount()
  })

  it("does not fetch for signed-out users and hides prior results on logout", async () => {
    const { result, rerender, unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    mocks.user = null
    rerender()
    expect(result.current.result.status).toBe("signed_out")
    expect(mocks.get).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("contains unexpected fetch rejections and retries successfully", async () => {
    mocks.get.mockRejectedValueOnce(new Error("network unavailable"))
    const { result, unmount } = renderHook(() => useNextPractice("source"))
    await flush()
    expect(result.current.result.status).toBe("error")
    act(() => result.current.retry())
    await flush()
    expect(result.current.result.status).toBe("ready")
    unmount()
  })
})
