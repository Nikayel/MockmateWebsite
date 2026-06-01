import { z } from "zod"
import { generateAIResponse } from "@/lib/ai-providers"
import type { HintCategory, HintDiagnosis, HintGenerationRequest, HintLevel } from "./types"
import type { StruggleLevel } from "./struggle-calculator"

const hintDiagnosisSchema = z.object({
  primaryNeed: z.enum(["conceptual", "approach", "implementation", "optimization", "debugging"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(240),
  evidence: z.array(z.string().min(1).max(160)).max(4).default([]),
  recommendedLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  shouldUseRag: z.boolean(),
  shouldUseUserHistory: z.boolean(),
  shouldUsePatternKnowledge: z.boolean(),
  shouldUseTestFailures: z.boolean(),
})

const DIAGNOSIS_SYSTEM_PROMPT = `You diagnose what kind of coding interview hint a user needs.

Return JSON only. Choose exactly one primaryNeed:
- conceptual: user needs to understand the underlying idea or pattern
- approach: user needs help choosing the algorithm/data structure
- implementation: user knows the idea but needs help translating it into code
- optimization: solution may work but needs better complexity
- debugging: tests/errors indicate a bug or failing edge case

Be conservative. Do not reveal solutions. Base the diagnosis on the user's current code, tests, constraints, and struggle state.`

function parseDiagnosis(text: string): HintDiagnosis | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonSource = codeBlockMatch ? codeBlockMatch[1] : text
  const jsonMatch = jsonSource.match(/\{[\s\S]*\}/)

  if (!jsonMatch) return null

  try {
    return hintDiagnosisSchema.parse(JSON.parse(jsonMatch[0]))
  } catch {
    return null
  }
}

function fallbackPrimaryNeed(request: HintGenerationRequest): HintCategory {
  if (request.trigger === "test_failed" || (request.testResults?.failingTests?.length ?? 0) > 0) {
    return "debugging"
  }

  if (!request.userCode.trim()) {
    return "conceptual"
  }

  if (request.trigger === "test_passed" && request.optimalComplexity) {
    return "optimization"
  }

  if (request.trigger === "code_change") {
    return "implementation"
  }

  return "approach"
}

export function buildFallbackDiagnosis(
  request: HintGenerationRequest,
  recommendedRevealLevel: HintLevel
): HintDiagnosis {
  const primaryNeed = fallbackPrimaryNeed(request)

  return {
    primaryNeed,
    confidence: 0.5,
    reason: "Used deterministic fallback because LLM diagnosis was unavailable.",
    evidence: [
      `trigger=${request.trigger || "manual"}`,
      `tests=${request.testResults ? `${request.testResults.passed}/${request.testResults.total}` : "none"}`,
    ],
    recommendedLevel: recommendedRevealLevel,
    shouldUseRag: primaryNeed !== "debugging",
    shouldUseUserHistory: true,
    shouldUsePatternKnowledge: primaryNeed === "conceptual" || primaryNeed === "approach",
    shouldUseTestFailures: primaryNeed === "debugging",
  }
}

export async function diagnoseHintNeed(params: {
  request: HintGenerationRequest
  struggleLevel: StruggleLevel
  recommendedRevealLevel: HintLevel
}): Promise<HintDiagnosis> {
  const { request, struggleLevel, recommendedRevealLevel } = params

  const userPrompt = `## Problem
Title: ${request.problemTitle}
Difficulty: ${request.difficulty}
Pattern: ${request.problemPattern || "unknown"}
Constraints: ${request.constraints?.slice(0, 5).join("; ") || "not provided"}
Target complexity: ${
    request.optimalComplexity
      ? `${request.optimalComplexity.time} time, ${request.optimalComplexity.space} space`
      : "not provided"
  }

## User State
Trigger: ${request.trigger || "manual"}
Struggle level: ${struggleLevel}
Current reveal level from metrics: ${recommendedRevealLevel}
Tests: ${
    request.testResults
      ? `${request.testResults.passed}/${request.testResults.total} passed`
      : "not run"
  }
Failing tests: ${request.testResults?.failingTests?.slice(0, 3).join(" | ") || "none"}
Existing hints: ${request.existingHints?.slice(-3).join(" | ") || "none"}

## User Code (${request.language})
\`\`\`${request.language}
${request.userCode || "// no code written yet"}
\`\`\`

Return JSON:
{
  "primaryNeed": "conceptual|approach|implementation|optimization|debugging",
  "confidence": 0.0,
  "reason": "short reason",
  "evidence": ["specific observed evidence"],
  "recommendedLevel": 1,
  "shouldUseRag": true,
  "shouldUseUserHistory": true,
  "shouldUsePatternKnowledge": true,
  "shouldUseTestFailures": false
}`

  try {
    const response = await generateAIResponse(DIAGNOSIS_SYSTEM_PROMPT, userPrompt, [], {
      complexity: "simple",
      temperature: 0.2,
      skipCache: false,
      eventType: "hint_request",
      userId: request.userId,
    })

    const diagnosis = parseDiagnosis(response.text)

    if (!diagnosis || diagnosis.confidence < 0.35) {
      return buildFallbackDiagnosis(request, recommendedRevealLevel)
    }

    return {
      ...diagnosis,
      recommendedLevel: Math.max(diagnosis.recommendedLevel, recommendedRevealLevel) as HintLevel,
    }
  } catch {
    return buildFallbackDiagnosis(request, recommendedRevealLevel)
  }
}
