import { describe, expect, it } from "vitest"
import { getOpenAIChatSamplingParameters } from "../openai-chat-options"

describe("getOpenAIChatSamplingParameters", () => {
  it("keeps temperature when GPT-6 reasoning is disabled", () => {
    expect(
      getOpenAIChatSamplingParameters({
        model: "gpt-6-luna",
        reasoningEffort: "none",
        temperature: 0.7,
      })
    ).toEqual({ temperature: 0.7 })
  })

  it.each(["medium", "high"] as const)(
    "omits temperature for GPT-6 %s reasoning",
    (reasoningEffort) => {
      expect(
        getOpenAIChatSamplingParameters({
          model: "gpt-6-luna",
          reasoningEffort,
          temperature: 0.3,
        })
      ).toEqual({})
    }
  )

  it("also fixes the GPT-5.6 rejection that triggered the scoring fallback", () => {
    expect(
      getOpenAIChatSamplingParameters({
        model: "gpt-5.6-luna",
        reasoningEffort: "xhigh",
        temperature: 0.3,
      })
    ).toEqual({})
  })

  it("leaves non-reasoning model sampling unchanged", () => {
    expect(
      getOpenAIChatSamplingParameters({
        model: "gpt-4o-mini",
        temperature: 0.4,
      })
    ).toEqual({ temperature: 0.4 })
  })
})
