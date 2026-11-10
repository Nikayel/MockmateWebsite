import { describe, expect, it } from "vitest"
import { buildChatRequestContext } from "../chat/request-context"
import { buildInterviewCompletionResponse } from "./response"
import { INTERVIEW_COMPLETION_REPLY, interviewCompletionActionSchema } from "./contract"

const request = () =>
  buildChatRequestContext({
    role: "interviewer",
    isPostInterview: true,
    hasSubmitted: true,
    candidateMessage: "How do I close this interview?",
  })

describe("interview completion capability", () => {
  it("returns a local closing message and action for an explicit submitted request", () => {
    expect(buildInterviewCompletionResponse(request())).toEqual({
      reply: INTERVIEW_COMPLETION_REPLY,
      action: { type: "end_interview" },
      provider: "local",
      feedbackAvailable: false,
    })
  })

  it.each([
    { role: "partner" as const },
    { isPostInterview: false },
    { isPostInterview: undefined },
    { hasSubmitted: false },
    { hasSubmitted: undefined },
    { isProactive: true },
    { isWrapUp: true },
    { candidateMessage: "" },
  ])("rejects completion outside a candidate's submitted debrief: %j", (overrides) => {
    const context = { ...request(), ...overrides }
    expect(buildInterviewCompletionResponse(context)).toBeUndefined()
  })

  it.each([
    "two events same user 1800 seconds apart -> count 1",
    "two events same user 1801 seconds apart -> count 2",
    "No nothing to add",
    "No questions",
    "I'm done with that test",
    "I don't understand the question",
    "Don't end the interview",
    "Where is the full interview score? I still have a question first.",
  ])("leaves ordinary or ambiguous debrief messages open: %j", (candidateMessage) => {
    const context = {
      ...request(),
      candidateMessage,
      context: [{ type: "ai", message: "Any questions for me?" }],
    }
    expect(buildInterviewCompletionResponse(context)).toBeUndefined()
  })

  it("uses the current candidate message, not an earlier request or presentation notes", () => {
    const context = {
      ...request(),
      candidateMessage: "two events same user 1801 seconds apart -> count 2",
      message: "Please end the interview",
      context: [{ type: "user", message: "Where can I find my interview score?" }],
    }
    expect(buildInterviewCompletionResponse(context)).toBeUndefined()
  })

  it("validates the client action strictly", () => {
    expect(
      interviewCompletionActionSchema.safeParse({ type: "end_interview", score: 100 }).success
    ).toBe(false)
  })
})
