/**
 * Interview Phase Management
 *
 * Defines the phases of a technical interview and phase detection logic.
 *
 * NOTE: Phase-specific prompts are now in interviewer-prompts.ts (few-shot examples).
 * This file focuses on:
 * - Phase type definitions
 * - Phase detection (deterministic)
 * - Conversation tracking
 *
 * DRY: Uses shared-patterns.ts for pattern detection.
 */

import {
  EDGE_CASE_KEYWORDS,
  extractEdgeCases,
  normalizeComplexity,
  extractComplexityFromText,
} from "./shared-patterns"

// =============================================================================
// INTERVIEW PHASES
// =============================================================================

export type InterviewPhase =
  | "intro" // Initial greeting and problem introduction
  | "discussion" // Candidate explains approach, interviewer probes
  | "coding" // Candidate writes code, interviewer observes
  | "testing" // Tests run, discuss results and complexity
  | "post_interview" // Wrap-up after submit, final thoughts
  | "complete" // Session ended, direct to feedback

export interface PhaseContext {
  currentPhase: InterviewPhase
  phaseStartedAt: number
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}

// =============================================================================
// PHASE DETECTION
// =============================================================================

/**
 * Detect the current interview phase using DETERMINISTIC signals.
 *
 * Philosophy: Use reliable signals, not fragile regex/keyword detection.
 * - Button clicks (submit, run tests) = 100% reliable
 * - Code length comparison = reliable
 * - LLM extraction for approach = already paid for, use it
 *
 * NO regex detection here - that belongs in extraction.
 */
export interface PhaseDetectionContext {
  // DETERMINISTIC: Button clicks (100% reliable)
  hasSubmitted: boolean
  testsHaveRun: boolean

  // DETERMINISTIC: Code comparison
  currentCodeLength: number
  starterCodeLength: number

  // FROM LLM EXTRACTION: Approach detection (already running every ~3 messages)
  approachExplained?: boolean

  // SIMPLE COUNT: Message count for intro phase
  messageCount: number
}

export function detectInterviewPhase(context: PhaseDetectionContext): InterviewPhase {
  // 1. BUTTON CLICK: User clicked Submit → post-interview
  if (context.hasSubmitted) {
    return "post_interview"
  }

  // 2. BUTTON CLICK: User clicked Run Tests → testing phase
  if (context.testsHaveRun) {
    return "testing"
  }

  // 3. CODE LENGTH: Compare current code to starter template
  // If they've written >50 chars of actual code, they're coding
  const codeWritten = context.currentCodeLength - context.starterCodeLength
  if (codeWritten > 50) {
    return "coding"
  }

  // 4. LLM EXTRACTION: Approach explained (from extractConversationState)
  if (context.approachExplained) {
    return "discussion"
  }

  // 5. SIMPLE COUNT: Very early in conversation → intro
  if (context.messageCount <= 2) {
    return "intro"
  }

  // 6. DEFAULT: Still in discussion phase
  return "discussion"
}

// Legacy function for backwards compatibility
// TODO: Remove once all callers updated to new interface
export function detectInterviewPhaseLegacy(context: {
  messageCount: number
  hasExplainedApproach: boolean
  hasStartedCoding: boolean
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}): InterviewPhase {
  return detectInterviewPhase({
    hasSubmitted: context.hasSubmitted,
    testsHaveRun: context.testsHaveRun,
    currentCodeLength: context.hasStartedCoding ? 100 : 0, // Fake for legacy
    starterCodeLength: 0,
    approachExplained: context.hasExplainedApproach,
    messageCount: context.messageCount,
  })
}

// =============================================================================
// PHASE-SPECIFIC PROMPTS (DEPRECATED - REMOVED)
// =============================================================================
//
// PHASE_PROMPTS has been moved to interviewer-prompts.ts
// Import from there: import { PHASE_PROMPTS } from './interviewer-prompts'

// =============================================================================
// CONVERSATION TRACKING
// =============================================================================

/**
 * Silent notes - things the interviewer noticed but didn't correct
 * These are shown in feedback as "What You Missed"
 */
