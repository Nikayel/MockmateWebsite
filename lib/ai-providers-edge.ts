/**
 * Edge-Compatible AI Provider
 *
 * A lightweight version of ai-providers.ts that works in Edge runtime.
 * Does NOT use:
 * - Firebase (no caching, no usage tracking)
 * - Node.js crypto module
 * - Any Node.js-specific APIs
 *
 * Used by /api/feedback/stream for streaming feedback generation.
 *
 * Chain: OpenAI -> DeepSeek -> Gemini, mirroring FALLBACK_ORDER.complex in
 * lib/ai-providers.ts, because this runtime serves the same capability (feedback
 * generation). The two files must agree on vendor order or the same user action
 * gets scored by a different model depending on which runtime served it.
 *
 * All three are plain fetch except Gemini, which uses its Edge-safe SDK. This is
 * the only runtime with no other fallback path, so every rung degrades rather
 * than throwing until the last one.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { DEEPSEEK_MODELS, GEMINI_MODELS, OPENAI_MODELS } from "./ai/model-ids"

export interface EdgeAIResponse {
  text: string
  provider: "openai" | "gemini" | "deepseek"
  latencyMs: number
}

/**
 * The facts needed to price and attribute one Edge LLM call.
 *
 * The Edge runtime cannot reach Firebase Admin, so spend is reported
 * server-to-server (see lib/usage/edge-reporter.ts). Only ONE of the five LLM
 * calls behind /api/feedback/stream was doing that; the other four were free as
 * far as the cost ledger, the per-user budget cap and the daily kill-switch were
 * concerned. Every one of them funnels through generateAIResponseEdge, so the
 * hook belongs here rather than at each call site.
 */
export interface EdgeAICallRecord {
  provider: EdgeAIResponse["provider"]
  /** Full prompt as sent, for input-token estimation. */
  promptText: string
  responseText: string
  latencyMs: number
}

/**
 * Per-call usage sink. Deliberately passed through options rather than
 * registered on the module: module scope is shared across concurrent requests in
 * an Edge isolate, and a shared observer would attribute one user's spend to
 * another user's budget.
 */
export type EdgeUsageSink = (record: EdgeAICallRecord) => void

/** Common options for every Edge LLM entry point. */
export interface EdgeAIOptions {
  maxTokens?: number
  temperature?: number
  /** Invoked once, after a successful call, with what that call actually cost. */
  onUsage?: EdgeUsageSink
}

// Initialize Gemini client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""

/**
 * Reasoning effort for this runtime.
 *
 * "high", matching FALLBACK_ORDER.complex — streamed feedback is one call per
 * session against a user already waiting on a results screen, so thinking is
 * affordable here in a way it is not on the interview path.
 */
const EDGE_REASONING_EFFORT = "high"

// Second rung. V4 Pro, matching the `deepseek` provider that backs `complex`.
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""

/**
 * Edge-safe DeepSeek call: plain fetch, OpenAI-compatible chat completions.
 * Fallback path only — Gemini stays primary for cost and scoring consistency.
 */
async function generateDeepSeekResponseEdge(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<EdgeAIResponse> {
  const startTime = Date.now()

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODELS.pro,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek fallback failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error("DeepSeek fallback returned no content")
  }

  return {
    text,
    provider: "deepseek",
    latencyMs: Date.now() - startTime,
  }
}

/**
 * Edge-safe OpenAI call: plain fetch, chat completions, explicit effort.
 *
 * `reasoning_effort` is always sent. The API defaults to `medium` when it is
 * omitted, so silence here would be a different model behaviour than the Node
 * path chose for the same capability.
 */
async function generateOpenAIResponseEdge(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<EdgeAIResponse> {
  const startTime = Date.now()

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODELS.luna,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_completion_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      reasoning_effort: EDGE_REASONING_EFFORT,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    // A high-effort call can spend its whole budget thinking and return an empty
    // message. Treat that as a failure so the chain degrades, rather than
    // streaming an empty feedback body to the user.
    throw new Error(
      `OpenAI returned no content (finish_reason: ${data.choices?.[0]?.finish_reason ?? "unknown"})`
    )
  }

  return {
    text,
    provider: "openai",
    latencyMs: Date.now() - startTime,
  }
}

