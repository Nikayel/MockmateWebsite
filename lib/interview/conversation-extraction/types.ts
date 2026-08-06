import type { ConversationTracker } from "@/lib/interview/interview-phases"

export interface ExtractionResult {
  approachExplained: boolean
  approachType: "none" | "brute_force" | "optimized" | "unclear"
  approachQuality: "none" | "vague" | "specific" | "detailed"
  timeComplexityMentioned: boolean
  timeComplexityValue: string | null
  dominantComplexity: string | null
  spaceComplexityMentioned: boolean
  spaceComplexityValue: string | null
  complexityExplanationGiven: boolean
  edgeCasesMentioned: string[]
  clarifyingQuestionsAsked: boolean
  answeredInterviewerQuestions: number
}

export interface OptimalComplexityContext {
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
}

export interface ExtendedConversationTracker extends ConversationTracker {
  approachQuality?: "none" | "vague" | "specific" | "detailed"
  dominantComplexity?: string | null
  clarifyingQuestionsAsked?: boolean
  answeredInterviewerQuestions?: number
}

export interface ConversationExtractionOptions {
  userId?: string
  sessionId?: string
}
