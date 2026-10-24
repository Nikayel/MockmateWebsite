import { describe, expect, it } from "vitest"
import { readOpenAIToolCalls, readAnthropicToolCalls } from "../model-tools"
import { toGeminiTools } from "../gemini-tools"

describe("native model tool adapters", () => {
  it("parses OpenAI-compatible calls and ignores malformed arguments", () => {
    expect(
      readOpenAIToolCalls([
        { function: { name: "open_sparra", arguments: "{}" } },
        { function: { name: "broken", arguments: "{" } },
        { name: "unstructured" },
      ])
    ).toEqual([{ name: "open_sparra", args: {} }])
    expect(readOpenAIToolCalls(null)).toEqual([])
  })
  it("reads Anthropic tool blocks separately from text", () => {
    expect(
      readAnthropicToolCalls([
        { type: "text", text: "Hi" },
        { type: "tool_use", name: "open_sparra", input: {} },
      ])
    ).toEqual([{ name: "open_sparra", args: {} }])
  })
  it("omits empty Gemini parameter schemas and preserves non-empty parameters", () => {
    const fn = {
      name: "open_sparra",
      description: "Open the partner",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    }
    expect(toGeminiTools([{ type: "function", function: fn }])[0].functionDeclarations[0]).toEqual({
      name: fn.name,
      description: fn.description,
    })
    const parameters = {
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
      additionalProperties: false,
    }
    expect(
      toGeminiTools([{ type: "function", function: { ...fn, parameters } }])[0]
        .functionDeclarations[0].parameters
    ).toEqual({
      type: "object",
      properties: { question: { type: "string" } },
      required: ["question"],
    })
  })
})
