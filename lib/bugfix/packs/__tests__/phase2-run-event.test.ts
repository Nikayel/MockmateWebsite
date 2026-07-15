import { describe, expect, it } from "vitest"
import { advancePackState, initPackProgress, type PackInput } from "../machine"
import { buildPhase2Release } from "../phase2"
import { computeRunEvent } from "../run-event"
import type { SealedPackContent } from "../types"

const SEALED: SealedPackContent = {
  packId: "p",
  solutionMd: "...",
  bugLocation: "src/main.py:10",
  bugSummary: "...",
  minimalFix: "...",
  survivalStory: "...",
  redHerrings: [],
  complexityAnswer: { time: "O(n log n)", space: "O(n)", dominantCost: "the sort" },
  phase2: { specPatch: "ops needs X", fixturePatch: "extra\n", expectedOutputV2: "v2\n" },
  buggyOutput: "wrong\n",
  debriefRubric: ["one drill"],
}

function progressAt(steps: PackInput[]) {
  let p = initPackProgress()
  for (const step of steps) p = advancePackState(p, step).progress
  return p
}

const RUN_MISMATCH: PackInput = { kind: "run", matchedOracle: false }
const RUN_MATCH: PackInput = { kind: "run", matchedOracle: true }
const ADVANCE: PackInput = { kind: "advance", evidence: "e" }

describe("buildPhase2Release", () => {
  it("does not release before PHASE2", () => {
    const early = progressAt([ADVANCE, RUN_MISMATCH]) // SYMPTOM
    const release = buildPhase2Release(early, SEALED)
    expect(release.released).toBe(false)
    expect(release.payload).toBeUndefined()
  })

  it("does not release for a null progress", () => {
    expect(buildPhase2Release(null, SEALED).released).toBe(false)
  })

  it("releases the sealed payload once PHASE2 is reached", () => {
    const atPhase2 = progressAt([
      ADVANCE,
      RUN_MISMATCH,
      ADVANCE,
      ADVANCE,
      ADVANCE,
      RUN_MATCH,
      ADVANCE,
    ])
    expect(atPhase2.state).toBe("PHASE2")
    const release = buildPhase2Release(atPhase2, SEALED)
    expect(release.released).toBe(true)
    expect(release.payload?.expectedOutputV2).toBe("v2\n")
  })

  it("does not release without sealed content even at PHASE2", () => {
    const atPhase2 = progressAt([
      ADVANCE,
      RUN_MISMATCH,
      ADVANCE,
      ADVANCE,
      ADVANCE,
      RUN_MATCH,
      ADVANCE,
    ])
    expect(buildPhase2Release(atPhase2, null).released).toBe(false)
  })
})

describe("computeRunEvent", () => {
  it("matches v1 against the public oracle", () => {
    const event = computeRunEvent("totals\nacme: 42\n", "totals\nacme: 42\n")
    expect(event.matchedOracle).toBe(true)
    expect(event.matchedOracleV2).toBeUndefined()
  })

  it("reports a v1 mismatch", () => {
    expect(computeRunEvent("acme: 43\n", "acme: 42\n").matchedOracle).toBe(false)
  })

  it("matches v2 only against the sealed expected_output_v2", () => {
    const event = computeRunEvent("v2\n", "v1\n", "v2\n")
    expect(event.matchedOracle).toBe(false)
    expect(event.matchedOracleV2).toBe(true)
  })
})
