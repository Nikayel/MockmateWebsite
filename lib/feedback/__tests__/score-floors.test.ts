import { describe, it, expect } from "vitest"
import { applyScoreFloors } from "../scoring/score-floors"
import {
  clampScore,
  calculatePerformanceScoreForScenario,
  SCORING,
} from "@/lib/constants"
import { COMMUNICATION_GATE_CAPS } from "../scoring/communication-gate"
import type { ConversationValidation, ScoreResult } from "../types"

function validation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: true,
    approachQuality: "good",
    complexityDiscussed: true,
    complexityAccurate: true,
    statedComplexity: "O(n)",
    questionsAsked: 2,
    questionsAnswered: 2,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 70,
    ...overrides,
  }
}

function scores(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    understanding: 50,
    problemSolving: 60,
    codeQuality: 70,
    communication: 40,
    overall: 65,
    ...overrides,
  }
}

describe("clampScore", () => {
  it("clamps into 0-100 and rounds", () => {
    expect(clampScore(105)).toBe(100)
    expect(clampScore(-5)).toBe(0)
    expect(clampScore(49.6)).toBe(50)
    expect(clampScore(0)).toBe(0)
    expect(clampScore(100)).toBe(100)
  })

  it("returns 0 for non-finite input instead of propagating", () => {
    expect(clampScore(NaN)).toBe(0)
    expect(clampScore(Infinity)).toBe(0)
    expect(clampScore(-Infinity)).toBe(0)
  })
})

describe("calculatePerformanceScoreForScenario", () => {
  const components = { understanding: 90, problemSolving: 70, codeQuality: 95, communication: 40 }

  it("uses DSA weights by default", () => {
    const w = SCORING.PERFORMANCE_WEIGHTS
    const expected = Math.round(
      90 * w.UNDERSTANDING + 70 * w.PROBLEM_SOLVING + 95 * w.CODE_QUALITY + 40 * w.COMMUNICATION
    )
    expect(calculatePerformanceScoreForScenario(components, "dsa")).toBe(expected)
    expect(calculatePerformanceScoreForScenario(components, undefined)).toBe(expected)
    expect(calculatePerformanceScoreForScenario(components, "optimization")).toBe(expected)
  })

  it("uses bug-fix weights for bugfix sessions (the P0-3 case)", () => {
    const w = SCORING.BUG_FIX_WEIGHTS
    const expected = Math.round(
      90 * w.UNDERSTANDING + 70 * w.PROBLEM_SOLVING + 95 * w.CODE_QUALITY + 40 * w.COMMUNICATION
    )
    expect(calculatePerformanceScoreForScenario(components, "bugfix")).toBe(expected)
    expect(calculatePerformanceScoreForScenario(components, "bug_fix")).toBe(expected)
    expect(calculatePerformanceScoreForScenario(components, "bug-fix")).toBe(expected)
    // Pins the audit's concrete example: U90/PS70/CQ95/C40 must NOT collapse
    // to the DSA-weighted 71 for a bugfix session.
    expect(expected).toBe(76)
  })

  it("uses system-design weights for system-design sessions", () => {
    const w = SCORING.SYSTEM_DESIGN_WEIGHTS
    const expected = Math.round(
      90 * w.UNDERSTANDING + 70 * w.PROBLEM_SOLVING + 95 * w.CODE_QUALITY + 40 * w.COMMUNICATION
    )
    expect(calculatePerformanceScoreForScenario(components, "system-design")).toBe(expected)
    expect(calculatePerformanceScoreForScenario(components, "system_design")).toBe(expected)
  })
})

