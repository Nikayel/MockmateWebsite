/**
 * Guard for the bugfix category projection shared by the streaming feedback route and the
 * fallback path. The bug this pins: hypothesisQuality was averaged into BOTH understanding and
 * problemSolving while aiCollaborationQuality was dropped entirely, and the two paths projected
 * the same breakdown differently. Every one of the 11 dimensions must land in exactly one of the
 * four user-facing categories.
 */
import { describe, expect, it } from "vitest"
import { mapBugfixBreakdownToCategoryScores } from "../scoring"
import type { BugfixScoreBreakdown } from "../types"

const ALL_DIMENSIONS: Array<keyof Omit<BugfixScoreBreakdown, "overall">> = [
  "reproductionDiscipline",
  "codebaseNavigation",
  "evidenceGathering",
  "hypothesisQuality",
  "minimalFixQuality",
  "verificationDiscipline",
  "overEditControl",
  "rootCauseUnderstanding",
  "regressionPrevention",
  "aiCollaborationQuality",
  "communication",
]

function zeroBreakdown(): BugfixScoreBreakdown {
  const base = { overall: 0 } as BugfixScoreBreakdown
  for (const dim of ALL_DIMENSIONS) base[dim] = 0
  return base
}

describe("mapBugfixBreakdownToCategoryScores", () => {
  it("averages each category's intended dimensions", () => {
    const breakdown: BugfixScoreBreakdown = {
      reproductionDiscipline: 10,
      codebaseNavigation: 20,
      evidenceGathering: 30, // understanding -> 20
      hypothesisQuality: 40,
      rootCauseUnderstanding: 50,
      regressionPrevention: 60, // problemSolving -> 50
      verificationDiscipline: 70,
      minimalFixQuality: 80,
      overEditControl: 90, // codeQuality -> 80
      communication: 44,
      aiCollaborationQuality: 56, // communication -> 50
      overall: 0,
    }
    expect(mapBugfixBreakdownToCategoryScores(breakdown)).toEqual({
      understanding: 20,
      problemSolving: 50,
      codeQuality: 80,
      communication: 50,
    })
  })

  it("routes every dimension to exactly one category (no double-count, none dropped)", () => {
    for (const dim of ALL_DIMENSIONS) {
      const breakdown = zeroBreakdown()
      breakdown[dim] = 90
      const categories = mapBugfixBreakdownToCategoryScores(breakdown)
      const nonZero = Object.values(categories).filter((v) => v > 0)
      expect(nonZero, `dimension ${dim} must influence exactly one category`).toHaveLength(1)
    }
  })
})
