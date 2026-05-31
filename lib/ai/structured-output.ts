import { z } from "zod"
import {
  generateAIResponse,
  type AIProvider,
  type AIResponse,
  type TaskComplexity,
} from "@/lib/ai-providers"
import type { RateLimitTier } from "@/lib/rate-limiter"

export interface GenerateStructuredAIResponseOptions<T> {
  systemPrompt: string
  userMessage: string
  history?: Array<{ role: "user" | "model"; content: string }>
  schema: z.ZodType<T>
  schemaName: string
  jsonExample: string
  complexity?: TaskComplexity
  preferredProvider?: AIProvider
  maxProviderRetries?: number
  maxParseAttempts?: number
  temperature?: number
  userId?: string
  userTier?: RateLimitTier
  sessionId?: string
  scenarioId?: string
  eventType?: "chat_message" | "feedback_generation" | "hint_request"
  skipRateLimit?: boolean
}

export interface StructuredAIResponse<T> {
  data: T
  rawText: string
  provider: AIResponse["provider"]
  latencyMs: number
  tokensUsed?: number
  attempts: number
  repaired: boolean
}

export class StructuredOutputError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
    public readonly attempts: number,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = "StructuredOutputError"
  }
}

export function extractJsonObjectText(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = codeBlockMatch ? codeBlockMatch[1] : text
  const jsonMatch = candidate.match(/\{[\s\S]*\}/)

  return jsonMatch ? jsonMatch[0] : null
}

export function parseStructuredJson<T>(
  text: string,
  schema: z.ZodType<T>
): { data: T; jsonText: string } {
  const jsonText = extractJsonObjectText(text)
  if (!jsonText) {
    throw new StructuredOutputError("No JSON object found in model response.", text, 1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    throw new StructuredOutputError("Model response contained invalid JSON.", text, 1, error)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new StructuredOutputError(
      `Model JSON did not match schema: ${result.error.errors
        .map((issue) => `${issue.path.join(".") || "root"} ${issue.message}`)
        .join("; ")}`,
      text,
      1,
      result.error
    )
  }

  return { data: result.data, jsonText }
}

export async function generateStructuredAIResponse<T>(
  options: GenerateStructuredAIResponseOptions<T>
): Promise<StructuredAIResponse<T>> {
  const {
    systemPrompt,
    userMessage,
    history = [],
    schema,
    schemaName,
    jsonExample,
    complexity = "simple",
    preferredProvider,
    maxProviderRetries,
    maxParseAttempts = 2,
    temperature = 0.1,
    userId,
    userTier,
    sessionId,
    scenarioId,
    eventType = "chat_message",
    skipRateLimit,
  } = options

  const structuredSystemPrompt = `${systemPrompt}

STRUCTURED OUTPUT CONTRACT:
- Return ONLY valid JSON.
- The JSON must match the ${schemaName} schema.
- Do not include markdown, code fences, commentary, or trailing text.
- Example JSON shape:
${jsonExample}`

  let lastRawText = ""
  let lastError: unknown
  let lastResponse: AIResponse | undefined

  for (let attempt = 1; attempt <= maxParseAttempts; attempt++) {
    const isRepairAttempt = attempt > 1
    const prompt = isRepairAttempt
      ? `Your previous response was not valid ${schemaName} JSON.

Previous response:
${lastRawText}

Parse error:
${lastError instanceof Error ? lastError.message : String(lastError)}

Return ONLY corrected JSON matching this example shape:
${jsonExample}`
      : userMessage

    lastResponse = await generateAIResponse(structuredSystemPrompt, prompt, history, {
      complexity,
      preferredProvider,
      maxRetries: maxProviderRetries,
      temperature,
      userId,
      userTier,
      sessionId,
      scenarioId,
      eventType,
      skipCache: true,
      skipRateLimit,
    })

    lastRawText = lastResponse.text

    try {
      const { data } = parseStructuredJson(lastRawText, schema)
      return {
        data,
        rawText: lastRawText,
        provider: lastResponse.provider,
        latencyMs: lastResponse.latencyMs,
        tokensUsed: lastResponse.tokensUsed,
        attempts: attempt,
        repaired: isRepairAttempt,
      }
    } catch (error) {
      lastError = error
    }
  }

  throw new StructuredOutputError(
    `Failed to produce valid ${schemaName} JSON after ${maxParseAttempts} attempt(s).`,
    lastRawText,
    maxParseAttempts,
    lastError
  )
}
