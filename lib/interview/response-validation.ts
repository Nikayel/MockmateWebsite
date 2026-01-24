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
  GIVEAWAY_PATTERNS,
  LEADING_QUESTION_PATTERNS,
  VAGUE_ANSWER_PATTERNS,
  ACCEPTANCE_PATTERNS,
  PROBING_PATTERNS,
  containsSummarizing,
  countSentences,
  containsCodingTransition, // Enhanced detection with semantic fallback
} from "./shared-patterns"
import { SEMANTIC_RULES, buildSemanticValidationPrompt } from "./semantic-rules"

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
      // Use enhanced detection from shared-patterns.ts
      // This catches both regex patterns AND semantic intent (e.g., "You may now proceed with coding")
      if (!containsCodingTransition(ctx.response)) return null

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
          evidence: `Detected coding transition without discussing: ${missing.join(", ")}`,
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

      if (/view detailed feedback|end interview|see full interview score/i.test(ctx.response)) {
        return { violated: true, evidence: "Mentioned 'See Full Interview Score' before submit" }
      }
      return null
    },
    hint: "The 'See Full Interview Score' button only appears AFTER submit. Guide them to Submit first.",
  },

  // GATE 6: One question at a time
  {
    name: "one-question-at-a-time",
    severity: "warning",
    check: (ctx) => {
      const questions = ctx.response.match(/\?/g) || []
      if (questions.length > 2) {
        return { violated: true, evidence: `${questions.length} questions in one response` }
      }
      return null
    },
    hint: "Ask ONE focused question at a time. Let them answer before asking the next.",
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

  // GATE 9: No validation phrases (confirming correctness)
  {
    name: "no-validation-phrases",
    severity: "critical",
    check: (ctx) => {
      // Phrases that validate/confirm correctness - real interviewers stay neutral
      const validationPatterns = [
        /\b(?:Nice|Good|Perfect|Exactly|Correct)\b[.!,]?(?:\s|$)/i,
        /\bThat's (?:right|correct|exactly)\b/i,
        /\bYou've got (?:it|the (?:right |)idea|the logic)\b/i,
        /\bThat checks out\b/i,
        /\bThat's the (?:key )?insight\b/i,
        /\bYou nailed it\b/i,
        /\bSpot on\b/i,
      ]

      for (const pattern of validationPatterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Validation phrase: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Stay NEUTRAL. Don't confirm correctness. Say 'Okay' or 'Mm-hmm' instead of 'Nice' or 'Perfect'.",
  },

  // GATE 10: No teaching edge cases (explaining correct answers)
  {
    name: "no-teaching-edge-cases",
    severity: "critical",
    check: (ctx) => {
      // Phrases that teach the correct answer instead of letting them figure it out
      const teachingPatterns = [
        /\bActually,? (?:think about|consider)\b/i,
        /\bThe (?:right|correct) answer is\b/i,
        /\bIt should return\b/i,
        /\bThe answer is\b/i,
        /\bthere's (?:actually )?one way to be there\b/i, // Teaching edge case: "there's one way to be there"
        /\byou're already there\b/i, // Teaching edge case explanation
      ]

      for (const pattern of teachingPatterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return { violated: true, evidence: `Teaching phrase: "${match[0]}"` }
        }
      }
      return null
    },
    hint: "Don't teach edge cases. If they get it wrong, say 'Okay, noted.' and move on. Don't explain the correct answer.",
  },

  // GATE 11: Response brevity - prevent classroom-style monologues
  {
    name: "response-brevity",
    severity: "warning",
    check: (ctx) => {
      const count = countSentences(ctx.response)
      if (count > 5) {
        return { violated: true, evidence: `${count} sentences (max 4-5)` }
      }
      return null
    },
    hint: "Keep responses to 2-4 sentences. Ask ONE question, wait for answer.",
  },

  // GATE 12: No summarizing/parroting back what user said
  {
    name: "no-summarizing",
    severity: "warning",
    check: (ctx) => {
      const match = containsSummarizing(ctx.response)
      if (match) {
        return { violated: true, evidence: `Summarizing: "${match[0]}"` }
      }
      return null
    },
    hint: "Don't paraphrase. Move forward: 'Okay. How would that handle empty input?'",
  },

  // GATE 13: No asking for approach during clarification phase
  {
    name: "no-approach-in-clarification",
    severity: "critical",
    check: (ctx) => {
      // Only applies to clarification phase (early messages, approach not explained)
      if (ctx.phase !== "clarification") {
        return null
      }

      // Patterns that ask for approach too early
      const approachPatterns = [
        /what(?:'s| is) your (?:approach|thinking|plan)/i,
        /what(?:'s| is) your thinking/i,
        /how (?:are you|would you) (?:thinking|approach|tackle|solve)/i,
        /how are you thinking/i,
        /walk me through (?:your|the) (?:approach|plan|thinking)/i,
        /what approach/i,
        /how do you (?:want to|plan to) (?:solve|approach|tackle)/i,
        /before you (?:start )?coding/i,
        /let's (?:hear|discuss) your (?:approach|plan)/i,
        /let's dive in/i,
        /dive into/i,
        /understand your approach/i,
        /your approach/i,
        /how you plan to attack/i,
        /tell me how you/i,
        /clarifying question/i, // Interviewer shouldn't ask clarifying questions - USER asks them
      ]

      for (const pattern of approachPatterns) {
        const match = ctx.response.match(pattern)
        if (match) {
          return {
            violated: true,
            evidence: `Asked for approach in clarification phase: "${match[0]}"`,
          }
        }
      }
      return null
    },
    hint: "In clarification phase, don't ask for approach. Say 'Take your time reading. Any questions about the problem?' Let THEM bring up their approach.",
  },
]

// =============================================================================
// LLM-BASED SEMANTIC VALIDATION
// =============================================================================
// Rules defined in ./semantic-rules.ts

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
