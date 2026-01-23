import { NextRequest, NextResponse } from "next/server"
import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"

/**
 * API endpoint for LLM-based code complexity analysis.
 * Uses Claude to semantically analyze code instead of regex patterns.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { systemPrompt, userPrompt, code, language } = body

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 })
    }

    // Use a fast model for complexity analysis (it's a focused task)
    const aiResponse = await generateAIResponse(systemPrompt, userPrompt, [], {
      complexity: "simple", // Fast response for simple analysis
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
      logger.error({ error: parseError, response }, "Failed to parse LLM complexity response")

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
    logger.error({ error }, "Complexity analysis API error")
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
