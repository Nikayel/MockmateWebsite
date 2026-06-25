/**
 * Tests for the pure parts of Case Lab feedback generation.
 */

import { describe, it, expect } from "vitest"
import { buildCaseLabFeedbackPrompt, parseCaseLabFeedback } from "../case-lab-feedback"
import type { CaseLabRun } from "../types"

const baseRun: CaseLabRun = {
  id: "run_1",
  userId: "user_1",
  caseLabId: "palantir-911-dispatch",
  mode: "practice",
  status: "in_progress",
  currentMilestone: "review",
  startedAt: "2026-06-25T12:00:00.000Z",
  updatedAt: "2026-06-25T12:30:00.000Z",
  answers: {
    clarify: [{ dimension: "scale", question: "How many calls/min?", assumption: "100/min" }],
    decompose: {
      workflow: ["receive", "triage", "dispatch"],
      entities: [{ name: "Responder", role: "a dispatchable unit" }],
    },
    design: {
      api: { name: "POST /dispatch", inputs: [], outputs: [] },
      tradeoffs: [
        { decision: "ranking", optionA: "ETA", optionB: "load", choice: "ETA", why: "life-safety" },
      ],
      fallback: "escalate to regional pool",
    },
    build: {
      touchedFiles: ["dispatch.py"],
      code: "...",
      language: "python",
      testResults: [
        { name: "t1", passed: true },
        { name: "t2", passed: false },
      ],
    },
  },
  milestoneStatus: {
    clarify: "done",
    decompose: "done",
    design: "done",
    build: "active",
    review: "locked",
  },
}

describe("buildCaseLabFeedbackPrompt", () => {
  it("summarizes each milestone in the user prompt", () => {
    const { system, user } = buildCaseLabFeedbackPrompt(baseRun)
    expect(system).toContain("JSON")
    expect(user).toContain("palantir-911-dispatch")
    expect(user).toContain("How many calls/min?")
    expect(user).toContain("Responder")
    expect(user).toContain("POST /dispatch")
    expect(user).toContain("1/2 passing")
  })

  it("does not throw when optional milestones are missing", () => {
    const sparse: CaseLabRun = { ...baseRun, answers: {} }
    expect(() => buildCaseLabFeedbackPrompt(sparse)).not.toThrow()
  })
})

describe("parseCaseLabFeedback", () => {
  it("parses a clean JSON object", () => {
    const result = parseCaseLabFeedback(
      '{"tldr":"Solid","whatWorked":["scoping"],"fixNext":["tests"],"actionPlan":["practice"]}'
    )
    expect(result.tldr).toBe("Solid")
    expect(result.whatWorked).toEqual(["scoping"])
    expect(result.fixNext).toEqual(["tests"])
  })

  it("recovers JSON from code fences and surrounding prose", () => {
    const result = parseCaseLabFeedback(
      'Here you go:\n```json\n{"tldr":"Good","whatWorked":["a"]}\n```\nthanks'
    )
    expect(result.tldr).toBe("Good")
    expect(result.whatWorked).toEqual(["a"])
  })

  it("drops non-string list items", () => {
    const result = parseCaseLabFeedback('{"whatWorked":["ok", 3, null, "two"]}')
    expect(result.whatWorked).toEqual(["ok", "two"])
  })

  it("falls back to rawFeedback when JSON is unrecoverable", () => {
    const result = parseCaseLabFeedback("the model rambled with no json")
    expect(result.rawFeedback).toBe("the model rambled with no json")
    expect(result.tldr).toBeUndefined()
  })
})
