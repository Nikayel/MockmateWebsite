/**
 * Interviewer Agent - Conducts the technical interview
 *
 * Responsibilities:
 * - Generate natural, professional interviewer responses
 * - Ask probing questions based on phase
 * - Guide candidate through problem-solving process
 *
 * Model: Smart (Claude/GPT-4) - needs nuanced conversation ability
 *
 * Does NOT:
 * - Track conversation state (StateTracker's job)
 * - Validate responses (Validator's job)
 * - Calculate scores (Scorer's job)
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import {
  Agent,
  AgentConfig,
  InterviewerInput,
  InterviewerOutput,
  ChatMessage,
  InterviewPhase,
} from "./types"
import {
  INTERVIEWER_SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  PHASE_PROMPTS,
  QUICK_INJECTIONS,
} from "@/lib/interview/interviewer-prompts"

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

const INTERVIEWER_CONFIG: AgentConfig = {
  type: "interviewer",
  modelTier: "smart",
  description: "Conducts technical interviews with natural conversation",
  estimatedTokensPerCall: 500,
  maxRetries: 2,
}

// =============================================================================
// INTERVIEWER AGENT CLASS
// =============================================================================

export class InterviewerAgent implements Agent<InterviewerInput, InterviewerOutput> {
  readonly config = INTERVIEWER_CONFIG

  async execute(input: InterviewerInput): Promise<InterviewerOutput> {
    const startTime = Date.now()

    try {
      // Build the prompt
      const systemPrompt = this.buildSystemPrompt(input)
      const userPrompt = this.buildUserPrompt(input)

      // Generate response
      const response = await generateAIResponse(
        systemPrompt,
        userPrompt,
        this.formatHistory(input.messages),
        {
          complexity: "complex", // Use smart model
          temperature: 0.7,
          userId: input.context.userId || "interviewer-agent",
        }
      )

      // Post-process: strip bold, enforce length
      const processedResponse = this.postProcessResponse(response.text)

      logger.info("[InterviewerAgent] Generated response", {
        phase: input.state.currentPhase,
        responseLength: processedResponse.length,
        originalLength: response.text.length,
        wasProcessed: processedResponse !== response.text,
        latencyMs: Date.now() - startTime,
      })

      return {
        response: processedResponse,
        suggestedPhase: this.detectPhaseFromResponse(processedResponse, input.state.currentPhase),
        confidence: 0.9, // Could be enhanced with actual confidence scoring
      }
    } catch (error) {
      logger.error("[InterviewerAgent] Failed to generate response", { error })
      throw error
    }
  }

  validateInput(input: InterviewerInput): { valid: boolean; error?: string } {
    if (!input.context.sessionId) {
      return { valid: false, error: "Missing sessionId" }
    }
    if (!input.lastUserMessage) {
      return { valid: false, error: "Missing lastUserMessage" }
    }
    return { valid: true }
  }

  // ===========================================================================
  // PROMPT BUILDING
  // ===========================================================================

  private buildSystemPrompt(input: InterviewerInput): string {
    const { state, context } = input
    const phase = state.currentPhase

    // Start with core system prompt
    let prompt = INTERVIEWER_SYSTEM_PROMPT

    // Add problem context
    prompt += `\n\nPROBLEM: ${context.problemTitle} (${context.problemDifficulty})`

    // Add rich context from context-builders (if provided)
    // This gives v2 full parity with v1's context richness
    if (context.promptContext) {
      const pc = context.promptContext
      if (pc.companyContext) prompt += `\n\n${pc.companyContext}`
      if (pc.userContext) prompt += `\n\n${pc.userContext}`
      if (pc.levelContext) prompt += `\n\n${pc.levelContext}`
      if (pc.patternContext) prompt += `\n\n${pc.patternContext}`
      if (pc.typeSpecificContext) prompt += `\n\n${pc.typeSpecificContext}`
      if (pc.edgeCaseContext) prompt += `\n\n${pc.edgeCaseContext}`
      if (pc.testResultsContext) prompt += `\n\n${pc.testResultsContext}`
      if (pc.complexityContext) prompt += `\n\n${pc.complexityContext}`
      if (pc.fuzzyModeContext) prompt += `\n\n${pc.fuzzyModeContext}`
      if (pc.knowledgeContext) prompt += `\n\n${pc.knowledgeContext}`
      // Add current code context - this lets the interviewer see and reference the solution
      if (pc.codeContext) prompt += `\n\n${pc.codeContext}`
      // Add AI Partner usage tracking - alerts interviewer to AI assistance patterns
      if (pc.aiPartnerContext) prompt += `\n\n${pc.aiPartnerContext}`
      // Add user answered topics - prevents re-asking about already covered topics
      if (pc.userAnsweredContext) prompt += `\n\n${pc.userAnsweredContext}`
      // Add workspace context - other files in user's codebase
      if (pc.workspaceContext) prompt += `\n\n${pc.workspaceContext}`
      // Add RAG-enhanced context - dynamic knowledge retrieval
      if (pc.ragContext) prompt += `\n\n${pc.ragContext}`
    }

    // Add phase-specific guidance
    const phasePrompt = PHASE_PROMPTS[phase]
    if (phasePrompt) {
      prompt += `\n\n${phasePrompt}`
    }

    // Add few-shot examples
    prompt += `\n\n${FEW_SHOT_EXAMPLES}`

    // Add tool results if provided (pre-executed state queries)
    if (input.toolResults) {
      prompt += `\n\n${input.toolResults}`
    }

    // Add quick injections based on state
    prompt += this.buildQuickInjections(input)

    return prompt
  }

  private buildQuickInjections(input: InterviewerInput): string {
    const { state, context } = input
    const injections: string[] = []

    // Check prerequisites for coding transition
    if (state.currentPhase === "discussion" && !state.hasRunTests) {
      const hasComplexity = state.timeComplexityMentioned
      const hasEdgeCases = state.edgeCasesMentioned.length > 0

      if (!hasComplexity || !hasEdgeCases) {
        injections.push(QUICK_INJECTIONS.blockCoding)
      }
    }

    // Handle testing phase
    if (state.hasRunTests && state.currentPhase === "testing") {
      injections.push(QUICK_INJECTIONS.continueAfterTests)
    }

    // Add solution complexity context
    if (context.isOptimalSolution !== undefined) {
      injections.push(
        `\nSOLUTION COMPLEXITY: ${context.isOptimalSolution ? "Already optimal - focus on edge cases/trade-offs" : "Not optimal - can ask about improvements"}`
      )
    }

    return injections.length > 0 ? `\n\n${injections.join("\n")}` : ""
  }

  private buildUserPrompt(input: InterviewerInput): string {
    const sections: string[] = []

    // Add state summary for context
    sections.push(this.buildStateSummary(input.state))

    // Add the user's message
    sections.push(`\nCANDIDATE'S MESSAGE:\n"${input.lastUserMessage}"`)

    // Add test results if in testing phase
    if (input.state.hasRunTests && input.context.testResults) {
      const passed = input.context.testsPassed || 0
      const total = input.context.testsTotal || 0
      sections.push(`\nTEST RESULTS: ${passed}/${total} tests passed`)
    }

    return sections.join("\n")
  }

  private buildStateSummary(state: ConversationState): string {
    const lines: string[] = ["CONVERSATION STATE:"]

    // Approach
    if (state.approachExplained) {
      lines.push(`- Approach: ${state.approachType} (${state.approachQuality})`)
    } else {
      lines.push("- Approach: NOT YET EXPLAINED")
    }

    // Complexity
    if (state.timeComplexityMentioned) {
      lines.push(
        `- Time complexity: ${state.timeComplexityValue} ${state.complexityExplanationGiven ? "(with explanation)" : "(no explanation)"}`
      )
    } else {
      lines.push("- Time complexity: NOT DISCUSSED")
    }

    // Edge cases
    if (state.edgeCasesMentioned.length > 0) {
      lines.push(`- Edge cases mentioned: ${state.edgeCasesMentioned.join(", ")}`)
    } else {
      lines.push("- Edge cases: NOT MENTIONED")
    }

    // Progress
    lines.push(`- Phase: ${state.currentPhase}`)
    lines.push(`- Tests run: ${state.hasRunTests ? "YES" : "NO"}`)

    return lines.join("\n")
  }

  private formatHistory(
    messages: ChatMessage[]
  ): Array<{ role: "user" | "model"; content: string }> {
    // Take last 10 messages for context (configurable)
    const recentMessages = messages.slice(-10)

    return recentMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        content: m.content,
      }))
  }

  /**
   * Post-process the response to enforce guardrails:
   * 1. Strip bold/italic formatting
   * 2. Truncate overly long responses
   */
  private postProcessResponse(response: string): string {
    let processed = response

    // 1. Strip bold formatting (**text** -> text)
    processed = processed.replace(/\*\*([^*]+)\*\*/g, "$1")

    // 2. Strip italic formatting (*text* -> text)
    processed = processed.replace(/\*([^*]+)\*/g, "$1")

    // 3. Truncate if too long (more than ~150 words)
    const words = processed.split(/\s+/)
    if (words.length > 150) {
      // Find a good sentence break point
      const truncated = words.slice(0, 100).join(" ")
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("?"),
        truncated.lastIndexOf("!")
      )
      if (lastSentenceEnd > 50) {
        processed = truncated.slice(0, lastSentenceEnd + 1)
      } else {
        processed = truncated + "..."
      }
      logger.warn("[InterviewerAgent] Response truncated", {
        originalWords: words.length,
        truncatedWords: processed.split(/\s+/).length,
      })
    }

    return processed.trim()
  }

  private detectPhaseFromResponse(response: string, currentPhase: InterviewPhase): InterviewPhase {
    const lower = response.toLowerCase()

    // Detect phase transitions from response content
    if (lower.includes("view detailed feedback") || lower.includes("click submit")) {
      return "post_interview"
    }

    if (lower.includes("go ahead and code") || lower.includes("start coding")) {
      return "coding"
    }

    return currentPhase // No change detected
  }
}

// =============================================================================
// CONVENIENCE TYPES
// =============================================================================

import type { ConversationState } from "./types"

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const interviewerAgent = new InterviewerAgent()
