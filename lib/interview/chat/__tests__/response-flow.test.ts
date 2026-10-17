import { describe, expect, it } from "vitest"
import {
  INTERVIEW_ENDED_MESSAGE,
  buildEndedConversationResponse,
  buildProactiveSkipResponse,
} from "../response-flow"

describe("chat response flow helpers", () => {
  it("skips proactive interviewer checks before there is enough signal", () => {
    expect(
      buildProactiveSkipResponse({
        role: "interviewer",
        isProactive: true,
        currentCode: "let i = 0",
        timeSinceLastMessage: 30,
      })
    ).toEqual({
      reply: null,
      skipped: true,
      reason: "Candidate is not silent long enough for a check-in",
    })
  })

  it("requires enough silence even when substantial starter code exists", () => {
    expect(
      buildProactiveSkipResponse({
        role: "interviewer",
        isProactive: true,
        currentCode: "let i = 0",
        timeSinceLastMessage: 120,
      })
    ).toBeNull()

    expect(
      buildProactiveSkipResponse({
        role: "interviewer",
        isProactive: true,
        currentCode: "const answer = ".padEnd(120, "x"),
        timeSinceLastMessage: 30,
      })
    ).toMatchObject({ skipped: true, reply: null })
  })

  it("detects that the interviewer already ended the session", () => {
    expect(
      buildEndedConversationResponse({
        role: "interviewer",
        context: [{ type: "assistant", message: "Best of luck with the rest of your practice." }],
      })
    ).toEqual({
      reply: null,
      conversationEnded: true,
      endMessage: INTERVIEW_ENDED_MESSAGE,
    })
  })

  it("does not end partner conversations or active interviewer conversations", () => {
    expect(
      buildEndedConversationResponse({
        role: "partner",
        context: [{ type: "assistant", message: "Best of luck with the rest of your practice." }],
      })
    ).toBeNull()

    expect(
      buildEndedConversationResponse({
        role: "interviewer",
        context: [{ type: "assistant", message: "Let's keep going." }],
      })
    ).toBeNull()
  })
})