export type SilentNoteType =
  | "wrong_complexity" // User stated wrong complexity (e.g., O(1) instead of O(n))
  | "wrong_edge_case" // User got edge case wrong (e.g., "zero returns zero" when it should be 1)
  | "missed_edge_case" // User didn't mention important edge case
  | "wrong_optimality" // User thought solution was optimal when it wasn't (or vice versa)
  | "confused_approach" // User confused two approaches (e.g., thought brute force was optimized)
  | "incomplete_answer" // User gave vague/incomplete answer that wasn't probed further
  | "deflection" // User deflected question ("you tell me")

export interface SilentNote {
  type: SilentNoteType
  timestamp: number
  userSaid: string // What the user said
  correct?: string // What the correct answer would be (if known)
  context?: string // Additional context (e.g., which edge case)
}

export interface ConversationTracker {
  // What has the candidate covered?
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  approachQuality?: "none" | "vague" | "specific" | "detailed" // NEW: Quality of explanation

  // Complexity discussion
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null // e.g., "O(n)"
  dominantComplexity?: string | null // NEW: Overall complexity (e.g., O(n²) dominates O(n log n))
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean // Did they explain WHY?
  complexityIsAccurate?: boolean | null // NEW: Is their stated complexity correct?

  // Edge cases
  edgeCasesMentioned: string[] // List of edge cases they mentioned
  edgeCasesAskedByInterviewer: string[] // Edge cases interviewer already asked about

  // Progress
  hasStartedCoding: boolean
  hasRunTests: boolean
  wasAskedToOptimize: boolean
  didOptimize: boolean

  // Mistakes and corrections
  bugsMade: number
  bugsSelfCorrected: number
  hintsGiven: number

  // NEW: Positive signals
  clarifyingQuestionsAsked?: boolean // Did they ask clarifying questions (good sign)
  answeredInterviewerQuestions?: number // How many questions did they answer
  alternativesDiscussed?: boolean // Did they discuss alternative approaches or trade-offs

  // NEW: Silent notes - mistakes the interviewer noticed but didn't correct
  // These are shown in feedback as "What You Missed"
  silentNotes?: SilentNote[]
}

export function createEmptyTracker(): ConversationTracker {
  return {
    approachExplained: false,
    approachType: "none",
    timeComplexityMentioned: false,
    timeComplexityValue: null,
    spaceComplexityMentioned: false,
    spaceComplexityValue: null,
    complexityExplanationGiven: false,
    edgeCasesMentioned: [],
    edgeCasesAskedByInterviewer: [],
    hasStartedCoding: false,
    hasRunTests: false,
    wasAskedToOptimize: false,
    didOptimize: false,
    bugsMade: 0,
    bugsSelfCorrected: 0,
    hintsGiven: 0,
    silentNotes: [],
  }
}

/**
 * Add a silent note to the tracker
 * Silent notes track mistakes the interviewer noticed but didn't correct
 * These are shown in feedback as "What You Missed"
 */
export function addSilentNote(
  tracker: ConversationTracker,
  note: Omit<SilentNote, "timestamp">
): ConversationTracker {
  return {
    ...tracker,
    silentNotes: [
      ...(tracker.silentNotes || []),
      {
        ...note,
        timestamp: Date.now(),
      },
    ],
  }
}

/**
 * Get human-readable description for silent note types
 */
export function getSilentNoteDescription(type: SilentNoteType): string {
  const descriptions: Record<SilentNoteType, string> = {
    wrong_complexity: "Incorrect complexity analysis",
    wrong_edge_case: "Wrong answer for edge case",
    missed_edge_case: "Missed important edge case",
    wrong_optimality: "Incorrect optimality assessment",
    confused_approach: "Confused different approaches",
    incomplete_answer: "Incomplete or vague answer",
    deflection: "Deflected interviewer question",
  }
  return descriptions[type] || type
}

/**
 * Extract tracking information from conversation messages
 */
