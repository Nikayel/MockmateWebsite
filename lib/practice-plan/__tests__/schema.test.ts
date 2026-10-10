import { describe, expect, it } from "vitest"
import { savePracticeSchema } from "../schema"
const request = {
  sourceSessionId: "source",
  scenarioId: "next",
  reminderAt: null,
  timezone: "America/Detroit",
}
describe("practice save boundary", () => {
  it("accepts a save without scheduling email", () => {
    expect(savePracticeSchema.parse(request).reminderAt).toBeNull()
  })
  it.each([
    { userId: "other" },
    { recommendation: { href: "https://external.example" } },
    { sourceSessionId: "../other" },
    { scenarioId: " bad" },
    { timezone: "Invalid/Zone" },
    { reminderAt: "tomorrow" },
  ])("rejects unsafe fields %j", (fields) => {
    expect(savePracticeSchema.safeParse({ ...request, ...fields }).success).toBe(false)
  })
})
