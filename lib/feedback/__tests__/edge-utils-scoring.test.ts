import { describe, it, expect } from "vitest"
import { calculateValidatedScores, applyScoreFloors } from "../edge-utils"
import { COMMUNICATION_GATE_CAPS } from "../scoring/communication-gate"
import { SCORING } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult } from "../types"

function validation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 30,
    ...overrides,
  }
}

function preScreen(overrides: Partial<PreScreenResult> = {}): PreScreenResult {
  return {
    hasContent: true,
    candidateMessageCount: 8,
    avgMessageLength: 80,
    hasKeywords: { complexity: false, approach: false, alternatives: false, edgeCases: false },
    suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
    ...overrides,
  }
}

const silentPreScreen = () =>
  preScreen({ hasContent: false, candidateMessageCount: 0, avgMessageLength: 0 })

describe("edge calculateValidatedScores + applyScoreFloors (stream-route order)", () => {
  it("THE EDGE INVARIANT: silent 100%-pass session stays under the none cap through the full chain", () => {
    // The floor at ~line 348 fires only on approachExplained || complexityDiscussed,
    // the exact disjunction that forces the gate level to adequate. A silent
    // session therefore never sees the 70 floor and keeps the gate's overall cap.
    const silent = validation()
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      silentPreScreen(),
      silent,
      "dsa",
      null
    )
    expect(calc.understanding).toBe(COMMUNICATION_GATE_CAPS.none.understanding)
    expect(calc.problemSolving).toBe(COMMUNICATION_GATE_CAPS.none.problemSolving)
    expect(calc.codeQuality).toBe(96)
    expect(calc.overall).toBe(49)
    expect(calc.silentSolution).toBe(true)

    const floored = applyScoreFloors(calc, 100, 90, silent)
    expect(floored.overall).toBe(49)
    expect(floored.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.none.overall)
    // The 70 problemSolving floor must not fire either.
    expect(floored.problemSolving).toBe(COMMUNICATION_GATE_CAPS.none.problemSolving)
    expect(floored.silentSolution).toBe(true)
  })

  it("minimal-evidence 100%-pass session stays under the minimal cap through the chain", () => {
    const quiet = validation()
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen({ candidateMessageCount: 3 }),
      quiet,
      "dsa",
      null
    )
    const floored = applyScoreFloors(calc, 100, 90, quiet)
    expect(floored.overall).toBe(57)
    expect(floored.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.minimal.overall)
    expect(floored.understanding).toBe(COMMUNICATION_GATE_CAPS.minimal.understanding)
    expect(floored.problemSolving).toBe(COMMUNICATION_GATE_CAPS.minimal.problemSolving)
  })

  it("codeQuality floors still apply to silent sessions", () => {
    const silent = validation()
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: 40 },
      silentPreScreen(),
      silent,
      "dsa",
      null
    )
    expect(calc.codeQuality).toBe(66)
    const floored = applyScoreFloors(calc, 100, 40, silent)
    // The 100%-pass codeQuality floor of 75 is not communication-gated.
    expect(floored.codeQuality).toBe(75)
    expect(floored.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.none.overall)
  })

  it("approachExplained alone unlocks the 70 overall and problemSolving floors", () => {
    const talked = validation({ approachExplained: true, approachQuality: "good" })
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: 0 },
      preScreen(),
      talked,
      "dsa",
      null
    )
    const floored = applyScoreFloors(calc, 100, 0, talked)
    expect(floored.overall).toBe(70)
    expect(floored.problemSolving).toBe(70)
    expect(floored.codeQuality).toBe(75)
    expect(floored.silentSolution).toBe(false)
  })

  it("communicative optimal session passes through floors unchanged at the top", () => {
    const rich = validation({
      approachExplained: true,
      approachQuality: "excellent",
      complexityDiscussed: true,
      complexityAccurate: true,
    })
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen(),
      rich,
      "dsa",
      null
    )
    expect(calc).toEqual({
      understanding: 97,
      problemSolving: 77,
      codeQuality: 96,
      communication: 80,
      overall: 87,
      silentSolution: false,
    })
    const floored = applyScoreFloors(calc, 100, 90, rich)
    expect(floored.overall).toBe(87)
    expect(floored.communication).toBe(80)
  })

  it("garbage efficiencyScore (NaN) never leaks NaN out of the chain", () => {
    const talked = validation({ approachExplained: true, approachQuality: "good" })
    const calc = calculateValidatedScores(
      100,
      { efficiencyScore: Number.NaN },
      preScreen(),
      talked,
      "dsa",
      null
    )
    const floored = applyScoreFloors(calc, 100, Number.NaN, talked)
    for (const key of [
      "understanding",
      "problemSolving",
      "codeQuality",
      "communication",
      "overall",
    ] as const) {
      expect(Number.isFinite(calc[key])).toBe(true)
      expect(Number.isFinite(floored[key])).toBe(true)
    }
    // Since commit 17594ec5 a Number.isFinite guard normalizes a NaN
    // efficiencyScore to the neutral 50 before the base arithmetic, so the
    // subscores stay finite; the pass-rate floors then hold their usual levels.
    expect(floored.problemSolving).toBe(70)
    expect(floored.codeQuality).toBe(75)
    expect(floored.overall).toBe(70)
  })

  it("non-finite and out-of-range efficiencyScore normalizes to the neutral/clamped value", () => {
    const talked = validation({ approachExplained: true, approachQuality: "good" })
    const call = (efficiencyMetrics: { efficiencyScore?: number } | undefined) =>
      calculateValidatedScores(80, efficiencyMetrics, preScreen(), talked, "dsa", null)

    // NaN is treated exactly like the neutral 50, and like missing metrics.
    expect(call({ efficiencyScore: Number.NaN })).toEqual(call({ efficiencyScore: 50 }))
    expect(call({ efficiencyScore: Number.NaN })).toEqual(call(undefined))

    // Out-of-range values clamp to the 0..100 band.
    expect(call({ efficiencyScore: 150 })).toEqual(call({ efficiencyScore: 100 }))
  })

  it("scenario type selects the matching weight set from SCORING", () => {
    const rich = validation({
      approachExplained: true,
      approachQuality: "good",
      complexityDiscussed: true,
      complexityAccurate: true,
      edgeCasesConsidered: true,
    })
    const dsa = calculateValidatedScores(80, { efficiencyScore: 60 }, preScreen(), rich, "dsa", null)
    const bugfix = calculateValidatedScores(80, { efficiencyScore: 60 }, preScreen(), rich, "bugfix", null)
    const sd = calculateValidatedScores(80, { efficiencyScore: 60 }, preScreen(), rich, "system-design", null)

    // Subscores are weight-independent, only the overall changes.
    for (const other of [bugfix, sd]) {
      expect(other.understanding).toBe(dsa.understanding)
      expect(other.problemSolving).toBe(dsa.problemSolving)
      expect(other.codeQuality).toBe(dsa.codeQuality)
      expect(other.communication).toBe(dsa.communication)
    }

    const recompute = (w: { UNDERSTANDING: number; PROBLEM_SOLVING: number; CODE_QUALITY: number; COMMUNICATION: number }) =>
      Math.round(
        dsa.understanding * w.UNDERSTANDING +
          dsa.problemSolving * w.PROBLEM_SOLVING +
          dsa.codeQuality * w.CODE_QUALITY +
          dsa.communication * w.COMMUNICATION
      )
    expect(dsa.overall).toBe(recompute(SCORING.PERFORMANCE_WEIGHTS))
    expect(bugfix.overall).toBe(recompute(SCORING.BUG_FIX_WEIGHTS))
    expect(sd.overall).toBe(recompute(SCORING.SYSTEM_DESIGN_WEIGHTS))
  })

  it("gate level boundaries: 1 message is none, 2 messages is minimal", () => {
    const silent = validation()
    const one = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen({ candidateMessageCount: 1 }),
      silent,
      "dsa",
      null
    )
    const two = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen({ candidateMessageCount: 2 }),
      silent,
      "dsa",
      null
    )
    expect(one.understanding).toBe(COMMUNICATION_GATE_CAPS.none.understanding)
    expect(two.understanding).toBe(COMMUNICATION_GATE_CAPS.minimal.understanding)
  })
})

