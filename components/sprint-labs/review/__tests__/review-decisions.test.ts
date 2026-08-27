import { describe, expect, it } from "vitest"
import { canSendPushBack, isDecided, resolveVerdict } from "../review-decisions"

describe("isDecided", () => {
  it("is false for undecided and an in-progress push-back draft", () => {
    expect(isDecided({ kind: "undecided" })).toBe(false)
    expect(isDecided({ kind: "pushing-back", reasonDraft: "" })).toBe(false)
    expect(isDecided({ kind: "pushing-back", reasonDraft: "a reason" })).toBe(false)
  })

  it("is true once accepted or sent", () => {
    expect(isDecided({ kind: "accepted" })).toBe(true)
    expect(isDecided({ kind: "pushed-back", reason: "a reason" })).toBe(true)
  })
})

describe("canSendPushBack", () => {
  it("is disabled while the reason is empty or whitespace-only, with no length minimum otherwise", () => {
    expect(canSendPushBack({ kind: "pushing-back", reasonDraft: "" })).toBe(false)
    expect(canSendPushBack({ kind: "pushing-back", reasonDraft: "   " })).toBe(false)
    expect(canSendPushBack({ kind: "pushing-back", reasonDraft: "x" })).toBe(true)
  })

  it("is false for any other state", () => {
    expect(canSendPushBack({ kind: "undecided" })).toBe(false)
    expect(canSendPushBack({ kind: "accepted" })).toBe(false)
  })
})

describe("resolveVerdict", () => {
  it("names all four real (decision, correctness) combinations", () => {
    expect(resolveVerdict({ kind: "accepted" }, true)).toBe("correct")
    expect(resolveVerdict({ kind: "accepted" }, false)).toBe("accepted-wrong")
    expect(resolveVerdict({ kind: "pushed-back", reason: "r" }, false)).toBe("right-pushback")
    expect(resolveVerdict({ kind: "pushed-back", reason: "r" }, true)).toBe(
      "pushed-back-on-correct"
    )
  })

  it("is null for an undecided or in-progress comment", () => {
    expect(resolveVerdict({ kind: "undecided" }, true)).toBeNull()
    expect(resolveVerdict({ kind: "pushing-back", reasonDraft: "x" }, true)).toBeNull()
  })
})
