import { describe, expect, it, vi } from "vitest"
import { recoverLocalCheckpoint } from "./recovery"

const local = {
  sessionId: "attempt",
  timestamp: Date.now(),
  code: "latest edit",
  selectedLanguage: "python",
  elapsedTime: 14,
  chatMessages: [{ type: "user", message: "partner intent", timestamp: 1 }],
  interviewerMessages: [{ type: "ai", message: "question", timestamp: 2 }],
  chatInput: "unsent",
  testRunRevision: "rev",
}
function stored(value: unknown) {
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(value) })
}
describe("local/cloud reconciliation", () => {
  it("does not restore another tab's stale local write over the owning tab", () => {
    stored({ ...local, ownerId: "stale-tab" })
    expect(
      recoverLocalCheckpoint({ ownerId: "active-tab", code: "active work" }, "key", "attempt")
    ).toMatchObject({ code: "active work" })
  })
  it("recovers newer unsynced work with both panels, drafts and the same attempt", () => {
    stored(local)
    expect(
      recoverLocalCheckpoint(
        { code: "older", savedAt: new Date(local.timestamp - 1000).toISOString() },
        "key",
        "attempt"
      )
    ).toMatchObject({
      code: "latest edit",
      chatInput: "unsent",
      language: "python",
      chatMessages: local.chatMessages,
    })
  })
  it("never revives a completed attempt or crosses attempt boundaries", () => {
    stored(local)
    expect(recoverLocalCheckpoint({ completedAt: "done" }, "key", "attempt")).toEqual({
      completedAt: "done",
    })
    expect(recoverLocalCheckpoint(null, "key", "different-attempt")).toBeNull()
  })
  it("ignores expired or malformed local snapshots", () => {
    stored({ ...local, timestamp: Date.now() - 25 * 3600000 })
    expect(recoverLocalCheckpoint(null, "key", "attempt")).toBeNull()
    stored({ sessionId: "attempt", code: 7 })
    expect(recoverLocalCheckpoint(null, "key", "attempt")).toBeNull()
  })
})

it("preserves acknowledgments when restoring a saved attempt", () => {
  const interviewerMessages = [{ type: "user", message: "sure", reaction: "acknowledged" }]
  stored({ ...local, interviewerMessages })
  expect(recoverLocalCheckpoint(null, "key", "attempt")?.interviewerMessages).toEqual(
    interviewerMessages
  )
})
