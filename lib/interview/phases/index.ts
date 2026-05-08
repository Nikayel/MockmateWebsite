export { detectInterviewPhase, detectInterviewPhaseLegacy } from "./detection"
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
