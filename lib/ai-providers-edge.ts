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
    model: "gemini-2.5-flash",
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

  const transcriptText = transcript
    .slice(-15) // Last 15 messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")

  const prompt = `Analyze this interview transcript and extract:

TRANSCRIPT:
${transcriptText.substring(0, 6000)}

${code ? `CODE:\n\`\`\`\n${code.substring(0, 1000)}\n\`\`\`` : ""}
${complexity ? `OPTIMAL: Time=${complexity.time || "?"}, Space=${complexity.space || "?"}` : ""}

Return JSON only:
{
  "approachExplained": true/false,
  "approachQuality": "none"|"partial"|"good"|"excellent",
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
      return {
        ...defaultResult,
        approachExplained: parsed.approachExplained ?? false,
        approachQuality: parsed.approachQuality ?? "none",
        complexityDiscussed: parsed.complexityDiscussed ?? false,
        complexityAccurate: parsed.complexityAccurate ?? false,
        edgeCasesConsidered: parsed.edgeCasesConsidered ?? false,
        statedComplexity: parsed.statedComplexity ?? null,
        communicationScore: parsed.approachExplained ? 60 : 30,
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

  const transcriptText = transcript
    .filter((m) => m.role === "user")
    .slice(-10)
    .map((m) => m.content)
    .join("\n\n")

  const prompt = `Extract evidence from candidate messages:

PROBLEM: ${problemContext.title}
OPTIMAL: Time=${problemContext.optimalTimeComplexity}, Space=${problemContext.optimalSpaceComplexity}

CANDIDATE MESSAGES:
${transcriptText.substring(0, 4000)}

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
