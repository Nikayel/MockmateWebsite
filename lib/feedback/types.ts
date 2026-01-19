/**
 * Type definitions for feedback generation system
 *
 * This module contains all interfaces and types used across the feedback system,
 * including scoring structures, validation results, and AI critique interfaces.
 */

/**
 * Structured feedback schema - NEW GRADING CRITERIA
 * Aligned with real Meta/Google AI-assisted interview scoring
 */
export interface FeedbackScores {
  // New grading criteria
  understanding: number // 30% - Can you explain your approach?
  problemSolving: number // 25% - Debug & optimize
  codeQuality: number // 25% - Clean & efficient
  communication: number // 20% - Think out loud
  // Legacy (kept for backward compatibility)
  correctness: number
  efficiency: number
  reasoningExplanation: number
  aiCollaboration: number
  overall: number
}

/**
 * Silent note from interview - things the interviewer noticed but didn't correct
 * Used to populate the "What You Missed" section in feedback
 */
export interface SilentNoteFeedback {
  type: string
  userSaid: string
  correct?: string
  context?: string
}

/**
 * Structured feedback response
 */
export interface StructuredFeedback {
  scores: FeedbackScores
  tldr: string
  whatWorked: string[]
  fixNext: string[]
  actionPlan: string[]
  aiWatchlist: string
  rawFeedback: string
  // NEW: Things the interviewer noticed but didn't correct during the interview
  whatYouMissed?: SilentNoteFeedback[]
}

/**
 * AI-validated conversation analysis results
 * This is what the AI returns after semantic analysis
 */
export interface ConversationValidation {
  // Coherence checks - is this real communication or gibberish?
  isCoherent: boolean // Are responses actual sentences?
  responsesRelevant: boolean // Do responses relate to questions asked?

  // Approach explanation quality
  approachExplained: boolean // Did they explain their approach?
  approachQuality: "none" | "poor" | "basic" | "good" | "excellent"

  // Complexity analysis - validated against actual code
  complexityDiscussed: boolean // Did they mention complexity?
  complexityAccurate: boolean // Was their stated complexity CORRECT?
  statedComplexity: string | null // What they claimed (e.g., "O(n)")

  // Question-answer quality
  questionsAsked: number // How many questions interviewer asked
  questionsAnswered: number // How many were substantively answered

  // Technical discussion depth
  edgeCasesConsidered: boolean
  alternativesDiscussed: boolean

  // Overall communication quality (0-100)
  communicationScore: number
}

/**
 * Constitutional AI Critique Result
 * Reviews scoring and feedback for fairness, tone, accuracy, actionability
 */
export interface CritiqueResult {
  aspect: "fairness" | "tone" | "accuracy" | "actionability"
  passed: boolean
  issue?: string
  suggestion?: string
}

/**
 * Constitutional AI Score Critique
 * Reviews calculated scores to ensure fairness and accuracy
 */
export interface ScoreCritiqueAdjustment {
  critiques: CritiqueResult[]
  adjustedScores?: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    overall: number
  }
  reasoning: string
  madeChanges: boolean
}

/**
 * Constitutional AI Feedback Critique
 * Reviews generated feedback text for constructive tone and accuracy
 */
export interface FeedbackCritiqueAdjustment {
  critiques: CritiqueResult[]
  revisedFeedback?: string
  reasoning: string
  madeChanges: boolean
}

/**
 * AI Partner code overlap analysis
 * Detects if candidate blindly copied AI suggestions without understanding
 */
export interface AICodeOverlapResult {
  hasHighOverlap: boolean // True if >70% of code matches AI suggestions
  overlapPercentage: number // 0-100
  copiedSnippets: string[] // Specific snippets that were copied
  modificationsMade: boolean // Did they modify the AI suggestions at all?
}

/**
 * Detect if a DSA solution is incomplete/stub code
 * This catches cases where user only wrote base case but no actual algorithm
 *
 * Examples of incomplete solutions:
 * - Just a null check with `pass`
 * - Only base cases, no recursive/iterative logic
 * - Contains `pass`, `...`, `TODO`, `NotImplementedError`
 * - Returns only for edge cases, no main logic
 */
export interface IncompleteSolutionAnalysis {
  isIncomplete: boolean
  reason: string
  hasBaseCase: boolean
  hasActualLogic: boolean
  stubPatterns: string[]
}

/**
 * Pre-screening results from algorithmic analysis
 * Fast analysis without AI to detect obvious patterns
 */
export interface PreScreenResult {
  hasContent: boolean
  candidateMessageCount: number
  avgMessageLength: number
  hasKeywords: {
    complexity: boolean
    approach: boolean
    alternatives: boolean
    edgeCases: boolean
  }
  suspiciousPatterns: {
    tooShort: boolean
    possibleGibberish: boolean
    keywordStuffing: boolean
  }
}

/**
 * Scoring function return type
 * Used by all scoring algorithms (DSA, System Design, Bug Fix)
 */
export interface ScoreResult {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  overall: number
}

/**
 * Extended score result with additional flags
 */
export interface ExtendedScoreResult extends ScoreResult {
  silentSolution: boolean
}
