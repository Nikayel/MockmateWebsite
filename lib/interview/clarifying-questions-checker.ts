/**
 * Clarifying Questions Checker
 *
 * Uses a small LLM (Gemini Flash Lite → DeepSeek Chat → Claude Haiku)
 * to semantically match whether a candidate asked expected clarifying questions.
 *
 * This is called at the phase transition from discussion → coding in Real Interview Mode.
 * Instead of regex matching, we use semantic understanding to catch variations like:
 * - "Should I return indices or values?" matches "do I return the index or actual number?"
 *
 * Cost-optimized: Only runs once per interview, uses cheapest models.
 */

import { generateAIResponse, type AIResponse } from "@/lib/ai-providers"
import type { ClarifyingQuestion } from "@/lib/scenarios/types"
import type { ChatMessage } from "@/lib/stores/interview-store"
import { logger } from "@/lib/logger"

/**
 * Result of checking a single clarifying question
 */
export interface ClarifyingQuestionResult {
  question: string
  expected: boolean // Was this a required question?
  asked: boolean // Did the candidate ask it?
  confidence: number // 0-100, how confident the LLM is
  matchedPhrase?: string // What the candidate said that matched
}

/**
 * Overall result of the clarifying questions check
 */
export interface ClarifyingQuestionsCheckResult {
  results: ClarifyingQuestionResult[]
  totalExpected: number
  totalAsked: number
  requiredAsked: number
  requiredTotal: number
  score: number // 0-100, weighted score
  provider: string // Which LLM was used
  latencyMs: number
}

/**
 * Build the prompt for the LLM to check clarifying questions
 */
function buildCheckPrompt(
  expectedQuestions: ClarifyingQuestion[],
  conversation: ChatMessage[]
): string {
  const conversationText = conversation
    .filter((msg) => msg.type === "user")
    .map((msg) => `- "${msg.message}"`)
    .join("\n")

  const questionsToCheck = expectedQuestions
    .map((q, i) => `${i + 1}. Topic: "${q.question}" (Required: ${q.required ? "YES" : "NO"})`)
    .join("\n")

  return `You are analyzing an interview conversation to determine if the candidate asked important clarifying questions.

CANDIDATE'S MESSAGES:
${conversationText || "(No messages from candidate)"}

EXPECTED CLARIFYING QUESTIONS:
${questionsToCheck}

For each expected question, determine if the candidate asked about that topic.
Consider semantic similarity - they don't need exact wording, just the same intent.

Examples of matches:
- "Should I return indices or values?" matches "do I return the index or actual number?"
- "Can I use the same element twice?" matches "is reusing numbers allowed?"
- "Is the array sorted?" matches "can I assume the input is already in order?"

Respond in JSON format:
{
  "results": [
    {
      "questionIndex": 1,
      "asked": true,
      "confidence": 85,
      "matchedPhrase": "do I return the index or actual number?"
    },
    {
      "questionIndex": 2,
      "asked": false,
      "confidence": 95,
      "matchedPhrase": null
    }
  ]
}

Only respond with the JSON, no other text.`
}

/**
 * Parse the LLM response into structured results
 */
function parseCheckResponse(
  response: string,
  expectedQuestions: ClarifyingQuestion[]
): ClarifyingQuestionResult[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim()
    }

    const parsed = JSON.parse(jsonStr)
    const results: ClarifyingQuestionResult[] = []

    for (let i = 0; i < expectedQuestions.length; i++) {
      const expected = expectedQuestions[i]
      const result = parsed.results?.find(
        (r: any) => r.questionIndex === i + 1
      )

      results.push({
        question: expected.question,
        expected: expected.required,
        asked: result?.asked ?? false,
        confidence: result?.confidence ?? 50,
        matchedPhrase: result?.matchedPhrase || undefined,
      })
    }

    return results
  } catch (error) {
    logger.error("[ClarifyingQuestionsChecker] Failed to parse LLM response", {
      response: response.substring(0, 500),
      error,
    })

    // Return default results (all questions not asked)
    return expectedQuestions.map((q) => ({
      question: q.question,
      expected: q.required,
      asked: false,
      confidence: 0,
    }))
  }
}

/**
 * Calculate the weighted score based on which questions were asked
 * Required questions are worth more than optional ones
 */
function calculateScore(results: ClarifyingQuestionResult[]): number {
  if (results.length === 0) return 100 // No questions expected = full score

  const requiredQuestions = results.filter((r) => r.expected)
  const optionalQuestions = results.filter((r) => !r.expected)

  // Required questions are worth 70%, optional 30%
  const requiredWeight = 0.7
  const optionalWeight = 0.3

  let requiredScore = 0
  if (requiredQuestions.length > 0) {
    const requiredAsked = requiredQuestions.filter((r) => r.asked).length
    requiredScore = (requiredAsked / requiredQuestions.length) * 100 * requiredWeight
  } else {
    requiredScore = 100 * requiredWeight // No required questions = full required score
  }

  let optionalScore = 0
  if (optionalQuestions.length > 0) {
    const optionalAsked = optionalQuestions.filter((r) => r.asked).length
    optionalScore = (optionalAsked / optionalQuestions.length) * 100 * optionalWeight
  } else {
    optionalScore = 100 * optionalWeight // No optional questions = full optional score
  }

  return Math.round(requiredScore + optionalScore)
}

