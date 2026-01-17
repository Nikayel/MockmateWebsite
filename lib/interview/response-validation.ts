/**
 * Post-Generation Response Validation
 *
 * Validates interviewer responses against behavioral rules.
 * Returns violations and suggested corrections.
 */

import type { ConversationTracker, InterviewPhase } from "./interview-phases"

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

interface ValidationContext {
  response: string
  phase: InterviewPhase
  tracker: ConversationTracker | undefined
  hasSubmitted: boolean
  lastUserMessage?: string
}

// Patterns that indicate vague answer acceptance
const VAGUE_ACCEPTANCE_PATTERNS = [
  /(?:go ahead|code it up|start coding|let's code)/i,
]

// Patterns that reveal optimal complexity bounds
const OPTIMAL_REVEAL_PATTERNS = [
  /(?:is|that's|this is)\s+(?:the\s+)?optimal/i,
  /(?:can't|cannot|can not)\s+do\s+better/i,
  /(?:is|that's)\s+(?:the\s+)?(?:best|lowest|minimum)\s+(?:you can|possible|bound)/i,
  /O\([^)]+\)\s+is\s+(?:the\s+)?(?:optimal|best|lowest)/i,
]

// Patterns that indicate excessive apology
const EXCESSIVE_APOLOGY_PATTERNS = [
  /my (?:bad|mistake|fault)/i,
  /you're right,?\s+(?:my bad|I should|fair point)/i,
  /fair point\.?\s+I should/i,
  /I should(?:'ve| have) (?:asked|known|done)/i,
]

/**
 * Validate an interviewer response against behavioral rules
 */
export function validateInterviewerResponse(ctx: ValidationContext): ValidationResult {
  const violations: ResponseViolation[] = []
  const responseLower = ctx.response.toLowerCase()

  // Rule 1: Check for premature "code it up" without prerequisites
  if (shouldCheckCodeItUp(ctx)) {
    const codeItUpViolation = checkCodeItUpViolation(ctx)
    if (codeItUpViolation) {
      violations.push(codeItUpViolation)
    }
  }

  // Rule 2: Check for vague answer acceptance
  if (ctx.lastUserMessage) {
    const vagueViolation = checkVagueAnswerAcceptance(ctx)
    if (vagueViolation) {
      violations.push(vagueViolation)
    }
  }

  // Rule 3: Check for revealing optimal bounds
  const optimalViolation = checkOptimalBoundsReveal(ctx.response)
  if (optimalViolation) {
    violations.push(optimalViolation)
  }

  // Rule 4: Check for excessive apology
  const apologyViolation = checkExcessiveApology(ctx.response)
  if (apologyViolation) {
    violations.push(apologyViolation)
  }

  // Rule 5: Check for premature feedback mention
  if (!ctx.hasSubmitted && responseLower.includes("view detailed feedback")) {
    violations.push({
      rule: "premature_feedback_mention",
      description: "Mentioned 'View Detailed Feedback' before user submitted",
      severity: "critical",
      evidence: "view detailed feedback",
    })
  }

  // Rule 6: Check for leading questions
  const leadingViolation = checkLeadingQuestions(ctx.response)
  if (leadingViolation) {
    violations.push(leadingViolation)
  }

  // Determine if we should regenerate
  const hasCritical = violations.some((v) => v.severity === "critical")
  const shouldRegenerate = hasCritical

  return {
    isValid: violations.length === 0,
    violations,
    shouldRegenerate,
    regenerationHint: buildRegenerationHint(violations),
  }
}

function shouldCheckCodeItUp(ctx: ValidationContext): boolean {
  const isPreTestPhase =
    (ctx.phase === "discussion" || ctx.phase === "coding") &&
    ctx.tracker &&
    !ctx.tracker.hasRunTests
  return isPreTestPhase
}

function checkCodeItUpViolation(ctx: ValidationContext): ResponseViolation | null {
  const responseLower = ctx.response.toLowerCase()
  const codeItUpPhrases = ["code it up", "go ahead and code", "start coding", "go code", "let's code"]
  const hasCodeItUp = codeItUpPhrases.some((phrase) => responseLower.includes(phrase))

  if (!hasCodeItUp || !ctx.tracker) return null

  const missingPrereqs: string[] = []
  if (!ctx.tracker.timeComplexityMentioned) {
    missingPrereqs.push("complexity")
  }
  if (ctx.tracker.edgeCasesMentioned.length === 0) {
    missingPrereqs.push("edge cases")
  }

  if (missingPrereqs.length > 0) {
    return {
      rule: "premature_code_it_up",
      description: `Said "code it up" without discussing: ${missingPrereqs.join(", ")}`,
      severity: "critical",
      evidence: codeItUpPhrases.find((p) => responseLower.includes(p)) || "",
    }
  }

  return null
}

function checkVagueAnswerAcceptance(ctx: ValidationContext): ResponseViolation | null {
  if (!ctx.lastUserMessage) return null

  const userMsgLower = ctx.lastUserMessage.toLowerCase()
  const responseLower = ctx.response.toLowerCase()

  // Check if user gave a vague answer
  const vaguePatterns = [
    { pattern: /i(?:'ll| will| can) (?:just )?skip (?:them|it|those)/i, topic: "skipping" },
    { pattern: /i(?:'ll| will| can) (?:just )?(?:use|add) (?:a )?(?:hash|map|set)/i, topic: "data structure" },
    { pattern: /i(?:'ll| will| can) (?:just )?iterate/i, topic: "iteration" },
    { pattern: /i(?:'ll| will| can) (?:just )?check (?:for )?(?:that|it)/i, topic: "checking" },
    { pattern: /i(?:'ll| will| can) (?:just )?handle (?:that|it)/i, topic: "handling" },
  ]

  const vagueAnswer = vaguePatterns.find((p) => p.pattern.test(userMsgLower))
  if (!vagueAnswer) return null

  // Check if interviewer accepted it without probing
  const acceptedWithoutProbing = VAGUE_ACCEPTANCE_PATTERNS.some((p) => p.test(responseLower))

  // Check if interviewer DID probe (good behavior)
  const probingPatterns = [
    /how (?:exactly|specifically|would you)/i,
    /walk me through/i,
    /what (?:will|would) you/i,
    /where (?:exactly|specifically)/i,
    /show me/i,
    /explain (?:how|what|where)/i,
  ]
  const didProbe = probingPatterns.some((p) => p.test(responseLower))

  if (acceptedWithoutProbing && !didProbe) {
    return {
      rule: "vague_answer_accepted",
      description: `Accepted vague answer about "${vagueAnswer.topic}" without probing for specifics`,
      severity: "critical",
      evidence: ctx.lastUserMessage.substring(0, 100),
    }
  }

  return null
}

function checkOptimalBoundsReveal(response: string): ResponseViolation | null {
  for (const pattern of OPTIMAL_REVEAL_PATTERNS) {
    const match = response.match(pattern)
    if (match) {
      return {
        rule: "revealed_optimal_bounds",
        description: "Revealed optimal complexity bounds instead of letting candidate discover it",
        severity: "warning",
        evidence: match[0],
      }
    }
  }
  return null
}

function checkExcessiveApology(response: string): ResponseViolation | null {
  const apologies: string[] = []
  for (const pattern of EXCESSIVE_APOLOGY_PATTERNS) {
    const match = response.match(pattern)
    if (match) {
      apologies.push(match[0])
    }
  }

  // One apology is fine, multiple is excessive
  if (apologies.length >= 2) {
    return {
      rule: "excessive_apology",
      description: "Multiple apologies detected - maintain professional composure",
      severity: "warning",
      evidence: apologies.join(", "),
    }
  }

  return null
}

function checkLeadingQuestions(response: string): ResponseViolation | null {
  const leadingPatterns = [
    { pattern: /are you thinking.*(dp|dynamic|hash|map|set|tree|stack|queue)/i, technique: "data structure/algorithm" },
    { pattern: /would a.*(hash|map|set|array|tree|stack|queue).*help/i, technique: "data structure" },
    { pattern: /have you considered.*(dp|dynamic|hash|sliding|two pointer)/i, technique: "algorithm" },
    { pattern: /it's basically.*(fibonacci|dp|bfs|dfs|binary search)/i, technique: "algorithm" },
  ]

  for (const { pattern, technique } of leadingPatterns) {
    if (pattern.test(response)) {
      return {
        rule: "leading_question",
        description: `Leading question that suggests ${technique}`,
        severity: "warning",
        evidence: response.match(pattern)?.[0] || "",
      }
    }
  }

  return null
}

function buildRegenerationHint(violations: ResponseViolation[]): string | undefined {
  if (violations.length === 0) return undefined

  const hints: string[] = []

  for (const v of violations) {
    switch (v.rule) {
      case "premature_code_it_up":
        hints.push("Ask about complexity and edge cases BEFORE saying 'code it up'")
        break
      case "vague_answer_accepted":
        hints.push("Probe for specifics - ask HOW they would implement their vague statement")
        break
      case "revealed_optimal_bounds":
        hints.push("Ask 'What do you think? Can this be improved?' instead of revealing optimality")
        break
      case "excessive_apology":
        hints.push("Acknowledge once, then redirect: 'Let's move forward - what's your complexity analysis?'")
        break
      case "premature_feedback_mention":
        hints.push("Don't mention 'View Detailed Feedback' until after user submits")
        break
      case "leading_question":
        hints.push("Ask open-ended questions like 'Walk me through your approach' instead of suggesting techniques")
        break
    }
  }

  return hints.join(". ")
}
