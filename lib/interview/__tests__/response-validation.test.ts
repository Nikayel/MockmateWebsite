import { describe, expect, it } from "vitest"
import { validateWithRetry, type ValidationContext } from "@/lib/interview/response-validation"
import { createEmptyTracker } from "@/lib/interview/interview-phases"

describe("validateWithRetry", () => {
  it("revalidates regenerated responses semantically before accepting them", async () => {
    const ctx: ValidationContext = {
      response: "Walk me through your approach before you code.",
      phase: "clarification",
      tracker: createEmptyTracker(),
      hasSubmitted: false,
      lastUserMessage: "I am reading the prompt.",
    }

    const regeneratedResponses = [
      "Tell me your plan before you start coding.",
      "Take your time reading. Any questions about the problem?",
    ]

    const result = await validateWithRetry(
      ctx,
      async () => regeneratedResponses.shift() || "Take your time.",
      async (_system, user) => ({
        text: user.includes("Tell me your plan")
          ? JSON.stringify({
              violated: true,
              rule: "no-approach-in-clarification",
              evidence: "Asks for a plan during clarification.",
              suggestion: "Only invite clarifying questions.",
            })
          : JSON.stringify({
              violated: false,
              rule: null,
              evidence: null,
              suggestion: null,
            }),
      }),
      2
    )

    expect(result.response).toBe("Take your time reading. Any questions about the problem?")
    expect(result.retries).toBe(2)
    expect(result.violations).toEqual([])
  })
})
