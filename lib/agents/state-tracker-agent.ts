/**
 * State Tracker Agent - Extracts and tracks conversation state
 *
 * Responsibilities:
 * - Detect what topics have been discussed
 * - Track complexity mentions
 * - Track edge cases mentioned
 * - Determine conversation phase
 *
 * Model: Cheap (Haiku/GPT-3.5) - extraction is simpler than generation
 *
 * Design: Hybrid approach
 * - Algorithmic: Phase detection, basic keyword matching
 * - LLM: Semantic understanding (approach quality, complexity accuracy)
 */

import { generateAIResponse } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import {
  Agent,
  AgentConfig,
  StateTrackerInput,
  StateTrackerOutput,
  ConversationState,
  InterviewPhase,
  ChatMessage,
} from "./types"
import {
  getComplexityRank,
  findDominantComplexity,
  normalizeComplexity,
  extractEdgeCases,
  isVagueAnswer,
} from "@/lib/interview/shared-patterns"

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

const STATE_TRACKER_CONFIG: AgentConfig = {
  type: "state_tracker",
  modelTier: "cheap",
  description: "Extracts and tracks conversation state",
  estimatedTokensPerCall: 200,
  maxRetries: 1,
}

// =============================================================================
// STATE TRACKER AGENT CLASS
// =============================================================================

export class StateTrackerAgent implements Agent<StateTrackerInput, StateTrackerOutput> {
  readonly config = STATE_TRACKER_CONFIG

  async execute(input: StateTrackerInput): Promise<StateTrackerOutput> {
    const startTime = Date.now()

    try {
      // Start with algorithmic extraction (fast, no API call)
      const algorithmicState = this.extractAlgorithmically(input)

      // Determine if we need LLM extraction
      const needsLLM = this.shouldUseLLM(input, algorithmicState)

      let finalState = algorithmicState

      if (needsLLM) {
        // Enhance with LLM extraction
        const llmEnhancements = await this.extractWithLLM(input, algorithmicState)
        finalState = this.mergeStates(algorithmicState, llmEnhancements)
      }

      // Detect changes from previous state
      const changes = this.detectChanges(input.currentState, finalState)

      logger.info("[StateTrackerAgent] State extracted", {
        phase: finalState.currentPhase,
        usedLLM: needsLLM,
        changesCount: changes.length,
        latencyMs: Date.now() - startTime,
      })

      return { state: finalState, changes }
    } catch (error) {
      logger.error("[StateTrackerAgent] Extraction failed", { error })
      // Return safe defaults on error
      return {
        state: this.getDefaultState(),
        changes: [],
      }
    }
  }

  // ===========================================================================
  // ALGORITHMIC EXTRACTION (No API call)
  // ===========================================================================

  private extractAlgorithmically(input: StateTrackerInput): ConversationState {
    const { messages, context } = input
    const state = this.getDefaultState()

    // Detect phase first
    state.currentPhase = this.detectPhase(input)
    state.messageCount = messages.length

    // Process each message
    messages.forEach((msg, index) => {
      if (msg.role === "user") {
        this.processUserMessage(msg.content, state)
      } else if (msg.role === "assistant") {
        this.processAssistantMessage(msg.content, state)
      }
    })

    // Update from context
    state.hasRunTests = context.testsHaveRun
    state.hasStartedCoding = this.detectCodingStarted(context)

    return state
  }

  private detectPhase(input: StateTrackerInput): InterviewPhase {
    const { context, messages } = input

    // Button clicks are 100% reliable
    if (context.hasSubmitted) return "post_interview"
    if (context.testsHaveRun) return "testing"

    // Code comparison
    const codeWritten = (context.currentCode?.length || 0) - (context.starterCode?.length || 0)
    if (codeWritten > 50) return "coding"

    // Message count for intro
    if (messages.length <= 2) return "intro"

    // Check if approach was explained
    const lastUserMessages = messages
      .filter(m => m.role === "user")
      .slice(-3)
      .map(m => m.content.toLowerCase())

    const hasApproachSignal = lastUserMessages.some(m =>
      m.includes("approach") ||
      m.includes("i would") ||
      m.includes("i'll use") ||
      m.includes("my plan")
    )

    if (hasApproachSignal) return "discussion"

    return "discussion" // Default
  }

