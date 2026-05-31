import { describe, expect, it, vi, beforeEach } from "vitest"
import { z } from "zod"

const mocks = vi.hoisted(() => ({
  generateAIResponse: vi.fn(),
}))

vi.mock("@/lib/ai-providers", () => ({
  generateAIResponse: mocks.generateAIResponse,
}))

const schema = z.object({
  answer: z.string(),
  count: z.number(),
})

describe("structured output helper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses and validates JSON from a model response", async () => {
    mocks.generateAIResponse.mockResolvedValue({
      text: '{"answer":"ok","count":2}',
      provider: "gemini",
      latencyMs: 10,
      tokensUsed: 20,
    })

    const { generateStructuredAIResponse } = await import("../structured-output")

    const response = await generateStructuredAIResponse({
      systemPrompt: "Return JSON.",
      userMessage: "Extract.",
      schema,
      schemaName: "TestSchema",
      jsonExample: '{"answer":"ok","count":1}',
    })

    expect(response.data).toEqual({ answer: "ok", count: 2 })
    expect(response.attempts).toBe(1)
    expect(response.repaired).toBe(false)
  })

  it("repairs malformed or non-schema output before giving up", async () => {
    mocks.generateAIResponse
      .mockResolvedValueOnce({
        text: "Sure, the answer is ok.",
        provider: "gemini",
        latencyMs: 10,
        tokensUsed: 20,
      })
      .mockResolvedValueOnce({
        text: '```json\n{"answer":"ok","count":2}\n```',
        provider: "gemini",
        latencyMs: 12,
        tokensUsed: 25,
      })

    const { generateStructuredAIResponse } = await import("../structured-output")

    const response = await generateStructuredAIResponse({
      systemPrompt: "Return JSON.",
      userMessage: "Extract.",
      schema,
      schemaName: "TestSchema",
      jsonExample: '{"answer":"ok","count":1}',
    })

    expect(response.data).toEqual({ answer: "ok", count: 2 })
    expect(response.attempts).toBe(2)
    expect(response.repaired).toBe(true)
    expect(mocks.generateAIResponse).toHaveBeenCalledTimes(2)
    expect(mocks.generateAIResponse.mock.calls[1][1]).toContain("previous response was not valid")
  })

  it("throws a structured error after all parse attempts fail", async () => {
    mocks.generateAIResponse.mockResolvedValue({
      text: "not json",
      provider: "gemini",
      latencyMs: 10,
      tokensUsed: 20,
    })

    const { StructuredOutputError, generateStructuredAIResponse } =
      await import("../structured-output")

    await expect(
      generateStructuredAIResponse({
        systemPrompt: "Return JSON.",
        userMessage: "Extract.",
        schema,
        schemaName: "TestSchema",
        jsonExample: '{"answer":"ok","count":1}',
      })
    ).rejects.toBeInstanceOf(StructuredOutputError)
  })
})