export function updateTrackerFromMessage(
  tracker: ConversationTracker,
  message: string,
  role: "user" | "interviewer"
): ConversationTracker {
  const updated = { ...tracker }
  const lowerMessage = message.toLowerCase()

  if (role === "user") {
    // Check for approach explanation
    if (
      lowerMessage.includes("approach") ||
      lowerMessage.includes("i would") ||
      lowerMessage.includes("i'll use") ||
      lowerMessage.includes("my plan") ||
      lowerMessage.includes("thinking")
    ) {
      updated.approachExplained = true
    }

    // Check for complexity mentions using shared voice-aware extraction
    // This catches: O(n), "on2", "o of n", "linear time", "n squared", etc.
    const extractedComplexity = extractComplexityFromText(message)

    if (extractedComplexity) {
      // Determine if it's time or space complexity based on context
      if (lowerMessage.includes("space") || lowerMessage.includes("memory")) {
        updated.spaceComplexityMentioned = true
        updated.spaceComplexityValue = extractedComplexity
      } else {
        // Default to time complexity (most common)
        updated.timeComplexityMentioned = true
        updated.timeComplexityValue = extractedComplexity
      }
    }

    // Also check for explicit time/space keywords without O notation
    // e.g., "linear time", "constant space", "quadratic"
    if (
      !extractedComplexity &&
      (lowerMessage.includes("linear") ||
        lowerMessage.includes("constant") ||
        lowerMessage.includes("quadratic") ||
        lowerMessage.includes("logarithmic") ||
        lowerMessage.includes("exponential"))
    ) {
      updated.timeComplexityMentioned = true
      updated.timeComplexityValue = normalizeComplexity(lowerMessage)
    }

    // Check if they explained why
    if (
      updated.timeComplexityMentioned &&
      (lowerMessage.includes("because") ||
        lowerMessage.includes("since") ||
        lowerMessage.includes("due to") ||
        lowerMessage.includes("loop") ||
        lowerMessage.includes("iterate") ||
        lowerMessage.includes("through"))
    ) {
      updated.complexityExplanationGiven = true
    }

    // Check for edge case mentions - use shared keywords
    const mentionedEdgeCases = extractEdgeCases(message)
    mentionedEdgeCases.forEach((keyword) => {
      if (!updated.edgeCasesMentioned.includes(keyword)) {
        updated.edgeCasesMentioned.push(keyword)
      }
    })

    // Check for brute force vs optimized
    if (
      lowerMessage.includes("brute force") ||
      lowerMessage.includes("nested loop") ||
      lowerMessage.includes("n squared") ||
      lowerMessage.includes("n^2")
    ) {
      updated.approachType = "brute_force"
    } else if (
      lowerMessage.includes("hash") ||
      lowerMessage.includes("map") ||
      lowerMessage.includes("set") ||
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better")
    ) {
      if (updated.approachType === "brute_force") {
        updated.didOptimize = true
      }
      updated.approachType = "optimized"
    }
  }

  if (role === "interviewer") {
    // Track what interviewer has asked about
    if (
      lowerMessage.includes("optimize") ||
      lowerMessage.includes("better approach") ||
      lowerMessage.includes("improve")
    ) {
      updated.wasAskedToOptimize = true
    }

    // Track edge cases interviewer asked about - use shared keywords
    const askedEdgeCases = extractEdgeCases(message)
    askedEdgeCases.forEach((keyword) => {
      if (!updated.edgeCasesAskedByInterviewer.includes(keyword)) {
        updated.edgeCasesAskedByInterviewer.push(keyword)
      }
    })

    // Track hints given
    if (
      lowerMessage.includes("hint") ||
      lowerMessage.includes("consider") ||
      lowerMessage.includes("think about") ||
      lowerMessage.includes("what if")
    ) {
      updated.hintsGiven++
    }
  }

  return updated
}

/**
 * Build tracking context string for the AI prompt
 */