/**
 * Gemini rung. Last resort in this runtime.
 */
async function generateGeminiResponseEdge(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<EdgeAIResponse> {
  const startTime = Date.now()

  if (!genAI) {
    throw new Error("Gemini API key not configured")
  }

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: options?.maxTokens ?? 2048,
    temperature: options?.temperature ?? 0.3,
  }
  // gemini-3.x flash models think by default; cap the budget so streamed
  // feedback is not stalled behind unbounded thought. gemini-3.6-flash
  // rejects a 0 budget, so 1024 mirrors thinkingLevel "low" in ai-providers.
  if (GEMINI_MODELS.flash.includes("gemini-3")) {
    generationConfig.thinkingConfig = { thinkingBudget: 1024 }
  }
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODELS.flash,
    generationConfig,
    systemInstruction: systemPrompt,
  })

  const result = await model.generateContent(userMessage)

  return {
    text: result.response.text(),
    provider: "gemini",
    latencyMs: Date.now() - startTime,
  }
}

/**
 * Generate an AI response, degrading through the chain.
 *
 * Tries each configured vendor in order and only throws once every one has
 * failed. An unconfigured vendor is skipped rather than counted as a failure, so
 * a deployment missing one key still works.
 *
 * The thrown error names EVERY rung's failure, not just the last one. Surfacing
 * only the final error would report Gemini's message for an outage whose actual
 * cause was OpenAI, which is the opposite of what an operator needs: the last
 * rung is the least interesting vendor in the chain by construction.
 */
