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

export {
  createChallenge,
  updateChallengeCorrection,
  buildBeliefSnapshot,
  ChallengeError,
  type ChallengeDoc,
  type ChallengeCorrection,
  type BeliefSnapshot,
} from "./challenges"

export {
  amendForChallenge,
  computeAmendedCard,
  correctedRatingForReason,
  applyVerificationPull,
  verificationDueAt,
  type AmendmentSource,
} from "./amendment"

export {
  resolveVerificationForReview,
  getRecentChallenges,
  isVerificationPassed,
  VERIFICATION_PASS_THRESHOLD,
} from "./verification"

export { getCardEvidence, type EvidenceRow } from "./evidence"

export {
  logLearnerModelEvent,
  LEARNER_MODEL_EVENTS,
  CLIENT_REPORTABLE_EVENTS,
  type LearnerModelEventType,
} from "./events"
