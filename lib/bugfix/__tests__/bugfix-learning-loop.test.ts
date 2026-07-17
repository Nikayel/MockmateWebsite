import { describe, expect, it } from "vitest"
import {
  buildBugfixPostSessionReport,
  buildBugfixReadinessProfile,
  buildBugfixScenarioAuditRows,
  calculateBugfixEvidenceScore,
  createBugfixEvidenceEvent,
  summarizeBugfixEvidence,
} from "@/lib/bugfix"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"

describe("bugfix evidence learning loop", () => {
  it("penalizes passing tests without debugging evidence", () => {
    const evidence = summarizeBugfixEvidence({
      expectedTouchedFiles: ["src/fix.js"],
      events: [
        createBugfixEvidenceEvent({
          type: "file_edited",
          filePath: "src/fix.js",
          fileRole: "editable",
          timestamp: 1,
        }),
        createBugfixEvidenceEvent({
          type: "test_run",
          timestamp: 2,
          testSummary: { total: 4, passed: 4, failed: 0, passRate: 100 },
        }),
      ],
    })

    const score = calculateBugfixEvidenceScore(evidence)
    expect(score.overall).toBeLessThan(90)
    // Edited before ever running anything, and never opened a file: the behavioral
    // signals are what condemn this, and they need no language understanding to read.
    expect(score.reproductionDiscipline).toBeLessThan(50)
    expect(score.codebaseNavigation).toBe(0)
  })

  it("stays neutral on language dimensions the semantic scorer did not judge", () => {
    // These three are scored from what the candidate SAYS, which only the semantic
    // scorer can read. On the no-AI fallback path it never runs and passes no
    // overrides. They must not collapse to 0 there: that would silently dock 28% of
    // the weight (10 + 10 + 8) from every session, punishing candidates for the
    // absence of textareas the product no longer has.
    const evidence = summarizeBugfixEvidence({ events: [], expectedTouchedFiles: [] })
    const score = calculateBugfixEvidenceScore(evidence)

    expect(score.hypothesisQuality).toBe(50)
    expect(score.rootCauseUnderstanding).toBe(50)
    expect(score.regressionPrevention).toBe(50)
  })

  it("lets the semantic scorer override every language dimension it judged", () => {
    const evidence = summarizeBugfixEvidence({ events: [], expectedTouchedFiles: [] })
    const score = calculateBugfixEvidenceScore(evidence, {
      semanticOverrides: { hypothesisQuality: 90, rootCauseAccuracy: 0, preventionQuality: 70 },
    })

    // 0 must survive the override: a judged "they never said it" is a real 0, and an
    // `||` here instead of `??` would quietly promote it to the neutral 50.
    expect(score.hypothesisQuality).toBe(90)
    expect(score.rootCauseUnderstanding).toBe(0)
    expect(score.regressionPrevention).toBe(70)
  })

  it("rewards complete evidence and maps weaknesses to bugfix tracks", () => {
    const evidence = summarizeBugfixEvidence({
      expectedTouchedFiles: ["src/fix.js"],
      events: [
        createBugfixEvidenceEvent({ type: "incident_read", timestamp: 1 }),
        createBugfixEvidenceEvent({
          type: "test_or_doc_opened",
          filePath: "tests/fix.test.js",
          fileRole: "test",
          timestamp: 2,
        }),
        createBugfixEvidenceEvent({
          type: "test_run",
          timestamp: 3,
          testSummary: { total: 4, passed: 1, failed: 3, passRate: 25 },
        }),
        createBugfixEvidenceEvent({
          type: "file_opened",
          filePath: "src/fix.js",
          fileRole: "editable",
          timestamp: 4,
        }),
        createBugfixEvidenceEvent({
          type: "hypothesis_created",
          text: "stale state",
          timestamp: 5,
        }),
        createBugfixEvidenceEvent({
          type: "file_edited",
          filePath: "src/fix.js",
          fileRole: "editable",
          timestamp: 6,
        }),
        createBugfixEvidenceEvent({
          type: "ai_help_requested",
          aiHelpKind: "hypothesis-check",
          timestamp: 7,
        }),
        createBugfixEvidenceEvent({
          type: "test_run",
          timestamp: 8,
          testSummary: { total: 4, passed: 4, failed: 0, passRate: 100 },
        }),
        createBugfixEvidenceEvent({ type: "prevention_explained", timestamp: 9 }),
        createBugfixEvidenceEvent({
          type: "submission_created",
          text: "root cause",
          timestamp: 10,
        }),
      ],
    })

    const score = calculateBugfixEvidenceScore(evidence, {
      semanticOverrides: {
        hypothesisQuality: 90,
        rootCauseAccuracy: 90,
        preventionQuality: 90,
        communicationScore: 85,
      },
    })
    const profile = buildBugfixReadinessProfile({ score, weaknessTags: ["async-race"] })
    const report = buildBugfixPostSessionReport({ evidence, score })

    expect(score.overall).toBeGreaterThanOrEqual(75)
    expect(profile.track).toBe("frontend-regression-debugging")
    expect(profile.modeRecommendation).toBe("interview")
    expect(report.finalDiffSummary).toContain("src/fix.js")
  })

  it("audits public bugfix scenarios for release governance", () => {
    const rows = buildBugfixScenarioAuditRows(realWorldBugFixScenarios)

    expect(rows).toHaveLength(realWorldBugFixScenarios.length)
    expect(rows.every((row) => row.complete)).toBe(true)
  })
})
