import { describe, expect, it } from "vitest"
import { deriveInterviewPhase, type PhaseDerivationInput } from "../useInterviewPhaseTracking"

// The hook wires React state + setters; the testable logic is the pure phase
// derivation (node env, no React renderer).
const base: PhaseDerivationInput = {
  showPostInterviewDiscussion: false,
  showFeedback: false,
  testResultsLength: 0,
  codeLength: 0,
  approachExplained: false,
  interviewerMessagesLength: 0,
}

describe("deriveInterviewPhase", () => {
  it("returns to coding when a debugging patch changes after a run", () => {
    expect(
      deriveInterviewPhase({
        ...base,
        scenarioType: "bugfix",
        hasCodeChanges: true,
        testResultsLength: 2,
        testsAreCurrent: false,
      })
    ).toBe("coding")
  })
  it("does not mistake a long debugging starter for candidate coding", () => {
    expect(deriveInterviewPhase({ ...base, scenarioType: "bugfix", codeLength: 5000 })).toBe(
      "clarification"
    )
  })

  it("treats untouched baseline failures as investigation, not patch verification", () => {
    expect(deriveInterviewPhase({ ...base, scenarioType: "bugfix", testResultsLength: 2 })).toBe(
      "discussion"
    )
    expect(deriveInterviewPhase({ ...base, scenarioType: "bugfix", hasCodeChanges: true })).toBe(
      "coding"
    )
  })
  it("prioritizes post-interview over everything", () => {
    expect(
      deriveInterviewPhase({
        ...base,
        showPostInterviewDiscussion: true,
        showFeedback: true,
        testResultsLength: 5,
        codeLength: 999,
      })
    ).toBe("post_interview")
  })

  it("returns complete when feedback is shown", () => {
    expect(deriveInterviewPhase({ ...base, showFeedback: true, testResultsLength: 3 })).toBe(
      "complete"
    )
  })

  it("returns testing once tests have run", () => {
    expect(deriveInterviewPhase({ ...base, testResultsLength: 1, codeLength: 999 })).toBe("testing")
  })

  it("returns coding when meaningful code exists (>50 chars)", () => {
    expect(deriveInterviewPhase({ ...base, codeLength: 51 })).toBe("coding")
    expect(deriveInterviewPhase({ ...base, codeLength: 50 })).not.toBe("coding")
  })

  it("returns discussion once approach is explained", () => {
    expect(deriveInterviewPhase({ ...base, approachExplained: true })).toBe("discussion")
  })

  it("returns intro for a fresh conversation (<=2 interviewer messages)", () => {
    expect(deriveInterviewPhase({ ...base, interviewerMessagesLength: 2 })).toBe("intro")
  })

  it("defaults to discussion for a longer conversation with no other signal", () => {
    expect(deriveInterviewPhase({ ...base, interviewerMessagesLength: 5 })).toBe("discussion")
  })
})