export function buildTrackingContext(tracker: ConversationTracker): string {
  const sections: string[] = []

  // Approach status
  if (tracker.approachExplained) {
    sections.push(`CANDIDATE HAS EXPLAINED APPROACH: ${tracker.approachType}`)
    if (tracker.approachType === "brute_force" && !tracker.wasAskedToOptimize) {
      sections.push(`-> ACTION: Ask if they can optimize`)
    }
    if (tracker.wasAskedToOptimize && tracker.didOptimize) {
      sections.push(`-> Candidate improved from brute force to optimized (GOOD SIGNAL)`)
    }
  } else {
    sections.push(`CANDIDATE HAS NOT YET EXPLAINED APPROACH`)
  }

  // Complexity status
  if (tracker.timeComplexityMentioned) {
    sections.push(
      `TIME COMPLEXITY DISCUSSED: ${tracker.timeComplexityValue}${tracker.complexityExplanationGiven ? " (with explanation)" : " (no explanation given)"}`
    )
    if (!tracker.complexityExplanationGiven) {
      sections.push(`-> ACTION: Ask them to walk through their reasoning`)
    }
  }
  if (tracker.spaceComplexityMentioned) {
    sections.push(`SPACE COMPLEXITY DISCUSSED: ${tracker.spaceComplexityValue}`)
  }

  // Edge cases status
  if (tracker.edgeCasesMentioned.length > 0) {
    sections.push(`EDGE CASES CANDIDATE MENTIONED: ${tracker.edgeCasesMentioned.join(", ")}`)
    sections.push(`-> DO NOT say they didn't mention edge cases - they did!`)
  }
  if (tracker.edgeCasesAskedByInterviewer.length > 0) {
    sections.push(
      `EDGE CASES YOU ALREADY ASKED ABOUT: ${tracker.edgeCasesAskedByInterviewer.join(", ")}`
    )
    sections.push(`-> DO NOT ask about these again`)
  }

  // Hints given
  if (tracker.hintsGiven > 0) {
    sections.push(`HINTS GIVEN SO FAR: ${tracker.hintsGiven}`)
  }

  return sections.length > 0
    ? `\nCONVERSATION TRACKING (what has already been covered):\n${sections.join("\n")}\n`
    : ""
}

// =============================================================================
// INTERVIEWER BEHAVIOR RULES (DEPRECATED - REMOVED)
// =============================================================================
//
// INTERVIEWER_BEHAVIOR_RULES has been replaced by:
// 1. Hard gates in response-validation.ts (deterministic enforcement)
// 2. Few-shot examples in interviewer-prompts.ts (better LLM learning)
//
// See response-validation.ts for hard gates and interviewer-prompts.ts for examples.

// =============================================================================
// PROGRESSIVE HINT SYSTEM
// =============================================================================

export interface HintLevel {
  level: number
  type: "leading_question" | "concrete_example" | "direct_nudge" | "explicit_help"
  description: string
}

export const HINT_PROGRESSION: HintLevel[] = [
  {
    level: 1,
    type: "leading_question",
    description: "Ask a question that points toward the issue without revealing it",
  },
  {
    level: 2,
    type: "concrete_example",
    description: "Walk through a specific input that exposes the problem",
  },
  {
    level: 3,
    type: "direct_nudge",
    description: "Suggest the general direction (data structure, technique)",
  },
  {
    level: 4,
    type: "explicit_help",
    description: "Give specific guidance (only if running out of time)",
  },
]

export function getHintGuidance(hintsGiven: number): string {
  const currentLevel = Math.min(hintsGiven + 1, 4)
  const hint = HINT_PROGRESSION[currentLevel - 1]

  return `
HINT GUIDANCE (You've given ${hintsGiven} hints so far):
Current hint level: ${currentLevel}/4 - ${hint.type}
Strategy: ${hint.description}

${currentLevel === 1 ? `EXAMPLE: "Have you thought about what happens when the input is empty?"` : ""}
${currentLevel === 2 ? `EXAMPLE: "Let's trace through with input [2,7] and target 9 - what happens at each step?"` : ""}
${currentLevel === 3 ? `EXAMPLE: "Think about what data structure gives you O(1) lookups"` : ""}
${currentLevel === 4 ? `EXAMPLE: "Consider using a hash map to store values you've seen"` : ""}
`
}
