import { describe, expect, it } from "vitest"
import { buildChatPromptFlow } from "../prompt-flow"
import { INTERVIEW_ENDED_MESSAGE } from "../response-flow"

describe("buildChatPromptFlow", () => {
  it("returns a proactive skip response before enough signal", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      isProactive: true,
      currentCode: "let i = 0",
      currentCodeContext: "",
      workspaceContextStr: "",
      timeSinceLastMessage: 30,
    })

    expect(result).toEqual({
      earlyResponse: {
        reply: null,
        skipped: true,
        reason: "Not enough code to comment on yet and not silent long enough",
      },
    })
  })

  it("builds the existing natural proactive check-in prompt", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      isProactive: true,
      currentCode:
        "function twoSum(nums, target) { const seen = new Map(); for (let i = 0; i < nums.length; i++) { const need = target - nums[i]; } }",
      currentCodeContext: "\nCODE HERE",
      workspaceContextStr: "",
      scenarioPattern: "arrays-hashing",
      partnerMessagesCount: 5,
      lastPartnerExchange: "Use a map.",
      recentNudgeTopics: ["complexity"],
      userAnsweredTopics: ["approach"],
    })

    expect(result.fullUserMessage).toContain("[NATURAL CHECK-IN]")
    expect(result.fullUserMessage).toContain("CODE HERE")
    expect(result.fullUserMessage).toContain("arrays-hashing")
    expect(result.fullUserMessage).toContain("HIGH AI USAGE")
    expect(result.fullUserMessage).toContain("AVOID REPEATING THESE TOPICS")
    expect(result.fullUserMessage).toContain("CANDIDATE HAS ALREADY ANSWERED")
  })

  it("builds wrap-up debrief prompts with test status", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      isWrapUp: true,
      currentCodeContext: "\nFINAL CODE",
      workspaceContextStr: "",
      testResults: [{ passed: true }, { passed: false }],
      elapsedMinutes: 12,
    })

    expect(result.fullUserMessage).toContain("[INTERVIEW DEBRIEF]")
    expect(result.fullUserMessage).toContain("TEST RESULTS: 1/2 tests passed")
    expect(result.fullUserMessage).toContain("STATUS: DID NOT PASS")
    expect(result.fullUserMessage).toContain("Time spent: 12 minutes")
  })

  it("returns ended-conversation response when the interviewer already closed", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      message: "Actually one more question",
      currentCodeContext: "",
      workspaceContextStr: "",
      context: [{ type: "assistant", message: "Best of luck with your interview." }],
    })

    expect(result).toEqual({
      earlyResponse: {
        reply: null,
        conversationEnded: true,
        endMessage: INTERVIEW_ENDED_MESSAGE,
      },
    })
  })

  it("builds normal messages with workspace, code, and answered-topic context", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      message: "Let's continue",
      currentCodeContext: "\nCODE",
      workspaceContextStr: "\nWORKSPACE",
      userAnsweredTopics: ["edge cases"],
    })

    expect(result.fullUserMessage).toContain("Let's continue")
    expect(result.fullUserMessage).toContain("WORKSPACE")
    expect(result.fullUserMessage).toContain("CODE")
    expect(result.fullUserMessage).toContain("edge cases")
  })
})
