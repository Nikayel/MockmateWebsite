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
 * Gemini-first with an Edge-safe DeepSeek fallback (plain fetch against the
 * OpenAI-compatible endpoint), so a Gemini outage or model retirement cannot
 * hard-fail the only runtime that has no other fallback path.
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODELS } from "./ai/model-ids"

export interface EdgeAIResponse {
  text: string
  provider: "gemini" | "deepseek"
  latencyMs: number
}

// Initialize Gemini client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

// Fallback vendor (mirrors the deepseek-chat config in lib/ai-providers.ts)
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
      model: "deepseek-chat",
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
 * Generate AI response using Gemini (Edge-compatible)
 * No caching, no usage tracking - just direct API call
 */
export async function generateAIResponseEdge(
  systemPrompt: string,
  userMessage: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<EdgeAIResponse> {
  const startTime = Date.now()

  if (!genAI) {
    if (DEEPSEEK_API_KEY) {
      return generateDeepSeekResponseEdge(systemPrompt, userMessage, options)
    }
    throw new Error("Gemini API key not configured")
  }

  try {
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
    const response = result.response
    const text = response.text()

    return {
      text,
      provider: "gemini",
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    // The Edge runtime has no other fallback path: a Gemini outage or model
    // retirement must degrade to DeepSeek here, not hard-fail streaming feedback.
    if (DEEPSEEK_API_KEY) {
      return generateDeepSeekResponseEdge(systemPrompt, userMessage, options)
    }
    throw error
  }
}

/**
 * Generate feedback response (Edge-compatible wrapper)
 */
export async function generateFeedbackResponseEdge(
  systemPrompt: string,
  userMessage: string
): Promise<EdgeAIResponse> {
  return generateAIResponseEdge(systemPrompt, userMessage, {
    maxTokens: 2048,
    temperature: 0.3,
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
  complexity: { time?: string; space?: string } | null
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
      { maxTokens: 512, temperature: 0 }
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
  }
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
      { maxTokens: 512, temperature: 0 }
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
