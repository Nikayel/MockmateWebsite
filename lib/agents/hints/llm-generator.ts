/**
 * LLM-powered hint generation
 * Calls Gemini to generate contextual hints based on user's code and problem
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import { HINT_SYSTEM_PROMPT, buildUserPrompt } from "./prompts"
import { generateHintId } from "./code-analyzer"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { GeneratedHint, HintLevel, HintCategory, HintTrigger } from "./types"
import type { StruggleLevel } from "./struggle-calculator"

export interface LLMHintRequest {
  // Problem info
  problemTitle: string
  problemText: string
  problemPattern?: DSAPattern
  difficulty: "easy" | "medium" | "hard"

  // User's current state
  userCode: string
  language: string

  // Hint parameters
  level: HintLevel
  category: HintCategory
  trigger: HintTrigger
  struggleLevel: StruggleLevel

  // Optional context
  userId?: string
  existingHints?: string[]
  testFailures?: string[]
}

interface LLMHintResponse {
  title: string
  content: string
  codeAnalysis?: string
}

/**
 * Parse JSON response from LLM, handling various edge cases
 */
function parseHintJSON(text: string): LLMHintResponse | null {
  // Try to extract JSON from the response
  // LLMs sometimes wrap JSON in markdown code blocks
  let jsonStr = text

  // Remove markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  // Try to find JSON object in the text
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return null
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (!parsed.title || !parsed.content) {
      return null
    }

    return {
      title: String(parsed.title).slice(0, 100), // Cap title length
      content: String(parsed.content).slice(0, 1000), // Cap content length
      codeAnalysis: parsed.codeAnalysis ? String(parsed.codeAnalysis) : undefined,
    }
  } catch (e) {
    console.error("[HintLLM] JSON parse error:", e)
    return null
  }
}

/**
 * Extract hint from raw text when JSON parsing fails
 */
function extractHintFromText(text: string): LLMHintResponse {
  // Clean up the text
  let content = text
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/^\s*[-*]\s*/gm, "") // Remove bullet points
    .trim()

  // Try to find a title-like first line
  const lines = content.split("\n").filter((l) => l.trim())
  let title = "Hint"

  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    // If first line is short and looks like a title
    if (firstLine.length < 60 && !firstLine.includes(".")) {
      title = firstLine.replace(/^#+\s*/, "").replace(/:$/, "") // Remove markdown headers and trailing colon
      content = lines.slice(1).join("\n").trim() || firstLine
    }
  }

  return {
    title: title.slice(0, 100),
    content: content.slice(0, 1000) || "Consider the problem constraints carefully.",
  }
}

/**
 * Generate a single hint using LLM
 */
export async function generateLLMHint(request: LLMHintRequest): Promise<GeneratedHint | null> {
  try {
    // Get pattern knowledge if available
    const patternKnowledge = request.problemPattern
      ? getPatternKnowledge(request.problemPattern)
      : null

    // Build prompts
    const systemPrompt = HINT_SYSTEM_PROMPT
    const userPrompt = buildUserPrompt({
      level: request.level,
      category: request.category,
      problemTitle: request.problemTitle,
      problemText: request.problemText,
      problemPattern: request.problemPattern,
      difficulty: request.difficulty,
      userCode: request.userCode,
      language: request.language,
      struggleLevel: request.struggleLevel,
      testFailures: request.testFailures,
      patternKnowledge: patternKnowledge
        ? {
            displayName: patternKnowledge.displayName,
            whenToUse: patternKnowledge.whenToUse,
            keyInsights: patternKnowledge.keyInsights,
            commonMistakes: patternKnowledge.commonMistakes,
          }
        : undefined,
    })

    // Call LLM
    const response = await generateAIResponse(systemPrompt, userPrompt, [], {
      complexity: "simple", // Uses Gemini for cost efficiency
      temperature: 0.7,
      skipCache: false,
      eventType: "hint_request",
      userId: request.userId,
    })

    // Parse response
    let hintData = parseHintJSON(response.text)

    // Fallback to text extraction if JSON parsing fails
    if (!hintData) {
      console.warn("[HintLLM] JSON parsing failed, extracting from text")
      hintData = extractHintFromText(response.text)
    }

    // Build the hint object
    return {
      id: generateHintId(),
      level: request.level,
      category: request.category,
      title: hintData.title,
      content: hintData.content,
      isBlurred: true,
      source: "ai",
      relevanceScore: 0.9,
      metadata: {
        pattern: request.problemPattern,
        relatedConcepts: patternKnowledge?.relatedPatterns,
      },
    }
  } catch (error) {
    console.error("[HintLLM] Generation failed:", error)
    return null
  }
}

/**
 * Generate multiple hints at different levels
 */
export async function generateLLMHints(
  request: Omit<LLMHintRequest, "level">,
  maxLevel: HintLevel = 3
): Promise<GeneratedHint[]> {
  const hints: GeneratedHint[] = []
  const levels: HintLevel[] = [1, 2, 3, 4].filter((l) => l <= maxLevel) as HintLevel[]

  // Generate hints for each level (could parallelize but keeping sequential for cost control)
  for (const level of levels) {
    const hint = await generateLLMHint({ ...request, level })
    if (hint) {
      hints.push(hint)
    }
  }

  return hints
}
