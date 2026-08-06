import { describe, expect, it } from "vitest"
import {
  buildSemanticAnalysisPrompt,
  parseSemanticAnalysisResponse,
} from "../transcript-analysis-prompt"
import type { ProblemContext } from "../transcript-analysis-types"

/**
 * The semantic analysis prompt and its parser.
 *
 * Everything this file asserts protects one thing: a note produced here becomes
 * a recorded mistake against a real candidate and feeds their score. The
 * expensive failure is a FALSE POSITIVE, so the tests lean on what must never
 * be flagged rather than on what must be caught.
 */

const baseContext: ProblemContext = {
  title: "Two Sum",
  optimalTimeComplexity: "O(n)",
  optimalSpaceComplexity: "O(n)",
  criticalEdgeCases: ["empty input", "no valid pair"],
  scenarioType: "dsa",
}

const build = (context: ProblemContext, transcript = "USER: I'd use a hash map.") =>
  buildSemanticAnalysisPrompt({
    transcriptText: transcript,
    problemContext: context,
    existingNotes: [],
  })

describe("semantic analysis prompt", () => {
  it("includes the candidate's code when it is available", () => {
    // The whole defect: the prompt asked for "stated O(x) but actual is O(y)"
    // and was never given the code, so `actual` was not observable.
    const prompt = build({ ...baseContext, candidateCode: "def two_sum(nums, t):\n    pass" })
    expect(prompt).toContain("CANDIDATE'S FINAL CODE")
    expect(prompt).toContain("def two_sum(nums, t):")
  })

  it("asks the model to judge the code as written, not against the optimal solution", () => {
    // A candidate who writes an O(n^2) solution and correctly calls it O(n^2)
    // is RIGHT. Comparing their claim to the optimal would flag them for being
    // honest about a suboptimal answer.
    const prompt = build({ ...baseContext, candidateCode: "x = 1" })
    expect(prompt).toMatch(/NOT against the optimal/i)
    expect(prompt).toMatch(/describes its cost accurately is CORRECT/i)
  })

  it("drops the code-comparison instruction entirely when there is no code", () => {
    // Asking for a comparison against an unavailable artefact invites the model
    // to invent a verdict. Without code it may only use the transcript.
    const prompt = build(baseContext)
    expect(prompt).not.toContain("CANDIDATE'S FINAL CODE")
    expect(prompt).not.toMatch(/THE CODE ABOVE/)
    expect(prompt).toMatch(/code is NOT\s+available, so do NOT guess/i)
  })

  it("treats blank or whitespace-only code as no code", () => {
    for (const code of ["", "   \n  ", null, undefined]) {
      const prompt = build({ ...baseContext, candidateCode: code })
      expect(prompt, JSON.stringify(code)).not.toContain("CANDIDATE'S FINAL CODE")
    }
  })

  it("tells the model that an empty answer beats a guess", () => {
    expect(build(baseContext)).toMatch(/empty array is a better answer than a\s+guess/i)
  })

  it("bounds the code it sends", () => {
    // An interview solution is tens of lines; anything larger is pasted
    // boilerplate that would crowd out the conversation being analysed.
    const prompt = build({ ...baseContext, candidateCode: "y".repeat(10_000) })
    expect(prompt.match(/y+/)?.[0].length).toBeLessThanOrEqual(2500)
  })

  it("bounds the transcript it sends", () => {
    const prompt = build(baseContext, "z".repeat(20_000))
    expect(prompt.match(/z+/)?.[0].length).toBeLessThanOrEqual(6000)
  })
})

describe("semantic analysis parsing", () => {
  const AT = 1_700_000_000_000

  it("parses a well-formed array", () => {
    const notes = parseSemanticAnalysisResponse(
      `Here you go: [{"type":"wrong_complexity","userSaid":"it's O(n)","correct":"O(n^2)","context":"time"}]`,
      AT
    )
    expect(notes).toEqual([
      {
        type: "wrong_complexity",
        timestamp: AT,
        userSaid: "it's O(n)",
        correct: "O(n^2)",
        context: "time",
      },
    ])
  })

  it("returns nothing rather than throwing on unusable output", () => {
    // A scoring input that cannot be read is a reason to record no mistake,
    // never a reason to fail the feedback the candidate is waiting for.
    for (const bad of ["", "no json here", "[", "[{unclosed", "{}", "null", "[1,2,3]"]) {
      expect(() => parseSemanticAnalysisResponse(bad, AT), bad).not.toThrow()
      expect(parseSemanticAnalysisResponse(bad, AT), bad).toEqual([])
    }
  })

  it("discards note types nothing downstream can render", () => {
    // An unrecognised type used to be cast straight through into the tracker.
    const notes = parseSemanticAnalysisResponse(
      `[{"type":"vibes_off","userSaid":"hmm"},{"type":"missed_edge_case","userSaid":"ok"}]`,
      AT
    )
    expect(notes).toHaveLength(1)
    expect(notes[0].type).toBe("missed_edge_case")
  })

  it("honours the cap the prompt asks for", () => {
    const many = JSON.stringify(
      Array.from({ length: 9 }, () => ({ type: "incomplete_answer", userSaid: "x" }))
    )
    expect(parseSemanticAnalysisResponse(many, AT)).toHaveLength(3)
  })

  it("tolerates missing optional fields without inventing content", () => {
    const notes = parseSemanticAnalysisResponse(`[{"type":"confused_approach"}]`, AT)
    expect(notes[0].userSaid).toBe("")
    expect(notes[0].correct).toBeUndefined()
    expect(notes[0].context).toBeUndefined()
  })

  it("ignores non-string field types instead of passing them through", () => {
    const notes = parseSemanticAnalysisResponse(
      `[{"type":"wrong_optimality","userSaid":42,"correct":{"a":1},"context":[]}]`,
      AT
    )
    expect(notes[0].userSaid).toBe("")
    expect(notes[0].correct).toBeUndefined()
    expect(notes[0].context).toBeUndefined()
  })
})
