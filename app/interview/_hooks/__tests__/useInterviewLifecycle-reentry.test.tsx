/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useInterviewLifecycle } from "../useInterviewLifecycle"

afterEach(() => vi.useRealTimers())

describe("session reentry", () => {
  it("resets inactivity when a saved attempt is reopened after a long absence", () => {
    vi.useFakeTimers()
    const onPause = vi.fn()
    const onResume = vi.fn()
    const { result } = renderHook(() =>
      useInterviewLifecycle({ enabled: true, sessionId: "s", onPause, onResume })
    )
    act(() => vi.advanceTimersByTime(11 * 60000))
    expect(result.current.paused).toBe(true)
    act(() => result.current.restoreSession("s"))
    expect(result.current.paused).toBe(false)
    expect(result.current.isPaused()).toBe(false)
    expect(onResume).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(9 * 60000))
    expect(result.current.warning).toBe(true)
    expect(result.current.paused).toBe(false)
    act(() => vi.advanceTimersByTime(60000))
    expect(result.current.paused).toBe(true)
  })

  it("activates a restored attempt only after its identity has rendered", async () => {
    const onSync = vi.fn().mockResolvedValue(true)
    const { result, rerender } = renderHook(
      ({ enabled, sessionId }: { enabled: boolean; sessionId: string | null }) =>
        useInterviewLifecycle({ enabled, sessionId, onPause: vi.fn(), onSync }),
      { initialProps: { enabled: false, sessionId: null } }
    )
    act(() => result.current.restoreSession("saved"))
    expect(onSync).not.toHaveBeenCalled()
    await act(async () => rerender({ enabled: true, sessionId: "saved" }))
    expect(onSync).toHaveBeenCalledTimes(1)
    expect(onSync).toHaveBeenCalledWith("activate", expect.any(String), expect.any(Number), true)
    expect(result.current.paused).toBe(false)
  })

  it("ignores a late activation conflict from before the restore", async () => {
    const activations: Array<(ok: boolean) => void> = []
    const onSync = vi.fn(() => new Promise<boolean>((resolve) => activations.push(resolve)))
    const { result } = renderHook(() =>
      useInterviewLifecycle({ enabled: true, sessionId: "s", onPause: vi.fn(), onSync })
    )
    act(() => result.current.restoreSession("s"))
    await act(async () => activations[1](true))
    await act(async () => activations[0](false))
    expect(result.current.paused).toBe(false)
    expect(result.current.blockedByOtherTab).toBe(false)
  })

  it("does not pause for a short tab switch but catches a sleeping tab after ten minutes", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useInterviewLifecycle({ enabled: true, sessionId: "s", onPause: vi.fn() })
    )
    const started = Date.now()
    act(() => vi.setSystemTime(started + 5000))
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    act(() => window.dispatchEvent(new Event("focus")))
    expect(result.current.paused).toBe(false)
    act(() => vi.setSystemTime(started + 10 * 60000))
    act(() => window.dispatchEvent(new Event("focus")))
    expect(result.current.paused).toBe(true)
  })

  it("stops work and saves on exit without presenting a resume prompt", () => {
    vi.useFakeTimers()
    const onPause = vi.fn()
    const { result, rerender } = renderHook(
      ({ enabled }) => useInterviewLifecycle({ enabled, sessionId: "s", onPause }),
      { initialProps: { enabled: true } }
    )
    act(() => result.current.pauseForExit())
    expect(onPause).toHaveBeenCalledWith(true)
    expect(result.current.isPaused()).toBe(true)
    expect(result.current.paused).toBe(false)
    act(() => vi.advanceTimersByTime(11 * 60000))
    expect(result.current.paused).toBe(false)
    rerender({ enabled: false })
    rerender({ enabled: true })
    expect(result.current.isPaused()).toBe(false)
    expect(result.current.paused).toBe(false)
  })

  it.each(["resume", "pauseForExit"] as const)(
    "ignores delayed heartbeats after %s",
    async (action) => {
      vi.useFakeTimers()
      let finishHeartbeat: (ok: boolean) => void = () => {}
      const onSync = vi.fn((operation: string) =>
        operation === "heartbeat"
          ? new Promise<boolean>((resolve) => {
              finishHeartbeat = resolve
            })
          : Promise.resolve(true)
      )
      const { result } = renderHook(() =>
        useInterviewLifecycle({ enabled: true, sessionId: "s", onPause: vi.fn(), onSync })
      )
      await act(async () => {})
      act(() => vi.advanceTimersByTime(30000))
      await act(async () => result.current[action]())
      await act(async () => finishHeartbeat(false))
      expect(result.current.paused).toBe(false)
      expect(result.current.blockedByOtherTab).toBe(false)
    }
  )
})
