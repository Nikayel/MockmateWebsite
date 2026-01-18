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
import {
  CODING_TRANSITION_PATTERNS,
  GIVEAWAY_PATTERNS,
  LEADING_QUESTION_PATTERNS,
  VAGUE_ANSWER_PATTERNS,
  ACCEPTANCE_PATTERNS,
  PROBING_PATTERNS,
} from "./shared-patterns"

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
// GATE DEFINITIONS
// Each gate is a deterministic check that returns a violation or null
// =============================================================================

interface Gate {
  name: string
  severity: "critical" | "warning"
  check: (ctx: ValidationContext) => { violated: boolean; evidence: string } | null
  hint: string
}

const GATES: Gate[] = [
  // GATE 1: No "code it up" without prerequisites
  {
    name: "no-premature-coding",
    severity: "critical",
    check: (ctx) => {
      // Use shared patterns from shared-patterns.ts
      const match = CODING_TRANSITION_PATTERNS.find((p) => p.test(ctx.response))
      if (!match) return null

      // Only enforce in pre-test phases
      if (ctx.phase !== "discussion" && ctx.phase !== "coding") return null
      if (ctx.tracker?.hasRunTests) return null

      // Check prerequisites
      const hasComplexity = ctx.tracker?.timeComplexityMentioned ?? false
      const hasEdgeCases = (ctx.tracker?.edgeCasesMentioned?.length ?? 0) > 0

      if (!hasComplexity || !hasEdgeCases) {
        const missing = []
        if (!hasComplexity) missing.push("complexity")
        if (!hasEdgeCases) missing.push("edge cases")
        return {
          violated: true,
          evidence: `Said coding phrase without discussing: ${missing.join(", ")}`,
        }
      }
      return null
    },
    hint: "Ask about time complexity and edge cases BEFORE telling them to code",
  },

  // GATE 2: No giving away answers
  {
    name: "no-giving-answers",
    severity: "critical",
    check: (ctx) => {
      // Use shared patterns from shared-patterns.ts
      for (const { pattern, type } of GIVEAWAY_PATTERNS) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `${type}: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Ask guiding questions instead of giving the answer. Example: 'What data structure might help here?'",
  },

  // GATE 3: No revealing optimal bounds
  {
    name: "no-revealing-optimal",
    severity: "warning",
    check: (ctx) => {
      // Only matters if solution IS optimal
      if (!ctx.isOptimalSolution) return null

      const patterns = [
        /(?:this|that|it)(?:'s| is) (?:the )?optimal/i,
        /(?:can't|cannot) do better/i,
        /(?:this|that) is (?:the )?(?:best|lowest|minimum) (?:possible|you can)/i,
        /O\([^)]+\) is (?:the )?(?:optimal|best)/i,
        /you(?:'ve| have) (?:already )?(?:found|reached|achieved) (?:the )?optimal/i,
      ]

      for (const pattern of patterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: match[0] }
        }
      }
      return null
    },
    hint: "Don't reveal optimality. Ask: 'What do you think the complexity is? Could it be improved?'",
  },

  // GATE 4: No excessive apology
  {
    name: "no-excessive-apology",
    severity: "warning",
    check: (ctx) => {
      const apologyPatterns = [
        /my bad/i,
        /my mistake/i,
        /my fault/i,
        /i misspoke/i,
        /i should(?:'ve| have)/i,
        /fair point,? i/i,
        /you're right,? (?:my bad|i should)/i,
      ]

      const apologies = apologyPatterns.filter((p) => p.test(ctx.response))
      if (apologies.length >= 2) {
        return { violated: true, evidence: `${apologies.length} apologies detected` }
      }
      return null
    },
    hint: "Acknowledge once, then move forward. Example: 'Good catch. So, what's your complexity analysis?'",
  },

  // GATE 5: No premature feedback mention
  {
    name: "no-premature-feedback",
    severity: "critical",
    check: (ctx) => {
      if (ctx.hasSubmitted) return null

      if (/view detailed feedback/i.test(ctx.response)) {
        return { violated: true, evidence: "Mentioned 'View Detailed Feedback' before submit" }
      }
      return null
    },
    hint: "The 'View Detailed Feedback' button only appears AFTER submit. Guide them to Submit first.",
  },

  // GATE 6: One question at a time (strict)
  {
    name: "one-question-at-a-time",
    severity: "critical",
    check: (ctx) => {
      const questions = ctx.response.match(/\?/g) || []
      if (questions.length > 1) {
        return {
          violated: true,
          evidence: `${questions.length} questions - only ask one at a time`,
        }
      }
      return null
    },
    hint: "Only ask ONE question at a time",
  },

  // GATE 7: Vague answer acceptance
  {
    name: "no-accepting-vague-answers",
    severity: "critical",
    check: (ctx) => {
      if (!ctx.lastUserMessage) return null

      // Use shared patterns from shared-patterns.ts
      const userWasVague = VAGUE_ANSWER_PATTERNS.some((p) => p.test(ctx.lastUserMessage || ""))
      if (!userWasVague) return null

      // Check if interviewer accepted without probing (using shared patterns)
      const accepted = ACCEPTANCE_PATTERNS.some((p) => p.test(ctx.response))
      const probed = PROBING_PATTERNS.some((p) => p.test(ctx.response))

      if (accepted && !probed) {
        return { violated: true, evidence: "Accepted vague answer without probing" }
      }
      return null
    },
    hint: "When user gives vague answer, probe: 'How exactly would you handle that? Walk me through the code.'",
  },

  // GATE 8: No leading questions
  {
    name: "no-leading-questions",
    severity: "warning",
    check: (ctx) => {
      // Use shared patterns from shared-patterns.ts
      for (const { pattern, type } of LEADING_QUESTION_PATTERNS) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Leading toward ${type}: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Ask open questions: 'What approach are you considering?' not 'Would a hash map help?'",
  },

  // GATE 9: Response too long (character-based, simple)
  {
    name: "response-too-long",
    severity: "critical",
    check: (ctx) => {
      // 400 chars ≈ 2-3 sentences
      if (ctx.response.length > 400) {
        return {
          violated: true,
          evidence: `Response too long (${ctx.response.length} chars) - keep under 3 sentences`,
        }
      }
      return null
    },
    hint: "Keep response under 3 sentences. Be direct like: 'You said O(n²) - walk me through why.'",
  },
]

// =============================================================================
// MAIN VALIDATION FUNCTION
// =============================================================================

/**
 * Validate an interviewer response against all hard gates
 * Returns violations and hints for regeneration
 */
export function validateInterviewerResponse(ctx: ValidationContext): ValidationResult {
  const violations: ResponseViolation[] = []

  // Run all gates
  for (const gate of GATES) {
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
    const gate = GATES.find((g) => g.name === v.rule)
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
 * Run validation with retry loop
 * Returns the validated (or regenerated) response
 */
export async function validateWithRetry(
  ctx: ValidationContext,
  regenerate: (hint: string) => Promise<string>,
  maxRetries: number = 2
): Promise<{ response: string; violations: ResponseViolation[]; retries: number }> {
  let currentResponse = ctx.response
  let totalViolations: ResponseViolation[] = []
  let retries = 0

  for (let i = 0; i <= maxRetries; i++) {
    const validation = validateInterviewerResponse({
      ...ctx,
      response: currentResponse,
    })

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
