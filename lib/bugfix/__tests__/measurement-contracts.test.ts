import { describe, expect, it } from "vitest"
import { summarizeBugfixEvidence } from "../evidence"
import { calculateBugfixEvidenceScore } from "../scoring"
import { applyRootCauseAssessment, needsRootCausePractice } from "../reasoning-assessment"
import type { BugfixEvidenceEvent } from "../types"

const run = (
  timestamp: number,
  failed: number,
  sourceRevision = "current"
): BugfixEvidenceEvent => ({
  type: "test_run",
  timestamp,
  testSummary: { total: 1, passed: 1 - failed, failed, passRate: failed ? 0 : 100 },
  metadata: { sourceRevision },
})

describe("debugging measurements", () => {
  it("requires a failed judged run to establish reproduction", () => {
    const edit: BugfixEvidenceEvent = { type: "file_edited", timestamp: 3, filePath: "a.py" }
    expect(summarizeBugfixEvidence({ events: [run(1, 0), edit] }).reproducedBeforeEditing).toBe(
      false
    )
    expect(summarizeBugfixEvidence({ events: [run(1, 1), edit] }).reproducedBeforeEditing).toBe(
      true
    )
    expect(summarizeBugfixEvidence({ events: [edit, run(4, 1)] }).reproducedBeforeEditing).toBe(
      false
    )
  })

  it("does not improve scores by repeatedly running the same tests or opening unrelated files", () => {
    const base = summarizeBugfixEvidence({ events: [run(1, 1), run(2, 0)] })
    const noisy = summarizeBugfixEvidence({
      events: [
        run(1, 1),
        run(2, 0),
        run(3, 0),
        run(4, 0),
        { type: "file_opened", filePath: "unrelated.py", timestamp: 5 },
        { type: "ai_help_requested", aiHelpKind: "exact-fix", timestamp: 6 },
      ],
    })
    expect(calculateBugfixEvidenceScore(noisy)).toEqual(calculateBugfixEvidenceScore(base))
  })

  it("distinguishes a passing final source from a stale passing run", () => {
    const current = summarizeBugfixEvidence({ events: [run(1, 0)], finalSourceRevision: "current" })
    const stale = summarizeBugfixEvidence({ events: [run(1, 0)], finalSourceRevision: "changed" })
    expect(current.finalSourceVerified).toBe(true)
    expect(stale.finalSourceVerified).toBe(false)
    expect(calculateBugfixEvidenceScore(stale).verificationDiscipline).toBeLessThan(
      calculateBugfixEvidenceScore(current).verificationDiscipline
    )
    expect(
      summarizeBugfixEvidence({ events: [], finalSourceRevision: "current" }).finalSourceVerified
    ).toBeUndefined()
  })

  it("derives first AI request timing without claiming that help was delivered", () => {
    const evidence = summarizeBugfixEvidence({
      events: [
        { type: "session_started", timestamp: 0 },
        run(10, 1),
        { type: "ai_help_requested", timestamp: 20 },
        { type: "file_edited", timestamp: 30 },
        run(40, 0),
      ],
    })
    expect(evidence.firstAIHelp).toEqual({
      requestedAt: 20,
      elapsedMs: 20,
      beforeFirstEdit: true,
      beforeFirstFailure: false,
      beforeFirstSuccess: true,
    })
    expect(
      summarizeBugfixEvidence({ events: [{ type: "ai_help_requested", timestamp: 20 }] })
        .firstAIHelp
    ).toEqual({ requestedAt: 20 })
  })

  it("uses candidate quotes to connect assessed reasoning to recommendations", () => {
    const summary = summarizeBugfixEvidence({ events: [] })
    const quote = "Removing an entry shifts the next index."
    const strong = applyRootCauseAssessment(
      summary,
      { rootCauseAccuracy: 90, rootCauseEvidence: quote },
      [quote]
    )
    const weak = applyRootCauseAssessment(
      summary,
      { rootCauseAccuracy: 40, rootCauseEvidence: "Maybe the order is wrong." },
      ["Maybe the order is wrong."]
    )
    expect(strong.rootCauseExplained).toBe(true)
    expect(needsRootCausePractice(strong)).toBe(false)
    expect(needsRootCausePractice(weak)).toBe(true)
    expect(
      needsRootCausePractice(
        applyRootCauseAssessment(summary, { rootCauseAccuracy: 10, rootCauseEvidence: quote }, [])
      )
    ).toBe(false)
    expect(needsRootCausePractice(summary)).toBe(false)
  })
})
