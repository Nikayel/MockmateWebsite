import { describe, expect, it, vi } from "vitest"

// The builder class constructs a retriever on instantiation; these mocks keep the
// pure-text buildComplexityContext testable without vector-DB/profile clients.
vi.mock("@/lib/rag/retrieval/advanced-retrieval", () => ({
  getAdvancedRetriever: () => ({}),
}))
vi.mock("@/lib/rag/enhanced-user-profile", () => ({
  getEnhancedProfileService: () => ({}),
}))
vi.mock("@/lib/rag/misconception-detection", () => ({
  getMisconceptionTracker: () => ({}),
}))

import { buildComplexityContext } from "@/lib/rag/context-builder"

/**
 * Guards the anti-anchoring rules added after session 2Iz2oYpGQxs6UNo6s7Hd:
 * the interviewer re-asked one visited-state question six times because the
 * candidate's valid prune-to-empty memoization pattern-matched a documented
 * "common mistake". These strings are what tell the model to verify against
 * the candidate's actual code and to stop probing after two attempts.
 */
describe("buildComplexityContext interviewer guidance", () => {
  const context = buildComplexityContext("dsa-course-schedule")

  it("tells the interviewer to verify a claim against actual code before probing", () => {
    expect(context).toContain("FIRST, verify they are actually wrong")
    expect(context).toContain("judge what the candidate actually wrote")
  })

  it("caps probing at two attempts and prescribes the concrete-trace tactic", () => {
    expect(context).toContain("TWO-PROBE LIMIT")
    expect(context).toContain("at most TWO probing questions about any single concern")
    expect(context).toContain("NEVER rephrase the same question a third time")
  })

  it("frames common mistakes as patterns to verify, not verdicts", () => {
    expect(context).toContain("verify against their ACTUAL code before treating one as present")
  })

  it("does not tell the interviewer to say a forbidden validation phrase", () => {
    // "Good analysis" tripped the no-validation-phrases critical guardrail and
    // forced regenerations every time the model obeyed this line.
    expect(context).not.toContain("Good analysis")
  })

  it("course-schedule knowledge names the valid third-state alternatives", () => {
    expect(context).toContain("clearing a node's adjacency list once fully explored")
  })

  it("still returns empty for problems with no knowledge", () => {
    expect(buildComplexityContext("dsa-not-a-real-problem")).toBe("")
  })
})
