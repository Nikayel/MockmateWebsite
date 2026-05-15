import type { ConversationValidation } from "./types"

/**
 * Default validation when AI calls fail or are skipped.
 * Conservative by design: communication must be earned from actual evidence.
 */
export function getDefaultValidation(): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 25,
  }
}
