import { describe, expect, it } from "vitest"
import { buildChatRequestContext } from "../request-context"

describe("buildChatRequestContext", () => {
  it("normalizes partner request data and derived counts", () => {
    const context = buildChatRequestContext({
      role: "partner",
      message: "Help me debug",
      context: [
        { type: "user", message: "I am stuck" },
        { type: "assistant", message: "What fails?" },
      ],
      currentCode: "return []",
      starterCodeLength: 3,
      testResults: [{ passed: true }],
      userContext: { full_name: "Ada Lovelace" },
    })

    expect(context).toEqual(
      expect.objectContaining({
        role: "partner",
        message: "Help me debug",
        messageCount: 2,
        testsHaveRun: true,
        currentCodeLength: 9,
        starterCodeLength: 3,
        userContext: { full_name: "Ada Lovelace" },
      })
    )
  })

  it("defaults missing optional collections and lengths safely", () => {
    const context = buildChatRequestContext({
      role: "interviewer",
      isProactive: true,
    })

    expect(context.messageCount).toBe(0)
    expect(context.testsHaveRun).toBe(false)
    expect(context.currentCodeLength).toBe(0)
    expect(context.starterCodeLength).toBe(0)
    expect(context.context).toBeUndefined()
    expect(context.testResults).toBeUndefined()
  })
})
