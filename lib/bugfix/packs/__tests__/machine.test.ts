import { describe, expect, it } from "vitest"
import {
  advancePackState,
  debriefUnlocked,
  initPackProgress,
  isDebriefTriggerPhrase,
  PACK_STATES,
  packStateGoal,
  phase2Unlocked,
  type PackInput,
  type PackProgress,
} from "../machine"

const RUN_MISMATCH: PackInput = { kind: "run", matchedOracle: false }
const RUN_MATCH: PackInput = { kind: "run", matchedOracle: true }
const RUN_V2: PackInput = { kind: "run", matchedOracle: false, matchedOracleV2: true }
const ADVANCE: PackInput = { kind: "advance", evidence: "candidate said the precise sentence" }
const DEBRIEF: PackInput = { kind: "debrief-trigger", phrase: "debrief me" }

/** Drive a full happy-path session OPENING -> DEBRIEF and return the transcript. */
function walkthrough(): PackProgress {
  let progress = initPackProgress()
  const steps: PackInput[] = [
    ADVANCE, // OPENING -> REPRODUCE
    RUN_MISMATCH, // REPRODUCE -> SYMPTOM
    ADVANCE, // SYMPTOM -> SCOPE
    ADVANCE, // SCOPE -> LOCALIZE
    ADVANCE, // LOCALIZE -> FIX
    RUN_MATCH, // FIX -> COMPLEXITY
    ADVANCE, // COMPLEXITY -> PHASE2
    RUN_V2, // PHASE2 -> SCALE
    DEBRIEF, // SCALE -> DEBRIEF
  ]
  for (const step of steps) {
    progress = advancePackState(progress, step).progress
  }
  return progress
}

describe("advancePackState — forward-only walkthrough", () => {
  it("drives all 10 states in order with the right exit kinds", () => {
    const progress = walkthrough()
    expect(progress.state).toBe("DEBRIEF")
    expect(progress.history.map((t) => t.to)).toEqual([
      "REPRODUCE",
      "SYMPTOM",
      "SCOPE",
      "LOCALIZE",
      "FIX",
      "COMPLEXITY",
      "PHASE2",
      "SCALE",
      "DEBRIEF",
    ])
    expect(progress.history.find((t) => t.to === "REPRODUCE")?.kind).toBe("judgment")
    expect(progress.history.find((t) => t.to === "SYMPTOM")?.kind).toBe("deterministic")
    expect(progress.history.find((t) => t.to === "SCALE")?.kind).toBe("deterministic")
    expect(progress.history.find((t) => t.to === "DEBRIEF")?.kind).toBe("trigger")
  })
})

