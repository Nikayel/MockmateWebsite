/**
 * Interview phase management public API.
 *
 * The implementation is split across lib/interview/phases/* so phase detection,
 * conversation tracking, and hint progression can evolve independently.
 */

export {
  addSilentNote,
  buildTrackingContext,
  createEmptyTracker,
  detectInterviewPhase,
  detectInterviewPhaseLegacy,
  getHintGuidance,
  getSilentNoteDescription,
  HINT_PROGRESSION,
  updateTrackerFromMessage,
} from "./phases"

export type {
  ConversationTracker,
  HintLevel,
  InterviewPhase,
  PhaseContext,
  PhaseDetectionContext,
  SilentNote,
  SilentNoteType,
} from "./phases"
