import { describe, it, expect } from "vitest"
import { calculateBugfixEvidenceScore } from "../scoring"
import type { BugfixEvidenceSummary } from "../types"

/**
 * The stream route REPLACES the capped scorer output wholesale with this
 * breakdown for bugfix sessions, so the transcript-integrity caps have to
 * live here or bugfix escapes them entirely. These pin that they do.
 */
function evidence(overrides: Partial<BugfixEvidenceSummary> = {}): BugfixEvidenceSummary {
  return {
    reproducedBeforeEditing: true,
    inspectedFiles: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"],
    inspectedTestOrDocs: ["test/a.test.ts"],
    editedFiles: ["src/a.ts"],
    expectedTouchedFiles: ["src/a.ts"],
    overEditedFiles: [],
    hypothesisCount: 2,
    visibleTestsRun: 2,
    finalPassRate: 100,
    preventionExplained: true,
    rootCauseExplained: true,
    aiShortcutCount: 0,
    aiPartnerUseCount: 1,
    hypothesisText: "The index is off by one.",
    rootCauseText: "The loop bound used <= instead of <.",
    preventionText: "Add a boundary test.",
    ...overrides,
  }
}

// A strong session: the semantic judge liked the transcript.
const STRONG_SEMANTICS = {
  hypothesisQuality: 85,
  rootCauseAccuracy: 90,
  preventionQuality: 80,
  communicationScore: 85,
}

describe("calculateBugfixEvidenceScore transcript-integrity caps", () => {
  it("a clean session is unaffected", () => {
    const clean = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: true, responsesRelevant: true },
    })
    expect(clean.communication).toBe(85)
  })

  it("omitting integrity entirely leaves the score untouched (back-compat)", () => {
    const without = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
    })
    expect(without.communication).toBe(85)
  })

  it("an incoherent transcript caps communication at 25", () => {
    const result = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: false, responsesRelevant: true },
    })
    expect(result.communication).toBe(25)
  })

  it("irrelevant responses cap communication at 45", () => {
    const result = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: true, responsesRelevant: false },
    })
    expect(result.communication).toBe(45)
  })

  it("keyword stuffing is no longer an integrity signal", () => {
    // The detector measured brevity, not stuffing, and penalised concise
    // honest candidates. It no longer reaches scoring at all.
    const result = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: true, responsesRelevant: true },
    })
    expect(result.communication).toBe(85)
  })

  it("takes the min of every applicable cap, not the first match", () => {
    // Incoherent AND irrelevant: an if/else-if chain would stop at whichever
    // came first. Both apply, so the harsher 25 wins.
    const result = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: false, responsesRelevant: false },
    })
    expect(result.communication).toBe(25)
  })

  it("caps drag the weighted overall down", () => {
    const clean = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: true, responsesRelevant: true },
    })
    const flagged = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: true, responsesRelevant: false },
    })
    expect(flagged.overall).toBeLessThan(clean.overall)
  })

  it("never raises a communication score that was already below the cap", () => {
    const result = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: { ...STRONG_SEMANTICS, communicationScore: 12 },
      integrity: { isCoherent: false, responsesRelevant: false },
    })
    expect(result.communication).toBe(12)
  })

  it("leaves the evidence-derived dimensions alone", () => {
    const stuffed = calculateBugfixEvidenceScore(evidence(), {
      difficulty: "medium",
      semanticOverrides: STRONG_SEMANTICS,
      integrity: { isCoherent: false, responsesRelevant: false },
    })
    // Reproduction and verification are observed behaviour, not transcript
    // claims, so no transcript signal should touch them.
    expect(stuffed.reproductionDiscipline).toBe(100)
    expect(stuffed.verificationDiscipline).toBeGreaterThanOrEqual(70)
  })
})
