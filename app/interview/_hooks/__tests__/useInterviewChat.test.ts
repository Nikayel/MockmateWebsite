import { describe, expect, it } from "vitest"
import { isSessionConclusionMessage } from "../useInterviewChat"

describe("isSessionConclusionMessage", () => {
  it("treats a bare 'done' as a conclusion request", () => {
    expect(isSessionConclusionMessage("done")).toBe(true)
    expect(isSessionConclusionMessage("Done.")).toBe(true)
    expect(isSessionConclusionMessage("  DONE!  ")).toBe(true)
  })

  it("does not conclude when 'done' is part of reflective debrief prose", () => {
    expect(isSessionConclusionMessage("I could have done better on edge cases")).toBe(false)
  })

  it("does not conclude when 'all good' / 'i'm good' appear mid-sentence", () => {
    expect(
      isSessionConclusionMessage("all good on the loop, but the recursion tripped me up")
    ).toBe(false)
    expect(isSessionConclusionMessage("I'm good at recursion but weak on graphs")).toBe(false)
  })

  it("still concludes on the bare ambiguous signals", () => {
    expect(isSessionConclusionMessage("all good")).toBe(true)
    expect(isSessionConclusionMessage("I'm good")).toBe(true)
  })

  it("matches 'conclude' on word boundaries but not inside other words", () => {
    expect(isSessionConclusionMessage("Let's conclude")).toBe(true)
    expect(isSessionConclusionMessage("I concluded the array was already sorted")).toBe(false)
    expect(isSessionConclusionMessage("In conclusion, my approach was O(n)")).toBe(false)
  })

  it("matches unambiguous multi-word phrases anywhere in the message", () => {
    expect(isSessionConclusionMessage("No thanks, I think that's everything")).toBe(true)
    expect(isSessionConclusionMessage("I have no questions for you")).toBe(true)
    expect(isSessionConclusionMessage("that's all from me")).toBe(true)
    expect(isSessionConclusionMessage("let's wrap up here")).toBe(true)
    expect(isSessionConclusionMessage("I'm done here")).toBe(true)
  })
})
