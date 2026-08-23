/**
 * The hint ladder must actually escalate.
 *
 * It did not, for as long as `getNextHint` existed. It regenerated the whole
 * batch on every call - correctly, because hints are tailored to the code in
 * front of the candidate - and then tried to skip what had already been seen by
 * filtering on `previousHintIds`. Ids come from `generateHintId()`, which is
 * `hint_${Date.now()}_${Math.random()}`, so an id from an earlier batch can
 * never appear in a later one. The filter therefore always passed, `.find()`
 * always returned element [0], and `finalizeHints` sorts level ascending - so
 * every request returned level 1. Four presses of "give me a hint" produced
 * four level-1 nudges with different wording and no escalation, and the level-4
 * "you've seen all available hints" branch was unreachable.
 *
 * Nothing caught it: the only existing test touching getNextHint asserted that
 * the legacy and consolidated exports were the same function reference.
 *
 * These tests assert the SEQUENCE of levels across successive calls, because
 * "returns a hint" is a property the broken version also satisfied.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GeneratedHint, HintGenerationRequest, HintLevel } from "../types"

/** Hints as finalizeHints emits them: sorted by level ascending. */
function batch(levels: HintLevel[]): { hints: GeneratedHint[] } {
  return {
    hints: levels.map((level, i) => ({
      // Fresh random ids, exactly as generateHintId produces. This is the
      // condition the old implementation could not survive.
      id: `hint_${Date.now()}_${Math.random().toString(36).slice(2, 11)}_${i}`,
      level,
      category: "conceptual" as const,
      title: `Level ${level} hint`,
      content: `Guidance at level ${level}`,
      isBlurred: true,
      source: "ai" as const,
      relevanceScore: 1 - i * 0.1,
    })),
  }
}

const runHintGraph = vi.hoisted(() => vi.fn())
vi.mock("../graph", () => ({ runHintGraph }))

const REQUEST = {
  userId: "u1",
  problemId: "first-missing-positive",
  problemTitle: "First Missing Positive",
  problemText: "Find the smallest missing positive integer.",
  difficulty: "hard",
  userCode: "",
  language: "javascript",
  struggleMetrics: {
    timeSpentMinutes: 5,
    codeChanges: 0,
    testsRun: 0,
    testsFailed: 0,
    hintsRevealed: 0,
    lastCodeChangeMinutesAgo: 5,
    errorCount: 0,
  },
} as unknown as HintGenerationRequest

describe("hint ladder progression", () => {
  beforeEach(() => {
    runHintGraph.mockReset()
    runHintGraph.mockResolvedValue(batch([1, 2, 3, 4]))
  })

  it("returns levels 1, 2, 3, 4 across four successive requests", async () => {
    const { getNextHint } = await import("../index")

    const seen: HintLevel[] = []
    let highest: HintLevel | undefined

    for (let i = 0; i < 4; i++) {
      const hint = await getNextHint(REQUEST, [], highest)
      expect(hint).not.toBeNull()
      seen.push(hint!.level)
      highest = hint!.level
    }

    expect(seen).toEqual([1, 2, 3, 4])
  })

  it("never returns level 1 twice", async () => {
    const { getNextHint } = await import("../index")

    const first = await getNextHint(REQUEST, [], undefined)
    const second = await getNextHint(REQUEST, [], first!.level)

    expect(first!.level).toBe(1)
    expect(second!.level).not.toBe(1)
  })

  it("regenerates on every call, so hints stay tailored to current code", async () => {
    const { getNextHint } = await import("../index")

    await getNextHint(REQUEST, [], undefined)
    await getNextHint(REQUEST, [], 1)

    expect(runHintGraph).toHaveBeenCalledTimes(2)
  })

  it("climbs past a rung the batch happens to omit", async () => {
    runHintGraph.mockResolvedValue(batch([1, 3, 4]))
    const { getNextHint } = await import("../index")

    // finalizeHints dedupes by title and caps at 8, so a run can skip a level.
    const hint = await getNextHint(REQUEST, [], 1)

    expect(hint!.level).toBe(3)
  })

  it("never descends to a rung below what was already revealed", async () => {
    runHintGraph.mockResolvedValue(batch([1, 2, 3, 4]))
    const { getHintAtLevel } = await import("../index")

    for (const level of [1, 2, 3, 4] as HintLevel[]) {
      const hint = await getHintAtLevel(REQUEST, level)
      expect(hint!.level).toBeGreaterThanOrEqual(level)
    }
  })

  it("falls back to the exhausted-ladder message past the top rung", async () => {
    const { getNextHint } = await import("../index")

    const hint = await getNextHint(REQUEST, [], 4)

    expect(hint!.level).toBe(4)
    expect(hint!.title).toBe("Additional Guidance")
  })

  it("still escalates for an old client that sends only ids", async () => {
    const { getNextHint } = await import("../index")

    // The id VALUES are irrelevant, which is the whole bug. Only the count can
    // carry information, and it at least moves in the right direction.
    const first = await getNextHint(REQUEST, [])
    const third = await getNextHint(REQUEST, ["a", "b"])

    expect(first!.level).toBe(1)
    expect(third!.level).toBe(3)
  })

  it("returns null when the generator produced nothing at all", async () => {
    runHintGraph.mockResolvedValue({ hints: [] })
    const { getHintAtLevel } = await import("../index")

    expect(await getHintAtLevel(REQUEST, 1)).toBeNull()
  })
})
