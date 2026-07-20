/**
 * Silent bugfix sessions must not collect the neutral 50s.
 *
 * The semantic scorer's NEUTRAL fallback (50s) exists for "the scorer was
 * unavailable" — the candidate spoke but we lost the signal. A transcript with no
 * candidate turn is different: the hypothesis / root cause / prevention were
 * provably never stated, so those dimensions are earned-low (BUGFIX_SEMANTIC_SILENT),
 * not unknowable. Before this split, a fully silent session projected
 * problemSolving = avg(50, 50, 50) = 50 — the flat default-50 users saw.
 */
import { describe, expect, it } from "vitest"
import { calculateBugfixEvidenceScore, mapBugfixBreakdownToCategoryScores } from "../scoring"
import { BUGFIX_SEMANTIC_NEUTRAL, BUGFIX_SEMANTIC_SILENT } from "../semantic-scorer"
import type { BugfixEvidenceSummary } from "../types"

const silentButThoroughEvidence: BugfixEvidenceSummary = {
  reproducedBeforeEditing: true,
  inspectedFiles: ["a.py", "b.py", "c.py", "d.py"],
  inspectedTestOrDocs: ["test_a.py"],
  editedFiles: ["a.py"],
  expectedTouchedFiles: ["a.py"],
  overEditedFiles: [],
  hypothesisCount: 0,
  visibleTestsRun: 2,
  finalPassRate: 100,
  preventionExplained: false,
  rootCauseExplained: false,
  aiShortcutCount: 0,
  aiPartnerUseCount: 0,
  hypothesisText: "",
  rootCauseText: "",
  preventionText: "",
}

describe("silent bugfix sessions", () => {
  it("SILENT scores every language dimension well below NEUTRAL", () => {
    for (const key of [
      "hypothesisQuality",
      "rootCauseAccuracy",
      "preventionQuality",
      "communicationScore",
    ] as const) {
      expect(BUGFIX_SEMANTIC_SILENT[key]).toBeLessThan(BUGFIX_SEMANTIC_NEUTRAL[key])
      expect(BUGFIX_SEMANTIC_SILENT[key]).toBeLessThanOrEqual(15)
    }
  })

  it("a silent session no longer projects the default-50 problemSolving", () => {
    const breakdown = calculateBugfixEvidenceScore(silentButThoroughEvidence, {
      difficulty: "medium",
      semanticOverrides: BUGFIX_SEMANTIC_SILENT,
    })
    const categories = mapBugfixBreakdownToCategoryScores(breakdown)

    // The three transcript-only dimensions were never stated: earned-low.
    expect(categories.problemSolving).toBeLessThanOrEqual(15)
    // Deterministic evidence (repro, navigation, tests) stays earned.
    expect(categories.understanding).toBeGreaterThanOrEqual(90)
    expect(categories.codeQuality).toBeGreaterThanOrEqual(90)
  })

  it("the neutral fallback (scorer unavailable) still projects 50, not a penalty", () => {
    const breakdown = calculateBugfixEvidenceScore(silentButThoroughEvidence, {
      difficulty: "medium",
      semanticOverrides: BUGFIX_SEMANTIC_NEUTRAL,
    })
    const categories = mapBugfixBreakdownToCategoryScores(breakdown)
    expect(categories.problemSolving).toBe(50)
  })
})
