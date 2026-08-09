import { describe, expect, it } from "vitest"

import { buildCodeChangeNote, snapshotChatCode } from "../code-change-note"

/**
 * The model re-reads the full current code every turn but has no way to tell it
 * changed between messages. A candidate applied the fix under discussion and the
 * AI could only hedge ("you may have already applied the fix"). These notes are
 * the missing change signal; they ride the outgoing message, not the transcript.
 */
describe("buildCodeChangeNote", () => {
  it("says nothing on the first message of a chat", () => {
    expect(buildCodeChangeNote(null, snapshotChatCode("x = 1", []))).toBe("")
    expect(buildCodeChangeNote(undefined, snapshotChatCode("x = 1", []))).toBe("")
  })

  it("says nothing when nothing changed", () => {
    const snapshot = snapshotChatCode("x = 1", [{ path: "src/main.py", content: "print(1)" }])
    const same = snapshotChatCode("x = 1", [{ path: "src/main.py", content: "print(1)" }])

    expect(buildCodeChangeNote(snapshot, same)).toBe("")
  })

  it("flags a single-editor code change", () => {
    const note = buildCodeChangeNote(snapshotChatCode("x = 1", []), snapshotChatCode("x = 2", []))

    expect(note).toContain("[CODE UPDATE:")
    expect(note).toContain("edited their code since their last message")
  })

  it("names the workspace files that changed", () => {
    const previous = snapshotChatCode("old", [
      { path: "src/main.py", content: "print(1)" },
      { path: "src/dedupe.py", content: "KEY = (m, t, amount)" },
      { path: "fixtures/input.txt", content: "evt-1" },
    ])
    const current = snapshotChatCode("new", [
      { path: "src/main.py", content: "print(1)" },
      { path: "src/dedupe.py", content: "KEY = (m, t, event_id)" },
      { path: "fixtures/input.txt", content: "evt-1" },
    ])

    const note = buildCodeChangeNote(previous, current)

    expect(note).toContain("changed: src/dedupe.py")
    expect(note).not.toContain("src/main.py")
  })

  it("caps the changed-file list and counts the overflow", () => {
    const file = (path: string, content: string) => ({ path, content })
    const previous = snapshotChatCode(
      "",
      Array.from({ length: 7 }, (_, i) => file(`src/f${i}.py`, "old"))
    )
    const current = snapshotChatCode(
      "",
      Array.from({ length: 7 }, (_, i) => file(`src/f${i}.py`, "new"))
    )

    const note = buildCodeChangeNote(previous, current)

    expect(note).toContain("src/f4.py")
    expect(note).not.toContain("src/f5.py")
    expect(note).toContain("and 2 more")
  })

  it("treats an added file as a change", () => {
    const previous = snapshotChatCode("", [{ path: "src/main.py", content: "print(1)" }])
    const current = snapshotChatCode("", [
      { path: "src/main.py", content: "print(1)" },
      { path: "src/util.py", content: "def helper(): ..." },
    ])

    expect(buildCodeChangeNote(previous, current)).toContain("changed: src/util.py")
  })
})

describe("snapshotChatCode", () => {
  it("ignores malformed workspace input instead of throwing", () => {
    const snapshot = snapshotChatCode(undefined, [
      null,
      42,
      { path: "src/ok.py", content: "fine" },
      { path: 7, content: "bad path" },
      { path: "src/no-content.py" },
    ])

    expect(snapshot).toEqual({ code: "", files: { "src/ok.py": "fine" } })
  })

  it("handles a non-array workspace context", () => {
    expect(snapshotChatCode("x", undefined)).toEqual({ code: "x", files: {} })
    expect(snapshotChatCode("x", "garbage")).toEqual({ code: "x", files: {} })
  })
})
