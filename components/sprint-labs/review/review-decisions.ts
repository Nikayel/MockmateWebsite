/**
 * Pure decision state machine for one review comment (UX-SPEC.md §9
 * Interactions). No network, no React — `useTicketReview` owns the map of
 * these keyed by comment id.
 */

export type CommentDecisionState =
  | { kind: "undecided" }
  | { kind: "accepted" }
  | { kind: "pushing-back"; reasonDraft: string }
  | { kind: "pushed-back"; reason: string }

export function isDecided(state: CommentDecisionState): boolean {
  return state.kind === "accepted" || state.kind === "pushed-back"
}

/** "Send is disabled while empty. There is no character minimum." */
export function canSendPushBack(state: CommentDecisionState): boolean {
  return state.kind === "pushing-back" && state.reasonDraft.trim().length > 0
}

export type CommentVerdict =
  | "correct"
  | "right-pushback"
  | "accepted-wrong"
  | "pushed-back-on-correct"

/**
 * UX-SPEC.md §9 names three verdict strings; a fourth real combination
 * (pushing back on a comment that was actually correct) is not named there
 * but is a state a learner can genuinely reach, so it gets a symmetrical
 * fourth line rather than being left to render nothing.
 */
export function resolveVerdict(
  state: CommentDecisionState,
  correct: boolean
): CommentVerdict | null {
  if (state.kind === "accepted") return correct ? "correct" : "accepted-wrong"
  if (state.kind === "pushed-back") return correct ? "pushed-back-on-correct" : "right-pushback"
  return null
}

export const VERDICT_LABEL: Record<CommentVerdict, string> = {
  correct: "This one was correct",
  "right-pushback": "You were right to push back",
  "accepted-wrong": "Accepted a wrong comment",
  "pushed-back-on-correct": "Pushed back on a correct comment",
}
