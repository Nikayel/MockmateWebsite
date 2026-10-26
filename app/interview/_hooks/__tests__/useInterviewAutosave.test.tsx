/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useInterviewAutosave } from "../useInterviewAutosave"
import { autosaveOptions as options } from "./autosave-fixture"

const save = vi.hoisted(() => vi.fn())
vi.mock("@/lib/firestore-helpers", () => ({ saveSessionState: save }))

beforeEach(() => {
  const stored = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  })
  save.mockReset().mockResolvedValue(undefined)
})
describe("explicit session checkpoints", () => {
  it("saves fresh code and both conversations immediately, with the original session id", async () => {
    const { result } = renderHook(() => useInterviewAutosave(options()))
    await act(async () => {
      await result.current.saveNow()
    })
    expect(save).toHaveBeenCalledWith(
      "s",
      expect.objectContaining({
        code: "edited",
        elapsedTime: 12,
        chatMessages: [{ type: "user", message: "partner question" }],
        interviewerMessages: [{ type: "user", message: "my hypothesis" }],
      })
    )
    expect(JSON.parse(localStorage.getItem("interview_autosave_u_task")!)).toMatchObject({
      sessionId: "s",
      code: "edited",
    })
  })
  it("reports a failed cloud write while preserving the local recovery copy", async () => {
    save.mockRejectedValueOnce(new Error("offline"))
    const { result } = renderHook(() => useInterviewAutosave(options()))
    let saved: unknown
    await act(async () => {
      saved = await result.current.saveNow()
    })
    expect(saved).toMatchObject({ localSaved: true, cloudSaved: false })
    expect(localStorage.getItem("interview_autosave_u_task")).toContain("partner question")
  })
})
