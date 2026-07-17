import { NextRequest, NextResponse } from "next/server"
import { generateAIResponse } from "@/lib/ai-providers"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { logger } from "@/lib/logger"

// Bound the input we will forward to the LLM (prevents oversized prompts
// inflating cost). Matches the chat route's currentCode ceiling.
const MAX_CODE_LENGTH = 100_000
const MAX_LABEL_LENGTH = 200

// The system prompt is OWNED BY THE SERVER. It used to be accepted verbatim from the
// request body, which turned this "complexity analysis" endpoint into a general-purpose
// LLM proxy any signed-in user could steer. The client now sends only structured data.
const COMPLEXITY_SYSTEM_PROMPT = `You are an expert algorithm analyst. Analyze the given code and determine its time and space complexity.

RULES:
1. Analyze the ACTUAL algorithm, not just syntax patterns
2. Consider recursion depth and branching factor
3. Account for early returns, break conditions, and optimizations
4. Recognize common patterns: two-pointer, sliding window, divide-and-conquer, DP, etc.
5. Consider amortized complexity where applicable
6. Be precise: O(n) is different from O(n log n) is different from O(n²)

CRITICAL - AMORTIZED COMPLEXITY PATTERNS:
Some algorithms have nested loops but are still O(n) due to amortized analysis:

- BUCKET SORT / COUNTING SORT: Even with nested loops iterating buckets, if total items across ALL buckets = n, the complexity is O(n), NOT O(n²). Example: Top K Frequent Elements using bucket sort.

- MONOTONIC STACK/QUEUE: Inner while loop may run multiple times, but each element is pushed/popped at most once total, so O(n) amortized.

- TWO POINTERS (same direction): Two pointers both moving forward = O(n) total, not O(n²).

When you see nested loops, ask: "Does the inner loop's TOTAL iterations across ALL outer iterations equal n?" If yes, it's O(n) amortized.

OUTPUT FORMAT (JSON only, no markdown):
{
  "timeComplexity": "O(n)" | "O(n log n)" | "O(n²)" | "O(2^n)" | etc.,
  "spaceComplexity": "O(1)" | "O(n)" | "O(log n)" | etc.,
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why this complexity",
  "algorithmPattern": "pattern name if recognized",
  "suggestions": ["optional improvement suggestions"]
}`

/** Build the user prompt from structured, length-bounded fields — never from a client prompt. */
function buildComplexityUserPrompt(params: {
  code: string
  language: string
  problemTitle?: string
  optimalTimeComplexity?: string
  optimalSpaceComplexity?: string
}): string {
  const label = (value: unknown): string =>
    typeof value === "string" ? value.slice(0, MAX_LABEL_LENGTH) : ""
  const title = label(params.problemTitle)
  const optTime = label(params.optimalTimeComplexity)
  const optSpace = label(params.optimalSpaceComplexity)
  return `Analyze this ${label(params.language)} code${title ? ` for the problem "${title}"` : ""}:

\`\`\`
${params.code}
\`\`\`

${optTime ? `Known optimal time complexity: ${optTime}` : ""}
${optSpace ? `Known optimal space complexity: ${optSpace}` : ""}

Return ONLY valid JSON, no markdown code blocks.`
}

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
    // Accept only structured data. Any client-supplied systemPrompt/userPrompt is ignored;
    // the prompt is built on the server so this endpoint cannot be used as an LLM proxy.
    const { code, language, problemTitle, optimalTimeComplexity, optimalSpaceComplexity } = body

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 })
    }

    if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ error: "Code is invalid or too large" }, { status: 400 })
    }

    const systemPrompt = COMPLEXITY_SYSTEM_PROMPT
    const userPrompt = buildComplexityUserPrompt({
      code,
      language,
      problemTitle,
      optimalTimeComplexity,
      optimalSpaceComplexity,
    })

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