  private processUserMessage(content: string, state: ConversationState): void {
    const lower = content.toLowerCase()

    // Approach detection
    if (
      lower.includes("approach") ||
      lower.includes("i would") ||
      lower.includes("i'll use") ||
      lower.includes("my plan") ||
      lower.includes("thinking")
    ) {
      state.approachExplained = true
      state.approachType = this.detectApproachType(lower)
      state.approachQuality = isVagueAnswer(content) ? "vague" : "specific"
    }

    // Complexity detection
    const complexityMatches = content.match(/O\s*\(\s*[^)]+\s*\)/gi)
    if (complexityMatches) {
      state.timeComplexityMentioned = true
      const dominant = findDominantComplexity(complexityMatches)
      state.timeComplexityValue = dominant ? normalizeComplexity(dominant) : complexityMatches[0]

      // Check for explanation
      if (lower.includes("because") || lower.includes("since") || lower.includes("loop")) {
        state.complexityExplanationGiven = true
      }
    }

    // Natural language complexity
    if (!state.timeComplexityMentioned) {
      if (lower.includes("linear")) {
        state.timeComplexityMentioned = true
        state.timeComplexityValue = "O(n)"
      } else if (lower.includes("quadratic") || lower.includes("n squared")) {
        state.timeComplexityMentioned = true
        state.timeComplexityValue = "O(n²)"
      } else if (lower.includes("n log n")) {
        state.timeComplexityMentioned = true
        state.timeComplexityValue = "O(n log n)"
      }
    }

