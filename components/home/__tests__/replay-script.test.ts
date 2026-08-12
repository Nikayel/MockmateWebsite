import { describe, expect, it } from "vitest"
import { REPLAY_SCRIPT, computeReplayState, replayChapters } from "@/components/home/replay-script"

describe("replay script", () => {
  it("ends on a fixed solution, all tests passing, with a score", () => {
    const end = computeReplayState(REPLAY_SCRIPT, REPLAY_SCRIPT.length - 1)
    expect(end.tests).not.toBeNull()
    expect(end.tests!.every((t) => t.pass)).toBe(true)
    expect(end.score).not.toBeNull()
    expect(end.score!.length).toBe(3)
    // The fix: complement check precedes the insert.
    const checkLine = end.codeLines.findIndex((l) => l.includes("if target - n in seen"))
    const insertLine = end.codeLines.findIndex((l) => l.includes("seen[n] = i"))
    expect(checkLine).toBeGreaterThan(-1)
    expect(insertLine).toBeGreaterThan(checkLine)
  })

  it("shows a failing run before the interviewer's catch", () => {
    const failIndex = REPLAY_SCRIPT.findIndex(
      (s) => s.kind === "tests" && s.results.some((r) => !r.pass)
    )
    expect(failIndex).toBeGreaterThan(-1)
    const midState = computeReplayState(REPLAY_SCRIPT, failIndex)
    expect(midState.tests!.filter((t) => t.pass).length).toBe(1)
    // The buggy buffer inserts before it checks.
    const checkLine = midState.codeLines.findIndex((l) => l.includes("if target - n in seen"))
    const insertLine = midState.codeLines.findIndex((l) => l.includes("seen[n] = i"))
    expect(insertLine).toBeLessThan(checkLine)
  })

  it("exposes the scrubber chapters in timeline order", () => {
    const chapters = replayChapters(REPLAY_SCRIPT)
    expect(chapters.map((c) => c.label)).toEqual([
      "Clarify",
      "Approach",
      "Code",
      "Bug caught",
      "Fix",
      "Tests pass",
      "Score",
    ])
    const indexes = chapters.map((c) => c.index)
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes)
  })
})
