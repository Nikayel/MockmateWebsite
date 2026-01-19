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
]

// =============================================================================
// LLM-BASED SEMANTIC VALIDATION (replaces fragile regex)
// =============================================================================

/**
 * Semantic rules that regex can't reliably detect.
 * These are validated by LLM, not pattern matching.
 *
 * Why LLM instead of regex:
 * - "Actually, it's O(n)" is obvious, but
 * - "Well, to be precise, the complexity is linear" is the same violation
 * - "You're iterating twice so it's quadratic" explains complexity for them
 * - Regex misses all semantic variations
 */
export const SEMANTIC_RULES = [
  {
    id: "no-direct-correction",
    description: "AI corrects user's mistake directly instead of probing their reasoning",
    examples: [
      "BAD: 'Actually, it's O(n) not O(n²)'",
      "BAD: 'No, that approach is actually optimal'",
      "BAD: 'The correct complexity is O(n log n)'",
      "GOOD: 'Walk me through how you arrived at O(n²)'",
    ],
  },
  {
    id: "no-explaining-complexity",
    description: "AI explains complexity/approach instead of asking user to explain",
    examples: [
      "BAD: 'It's O(n²) because of the nested loops'",
      "BAD: 'The sort adds O(n log n) to your solution'",
      "BAD: 'You're iterating through n elements twice, so it's quadratic'",
      "GOOD: 'Where does that complexity come from? Walk me through the operations.'",
    ],
  },
  {
    id: "no-revealing-approach",
    description: "AI reveals the solution approach instead of guiding with questions",
    examples: [
      "BAD: 'You should use a hash map here'",
      "BAD: 'The trick is to sort first, then use two pointers'",
      "GOOD: 'What data structure might help you look things up quickly?'",
    ],
  },
  {
    id: "no-validation-phrases",
    description: "AI validates/confirms correctness instead of staying neutral",
    examples: [
      "BAD: 'Nice, you've got the right idea'",
      "BAD: 'Perfect, you've got the logic down'",
      "BAD: 'That checks out'",
      "BAD: 'Exactly'",
      "GOOD: 'Okay. Walk me through why.' (neutral, doesn't confirm)",
      "GOOD: 'Mm-hmm. What else?' (neutral acknowledgment)",
    ],
  },
  {
    id: "no-teaching-edge-cases",
    description: "AI teaches the correct answer for edge cases instead of noting the mistake",
    examples: [
      "BAD: 'Actually, think about it - if you're already at stair 0, there's one way to be there'",
      "BAD: 'The answer for zero should actually be 1, not 0'",
      "BAD: 'You're already there, you don't need to climb'",
      "GOOD: 'Okay, noted. Anything else?' (doesn't teach the correct answer)",
      "GOOD: 'Alright. Let's move on.' (notes mistake, doesn't explain)",
    ],
  },
]

/**
 * Build the semantic validation prompt
 */
export function buildSemanticValidationPrompt(response: string): string {
  const rulesText = SEMANTIC_RULES.map(
    (r) => `${r.id}: ${r.description}\n${r.examples.join("\n")}`
  ).join("\n\n")

  return `You are a response validator. Check if this interviewer response violates any rules.

RESPONSE TO CHECK:
"${response}"

RULES (violation = regenerate):
${rulesText}

Return JSON only:
{
  "violated": true/false,
  "rule": "rule-id or null",
  "evidence": "quote from response that violates, or null",
  "suggestion": "how to fix it, or null"
}

Be strict. If the AI is explaining something instead of asking, that's a violation.
If the AI is correcting instead of probing, that's a violation.`
}

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
