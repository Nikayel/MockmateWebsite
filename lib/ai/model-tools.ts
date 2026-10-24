import { z } from "zod"

/** Provider-neutral native function calls. The caller owns validation and execution. */
export interface ModelToolDefinition {
  type: "function"
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

export interface ModelToolCall {
  name: string
  args: unknown
}

const openAIToolCallSchema = z.object({
  function: z.object({ name: z.string(), arguments: z.string() }),
})
const anthropicToolCallSchema = z.object({
  type: z.literal("tool_use"),
  name: z.string(),
  input: z.unknown(),
})

export function readOpenAIToolCalls(value: unknown): ModelToolCall[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const parsed = openAIToolCallSchema.safeParse(entry)
    if (!parsed.success) return []
    try {
      return [
        {
          name: parsed.data.function.name,
          args: JSON.parse(parsed.data.function.arguments) as unknown,
        },
      ]
    } catch {
      return []
    }
  })
}

export function readAnthropicToolCalls(value: unknown): ModelToolCall[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const parsed = anthropicToolCallSchema.safeParse(entry)
    return parsed.success ? [{ name: parsed.data.name, args: parsed.data.input }] : []
  })
}
