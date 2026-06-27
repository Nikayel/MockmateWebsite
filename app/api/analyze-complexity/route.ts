import { NextRequest, NextResponse } from "next/server"
import { generateAIResponse } from "@/lib/ai-providers"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"

// Bound the input we will forward to the LLM (prevents oversized prompts
// inflating cost). Matches the chat route's currentCode ceiling.
const MAX_CODE_LENGTH = 100_000
const MAX_PROMPT_LENGTH = 20_000

/**
 * API endpoint for LLM-based code complexity analysis.
 * Uses an LLM to semantically analyze code instead of regex patterns.
 *
 * SECURITY: this is a cost-bearing (paid LLM) endpoint. It is protected by
 * IP rate limiting + auth requirement so signed-out callers cannot drive
 * unbounded model spend, and usage is attributed to the verified user.
 */
export async function POST(request: NextRequest) {
  // Layer 1: IP-based rate limiting (uses the platform-trusted client IP).
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Layer 2: require a signed-in user (rejects anonymous/guest with 401).
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }
  const userId = quotaResult.userId

  try {
    const body = await request.json()
    const { systemPrompt, userPrompt, code, language } = body

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 })
    }

    if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "Code is invalid or too large" }, { status: 400 })
    }

    if (
      (typeof systemPrompt === "string" && systemPrompt.length > MAX_PROMPT_LENGTH) ||
      (typeof userPrompt === "string" && userPrompt.length > MAX_PROMPT_LENGTH)
    ) {
      return NextResponse.json({ error: "Prompt too large" }, { status: 400 })
    }

    // Use a fast model for complexity analysis (it's a focused task)
    const aiResponse = await generateAIResponse(systemPrompt, userPrompt, [], {
      complexity: "simple", // Fast response for simple analysis
      userId, // verified user for cost attribution
      eventType: "chat_message",
    })
    const response = aiResponse.text

    // Parse the JSON response from the LLM
    let result
    try {
      // Clean up potential markdown code blocks
      let cleanedResponse = response.trim()
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7)
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3)
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3)
      }
      cleanedResponse = cleanedResponse.trim()

      result = JSON.parse(cleanedResponse)
    } catch (parseError) {
      logger.error("Failed to parse LLM complexity response", { error: parseError, response })

      // Try to extract complexity from free-form text
      const timeMatch = response.match(/time\s*complexity[:\s]+O\([^)]+\)/i)
      const spaceMatch = response.match(/space\s*complexity[:\s]+O\([^)]+\)/i)

      result = {
        timeComplexity: timeMatch ? timeMatch[0].match(/O\([^)]+\)/)?.[0] || "Unknown" : "Unknown",
        spaceComplexity: spaceMatch
          ? spaceMatch[0].match(/O\([^)]+\)/)?.[0] || "Unknown"
          : "Unknown",
        confidence: "low",
        reasoning: response,
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    logger.error("Complexity analysis API error", { error })
    return NextResponse.json(
      {
        timeComplexity: "Unknown",
        spaceComplexity: "Unknown",
        confidence: "low",
        reasoning: "Analysis failed",
      },
      { status: 200 } // Return 200 with fallback data so client can handle gracefully
    )
  }
}
