import type { ConversationTracker } from "@/lib/interview/interview-phases"
import type {
  ExtractionResult,
  ExtendedConversationTracker,
  OptimalComplexityContext,
} from "./types"
import { buildComplexitySilentNotes } from "./silent-notes"

export function mapExtractionToTrackerUpdates(
  extracted: ExtractionResult,
  currentTracker: ConversationTracker,
  optimalComplexity?: OptimalComplexityContext
): Partial<ExtendedConversationTracker> {
  const updates: Partial<ExtendedConversationTracker> = {
    approachExplained: extracted.approachExplained,
    approachType: extracted.approachType,
    approachQuality: extracted.approachQuality,
    timeComplexityMentioned: extracted.timeComplexityMentioned,
    timeComplexityValue: extracted.dominantComplexity || extracted.timeComplexityValue,
    dominantComplexity: extracted.dominantComplexity,
    spaceComplexityMentioned: extracted.spaceComplexityMentioned,
    spaceComplexityValue: extracted.spaceComplexityValue,
    complexityExplanationGiven: extracted.complexityExplanationGiven,
    complexityIsAccurate: extracted.complexityIsAccurate,
    clarifyingQuestionsAsked: extracted.clarifyingQuestionsAsked,
    answeredInterviewerQuestions: extracted.answeredInterviewerQuestions,
  }

  const allEdgeCases = new Set([
    ...(currentTracker.edgeCasesMentioned || []),
    ...extracted.edgeCasesMentioned,
  ])
  updates.edgeCasesMentioned = Array.from(allEdgeCases)

  const silentNotes = buildComplexitySilentNotes(extracted, currentTracker, optimalComplexity)
  if (silentNotes) {
    updates.silentNotes = silentNotes
  }

  return updates
}
