/**
 * Hard Gates - Response Validation with Regeneration
 *
 * Validates interviewer responses against behavioral rules.
 * Uses deterministic checks (not AI) to enforce rules.
 * Returns violations and triggers regeneration for critical issues.
 *
 * DRY: Uses shared-patterns.ts for all detection patterns.
 */

import type { ConversationTracker, InterviewPhase } from "./interview-phases"
import { logger } from "@/lib/logger"
import { RESPONSE_GUARDRAILS, SEMANTIC_RULES, buildSemanticValidationPrompt } from "./guardrails"

// Re-export for consumers
export { SEMANTIC_RULES, buildSemanticValidationPrompt }

export interface ValidationResult {
  isValid: boolean
  violations: ResponseViolation[]
  shouldRegenerate: boolean
  regenerationHint?: string
}

export interface ResponseViolation {
  rule: string
  description: string
  severity: "critical" | "warning"
  evidence: string
}

export interface ValidationContext {
  response: string
  phase: InterviewPhase
  tracker: ConversationTracker | undefined
  hasSubmitted: boolean
  lastUserMessage?: string
  isOptimalSolution?: boolean
}

// =============================================================================
// LLM-BASED SEMANTIC VALIDATION
// =============================================================================
// Rules defined in ./guardrails/semantic-rules.ts

export interface SemanticValidationResult {
  violated: boolean
  rule: string | null
  evidence: string | null
  suggestion: string | null
}

/**
 * Validate response semantically using LLM
 * This catches violations that regex misses
 */
export async function validateSemanticRules(
  response: string,
  generateAI: (system: string, user: string) => Promise<{ text: string }>
): Promise<SemanticValidationResult> {
  try {
    const prompt = buildSemanticValidationPrompt(response)
    const result = await generateAI(
      "You are a strict response validator. Return only valid JSON.",
      prompt
    )

    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    logger.warn("Semantic validation failed, allowing response", { error })
  }

  // Default to allowing if validation fails
  return { violated: false, rule: null, evidence: null, suggestion: null }
}

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate an interviewer response against regex gates (fast, deterministic)
 * For semantic validation, use validateInterviewerResponseAsync
 */
export function validateInterviewerResponse(ctx: ValidationContext): ValidationResult {
  const violations: ResponseViolation[] = []

  // Run all regex gates (fast)
  for (const gate of RESPONSE_GUARDRAILS) {
    try {
      const result = gate.check(ctx)
      if (result?.violated) {
        violations.push({
          rule: gate.name,
          description: result.evidence,
          severity: gate.severity,
          evidence: result.evidence,
        })
      }
    } catch (error) {
      // Gate threw an error - log but don't fail validation
      logger.warn(`Gate ${gate.name} threw error`, { error })
    }
  }

  // Determine if we should regenerate (only for critical violations)
  const criticalViolations = violations.filter((v) => v.severity === "critical")
  const shouldRegenerate = criticalViolations.length > 0

  // Build hint from violated gates
  const hints = violations.map((v) => {
    const gate = RESPONSE_GUARDRAILS.find((g) => g.name === v.rule)
    return gate?.hint || v.description
  })

  return {
    isValid: violations.length === 0,
    violations,
    shouldRegenerate,
    regenerationHint: hints.length > 0 ? hints.join(". ") : undefined,
  }
}

/**
 * Full validation: regex gates + LLM semantic validation
 * Use this for complete validation (slower but catches semantic violations)
 */
export async function validateInterviewerResponseAsync(
  ctx: ValidationContext,
  generateAI: (system: string, user: string) => Promise<{ text: string }>
): Promise<ValidationResult> {
  // Step 1: Run fast regex gates
  const regexResult = validateInterviewerResponse(ctx)

  // If regex already found critical violations, skip expensive LLM call
  if (regexResult.shouldRegenerate) {
    return regexResult
  }

  // Step 2: Run LLM semantic validation for subtle violations
  const semanticResult = await validateSemanticRules(ctx.response, generateAI)

  if (semanticResult.violated && semanticResult.rule) {
    const rule = SEMANTIC_RULES.find((r) => r.id === semanticResult.rule)
    const violation: ResponseViolation = {
      rule: semanticResult.rule,
      description: rule?.description || "Semantic rule violation",
      severity: "critical",
      evidence: semanticResult.evidence || "See suggestion",
    }

    return {
      isValid: false,
      violations: [...regexResult.violations, violation],
      shouldRegenerate: true,
      regenerationHint:
        semanticResult.suggestion || rule?.examples[3] || "Probe their reasoning instead",
    }
  }

  return regexResult
}

/**
 * Run validation with retry loop
 * Returns the validated (or regenerated) response
 */
export async function validateWithRetry(
  ctx: ValidationContext,
  regenerate: (hint: string) => Promise<string>,
  generateAI: (system: string, user: string) => Promise<{ text: string }>,
  maxRetries: number = 2
): Promise<{ response: string; violations: ResponseViolation[]; retries: number }> {
  let currentResponse = ctx.response
  let totalViolations: ResponseViolation[] = []
  let retries = 0

  for (let i = 0; i <= maxRetries; i++) {
    const validation = await validateInterviewerResponseAsync(
      {
        ...ctx,
        response: currentResponse,
      },
      generateAI
    )

    if (validation.isValid) {
      return { response: currentResponse, violations: [], retries }
    }

    // Log violations
    logger.info("[Hard Gates] Violations detected", {
      attempt: i + 1,
      violations: validation.violations.map((v) => v.rule),
      hint: validation.regenerationHint,
    })

    // If not critical or no more retries, return current response
    if (!validation.shouldRegenerate || i === maxRetries) {
      return {
        response: currentResponse,
        violations: validation.violations,
        retries,
      }
    }

    // Regenerate
    try {
      currentResponse = await regenerate(validation.regenerationHint || "Follow interviewer rules")
      retries++
      totalViolations = validation.violations
    } catch (error) {
      logger.error("[Hard Gates] Regeneration failed", { error })
      return {
        response: currentResponse,
        violations: validation.violations,
        retries,
      }
    }
  }

  return { response: currentResponse, violations: totalViolations, retries }
}
