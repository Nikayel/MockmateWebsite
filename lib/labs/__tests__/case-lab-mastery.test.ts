/**
 * Tests for the pure Case Lab → spaced-repetition mastery mapping (§7.5).
 */

import { describe, it, expect } from "vitest"
import { buildCaseLabMasterySession } from "../case-lab-mastery"
import type { CaseLab, CaseLabRun } from "../types"

const lab: CaseLab = {
  id: "palantir-911-dispatch",
  title: "Palantir 911 Dispatch",
  company: "palantir",
  role: "FDSE",
  difficulty: "medium",
  estimatedMinutes: 45,
  brief: { situation: "a 911 dispatch system", task: "build a responder recommender" },
  whyThisCompany: "mirrors the FDSE bar",
  skills: ["decomposition", "systems"],
  milestones: [],
  buildScenarioId: "palantir-911-dispatch-build",
  buildScenarioType: "add-functionality",
}

const baseRun: CaseLabRun = {
  id: "run_1",
  userId: "user_1",
  caseLabId: "palantir-911-dispatch",
  mode: "practice",
  status: "completed",
  currentMilestone: "review",
  startedAt: "2026-06-25T12:00:00.000Z",
  updatedAt: "2026-06-25T12:30:00.000Z",
  completedAt: "2026-06-25T12:45:00.000Z",
  answers: {
    build: {
      touchedFiles: ["src/dispatch.py"],
      code: "...",
      language: "python",
      testResults: [
        { name: "t1", passed: true },
        { name: "t2", passed: true },
        { name: "t3", passed: false },
      ],
    },
  },
  milestoneStatus: {
    clarify: "done",
    decompose: "done",
    design: "done",
    build: "done",
    review: "done",
  },
}

describe("buildCaseLabMasterySession", () => {
  it("maps the Build scenario as the unit of mastery", () => {
    const session = buildCaseLabMasterySession(lab, baseRun)
    expect(session.scenarioId).toBe("palantir-911-dispatch-build")
    expect(session.title).toBe("Palantir 911 Dispatch")
    expect(session.difficulty).toBe("medium")
    expect(session.completedAt).toBe("2026-06-25T12:45:00.000Z")
  })

  it("records under the non-DSA case-lab bucket, never a real DSA pattern (no mastery pollution)", () => {
    const session = buildCaseLabMasterySession(lab, baseRun)
    // Regression guard for PF-04: labs must not inflate arrays-hashing (or any DSA) stats.
    expect(session.pattern).toBe("case-lab")
    expect(session.pattern).not.toBe("arrays-hashing")
  })

  it("derives mastery from the build test pass rate", () => {
    const allPass = buildCaseLabMasterySession(lab, {
      ...baseRun,
      answers: {
        build: {
          ...baseRun.answers.build!,
          testResults: [
            { name: "t1", passed: true },
            { name: "t2", passed: true },
            { name: "t3", passed: true },
          ],
        },
      },
    })
    const allFail = buildCaseLabMasterySession(lab, {
      ...baseRun,
      answers: {
        build: {
          ...baseRun.answers.build!,
          testResults: [
            { name: "t1", passed: false },
            { name: "t2", passed: false },
            { name: "t3", passed: false },
          ],
        },
      },
    })
    expect(allPass.masteryScore).toBeGreaterThan(allFail.masteryScore)
    expect(allPass.performanceScore).toBe(allPass.masteryScore)
  })

  it("does not throw or NaN when no build tests were run", () => {
    const session = buildCaseLabMasterySession(lab, { ...baseRun, answers: {} })
    expect(Number.isFinite(session.masteryScore)).toBe(true)
    expect(session.completedAt).toBe("2026-06-25T12:45:00.000Z")
  })

  it("falls back to updatedAt when completedAt is absent", () => {
    const { completedAt: _omitted, ...rest } = baseRun
    const session = buildCaseLabMasterySession(lab, rest as CaseLabRun)
    expect(session.completedAt).toBe("2026-06-25T12:30:00.000Z")
  })
})
