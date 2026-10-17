/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useInterviewLifecycle } from "../useInterviewLifecycle"

afterEach(() => vi.useRealTimers())
describe("interview inactivity", () => {
  it("warns at nine minutes, pauses at ten, and requires explicit resume", () => {
    vi.useFakeTimers()
    const onPause = vi.fn()
    const { result } = renderHook(() =>
      useInterviewLifecycle({ enabled: true, sessionId: "s", onPause })
    )
    act(() => vi.advanceTimersByTime(9 * 60000))
    expect(result.current.warning).toBe(true)
    act(() => vi.advanceTimersByTime(60000))
    expect(result.current.paused).toBe(true)
    expect(onPause).toHaveBeenCalledTimes(1)
    act(() => window.dispatchEvent(new Event("pointerdown")))
    expect(result.current.paused).toBe(true)
    act(() => result.current.resume())
    expect(result.current.paused).toBe(false)
  })
  it("counts real reading and typing activity, but not renders or AI messages", () => {
    vi.useFakeTimers()
    const onPause = vi.fn()
    const { result, rerender } = renderHook(() =>
      useInterviewLifecycle({ enabled: true, sessionId: "s", onPause })
    )
    act(() => vi.advanceTimersByTime(8 * 60000))
    act(() => window.dispatchEvent(new Event("scroll")))
    act(() => vi.advanceTimersByTime(8 * 60000))
    rerender()
    expect(result.current.paused).toBe(false)
    act(() => vi.advanceTimersByTime(2 * 60000))
    expect(onPause).toHaveBeenCalledTimes(1)
  })
})
