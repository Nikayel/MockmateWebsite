import { describe, expect, it } from "vitest"
import type { ChatRequestContext } from "../chat/request-context"
import { executeInterviewerReaction, getInterviewerReactionTools } from "./tool"

const request: ChatRequestContext = {
  role: "interviewer",
  message: "Leave this with me while I investigate independently",
  starterCodeLength: 0,
  messageCount: 2,
  testsHaveRun: false,
  currentCodeLength: 0,
  context: [{ type: "ai", message: "Inspect the files before making the change." }],
}
describe("native acknowledgment capability", () => {
  it("offers one narrowly scoped tool and executes a validated call", async () => {
    expect(getInterviewerReactionTools(request)[0].function.name).toBe("acknowledge_message")
    expect(
      await executeInterviewerReaction([{ name: "acknowledge_message", args: {} }], request)
    ).toBe("acknowledged")
  })
  it.each([
    { role: "partner" as const },
    { isProactive: true },
    { isPostInterview: true },
    { hasSubmitted: true },
    { message: "Can you explain?" },
  ])("refuses ineligible contexts: %j", async (override) => {
    const context = { ...request, ...override }
    expect(getInterviewerReactionTools(context)).toEqual([])
    expect(
      await executeInterviewerReaction([{ name: "acknowledge_message", args: {} }], context)
    ).toBeUndefined()
  })
  it("rejects malformed and unrecognized tool calls", async () => {
    expect(
      await executeInterviewerReaction(
        [
          { name: "acknowledge_message", args: { text: "correct" } },
          { name: "acknowledge_message", args: null },
          { name: "other", args: {} },
        ],
        request
      )
    ).toBeUndefined()
  })
})

it("does not execute a reaction for agreement to an offered explanation", async () => {
  expect(
    await executeInterviewerReaction([{ name: "acknowledge_message", args: {} }], {
      ...request,
      message: "sure",
      context: [{ type: "ai", message: "Would you like a hint?" }],
    })
  ).toBeUndefined()
})
