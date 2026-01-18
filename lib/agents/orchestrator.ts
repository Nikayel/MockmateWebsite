/**
 * Interview Orchestrator - Coordinates all interview agents
 *
 * This is the main entry point for the multi-agent interview system.
 * It coordinates:
 * 1. State Tracker → Extract conversation state
 * 2. Interviewer → Generate response
 * 3. Validator → Check response
 * 4. (Retry loop if validation fails)
 *
 * Benefits:
 * - Clear separation of concerns
 * - Each agent is testable in isolation
 * - Easy to swap models per agent
 * - Cost optimization (cheap models where possible)
 * - Metrics and logging per agent
 */

import { logger } from "@/lib/logger"
import {
  OrchestratorConfig,
  OrchestrationResult,
  InterviewContext,
  ConversationState,
  ChatMessage,
  AgentType,
  InterviewerOutput,
} from "./types"
import { InterviewerAgent } from "./interviewer-agent"
import { StateTrackerAgent } from "./state-tracker-agent"
import { ResponseValidatorAgent } from "./response-validator-agent"
import {
  executeTool,
  formatToolResultsForPrompt,
  type ToolContext,
} from "@/lib/interview/interviewer-tools"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxInterviewerRetries: 2,
  enableConstitutionalAI: true,
  enableStateTracking: true,
  logLevel: "info",
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

export class InterviewOrchestrator {
  private config: OrchestratorConfig
  private interviewerAgent: InterviewerAgent
  private stateTrackerAgent: StateTrackerAgent
  private validatorAgent: ResponseValidatorAgent

