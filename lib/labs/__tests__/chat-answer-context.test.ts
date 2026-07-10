/**
 * Tests for the interviewer chat answer-context serializer (PF-02).
 * The point of the fix: emit the candidate's REAL work, not counts.
 */

import { describe, it, expect } from "vitest"
import { buildCaseLabAnswerContext } from "../chat-answer-context"
import type { CaseLabAnswers } from "../types"

const answers: CaseLabAnswers = {
  clarify: [
    {
      dimension: "business-outcome",
      question: "Optimize time-to-dispatch or cost?",
      assumption: "Time first",
    },
    { dimension: "users", question: "Does a dispatcher confirm?", assumption: "Human-in-the-loop" },
  ],
  decompose: {
    workflow: ["Call received", "Dispatcher scans map"],
    entities: [{ name: "Incident", role: "an emergency needing a responder" }],
  },
  design: {
    api: {
      name: "recommendResponder",
      inputs: [{ name: "incident", type: "Incident" }],
      outputs: [{ name: "ranked", type: "Unit[]" }],
    },
    tradeoffs: [
      {
        decision: "Rank by",
        optionA: "ETA",
        optionB: "distance",
        choice: "ETA",
        why: "traffic-aware",
      },
    ],
    fallback: "escalate to manual when no unit in range",
  },
  build: {
    touchedFiles: ["src/dispatch.py"],
    code: "...",
    language: "python",
    testResults: [
      { name: "ranks_by_eta", passed: true },
      { name: "excludes_stale_gps", passed: false },
      { name: "empty_fallback", passed: false },
    ],
  },
}

describe("buildCaseLabAnswerContext", () => {
  it("emits the candidate's real answers, not just counts", () => {
    const ctx = buildCaseLabAnswerContext(answers, "design")
    // Real content, not "Clarify: 2 questions"
    expect(ctx).toContain("Optimize time-to-dispatch or cost?")
    expect(ctx).toContain("recommendResponder")
    expect(ctx).toContain("Rank by")
    expect(ctx).not.toMatch(/Clarify: \d+ question/)
  })

  it("surfaces the names of FAILING build tests (the key coaching signal)", () => {
    const ctx = buildCaseLabAnswerContext(answers, "build")
    expect(ctx).toContain("FAILING tests")
    expect(ctx).toContain("excludes_stale_gps")
    expect(ctx).toContain("empty_fallback")
  })

  it("places the current milestone's section first", () => {
    const ctx = buildCaseLabAnswerContext(answers, "build")
    const buildIdx = ctx.indexOf("Build —")
    const clarifyIdx = ctx.indexOf("Clarify —")
    expect(buildIdx).toBeGreaterThanOrEqual(0)
    expect(clarifyIdx).toBeGreaterThan(buildIdx)
  })

  it("returns an empty string when nothing is filled in", () => {
    expect(buildCaseLabAnswerContext({}, "clarify")).toBe("")
    expect(buildCaseLabAnswerContext(undefined, "clarify")).toBe("")
  })

  it("respects the char budget", () => {
    const ctx = buildCaseLabAnswerContext(answers, "clarify", 80)
    expect(ctx.length).toBeLessThanOrEqual(80)
    expect(ctx.endsWith("…")).toBe(true)
  })
})
