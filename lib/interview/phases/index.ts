export { detectInterviewPhase, detectInterviewPhaseLegacy } from "./detection"
export { PHASE_PROVIDER, providerForPhase } from "./effort"
export {
  addSilentNote,
  buildTrackingContext,
  createEmptyTracker,
  getSilentNoteDescription,
  updateTrackerFromMessage,
} from "./tracker"
export { getHintGuidance, HINT_PROGRESSION } from "./hints"

export type {
  ConversationTracker,
  HintLevel,
  InterviewPhase,
  PhaseContext,
  PhaseDetectionContext,
  SilentNote,
  SilentNoteType,
} from "./types"
