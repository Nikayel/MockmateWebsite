import type { OpenAIReasoningEffort } from "./model-ids"

interface OpenAIChatSamplingParametersInput {
  model: string
  reasoningEffort?: OpenAIReasoningEffort
  temperature: number
}

/**
 * GPT-5.6 and GPT-6 Chat Completions reject custom sampling parameters while
 * reasoning is enabled. At `none`, temperature remains available and preserves
 * the existing conversational tuning.
 */
export function getOpenAIChatSamplingParameters({
  model,
  reasoningEffort,
  temperature,
}: OpenAIChatSamplingParametersInput): { temperature?: number } {
  const isReasoningFamily =
    model === "gpt-5.6" ||
    model.startsWith("gpt-5.6-") ||
    model === "gpt-6" ||
    model.startsWith("gpt-6-")

  if (isReasoningFamily && reasoningEffort !== "none") {
    return {}
  }

  return { temperature }
}