    // Space complexity
    if (lower.includes("space") && (lower.includes("o(") || lower.includes("constant") || lower.includes("linear"))) {
      state.spaceComplexityMentioned = true
      const spaceMatch = content.match(/space.*O\s*\(\s*([^)]+)\s*\)/i)
      if (spaceMatch) {
        state.spaceComplexityValue = normalizeComplexity(spaceMatch[0])
      }
    }

    // Edge cases
    const edgeCases = extractEdgeCases(content)
    edgeCases.forEach(ec => {
      if (!state.edgeCasesMentioned.includes(ec)) {
        state.edgeCasesMentioned.push(ec)
      }
    })

    // Clarifying questions
    if (content.includes("?") && (lower.includes("what if") || lower.includes("should i") || lower.includes("can i"))) {
      state.clarifyingQuestionsAsked = true
    }

    // Bug self-correction
    if (lower.includes("wait") || lower.includes("actually") || lower.includes("mistake") || lower.includes("bug")) {
      state.selfCorrectedBugs = true
    }
  }

  private processAssistantMessage(content: string, state: ConversationState): void {
    const lower = content.toLowerCase()

    // Track hints given
    if (lower.includes("hint") || lower.includes("consider") || lower.includes("think about")) {
      state.hintsGiven++
    }

    // Track edge cases interviewer asked about
    const edgeCases = extractEdgeCases(content)
    edgeCases.forEach(ec => {
      if (!state.edgeCasesAskedByInterviewer.includes(ec)) {
        state.edgeCasesAskedByInterviewer.push(ec)
      }
    })

    // Track questions asked (increment answered count when user responds)
    if (content.includes("?")) {
      // This will be matched with user responses
    }
  }

  private detectApproachType(content: string): "none" | "brute_force" | "optimized" | "unclear" {
    if (content.includes("brute force") || content.includes("nested") || content.includes("n squared")) {
      return "brute_force"
    }
    if (content.includes("hash") || content.includes("map") || content.includes("set") || content.includes("single pass")) {
      return "optimized"
    }
    return "unclear"
  }

  private detectCodingStarted(context: { currentCode?: string; starterCode?: string }): boolean {
    const codeWritten = (context.currentCode?.length || 0) - (context.starterCode?.length || 0)
    return codeWritten > 50
  }

  // ===========================================================================
  // LLM EXTRACTION (For semantic understanding)
  // ===========================================================================

  private shouldUseLLM(input: StateTrackerInput, algorithmicState: ConversationState): boolean {
    // Use LLM every 5 messages or when key signals detected
    const messageCount = input.messages.length

    if (messageCount % 5 === 0) return true

    // Use LLM if approach is unclear
    if (algorithmicState.approachType === "unclear" && algorithmicState.approachExplained) {
      return true
    }

    return false
  }

  private async extractWithLLM(
    input: StateTrackerInput,
    algorithmicState: ConversationState
  ): Promise<Partial<ConversationState>> {
    const recentMessages = input.messages.slice(-8)
    const conversationText = recentMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n")

    const prompt = `Analyze this interview conversation and extract:

1. APPROACH: What approach is the candidate using? (brute_force/optimized/unclear)
2. QUALITY: Is their explanation vague, specific, or detailed?
3. COMPLEXITY: Did they mention time complexity? What value?
4. ACCURACY: Is their stated complexity correct for their approach?

CONVERSATION:
${conversationText.substring(0, 3000)}

Return JSON only:
{
  "approachType": "brute_force" | "optimized" | "unclear",
  "approachQuality": "vague" | "specific" | "detailed",
  "timeComplexityValue": "O(n)" or null,
  "complexityIsAccurate": true/false/null
}`

    try {
      const response = await generateAIResponse(
        "You are a conversation analyzer. Return only valid JSON.",
        prompt,
        [],
        { complexity: "simple", temperature: 0.1 }
      )

      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          approachType: parsed.approachType || algorithmicState.approachType,
          approachQuality: parsed.approachQuality || algorithmicState.approachQuality,
          timeComplexityValue: parsed.timeComplexityValue || algorithmicState.timeComplexityValue,
        }
      }
    } catch (error) {
      logger.warn("[StateTrackerAgent] LLM extraction failed", { error })
    }

    return {}
  }

  private mergeStates(
    algorithmic: ConversationState,
    llm: Partial<ConversationState>
  ): ConversationState {
    return {
      ...algorithmic,
      // LLM is better at semantic understanding
      approachType: llm.approachType || algorithmic.approachType,
      approachQuality: llm.approachQuality || algorithmic.approachQuality,
      // Keep algorithmic for concrete detection
      timeComplexityValue: algorithmic.timeComplexityValue || llm.timeComplexityValue || null,
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private detectChanges(
    previous: Partial<ConversationState>,
    current: ConversationState
  ): string[] {
    const changes: string[] = []

    if (previous.currentPhase !== current.currentPhase) {
      changes.push(`phase: ${previous.currentPhase} → ${current.currentPhase}`)
    }
    if (!previous.approachExplained && current.approachExplained) {
      changes.push("approach explained")
    }
    if (!previous.timeComplexityMentioned && current.timeComplexityMentioned) {
      changes.push(`complexity mentioned: ${current.timeComplexityValue}`)
    }
    if ((previous.edgeCasesMentioned?.length || 0) < current.edgeCasesMentioned.length) {
      changes.push(`new edge cases: ${current.edgeCasesMentioned.slice(-1).join(", ")}`)
    }
    if (!previous.hasRunTests && current.hasRunTests) {
      changes.push("tests run")
    }

    return changes
  }

  private getDefaultState(): ConversationState {
    return {
      currentPhase: "intro",
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
      hasRunTests: false,
      hintsGiven: 0,
      clarifyingQuestionsAsked: false,
      answeredInterviewerQuestions: 0,
      selfCorrectedBugs: false,
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const stateTrackerAgent = new StateTrackerAgent()
