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
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { GEMINI_MODELS } from "./ai/model-ids"

export interface EdgeAIResponse {
  text: string
  provider: "gemini"
  latencyMs: number
}

// Initialize Gemini client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

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
    throw new Error("Gemini API key not configured")
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODELS.flash,
    generationConfig: {
      maxOutputTokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
    },
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

      // Graduated communication score based on detected signals (not binary 60/30)
      let communicationScore = 30
      if (approachExplained) communicationScore += 30
      if (complexityDiscussed) communicationScore += complexityAccurate ? 20 : 10
      if (edgeCasesConsidered) communicationScore += 10
      communicationScore = Math.min(100, communicationScore)

      return {
        ...defaultResult,
        approachExplained,
        approachQuality:
          parsed.approachQuality === "partial" ? "basic" : (parsed.approachQuality ?? "none"),
        complexityDiscussed,
        complexityAccurate,
        edgeCasesConsidered,
        statedComplexity: parsed.statedComplexity ?? null,
        communicationScore,
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
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fall through to null
  }

  return null
}
