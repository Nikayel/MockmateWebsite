export type InterviewPhase =
  | "intro"
  | "clarification"
  | "discussion"
  | "coding"
  | "testing"
  | "post_interview"
  | "complete"

export interface PhaseContext {
  currentPhase: InterviewPhase
  phaseStartedAt: number
  testsHaveRun: boolean
  allTestsPassed: boolean
  hasSubmitted: boolean
}

export interface PhaseDetectionContext {
  hasSubmitted: boolean
  testsHaveRun: boolean
  currentCodeLength: number
  starterCodeLength: number
  approachExplained?: boolean
  messageCount: number
}

export type SilentNoteType =
  | "wrong_complexity"
  | "wrong_edge_case"
  | "missed_edge_case"
  | "wrong_optimality"
  | "confused_approach"
  | "incomplete_answer"
  | "deflection"

export interface SilentNote {
  type: SilentNoteType
  timestamp: number
  userSaid: string
  correct?: string
  context?: string
}

export interface ConversationTracker {
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  approachQuality?: "none" | "vague" | "specific" | "detailed"

  timeComplexityMentioned: boolean
  timeComplexityValue: string | null
  dominantComplexity?: string | null
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean

  edgeCasesMentioned: string[]
  edgeCasesAskedByInterviewer: string[]

  hasStartedCoding: boolean
  hasRunTests: boolean
  wasAskedToOptimize: boolean
  didOptimize: boolean

  bugsMade: number
  bugsSelfCorrected: number
  hintsGiven: number

  clarifyingQuestionsAsked?: boolean
  answeredInterviewerQuestions?: number
  alternativesDiscussed?: boolean

  silentNotes?: SilentNote[]
}

export interface HintLevel {
  level: number
  type: "leading_question" | "concrete_example" | "direct_nudge" | "explicit_help"
  description: string
}