describe("deterministic exits require verified runs, not claims", () => {
  it("REPRODUCE does not advance on an advance signal (must run and see the diff)", () => {
    const progress = advancePackState(initPackProgress(), ADVANCE).progress // -> REPRODUCE
    const result = advancePackState(progress, ADVANCE)
    expect(result.advanced).toBe(false)
    expect(result.progress.state).toBe("REPRODUCE")
  })

  it("REPRODUCE does not advance if the run matched the oracle (nothing reproduced)", () => {
    const progress = advancePackState(initPackProgress(), ADVANCE).progress // -> REPRODUCE
    expect(advancePackState(progress, RUN_MATCH).advanced).toBe(false)
    expect(advancePackState(progress, RUN_MISMATCH).advanced).toBe(true)
  })

  it("FIX only advances on a character-exact match", () => {
    let p = initPackProgress()
    for (const step of [ADVANCE, RUN_MISMATCH, ADVANCE, ADVANCE, ADVANCE]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("FIX")
    expect(advancePackState(p, RUN_MISMATCH).advanced).toBe(false)
    expect(advancePackState(p, RUN_MATCH).advanced).toBe(true)
  })

  it("PHASE2 only advances on an expected_output_v2 match", () => {
    let p = initPackProgress()
    for (const step of [ADVANCE, RUN_MISMATCH, ADVANCE, ADVANCE, ADVANCE, RUN_MATCH, ADVANCE]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("PHASE2")
    expect(advancePackState(p, RUN_MATCH).advanced).toBe(false) // matching v1 is not enough
    expect(advancePackState(p, RUN_V2).advanced).toBe(true)
  })
})

describe("judgment exits require the interviewer advance signal", () => {
  it("SYMPTOM does not advance on a run event", () => {
    let p = advancePackState(initPackProgress(), ADVANCE).progress
    p = advancePackState(p, RUN_MISMATCH).progress // -> SYMPTOM
    expect(p.state).toBe("SYMPTOM")
    expect(advancePackState(p, RUN_MATCH).advanced).toBe(false)
    expect(advancePackState(p, ADVANCE).advanced).toBe(true)
  })
})

describe("DEBRIEF gating", () => {
  it("is unreachable without the literal trigger, even at SCALE", () => {
    let p = initPackProgress()
    for (const step of [
      ADVANCE,
      RUN_MISMATCH,
      ADVANCE,
      ADVANCE,
      ADVANCE,
      RUN_MATCH,
      ADVANCE,
      RUN_V2,
    ]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("SCALE")
    expect(advancePackState(p, ADVANCE).advanced).toBe(false)
    expect(advancePackState(p, { kind: "debrief-trigger", phrase: "let's debrief" }).advanced).toBe(
      false
    )
    expect(advancePackState(p, DEBRIEF).advanced).toBe(true)
  })

  it("cannot be triggered early from an earlier state (no forward skip)", () => {
    const opening = initPackProgress()
    expect(advancePackState(opening, DEBRIEF).advanced).toBe(false)
    expect(advancePackState(opening, DEBRIEF).progress.state).toBe("OPENING")
  })

  it("is terminal — no further advance", () => {
    const done = walkthrough()
    const after = advancePackState(done, DEBRIEF)
    expect(after.advanced).toBe(false)
    expect(after.progress.state).toBe("DEBRIEF")
  })
})

describe("gates + helpers", () => {
  it("phase2Unlocked only from PHASE2 onward", () => {
    let p = initPackProgress()
    expect(phase2Unlocked(p)).toBe(false)
    for (const step of [ADVANCE, RUN_MISMATCH, ADVANCE, ADVANCE, ADVANCE, RUN_MATCH, ADVANCE]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("PHASE2")
    expect(phase2Unlocked(p)).toBe(true)
  })

  it("debriefUnlocked only in DEBRIEF", () => {
    expect(debriefUnlocked(initPackProgress())).toBe(false)
    expect(debriefUnlocked(walkthrough())).toBe(true)
  })

  it("isDebriefTriggerPhrase matches only the literal phrase", () => {
    expect(isDebriefTriggerPhrase("debrief me")).toBe(true)
    expect(isDebriefTriggerPhrase("  Debrief me.  ")).toBe(true)
    expect(isDebriefTriggerPhrase("please debrief me now")).toBe(false)
    expect(isDebriefTriggerPhrase("debrief")).toBe(false)
  })

  it("counts non-advancing turns and resets them on advance", () => {
    let p = advancePackState(initPackProgress(), ADVANCE).progress // REPRODUCE, counters reset
    expect(p.nonAdvancingTurns).toBe(0)
    p = advancePackState(p, ADVANCE).progress // stay (needs a run)
    p = advancePackState(p, ADVANCE).progress // stay again
    expect(p.nonAdvancingTurns).toBe(2)
    p = advancePackState(p, RUN_MISMATCH).progress // advance -> SYMPTOM
    expect(p.nonAdvancingTurns).toBe(0)
  })

  it("exposes a goal for every state", () => {
    for (const state of PACK_STATES) {
      expect(packStateGoal(state).length).toBeGreaterThan(0)
    }
  })
})