describe("applyScoreFloors", () => {
  it("recomputes the 100%-pass overall with scenario weights, not DSA weights", () => {
    // Understanding-heavy session, communication < 60 so the hasGoodComm=85
    // floor stays out of the way. After floors: U=95, PS=75, CQ=80, C=55.
    // DSA weights give 75 (below the 78 floor -> 78); bugfix weights (0.35
    // understanding) give 79, which must win over the floor.
    const input = scores({
      understanding: 95,
      problemSolving: 60,
      codeQuality: 60,
      communication: 50,
      overall: 60,
    })
    const dsa = applyScoreFloors(input, 100, 90, validation({ communicationScore: 50 }), 8, "dsa")
    const bugfix = applyScoreFloors(
      input,
      100,
      90,
      validation({ communicationScore: 50 }),
      8,
      "bugfix"
    )
    expect(dsa.overall).toBe(78)
    expect(bugfix.overall).toBe(79)
  })

  it("floors never out-raise the silent-session gate cap (none level)", () => {
    // Deliberately UNCAPPED upstream components: if an earlier path failed to
    // cap the subscores, the floors' weighted recompute would yield ~81 and
    // the incoming overall 100 would survive Math.max. Only the re-applied
    // gate cap at the end of applyScoreFloors forces this to 55 — this test
    // fails if that line is removed.
    const silent = applyScoreFloors(
      scores({
        understanding: 100,
        problemSolving: 100,
        codeQuality: 100,
        communication: 100,
        overall: 100,
      }),
      100,
      95,
      validation({
        approachExplained: false,
        complexityDiscussed: false,
        approachQuality: "none",
        communicationScore: 10,
      }),
      0,
      "dsa"
    )
    expect(silent.overall).toBe(COMMUNICATION_GATE_CAPS.none.overall)
    expect(silent.silentSolution).toBe(true)
  })

  it("floors never out-raise the gate cap (minimal level)", () => {
    const minimal = applyScoreFloors(
      scores({
        understanding: 100,
        problemSolving: 100,
        codeQuality: 100,
        communication: 100,
        overall: 100,
      }),
      100,
      95,
      validation({
        approachExplained: false,
        complexityDiscussed: false,
        approachQuality: "none",
        communicationScore: 30,
      }),
      3,
      "dsa"
    )
    expect(minimal.overall).toBe(COMMUNICATION_GATE_CAPS.minimal.overall)
  })

  it("floors do not raise communication for an irrelevant-responses session", () => {
    // A perfect optimal solution whose answers never addressed the questions:
    // the scorer caps communication at 45, and the floors must not hand back
    // the 70 that hasGoodComm would otherwise grant. Without the
    // responsesRelevant guard this returns 70; with it the session takes the
    // no-approach branch and lands at 35.
    const result = applyScoreFloors(
      scores({ communication: 45, overall: 60 }),
      100,
      95,
      validation({ responsesRelevant: false, communicationScore: 80 }),
      8,
      "dsa"
    )
    expect(result.communication).toBeLessThanOrEqual(45)
  })

  it("caps a low-evidence system-design session even though no floor fires", () => {
    // SD sessions have passRate 0, so no floor branch runs; the re-applied
    // gate cap is the first place the Node SD path enforces the silence caps.
    // This is a deliberate behavior change (2026-07-31): the gate doc says
    // every scoring path applies the caps, and SD previously did not.
    const sd = applyScoreFloors(
      scores({ understanding: 70, problemSolving: 70, codeQuality: 70, communication: 80, overall: 75 }),
      0,
      undefined,
      validation({
        approachExplained: false,
        complexityDiscussed: false,
        approachQuality: "none",
        communicationScore: 80,
      }),
      3,
      "system-design"
    )
    expect(sd.overall).toBe(COMMUNICATION_GATE_CAPS.minimal.overall)
  })

  it("still grants the full floor to a communicative perfect session", () => {
    const result = applyScoreFloors(
      scores({ overall: 60, communication: 75 }),
      100,
      90,
      validation({ communicationScore: 75, approachQuality: "excellent" }),
      10,
      "dsa"
    )
    expect(result.overall).toBeGreaterThanOrEqual(85)
    expect(result.silentSolution).toBe(false)
  })
})
