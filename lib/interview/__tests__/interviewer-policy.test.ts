import { describe, expect, it } from "vitest"
import { createEmptyTracker } from "../interview-phases"
import { buildPreLLMInterviewerPolicy, formatPreLLMInterviewerPolicy } from "../interviewer-policy"

describe("buildPreLLMInterviewerPolicy", () => {
  it("keeps clarification phase away from approach prompts", () => {
    const policy = buildPreLLMInterviewerPolicy({
      phase: "clarification",
      hasSubmitted: false,
      testsHaveRun: false,
      testsPassed: 0,
      testsTotal: 0,
    })

    expect(policy.rules.join(" ")).toContain("do not ask about approach")
    expect(policy.requiredAction).toContain("reading/clarification")
  })

  it("forces approach before coding transitions", () => {
    const tracker = createEmptyTracker()

    const policy = buildPreLLMInterviewerPolicy({
      phase: "discussion",
      tracker,
      hasSubmitted: false,
      testsHaveRun: false,
      testsPassed: 0,
      testsTotal: 0,
    })

    expect(policy.rules.join(" ")).toContain("Missing before coding: approach")
    expect(policy.requiredAction).toBe(
      "Ask the candidate to walk through their approach before coding."
    )
  })

  it("asks complexity before edge cases after approach is explained", () => {
    const tracker = {
      ...createEmptyTracker(),
      approachExplained: true,
      approachQuality: "specific" as const,
    }

    const policy = buildPreLLMInterviewerPolicy({
      phase: "coding",
      tracker,
      hasSubmitted: false,
      testsHaveRun: false,
      testsPassed: 0,
      testsTotal: 0,
    })

    expect(policy.rules.join(" ")).toContain("time and space complexity")
    expect(policy.requiredAction).toBe(
      "Ask one question about the expected time and space complexity."
    )
  })

  it("guides to submit when testing topics are complete", () => {
    const tracker = {
      ...createEmptyTracker(),
      approachExplained: true,
      timeComplexityMentioned: true,
      timeComplexityValue: "O(n)",
      edgeCasesMentioned: ["empty input"],
      hasRunTests: true,
    }

    const policy = buildPreLLMInterviewerPolicy({
      phase: "testing",
      tracker,
      hasSubmitted: false,
      testsHaveRun: true,
      testsPassed: 4,
      testsTotal: 4,
    })

    expect(policy.rules.join(" ")).toContain("Do not ask another technical question")
    expect(policy.requiredAction).toBe(
      "Briefly acknowledge the passing tests, then guide the candidate to Submit."
    )
  })

  it("formats an empty policy as empty text", () => {
    expect(formatPreLLMInterviewerPolicy({ rules: [] })).toBe("")
  })
})
