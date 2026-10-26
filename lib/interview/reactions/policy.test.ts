import { describe, expect, it } from "vitest"
import type { ChatRequestContext } from "../chat/request-context"
import { shouldAcknowledgeWithReaction } from "./policy"

const base: ChatRequestContext = {
  role: "interviewer",
  starterCodeLength: 0,
  messageCount: 2,
  testsHaveRun: false,
  currentCodeLength: 0,
  context: [{ type: "ai", message: "Sparra is open. Bring your findings back when ready." }],
}
const reacts = (message: string, overrides: Partial<ChatRequestContext> = {}) =>
  shouldAcknowledgeWithReaction({ ...base, message, ...overrides })

describe("interviewer reaction-only turns", () => {
  it.each([
    "sure",
    "Okay!",
    "got it",
    "understood",
    "thanks",
    "no thanks",
    "not now",
    "never mind",
    "I'm good for now",
    "I'll take it from here",
    "let me work on it",
    "I'll go work on this",
    "sure, I'll inspect the files",
    "Okay, let me read the code",
    "Let me run the tests",
    "I’m going to think about it",
    "give me a minute",
    "on it",
    "brb",
    "👍",
  ])("reacts to a standalone acknowledgment or intent to work: %s", (message) => {
    expect(reacts(message)).toBe(true)
  })
  it.each([
    "sure, but why?",
    "okay tests passed",
    "I ran the tests",
    "I'll use a hash map",
    "I think the cache sweep skips expired entries",
    "sure explain cache_sweep",
    "I'm stuck",
    "ready",
    "yes",
    "done",
    "submit",
    "end session",
    "unclear",
    "hi",
    "no thanks, explain the task instead",
    "let me run the tests but first explain the entry point",
  ])(
    "keeps substantive, ambiguous, and session-control messages on the normal path: %s",
    (message) => {
      expect(reacts(message)).toBe(false)
    }
  )
  it.each(["Would you like a hint?", "I can show you an example.", "Is the input sorted?"])(
    "does not swallow agreement to a pending question or offer: %s",
    (message) => {
      expect(reacts("sure", { context: [{ type: "ai", message }] })).toBe(false)
      expect(reacts("no thanks", { context: [{ type: "ai", message }] })).toBe(true)
    }
  )
  it.each([
    { role: "partner" as const },
    { isProactive: true },
    { isWrapUp: true },
    { isPostInterview: true },
    { hasSubmitted: true },
    { context: [] },
  ])("does not intercept ineligible turns: %j", (overrides) => {
    expect(reacts("sure", overrides)).toBe(false)
  })
  it("uses Sable's lane rather than the last Sparra question", () => {
    expect(
      reacts("sure", {
        sessionContext: {
          timeline: [
            {
              id: "1",
              lane: "interviewer",
              role: "interviewer",
              content: "Take a moment to inspect.",
            },
            { id: "2", lane: "partner", role: "ai_partner", content: "Would you like a hint?" },
          ],
        } as ChatRequestContext["sessionContext"],
      })
    ).toBe(true)
  })
})

it("classifies the raw candidate message separately from timing and code annotations", () => {
  expect(reacts("[CANDIDATE]\nsure\n[TIME: 20 min elapsed]", { candidateMessage: "sure" })).toBe(
    true
  )
  expect(reacts("sure", { candidateMessage: "sure but why?" })).toBe(false)
})
