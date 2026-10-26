/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useInterviewAutosave } from "../useInterviewAutosave"
import { autosaveOptions } from "./autosave-fixture"
import { reloadAfterCheckpoint } from "@/lib/interview/session-lifecycle/reload-checkpoint"
import { recoverLocalCheckpoint } from "@/lib/interview/session-lifecycle/recovery"

const save = vi.hoisted(() => vi.fn())
vi.mock("@/lib/firestore-helpers", () => ({ saveSessionState: save }))
const key = "interview_autosave_u_task"
let stored: Map<string, string>
const read = () => JSON.parse(stored.get(key) ?? "null")
beforeEach(() => {
  vi.useFakeTimers()
  stored = new Map()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
  save.mockReset().mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe("active attempt device recovery", () => {
  it("checkpoints completed replies while excluding partial streaming output", async () => {
    const initial = autosaveOptions()
    const streamed = { type: "ai" as const, message: "partial", isStreaming: true }
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    rerender({ ...initial, interviewerMessages: [...initial.interviewerMessages, streamed] })
    await advance(500)
    expect(read().interviewerMessages).toEqual(initial.interviewerMessages)
    const completed = { ...streamed, message: "complete reply", isStreaming: false }
    rerender({ ...initial, interviewerMessages: [...initial.interviewerMessages, completed] })
    await advance(500)
    expect(read().interviewerMessages.at(-1).message).toBe("complete reply")
    expect(save).not.toHaveBeenCalled()
  })
  it("saves recent edits, both conversations and drafts without a cloud write", async () => {
    const initial = autosaveOptions()
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    rerender({ ...initial, code: "new edit", chatInput: "unsent", strictDeadlineAt: 1700000000000 })
    await advance(500)
    expect(read()).toMatchObject({
      sessionId: "s",
      code: "new edit",
      chatInput: "unsent",
      strictDeadlineAt: 1700000000000,
    })
    expect(read().chatMessages).toEqual(initial.chatMessages)
    expect(read().interviewerMessages).toEqual(initial.interviewerMessages)
    expect(save).not.toHaveBeenCalled()
    expect(recoverLocalCheckpoint(null, key, "s")).toMatchObject({
      code: "new edit",
      strictDeadlineAt: 1700000000000,
    })
  })
  it("bounds the loss window even during continuous typing", async () => {
    const initial = autosaveOptions()
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    for (let i = 0; i < 12; i++) {
      rerender({ ...initial, code: `edit ${i}` })
      await advance(200)
    }
    expect(read().code).toBe("edit 9")
    expect(save).not.toHaveBeenCalled()
  })
  it("keeps the cloud cadence and skips unchanged clock-only writes", async () => {
    const initial = autosaveOptions()
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    await advance(30000)
    expect(save).toHaveBeenCalledTimes(1)
    rerender({ ...initial, elapsedTime: 42 })
    await advance(30000)
    expect(save).toHaveBeenCalledTimes(1)
    expect(read().elapsedTime).toBe(42)
  })
  it("flushes the latest edit before a chunk recovery reload", async () => {
    const initial = autosaveOptions()
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    rerender({ ...initial, code: "not debounced yet" })
    const reload = vi.fn(() => expect(read().code).toBe("not debounced yet"))
    act(() => reloadAfterCheckpoint(reload, vi.fn()))
    expect(read().code).toBe("not debounced yet")
    await advance(0)
    expect(reload).toHaveBeenCalledOnce()
  })
  it("reports quota failure and clears it after a successful device checkpoint", async () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("quota")
      },
    })
    const initial = autosaveOptions()
    const { result, rerender } = renderHook((opts) => useInterviewAutosave(opts), {
      initialProps: initial,
    })
    await advance(500)
    expect(result.current.localSaveFailed).toBe(true)
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => stored.set(key, value),
    })
    rerender({ ...initial, code: "try again" })
    await advance(500)
    expect(result.current.localSaveFailed).toBe(false)
  })
  it("does not checkpoint a closed, completed or other-tab-owned attempt", async () => {
    const initial = { ...autosaveOptions(), canCheckpoint: false }
    const { rerender } = renderHook((opts) => useInterviewAutosave(opts), { initialProps: initial })
    await advance(30000)
    expect(read()).toBeNull()
    rerender({ ...initial, isInterviewStarted: false })
    await advance(1000)
    expect(save).not.toHaveBeenCalled()
  })
})