  // Metrics tracking
  private metrics: {
    totalLatencyMs: number
    agentCalls: { agent: AgentType; latencyMs: number; tokens?: number }[]
    retries: number
  } = {
    totalLatencyMs: 0,
    agentCalls: [],
    retries: 0,
  }

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.interviewerAgent = new InterviewerAgent()
    this.stateTrackerAgent = new StateTrackerAgent()
    this.validatorAgent = new ResponseValidatorAgent()
  }

  // ===========================================================================
  // MAIN ORCHESTRATION: Generate Interview Response
  // ===========================================================================

  /**
   * Generate an interviewer response for the given context and messages
   *
   * Flow:
   * 1. Track state from conversation
   * 2. Pre-execute tools for state queries
   * 3. Generate interviewer response
   * 4. Validate response
   * 5. Retry if validation fails
   * 6. Return final response with metrics
   */
  async generateResponse(
    context: InterviewContext,
    messages: ChatMessage[],
    lastUserMessage: string,
    previousState?: Partial<ConversationState>
  ): Promise<OrchestrationResult<{ response: string; state: ConversationState }>> {
    const startTime = Date.now()
    this.resetMetrics()

    try {
      // Step 1: Track conversation state
      const stateResult = await this.trackState(context, messages, previousState)
      if (!stateResult.success || !stateResult.data) {
        return {
          success: false,
          error: stateResult.error || "State tracking failed",
          metrics: this.getMetrics(startTime),
        }
      }
      const state = stateResult.data.state

      // Step 1.5: Inject guardrails from state into context
      this.injectGuardrailsIntoContext(context, state)

      // Step 2: Pre-execute tools for state queries
      const toolResults = this.executeTools(state, context)

      // Step 3: Generate and validate response (with retry loop)
      const responseResult = await this.generateAndValidate(
        context,
        state,
        messages,
        lastUserMessage,
        toolResults
      )

      if (!responseResult.success || !responseResult.data) {
        return {
          success: false,
          error: responseResult.error || "Response generation failed",
          metrics: this.getMetrics(startTime),
        }
      }

      return {
        success: true,
        data: {
          response: responseResult.data.response,
          state,
        },
        metrics: this.getMetrics(startTime),
      }
    } catch (error) {
      logger.error("[Orchestrator] Orchestration failed", { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: this.getMetrics(startTime),
      }
    }
  }

  // ===========================================================================
  // AGENT COORDINATION
  // ===========================================================================

  /**
   * Step 1: Track conversation state
   */
  private async trackState(
    context: InterviewContext,
    messages: ChatMessage[],
    previousState?: Partial<ConversationState>
  ): Promise<OrchestrationResult<{ state: ConversationState; changes: string[] }>> {
    if (!this.config.enableStateTracking) {
      // Return minimal state if tracking disabled
      return {
        success: true,
        data: {
          state: this.getMinimalState(context),
          changes: [],
        },
      }
    }

    const startTime = Date.now()

    try {
      const result = await this.stateTrackerAgent.execute({
        messages,
        currentState: previousState || {},
        context: {
          ...context,
          currentCode: context.currentCode || "",
          starterCode: context.starterCode || "",
        },
      })

      this.recordAgentCall("state_tracker", startTime)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      logger.error("[Orchestrator] State tracking failed", { error })
      return {
        success: false,
        error: "State tracking failed",
      }
    }
  }

  /**
   * Step 2: Pre-execute tools for state queries
   */
  private executeTools(state: ConversationState, context: InterviewContext): string {
    const toolContext: ToolContext = {
      tracker: this.convertToTracker(state),
      phase: state.currentPhase,
      isOptimalSolution: context.isOptimalSolution || false,
      testsHaveRun: context.testsHaveRun,
      testsPassed: context.testsPassed || 0,
      testsTotal: context.testsTotal || 0,
    }

    // Execute relevant tools based on phase
    const toolCalls: Array<{ name: string; result: ReturnType<typeof executeTool> }> = []

    // Always check prerequisites in discussion/coding phase
    if (state.currentPhase === "discussion" || state.currentPhase === "coding") {
      toolCalls.push({
        name: "check_prerequisites",
        result: executeTool("check_prerequisites", {}, toolContext),
      })

      toolCalls.push({
        name: "get_next_required_topic",
        result: executeTool("get_next_required_topic", {}, toolContext),
      })
    }

    // Check phase info
    toolCalls.push({
      name: "get_interview_phase",
      result: executeTool("get_interview_phase", {}, toolContext),
    })

    return formatToolResultsForPrompt(toolCalls)
  }

  /**
   * Step 3: Generate and validate response with retry loop
   */
  private async generateAndValidate(
    context: InterviewContext,
    state: ConversationState,
    messages: ChatMessage[],
    lastUserMessage: string,
    toolResults: string
  ): Promise<OrchestrationResult<{ response: string }>> {
    let currentResponse = ""
    let retries = 0

    for (let attempt = 0; attempt <= this.config.maxInterviewerRetries; attempt++) {
      // Generate response
      const generateStart = Date.now()
      let generateResult: InterviewerOutput

      try {
        generateResult = await this.interviewerAgent.execute({
          context,
          state,
          messages,
          lastUserMessage,
          toolResults:
            attempt === 0 ? toolResults : toolResults + this.buildRetryHint(currentResponse),
        })
        this.recordAgentCall("interviewer", generateStart)
        currentResponse = generateResult.response
      } catch (error) {
        logger.error("[Orchestrator] Interview generation failed", { error, attempt })
        continue
      }

      // Validate response
      const validateStart = Date.now()
      const validationResult = await this.validatorAgent.execute({
        response: currentResponse,
        state,
        context,
        lastUserMessage,
      })
      this.recordAgentCall("response_validator", validateStart)

      // If valid, return
      if (validationResult.isValid) {
        return {
          success: true,
          data: { response: currentResponse },
        }
      }

      // If critical violations and more retries available, retry
      if (validationResult.shouldRegenerate && attempt < this.config.maxInterviewerRetries) {
        logger.info("[Orchestrator] Regenerating due to violations", {
          attempt: attempt + 1,
          violations: validationResult.violations.map((v) => v.rule),
        })
        retries++
        this.metrics.retries = retries

        // Add regeneration hint to tool results for next attempt
        toolResults += `\n\n⚠️ PREVIOUS RESPONSE VIOLATED RULES:\n${validationResult.regenerationHint}\n\nREGENERATE with these rules in mind.`
        continue
      }

      // If only warnings or no more retries, return current response
      return {
        success: true,
        data: { response: currentResponse },
      }
    }

    // Exhausted retries
    return {
      success: true,
      data: { response: currentResponse },
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private buildRetryHint(previousResponse: string): string {
    return `\n\nPREVIOUS RESPONSE (violated rules):\n"${previousResponse.substring(0, 200)}..."\n\nGenerate a DIFFERENT response that follows the rules.`
  }

  /**
   * Inject guardrails from state into context.
   * This enriches the userAnsweredContext with closed topics and probe counts.
   */
  private injectGuardrailsIntoContext(context: InterviewContext, state: ConversationState): void {
    if (!context.promptContext) return

    // Build guardrails section from state
    const guardrails: string[] = []

    // Closed topics - user has properly answered these
    if (state.closedTopics && state.closedTopics.length > 0) {
      guardrails.push(`
## CLOSED TOPICS - DO NOT ASK ABOUT THESE AGAIN
The candidate has PROPERLY ANSWERED these. Move on.
${state.closedTopics.map((t) => `- ${t.replace(/_/g, " ")}`).join("\n")}`)
    }

    // Over-probed topics - asked too many times
    if (state.topicProbeCount) {
      const overProbed: string[] = []
      if (state.topicProbeCount.timeComplexity >= 2) overProbed.push("time complexity")
      if (state.topicProbeCount.spaceComplexity >= 2) overProbed.push("space complexity")
      if (state.topicProbeCount.approach >= 3) overProbed.push("approach/algorithm")
      if (state.topicProbeCount.edgeCases >= 3) overProbed.push("edge cases")
      if (state.topicProbeCount.duplicates >= 2) overProbed.push("duplicate handling")

      if (overProbed.length > 0) {
        guardrails.push(`
## STOP ASKING ABOUT THESE - ALREADY PROBED ENOUGH
${overProbed.map((t) => `- ${t}`).join("\n")}
Move to the next phase or ask about something else.`)
      }
    }

    // Append to userAnsweredContext
    if (guardrails.length > 0) {
      context.promptContext.userAnsweredContext =
        (context.promptContext.userAnsweredContext || "") + "\n" + guardrails.join("\n")
    }
  }

  private convertToTracker(state: ConversationState): ConversationTracker {
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
      wasAskedToOptimize: false,
      didOptimize: false,
      bugsMade: 0,
      bugsSelfCorrected: state.selfCorrectedBugs ? 1 : 0,
      hintsGiven: state.hintsGiven,
      clarifyingQuestionsAsked: state.clarifyingQuestionsAsked,
      answeredInterviewerQuestions: state.answeredInterviewerQuestions,
    }
  }

  private getMinimalState(context: InterviewContext): ConversationState {
    return {
      currentPhase: context.hasSubmitted
        ? "post_interview"
        : context.testsHaveRun
          ? "testing"
          : "discussion",
      messageCount: 0,
      approachExplained: false,
      approachType: "none",
      approachQuality: "none",
      timeComplexityMentioned: false,
      timeComplexityValue: null,
      spaceComplexityMentioned: false,
      spaceComplexityValue: null,
      complexityExplanationGiven: false,
      edgeCasesMentioned: [],
      edgeCasesAskedByInterviewer: [],
      hasStartedCoding: false,
      hasRunTests: context.testsHaveRun,
      hintsGiven: 0,
      clarifyingQuestionsAsked: false,
      answeredInterviewerQuestions: 0,
      selfCorrectedBugs: false,
      topicProbeCount: {
        timeComplexity: 0,
        spaceComplexity: 0,
        approach: 0,
        edgeCases: 0,
        duplicates: 0,
      },
      closedTopics: [],
    }
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  private resetMetrics(): void {
    this.metrics = {
      totalLatencyMs: 0,
      agentCalls: [],
      retries: 0,
    }
  }

  private recordAgentCall(agent: AgentType, startTime: number): void {
    this.metrics.agentCalls.push({
      agent,
      latencyMs: Date.now() - startTime,
    })
  }

  private getMetrics(startTime: number): typeof this.metrics {
    return {
      ...this.metrics,
      totalLatencyMs: Date.now() - startTime,
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const interviewOrchestrator = new InterviewOrchestrator()

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Quick orchestration for interview responses
 * This is the main function to call from route handlers
 */
export async function orchestrateInterviewResponse(
  context: InterviewContext,
  messages: ChatMessage[],
  lastUserMessage: string,
  previousState?: Partial<ConversationState>
): Promise<OrchestrationResult<{ response: string; state: ConversationState }>> {
  return interviewOrchestrator.generateResponse(context, messages, lastUserMessage, previousState)
}
