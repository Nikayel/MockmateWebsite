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

  // Problem-specific context for better tailoring
  optimalComplexity?: {
    time: string
    space: string
  }
  constraints?: string[]
}

export interface LLMHintsBatchRequest extends Omit<LLMHintRequest, "level" | "category"> {
  levels: Array<{
    level: HintLevel
    category: HintCategory
  }>
}

interface LLMHintResponse {
  title: string
  content: string
  codeAnalysis?: string
}

interface LLMBatchHintResponse extends LLMHintResponse {
  level: HintLevel
}

interface PatternPromptKnowledge {
  displayName: string
  whenToUse: string[]
  keyInsights: string[]
  commonMistakes: string[]
}

function getPromptPatternKnowledge(problemPattern: DSAPattern | undefined): {
  promptKnowledge?: PatternPromptKnowledge
  relatedPatterns?: string[]
} {
  if (!problemPattern) {
    return {}
  }

  const patternKnowledge = getPatternKnowledge(problemPattern)

  return {
    promptKnowledge: patternKnowledge
      ? {
          displayName: patternKnowledge.displayName,
          whenToUse: patternKnowledge.whenToUse,
          keyInsights: patternKnowledge.keyInsights,
          commonMistakes: patternKnowledge.commonMistakes,
        }
      : undefined,
    relatedPatterns: patternKnowledge?.relatedPatterns,
  }
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

function parseBatchHintJSON(
  text: string,
  requestedLevels: HintLevel[]
): LLMBatchHintResponse[] | null {
  let jsonStr = text

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim()
  }

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (!parsed || typeof parsed !== "object" || !("hints" in parsed)) {
      return null
    }

    const hints = (parsed as { hints: unknown }).hints
    if (!Array.isArray(hints)) {
      return null
    }

    const requestedLevelSet = new Set<HintLevel>(requestedLevels)
    const parsedHints: LLMBatchHintResponse[] = []

    for (const hint of hints) {
      if (!hint || typeof hint !== "object") {
        continue
      }

      const record = hint as Record<string, unknown>
      const level = Number(record.level)

      if (
        !requestedLevelSet.has(level as HintLevel) ||
        typeof record.title !== "string" ||
        typeof record.content !== "string"
      ) {
        continue
      }

      parsedHints.push({
        level: level as HintLevel,
        title: record.title.slice(0, 100),
        content: record.content.slice(0, 1000),
        codeAnalysis:
          typeof record.codeAnalysis === "string" ? record.codeAnalysis.slice(0, 500) : undefined,
      })
    }

    return parsedHints.length > 0 ? parsedHints : null
  } catch (e) {
    console.error("[HintLLM] Batch JSON parse error:", e)
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

function buildBatchUserPrompt(
  request: LLMHintsBatchRequest,
  patternKnowledge?: PatternPromptKnowledge
) {
  const firstLevel = request.levels[0]
  const basePrompt = buildUserPrompt({
    level: firstLevel.level,
    category: firstLevel.category,
    problemTitle: request.problemTitle,
    problemText: request.problemText,
    problemPattern: request.problemPattern,
    difficulty: request.difficulty,
    userCode: request.userCode,
    language: request.language,
    struggleLevel: request.struggleLevel,
    testFailures: request.testFailures,
    optimalComplexity: request.optimalComplexity,
    constraints: request.constraints,
    patternKnowledge,
  })

  return `${basePrompt}

---
BATCH REQUEST:
Generate one personalized hint for each requested level below. Keep each hint aligned to its level's rules from the system prompt and category focus.

Requested hints:
${request.levels.map(({ level, category }) => `- Level ${level}: ${category}`).join("\n")}

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
  "hints": [
    {
      "level": 1,
      "title": "3-5 word hint title",
      "content": "The personalized hint for this exact level",
      "codeAnalysis": "Brief assessment for this level"
    }
  ]
}`
}

/**
 * Generate a single hint using LLM
 */
export async function generateLLMHint(request: LLMHintRequest): Promise<GeneratedHint | null> {
  try {
    const { promptKnowledge, relatedPatterns } = getPromptPatternKnowledge(request.problemPattern)

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
      optimalComplexity: request.optimalComplexity,
      constraints: request.constraints,
      patternKnowledge: promptKnowledge,
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
        relatedConcepts: relatedPatterns,
      },
    }
  } catch (error) {
    console.error("[HintLLM] Generation failed:", error)
    return null
  }
}

/**
 * Generate multiple progressive hints in a single LLM request.
 */
export async function generateLLMHintsForLevels(
  request: LLMHintsBatchRequest
): Promise<GeneratedHint[]> {
  if (request.levels.length === 0) {
    return []
  }

  try {
    const { promptKnowledge, relatedPatterns } = getPromptPatternKnowledge(request.problemPattern)
    const response = await generateAIResponse(
      HINT_SYSTEM_PROMPT,
      buildBatchUserPrompt(request, promptKnowledge),
      [],
      {
        complexity: "simple",
        temperature: 0.7,
        skipCache: false,
        eventType: "hint_request",
        userId: request.userId,
      }
    )

    const requestedLevels = request.levels.map(({ level }) => level)
    const parsedHints = parseBatchHintJSON(response.text, requestedLevels)

    if (!parsedHints) {
      console.warn("[HintLLM] Batch JSON parsing failed")
      return []
    }

    const categoryByLevel = new Map(request.levels.map(({ level, category }) => [level, category]))

    return parsedHints.map((hint) => ({
      id: generateHintId(),
      level: hint.level,
      category: categoryByLevel.get(hint.level) ?? "approach",
      title: hint.title,
      content: hint.content,
      isBlurred: true,
      source: "ai",
      relevanceScore: 0.9,
      metadata: {
        pattern: request.problemPattern,
        relatedConcepts: relatedPatterns,
      },
    }))
  } catch (error) {
    console.error("[HintLLM] Batch generation failed:", error)
    return []
  }
}

/**
 * Generate multiple hints at different levels
 */
export async function generateLLMHints(
  request: Omit<LLMHintRequest, "level">,
  maxLevel: HintLevel = 3
): Promise<GeneratedHint[]> {
  const levels: HintLevel[] = [1, 2, 3, 4].filter((l) => l <= maxLevel) as HintLevel[]

  return generateLLMHintsForLevels({
    ...request,
    levels: levels.map((level) => ({
      level,
      category: request.category,
    })),
  })
}