describe("edge integrity caps (the route DSA and bugfix actually use)", () => {
  const eff = { efficiencyScore: 90 }
  const engaged = (o: Partial<ConversationValidation> = {}) =>
    validation({
      approachExplained: true,
      complexityDiscussed: true,
      complexityAccurate: true,
      communicationScore: 80,
      ...o,
    })

  function chain(pre: PreScreenResult, val: ConversationValidation) {
    const scored = calculateValidatedScores(100, eff, pre, val, "dsa", "def f():\n    return 1")
    return applyScoreFloors(scored, 100, 90, val, pre.suspiciousPatterns.keywordStuffing)
  }

  it("a clean session is unaffected by the caps", () => {
    const clean = chain(preScreen(), engaged())
    expect(clean.communication).toBe(80)
    expect(clean.overall).toBe(87)
  })

  it("keyword stuffing caps communication and survives the floors", () => {
    const stuffed = chain(
      preScreen({
        suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: true },
      }),
      engaged()
    )
    // Before the fix this returned 80/87, byte-identical to the clean session.
    expect(stuffed.communication).toBe(35)
    expect(stuffed.overall).toBeLessThan(87)
  })

  it("an incoherent session caps at 25 and survives the floors", () => {
    const incoherent = chain(preScreen(), engaged({ isCoherent: false }))
    expect(incoherent.communication).toBe(25)
    expect(incoherent.overall).toBeLessThan(87)
  })

  it("irrelevant responses cap at 45 and survive the floors", () => {
    const irrelevant = chain(preScreen(), engaged({ responsesRelevant: false }))
    expect(irrelevant.communication).toBeLessThanOrEqual(45)
    expect(irrelevant.overall).toBeLessThan(87)
  })

  it("codeQuality still floors for a flagged session: passing tests are real evidence", () => {
    const stuffed = chain(
      preScreen({
        suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: true },
      }),
      engaged()
    )
    expect(stuffed.codeQuality).toBeGreaterThanOrEqual(75)
  })
})
