/**
 * Response Validator Agent - Validates interviewer responses
 *
 * Responsibilities:
 * - Check responses against hard behavioral rules
 * - Detect violations (premature coding, giving answers, etc.)
 * - Provide hints for regeneration
 *
 * Model: DETERMINISTIC (no LLM) - rules are explicit patterns
 *
 * Design: Uses the hard gates from response-validation.ts
 * This is a thin wrapper that adapts the validation to agent interface
 */

import { logger } from "@/lib/logger"
import {
  Agent,
  AgentConfig,
  ValidatorInput,
  ValidatorOutput,
  ValidationViolation,
} from "./types"
import {
  validateInterviewerResponse,
  type ValidationContext,
} from "@/lib/interview/response-validation"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

const VALIDATOR_CONFIG: AgentConfig = {
  type: "response_validator",
  modelTier: "deterministic",
  description: "Validates interviewer responses against behavioral rules",
  estimatedTokensPerCall: 0, // No LLM calls
  maxRetries: 0, // No retries - deterministic
}

// =============================================================================
// RESPONSE VALIDATOR AGENT CLASS
// =============================================================================

export class ResponseValidatorAgent implements Agent<ValidatorInput, ValidatorOutput> {
  readonly config = VALIDATOR_CONFIG

  async execute(input: ValidatorInput): Promise<ValidatorOutput> {
    const startTime = Date.now()

    try {
      // Convert agent types to validation types
      const validationContext: ValidationContext = {
        response: input.response,
        phase: input.state.currentPhase,
        tracker: this.convertToTracker(input.state),
        hasSubmitted: input.context.hasSubmitted,
        lastUserMessage: input.lastUserMessage,
        isOptimalSolution: input.context.isOptimalSolution,
      }

      // Run validation
      const result = validateInterviewerResponse(validationContext)

      // Convert to agent output format
      const violations: ValidationViolation[] = result.violations.map(v => ({
        rule: v.rule,
        severity: v.severity,
        evidence: v.evidence,
        hint: this.getHintForRule(v.rule),
      }))

      logger.info("[ResponseValidatorAgent] Validation complete", {
        isValid: result.isValid,
        violationCount: violations.length,
        criticalCount: violations.filter(v => v.severity === "critical").length,
        latencyMs: Date.now() - startTime,
      })

      return {
        isValid: result.isValid,
        violations,
        shouldRegenerate: result.shouldRegenerate,
        regenerationHint: result.regenerationHint,
      }
    } catch (error) {
      logger.error("[ResponseValidatorAgent] Validation failed", { error })
      // Return permissive result on error (don't block the response)
      return {
        isValid: true,
        violations: [],
        shouldRegenerate: false,
      }
    }
  }

  // ===========================================================================
  // STATE CONVERSION
  // ===========================================================================

  private convertToTracker(state: ValidatorInput["state"]): ConversationTracker {
    return {
      approachExplained: state.approachExplained,
      approachType: state.approachType,
      approachQuality: state.approachQuality,
      timeComplexityMentioned: state.timeComplexityMentioned,
      timeComplexityValue: state.timeComplexityValue,
      spaceComplexityMentioned: state.spaceComplexityMentioned,
      spaceComplexityValue: state.spaceComplexityValue,
      complexityExplanationGiven: state.complexityExplanationGiven,
      edgeCasesMentioned: state.edgeCasesMentioned,
      edgeCasesAskedByInterviewer: state.edgeCasesAskedByInterviewer,
      hasStartedCoding: state.hasStartedCoding,
      hasRunTests: state.hasRunTests,
      wasAskedToOptimize: false, // Not tracked in agent state
      didOptimize: false, // Not tracked in agent state
      bugsMade: 0, // Not tracked in agent state
      bugsSelfCorrected: state.selfCorrectedBugs ? 1 : 0,
      hintsGiven: state.hintsGiven,
      clarifyingQuestionsAsked: state.clarifyingQuestionsAsked,
      answeredInterviewerQuestions: state.answeredInterviewerQuestions,
    }
  }

  // ===========================================================================
  // HINT LOOKUP
  // ===========================================================================

  private getHintForRule(rule: string): string {
    const hints: Record<string, string> = {
      "no-premature-coding": "Ask about time complexity and edge cases BEFORE telling them to code",
      "no-giving-answers": "Ask guiding questions instead of giving the answer. Example: 'What data structure might help here?'",
      "no-revealing-optimal": "Don't reveal optimality. Ask: 'What do you think the complexity is? Could it be improved?'",
      "no-excessive-apology": "Acknowledge once, then move forward. Example: 'Good catch. So, what's your complexity analysis?'",
      "no-premature-feedback": "The 'View Detailed Feedback' button only appears AFTER submit. Guide them to Submit first.",
      "one-question-at-a-time": "Ask ONE focused question at a time. Let them answer before asking the next.",
      "no-accepting-vague-answers": "When user gives vague answer, probe: 'How exactly would you handle that? Walk me through the code.'",
      "no-leading-questions": "Ask open questions: 'What approach are you considering?' not 'Would a hash map help?'",
    }

    return hints[rule] || "Follow interviewer best practices"
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick validation check (for use outside agent pattern)
 */
export function quickValidate(
  response: string,
  state: ValidatorInput["state"],
  context: ValidatorInput["context"],
  lastUserMessage?: string
): ValidatorOutput {
  const agent = new ResponseValidatorAgent()
  // Since execute is async but validation is sync, we can call it directly
  return agent.execute({ response, state, context, lastUserMessage }) as unknown as ValidatorOutput
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const responseValidatorAgent = new ResponseValidatorAgent()