export async function generateAIResponseEdge(
  systemPrompt: string,
  userMessage: string,
  options?: EdgeAIOptions
): Promise<EdgeAIResponse> {
  const chain: Array<{
    provider: EdgeAIResponse["provider"]
    configured: boolean
    call: () => Promise<EdgeAIResponse>
  }> = [
    {
      provider: "openai",
      configured: !!OPENAI_API_KEY,
      call: () => generateOpenAIResponseEdge(systemPrompt, userMessage, options),
    },
    {
      provider: "deepseek",
      configured: !!DEEPSEEK_API_KEY,
      call: () => generateDeepSeekResponseEdge(systemPrompt, userMessage, options),
    },
    {
      provider: "gemini",
      configured: !!genAI,
      call: () => generateGeminiResponseEdge(systemPrompt, userMessage, options),
    },
  ]

  const failures: string[] = []

  for (const rung of chain) {
    if (!rung.configured) continue
    try {
      const response = await rung.call()

      // Report the spend before returning. Wrapped because accounting must
      // never break the AI path: a throwing sink would turn a successful,
      // already-paid-for call into a fallback to the next rung, billing the
      // user twice for one answer.
      if (options?.onUsage) {
        try {
          options.onUsage({
            // The rung that ANSWERED, which after a fallback is not the rung we
            // started on. Pricing is per provider, so attributing to the wrong
            // one misprices the call.
            provider: response.provider,
            promptText: `${systemPrompt}\n${userMessage}`,
            responseText: response.text,
            latencyMs: response.latencyMs,
          })
        } catch {
          // Losing a usage record costs accounting accuracy. Losing the user's
          // feedback costs the user.
        }
      }

      return response
    } catch (error) {
      failures.push(`${rung.provider}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (failures.length === 0) {
    throw new Error(
      "No AI provider configured for the Edge runtime. Set OPENAI_API_KEY, DEEPSEEK_API_KEY or GEMINI_API_KEY."
    )
  }
  throw new Error(`All Edge AI providers failed - ${failures.join("; ")}`)
}

/**
 * Generate feedback response (Edge-compatible wrapper)
 */
export async function generateFeedbackResponseEdge(
  systemPrompt: string,
  userMessage: string,
  onUsage?: EdgeUsageSink
): Promise<EdgeAIResponse> {
  return generateAIResponseEdge(systemPrompt, userMessage, {
    maxTokens: 2048,
    temperature: 0.3,
    onUsage,
  })
}

// Full ConversationValidation type for Edge runtime
export interface EdgeConversationValidation {
  isCoherent: boolean
  responsesRelevant: boolean
  approachExplained: boolean
  approachQuality: "none" | "poor" | "basic" | "good" | "excellent"
  complexityDiscussed: boolean
  complexityAccurate: boolean
  statedComplexity: string | null
  questionsAsked: number
  questionsAnswered: number
  edgeCasesConsidered: boolean
  alternativesDiscussed: boolean
  communicationScore: number
  // Additional fields for compatibility
  questionsAnsweredProperly?: number
  communicationEffort?: number
}

/**
 * Validate conversation with AI (Edge-compatible)
 * Returns full ConversationValidation for compatibility
 */
export async function validateConversationEdge(
  transcript: Array<{ role: string; content: string }>,
  code: string | null,
  complexity: { time?: string; space?: string } | null,
  onUsage?: EdgeUsageSink
): Promise<EdgeConversationValidation> {
  const defaultResult: EdgeConversationValidation = {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 30,
    questionsAnsweredProperly: 0,
    communicationEffort: 0,
  }

  if (!genAI || transcript.length === 0) {
    return defaultResult
  }

  // Full context: use entire transcript so AI has complete semantic understanding
  const MAX_MESSAGE_CHARS = 400
  const MAX_TRANSCRIPT_CHARS = 24000 // ~6k tokens; typical 60-80 message interview fits

  const formatMessage = (m: { role: string; content: string }) => {
    const content =
      m.content.length > MAX_MESSAGE_CHARS
        ? m.content.slice(0, MAX_MESSAGE_CHARS) + "..."
        : m.content
    return `${m.role.toUpperCase()}: ${content}`
  }

  const fullText = transcript.map(formatMessage).join("\n\n")
  let transcriptText: string
  if (fullText.length <= MAX_TRANSCRIPT_CHARS) {
    transcriptText = fullText
  } else {
    // Very long: include start (approach) + end (complexity/wrap-up), preserve message boundaries
    const FIRST_PART_CHARS = 16000
    const LAST_PART_CHARS = 7000
    const lines = transcript.map(formatMessage)
    const firstLines: string[] = []
    let len = 0
    for (const line of lines) {
      if (len + line.length > FIRST_PART_CHARS) break
      firstLines.push(line)
      len += line.length
    }
    const lastLines: string[] = []
    len = 0
    for (let i = lines.length - 1; i >= 0 && len < LAST_PART_CHARS; i--) {
      lastLines.unshift(lines[i])
      len += lines[i].length
    }
    transcriptText = [...firstLines, "[... middle of conversation ...]", ...lastLines].join("\n\n")
  }

  const prompt = `You are a semantic interviewer evaluator. Analyze this FULL transcript - use meaning, not keyword matching.

SEMANTIC RULES:
- approachExplained: true if they described HOW they'll solve it in ANY natural way (e.g. "I'll use a dictionary", "loop over and get frequency", "two pointers", tracing through an example)
- complexityDiscussed: true if they mentioned time/space complexity (O(n), linear, constant, etc.)
- edgeCasesConsidered: true if they discussed empty input, null, single element, boundaries, or answered edge-case questions thoughtfully

TRANSCRIPT:
${transcriptText}

${code ? `CODE:\n\`\`\`\n${code.substring(0, 1000)}\n\`\`\`` : ""}
${complexity ? `OPTIMAL: Time=${complexity.time || "?"}, Space=${complexity.space || "?"}` : ""}

Return JSON only:
{
  "approachExplained": true/false,
  "approachQuality": "none"|"poor"|"basic"|"good"|"excellent",
  "complexityDiscussed": true/false,
  "complexityAccurate": true/false,
  "edgeCasesConsidered": true/false,
  "statedComplexity": "O(n)" or null
}`

  try {
    const response = await generateAIResponseEdge(
      "You analyze interview transcripts. Return ONLY valid JSON, no markdown.",
      prompt,
      { maxTokens: 512, temperature: 0, onUsage }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const approachExplained = parsed.approachExplained ?? false
      const complexityDiscussed = parsed.complexityDiscussed ?? false
      const complexityAccurate = parsed.complexityAccurate ?? false
      const edgeCasesConsidered = parsed.edgeCasesConsidered ?? false

      // The canonical scoring path (calculateValidatedScores) derives communication from these
      // signals, so validateConversationEdge no longer computes its own graduated score.
      return {
        ...defaultResult,
        approachExplained,
        approachQuality:
          parsed.approachQuality === "partial" ? "basic" : (parsed.approachQuality ?? "none"),
        complexityDiscussed,
        complexityAccurate,
        edgeCasesConsidered,
        statedComplexity: parsed.statedComplexity ?? null,
      }
    }
  } catch {
    // Fall through to default
  }

  return defaultResult
}

/**
 * Extract conversation evidence (Edge-compatible)
 * Simplified version for Edge runtime
 */
export async function extractConversationEvidenceEdge(
  transcript: Array<{ role: string; content: string }>,
  problemContext: {
    title: string
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    criticalEdgeCases: string[]
  },
  onUsage?: EdgeUsageSink
): Promise<{
  approach: { explained: boolean; quote?: string }
  timeComplexity: { mentioned: boolean; value?: string; isCorrect?: boolean }
  edgeCases: { mentionedByCandidate: string[] }
} | null> {
  if (!genAI || transcript.length === 0) {
    return null
  }

  // Full context: all candidate messages for semantic evidence extraction
  const candidateMessages = transcript.filter((m) => m.role === "user")
  const MAX_EVIDENCE_CHARS = 12000
  const fullText = candidateMessages.map((m) => m.content).join("\n\n")
  let transcriptText: string
  if (fullText.length <= MAX_EVIDENCE_CHARS) {
    transcriptText = fullText
  } else {
    const firstPartChars = 8000
    const lastPartChars = 3500
    const firstParts: string[] = []
    let len = 0
    for (const m of candidateMessages) {
      if (len + m.content.length > firstPartChars) break
      firstParts.push(m.content)
      len += m.content.length
    }
    const lastParts: string[] = []
    len = 0
    for (let i = candidateMessages.length - 1; i >= 0 && len < lastPartChars; i--) {
      lastParts.unshift(candidateMessages[i].content)
      len += candidateMessages[i].content.length
    }
    transcriptText = `${firstParts.join("\n\n")}\n\n[... middle ...]\n\n${lastParts.join("\n\n")}`
  }

  const prompt = `Extract evidence from candidate messages:

PROBLEM: ${problemContext.title}
OPTIMAL: Time=${problemContext.optimalTimeComplexity}, Space=${problemContext.optimalSpaceComplexity}

CANDIDATE MESSAGES (full context):
${transcriptText}

Return JSON only:
{
  "approach": { "explained": true/false, "quote": "exact quote or null" },
  "timeComplexity": { "mentioned": true/false, "value": "O(n)" or null, "isCorrect": true/false/null },
  "edgeCases": { "mentionedByCandidate": ["edge case 1", ...] }
}`

  try {
    const response = await generateAIResponseEdge(
      "Extract interview evidence. Return ONLY valid JSON.",
      prompt,
      { maxTokens: 512, temperature: 0, onUsage }
    )

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      // The model's JSON is untrusted: the stream route dereferences
      // evidence.edgeCases.mentionedByCandidate, so a response missing a key
      // would crash the whole feedback stream. Normalize into the declared
      // shape with safe defaults; return null only if nothing is usable.
      const parsed: unknown = JSON.parse(jsonMatch[0])
      if (typeof parsed !== "object" || parsed === null) return null
      const record = parsed as Record<string, unknown>
      const asRecord = (value: unknown): Record<string, unknown> =>
        typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {}
      const approach = asRecord(record.approach)
      const timeComplexity = asRecord(record.timeComplexity)
      const edgeCases = asRecord(record.edgeCases)
      return {
        approach: {
          explained: approach.explained === true,
          quote: typeof approach.quote === "string" ? approach.quote : undefined,
        },
        timeComplexity: {
          mentioned: timeComplexity.mentioned === true,
          value: typeof timeComplexity.value === "string" ? timeComplexity.value : undefined,
          isCorrect:
            typeof timeComplexity.isCorrect === "boolean" ? timeComplexity.isCorrect : undefined,
        },
        edgeCases: {
          mentionedByCandidate: Array.isArray(edgeCases.mentionedByCandidate)
            ? edgeCases.mentionedByCandidate.filter(
                (item): item is string => typeof item === "string"
              )
            : [],
        },
      }
    }
  } catch {
    // Fall through to null
  }

  return null
}
