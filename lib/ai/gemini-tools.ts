import type { FunctionDeclarationSchema } from "@google/generative-ai"
import type { ModelToolDefinition } from "./model-tools"

// Gemini accepts the OpenAPI subset of JSON Schema, without these keywords.
function geminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(geminiSchema)
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "additionalProperties" && key !== "$schema")
      .map(([key, nested]) => [key, geminiSchema(nested)])
  )
}

export function toGeminiTools(tools: ModelToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map(({ function: fn }) => ({
        name: fn.name,
        description: fn.description,
        // Gemini rejects empty parameter schemas; a no-argument function omits it.
        ...(Object.keys(fn.parameters.properties ?? {}).length
          ? {
              parameters: geminiSchema(fn.parameters) as FunctionDeclarationSchema,
            }
          : {}),
      })),
    },
  ]
}
