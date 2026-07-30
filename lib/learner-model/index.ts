/**
 * Open learner model — "What CodeSparring Thinks You Know"
 *
 * Inspect / challenge / correct the system's beliefs about a learner,
 * derived from FSRS spaced-repetition state.
 */

export { buildLearnerModel, buildCardBelief, maskForBlackBox } from "./model-builder"

export {
  daysUntilRetentionDrops,
  describeCardBelief,
  describeConceptBelief,
  SOLID_RECALL_THRESHOLD,
} from "./translate"

export type {
  LearnerModelPayload,
  ConceptBelief,
  CardBelief,
  MemoryStrengthChip,
  LearnerModelCondition,
  ChallengeReason,
} from "./types"
