import { describe, expect, it } from "vitest"
import { buildChatRequestContext } from "../chat/request-context"
import { executeInterviewCompletion, getInterviewCompletionTools } from "./tool"
import { interviewCompletionActionSchema } from "./contract"

const request = () =>
  buildChatRequestContext({
    role: "interviewer",
    isPostInterview: true,
    hasSubmitted: true,
    candidateMessage: "How do I close this interview?",
  })

describe("interview completion capability", () => {
  it("offers a native no-argument tool in the submitted debrief", async () => {
    expect(getInterviewCompletionTools(request())).toMatchObject([
      { type: "function", function: { name: "end_interview", parameters: { properties: {} } } },
    ])
    expect(
      await executeInterviewCompletion([{ name: "end_interview", args: {} }], request())
    ).toEqual({
      type: "end_interview",
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
  ])("rejects completion outside a candidate's submitted debrief: %j", async (overrides) => {
    const context = { ...request(), ...overrides }
    expect(getInterviewCompletionTools(context)).toEqual([])
    expect(
      await executeInterviewCompletion([{ name: "end_interview", args: {} }], context)
    ).toBeUndefined()
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
  ])("rejects an unsolicited model completion after %j", async (candidateMessage) => {
    const context = {
      ...request(),
      candidateMessage,
      context: [{ type: "ai", message: "Any questions for me?" }],
    }
    expect(getInterviewCompletionTools(context)).toEqual([])
    expect(
      await executeInterviewCompletion([{ name: "end_interview", args: {} }], context)
    ).toBeUndefined()
  })

  it("uses the current candidate message, not an earlier request or presentation notes", async () => {
    const context = {
      ...request(),
      candidateMessage: "two events same user 1801 seconds apart -> count 2",
      message: "Please end the interview",
      context: [{ type: "user", message: "Where can I find my interview score?" }],
    }
    expect(getInterviewCompletionTools(context)).toEqual([])
    expect(
      await executeInterviewCompletion([{ name: "end_interview", args: {} }], context)
    ).toBeUndefined()
  })

  it.each([
    { name: "open_score_url", args: {} },
    { name: "end_interview", args: { url: "https://example.com" } },
    { name: "end_interview", args: null },
  ])("validates the tool name and arguments: %j", async (call) => {
    expect(await executeInterviewCompletion([call], request())).toBeUndefined()
  })

  it("validates the client action strictly", () => {
    expect(
      interviewCompletionActionSchema.safeParse({ type: "end_interview", score: 100 }).success
    ).toBe(false)
  })
})