/**
 * Check if the candidate asked the expected clarifying questions
 *
 * @param expectedQuestions - The clarifying questions defined in the scenario
 * @param conversation - The conversation messages from the interview
 * @returns Results of the check including which questions were asked
 */
export async function checkClarifyingQuestions(
  expectedQuestions: ClarifyingQuestion[],
  conversation: ChatMessage[],
  options?: {
    userId?: string
    sessionId?: string
    scenarioId?: string
  }
): Promise<ClarifyingQuestionsCheckResult> {
  const startTime = Date.now()

  // If no questions to check, return perfect score
  if (!expectedQuestions || expectedQuestions.length === 0) {
    return {
      results: [],
      totalExpected: 0,
      totalAsked: 0,
      requiredAsked: 0,
      requiredTotal: 0,
      score: 100,
      provider: "none",
      latencyMs: 0,
    }
  }

  // If no conversation, return zero score
  const userMessages = conversation.filter((msg) => msg.type === "user")
  if (userMessages.length === 0) {
    return {
      results: expectedQuestions.map((q) => ({
        question: q.question,
        expected: q.required,
        asked: false,
        confidence: 100, // Very confident they didn't ask since they said nothing
      })),
      totalExpected: expectedQuestions.length,
      totalAsked: 0,
      requiredAsked: 0,
      requiredTotal: expectedQuestions.filter((q) => q.required).length,
      score: 0,
      provider: "none",
      latencyMs: Date.now() - startTime,
    }
  }

  try {
    const systemPrompt = "You are a precise analyzer that checks if interview questions were asked. Respond only in JSON format."
    const userMessage = buildCheckPrompt(expectedQuestions, conversation)

    // Use "simple" complexity to get cheapest providers (Flash Lite → DeepSeek Chat → Haiku)
    const response: AIResponse = await generateAIResponse(
      systemPrompt,
      userMessage,
      [],
      {
        complexity: "simple",
        temperature: 0.1, // Low temperature for consistent analysis
        userId: options?.userId,
        sessionId: options?.sessionId,
        scenarioId: options?.scenarioId,
        eventType: "chat_message", // Categorize as chat for cost tracking
        skipCache: true, // Don't cache this - each interview is unique
      }
    )

    const results = parseCheckResponse(response.text, expectedQuestions)
    const totalAsked = results.filter((r) => r.asked).length
    const requiredResults = results.filter((r) => r.expected)
    const requiredAsked = requiredResults.filter((r) => r.asked).length

    return {
      results,
      totalExpected: expectedQuestions.length,
      totalAsked,
      requiredAsked,
      requiredTotal: requiredResults.length,
      score: calculateScore(results),
      provider: response.provider,
      latencyMs: Date.now() - startTime,
    }
  } catch (error) {
    logger.error("[ClarifyingQuestionsChecker] LLM check failed", { error })

    // Return default results on error
    return {
      results: expectedQuestions.map((q) => ({
        question: q.question,
        expected: q.required,
        asked: false,
        confidence: 0,
      })),
      totalExpected: expectedQuestions.length,
      totalAsked: 0,
      requiredAsked: 0,
      requiredTotal: expectedQuestions.filter((q) => q.required).length,
      score: 0,
      provider: "error",
      latencyMs: Date.now() - startTime,
    }
  }
}

/**
 * Generate feedback about clarifying questions for the candidate
 */
export function generateClarifyingQuestionsFeedback(
  checkResult: ClarifyingQuestionsCheckResult
): string {
  if (checkResult.totalExpected === 0) {
    return ""
  }

  const lines: string[] = []

  // Score-based header
  if (checkResult.score >= 80) {
    lines.push("**Clarifying Questions: Excellent!**")
    lines.push("You asked great clarifying questions before diving into the solution.")
  } else if (checkResult.score >= 50) {
    lines.push("**Clarifying Questions: Good Start**")
    lines.push("You asked some clarifying questions, but missed a few important ones.")
  } else {
    lines.push("**Clarifying Questions: Needs Improvement**")
    lines.push("In real interviews, asking clarifying questions shows strong problem-solving skills.")
  }

  // Required questions that were missed
  const missedRequired = checkResult.results.filter((r) => r.expected && !r.asked)
  if (missedRequired.length > 0) {
    lines.push("")
    lines.push("**Questions you should have asked:**")
    missedRequired.forEach((q) => {
      lines.push(`- ${q.question}`)
    })
  }

  // Questions they did ask (positive reinforcement)
  const askedQuestions = checkResult.results.filter((r) => r.asked)
  if (askedQuestions.length > 0) {
    lines.push("")
    lines.push("**Good questions you asked:**")
    askedQuestions.forEach((q) => {
      lines.push(`- ${q.question}${q.matchedPhrase ? ` (you asked: "${q.matchedPhrase}")` : ""}`)
    })
  }

  return lines.join("\n")
}
