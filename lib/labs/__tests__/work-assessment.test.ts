/**
 * Tests for the empty-completion guard assessment (PF-03).
 */

import { describe, it, expect } from "vitest"
import { assessCaseLabWork } from "../work-assessment"
import type { CaseLabAnswers } from "../types"

describe("assessCaseLabWork", () => {
  it("treats a blank run as non-substantive with every content milestone empty", () => {
    const w = assessCaseLabWork({})
    expect(w.isSubstantive).toBe(false)
    expect(w.filledCount).toBe(0)
    expect(w.emptyMilestones).toEqual(["clarify", "decompose", "design", "build"])
    expect(w.buildRan).toBe(false)
  })

  it("treats undefined answers as blank", () => {
    expect(assessCaseLabWork(undefined).isSubstantive).toBe(false)
  })

  it("ignores whitespace-only fields", () => {
    const answers: CaseLabAnswers = {
      clarify: [{ dimension: "x", question: "   ", assumption: "" }],
      decompose: { workflow: ["  "], entities: [{ name: " ", role: "" }] },
    }
    const w = assessCaseLabWork(answers)
    expect(w.filled.clarify).toBe(false)
    expect(w.filled.decompose).toBe(false)
    expect(w.isSubstantive).toBe(false)
  })

  it("is substantive as soon as Build tests have run, even if nothing else is filled", () => {
    const answers: CaseLabAnswers = {
      build: {
        touchedFiles: ["a.py"],
        code: "x",
        language: "python",
        testResults: [{ name: "t1", passed: false }],
      },
    }
    const w = assessCaseLabWork(answers)
    expect(w.buildRan).toBe(true)
    expect(w.isSubstantive).toBe(true)
  })

  it("is substantive with two filled content milestones and no Build run", () => {
    const answers: CaseLabAnswers = {
      clarify: [{ dimension: "x", question: "what is best?", assumption: "fastest" }],
      design: { api: { name: "rank", inputs: [], outputs: [] }, tradeoffs: [], fallback: "" },
    }
    const w = assessCaseLabWork(answers)
    expect(w.filledCount).toBe(2)
    expect(w.isSubstantive).toBe(true)
    expect(w.emptyMilestones).toEqual(["decompose", "build"])
  })

  it("stays non-substantive with a single filled milestone and no Build", () => {
    const answers: CaseLabAnswers = {
      clarify: [{ dimension: "x", question: "one question", assumption: "" }],
    }
    expect(assessCaseLabWork(answers).isSubstantive).toBe(false)
  })
})
