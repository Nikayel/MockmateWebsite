/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fixturePlan } from "@/lib/practice-plan/__tests__/fixtures"
const mocks = vi.hoisted(() => ({
  user: { uid: "owner" } as { uid: string } | null,
  get: vi.fn(),
  send: vi.fn(),
  track: vi.fn(),
}))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ firebaseUser: mocks.user }) }))
vi.mock("../useAuthedFetch", () => ({
  useAuthedFetch: () => ({ get: mocks.get, send: mocks.send }),
}))
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))
import { usePracticePlan } from "../usePracticePlan"
const response = (data: unknown, status = 200) => ({
  ok: status === 200,
  status,
  needsReauth: status === 401,
  data,
})
const request = { sourceSessionId: "source", scenarioId: "next", reminderAt: null, timezone: "UTC" }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = { uid: "owner" }
  mocks.get.mockResolvedValue(response({ status: "empty" }))
  mocks.send.mockResolvedValue(response({ status: "ready", plan: fixturePlan }))
})
afterEach(() => vi.useRealTimers())
describe("durable save client", () => {
  it("does nothing when the user never clicks", async () => {
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.track).not.toHaveBeenCalled()
  })
  it("does not claim success while saving and blocks a double click", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void
    mocks.send.mockReturnValue(
      new Promise((done) => {
        resolve = done
      })
    )
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    let saved!: Promise<boolean>
    act(() => {
      saved = result.current.save(request)
      void result.current.save(request)
    })
    expect(result.current.writing).toBe(true)
    expect(result.current.result.status).toBe("empty")
    expect(mocks.send).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve(response({ status: "ready", plan: fixturePlan }))
      await saved
    })
    expect(result.current.result.status).toBe("ready")
    expect(result.current.writing).toBe(false)
  })
  it("preserves the previous state on network and malformed-response failures", async () => {
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    mocks.send.mockRejectedValueOnce(new Error("offline"))
    await act(async () => {
      expect(await result.current.save(request)).toBe(false)
    })
    expect(result.current.result.status).toBe("empty")
    expect(result.current.error).toContain("couldn't confirm")
    mocks.send.mockResolvedValueOnce(response({ status: "ready", plan: {} }))
    await act(async () => {
      expect(await result.current.save(request)).toBe(false)
    })
    expect(result.current.result.status).toBe("empty")
  })
  it("explains expired sign-in without marking the task saved", async () => {
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    mocks.send.mockResolvedValueOnce(response({}, 401))
    await act(async () => {
      await result.current.save(request)
    })
    expect(result.current.error).toContain("Sign in again")
    expect(result.current.result.status).toBe("empty")
  })
  it("ignores an old read that arrives after a successful save", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void
    mocks.get.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    const { result } = renderHook(usePracticePlan)
    await act(async () => {
      await result.current.save(request)
    })
    await act(async () => {
      resolve(response({ status: "empty" }))
    })
    expect(result.current.result.status).toBe("ready")
  })
  it("ignores a write that finishes after signing out", async () => {
    let resolve!: (value: ReturnType<typeof response>) => void
    mocks.send.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    const { result, rerender } = renderHook(usePracticePlan)
    let saved!: Promise<boolean>
    act(() => {
      saved = result.current.save(request)
    })
    mocks.user = null
    rerender()
    await act(async () => {
      resolve(response({ status: "ready", plan: fixturePlan }))
      await saved
    })
    expect(result.current.result.status).toBe("signed_out")
    expect(mocks.track).not.toHaveBeenCalled()
  })
  it("bounds a stalled save and ignores its late success", async () => {
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    vi.useFakeTimers()
    let finish!: (value: ReturnType<typeof response>) => void
    mocks.send.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    let saved!: Promise<boolean>
    act(() => {
      saved = result.current.save(request)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    expect(await saved).toBe(false)
    expect(result.current.writing).toBe(false)
    expect(result.current.error).toContain("couldn't confirm")
    await act(async () => {
      finish(response({ status: "ready", plan: fixturePlan }))
    })
    expect(result.current.result.status).toBe("empty")
    await act(async () => {
      expect(await result.current.save(request)).toBe(true)
    })
  })
  it("shows an actionable server rejection from the authenticated fetch error", async () => {
    const { result } = renderHook(usePracticePlan)
    await waitFor(() => expect(result.current.result.status).toBe("empty"))
    mocks.send.mockResolvedValueOnce({
      ok: false,
      status: 409,
      needsReauth: false,
      error: "Enable reminders in account settings, or save without a reminder.",
    })
    await act(async () => {
      await result.current.save(request)
    })
    expect(result.current.error).toContain("account settings")
  })
})
