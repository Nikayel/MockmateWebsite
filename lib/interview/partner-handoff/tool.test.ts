import { afterEach, describe, expect, it, vi } from "vitest"
import { buildChatRequestContext } from "../chat/request-context"
import { canOfferPartnerHandoff, executePartnerHandoff, getPartnerHandoffTools } from "./tool"
import { partnerHandoffActionSchema } from "./contract"

const request = () =>
  buildChatRequestContext({ role: "interviewer", scenarioType: "bugfix", partnerAvailable: true })
afterEach(() => vi.unstubAllEnvs())

describe("Sparra tool capability", () => {
  it.each(["bugfix", "system-design", "add-functionality"])(
    "exposes a native no-argument tool for %s",
    (scenarioType) => {
      expect(getPartnerHandoffTools({ ...request(), scenarioType })).toEqual([
        expect.objectContaining({
          type: "function",
          function: expect.objectContaining({
            name: "open_sparra",
            parameters: expect.objectContaining({ type: "object", properties: {} }),
          }),
        }),
      ])
    }
  )
  it.each([
    { partnerAvailable: false },
    { partnerAvailable: undefined },
    { role: "partner" as const },
    { scenarioType: "dsa" },
    { scenarioType: undefined },
    { scenarioType: "unknown" },
    { isProactive: true },
    { isWrapUp: true },
    { isPostInterview: true },
    { hasSubmitted: true },
  ])("does not offer or execute a handoff in an ineligible context: %j", async (overrides) => {
    const context = { ...request(), ...overrides }
    expect(getPartnerHandoffTools(context)).toBeUndefined()
    expect(
      await executePartnerHandoff([{ name: "open_sparra", args: {} }], context)
    ).toBeUndefined()
  })
  it("supports an operational kill switch", () => {
    vi.stubEnv("INTERVIEW_PARTNER_HANDOFF_ENABLED", "false")
    expect(canOfferPartnerHandoff(request())).toBe(false)
  })
  it("executes only the allowlisted tool with validated arguments", async () => {
    expect(await executePartnerHandoff([{ name: "open_sparra", args: {} }], request())).toEqual({
      type: "open_sparra",
    })
    for (const call of [
      { name: "delete_session", args: {} },
      { name: "open_sparra", args: { url: "https://example.com" } },
      { name: "open_sparra", args: null },
    ]) {
      expect(await executePartnerHandoff([call], request())).toBeUndefined()
    }
  })
  it("rejects arbitrary browser commands at the client boundary", () => {
    expect(
      partnerHandoffActionSchema.safeParse({ type: "open_sparra", script: "alert(1)" }).success
    ).toBe(false)
    expect(
      partnerHandoffActionSchema.safeParse({ type: "navigate", url: "https://example.com" }).success
    ).toBe(false)
  })
})
