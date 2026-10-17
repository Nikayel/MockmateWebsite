import { describe, expect, it } from "vitest"
import { buildChatPromptFlow } from "../prompt-flow"
import { INTERVIEW_ENDED_MESSAGE } from "../response-flow"

describe("buildChatPromptFlow", () => {
  it("keeps a time-only check-in instead of overwriting it with assumed code activity", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      isProactive: true,
      timeSinceLastMessage: 300,
      currentCodeContext: "",
      workspaceContextStr: "",
    })
    expect(result.fullUserMessage).toContain("[TIME-BASED CHECK-IN]")
    expect(result.fullUserMessage).not.toContain("candidate has been working on code")
  })

  it("a debugging check-in does not inject a DSA pattern or escalate repeated questions into hints", () => {
    const result = buildChatPromptFlow({
      scenarioType: "bugfix",
      role: "interviewer",
      isProactive: true,
      timeSinceLastMessage: 180,
      currentCode: "starter",
      currentCodeContext: "PUBLIC CODE",
      workspaceContextStr: "PUBLIC WORKSPACE",
      scenarioPattern: "arrays-hashing",
      recentNudgeTopics: ["debugging evidence"],
    })
    expect(result.fullUserMessage).toContain("[DEBUGGING CHECK-IN]")
    expect(result.fullUserMessage).toContain("PUBLIC WORKSPACE")
    expect(result.fullUserMessage).not.toContain("arrays-hashing")
    expect(result.fullUserMessage).not.toContain("CONCRETE hint")
    expect(result.fullUserMessage).toContain("Do not provide a hint unless asked")
  })

  it("includes history-derived probe limits on ordinary debugging turns, not just check-ins", () => {
    const result = buildChatPromptFlow({
      scenarioType: "bugfix",
      role: "interviewer",
      message: "I'll try that and rerun",
      currentCodeContext: "",
      workspaceContextStr: "",
      context: [
        { type: "ai", message: "What's your hypothesis?" },
        { type: "user", message: "I think status is checked too late" },
        { type: "ai", message: "What evidence supports the hypothesis?" },
      ],
    })
    expect(result.fullUserMessage).toContain("debugging hypothesis: 2 probe(s)")
    expect(result.fullUserMessage).toContain("do not paraphrase it a third time")
    expect(result.fullUserMessage).toContain("I'll try that and rerun")
  })

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
        reason: "Candidate is not silent long enough for a check-in",
      },
    })
  })

  it("builds the existing natural proactive check-in prompt", () => {
    const result = buildChatPromptFlow({
      role: "interviewer",
      isProactive: true,
      timeSinceLastMessage: 120,
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
    expect(result.fullUserMessage).toContain("frequency alone is not evidence of misuse")
    expect(result.fullUserMessage).not.toContain("blindly copied")
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
