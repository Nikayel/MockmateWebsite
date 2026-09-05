/**
 * The lifecycle of a guest's post-trial sign-in, as seen by the feedback
 * slot. "covering" spans provider-click to debrief-start (Firebase commits the
 * new user before the popup promise resolves, so the slot must already know a
 * conversion is in flight); "failed" means auth succeeded but the session
 * migration did not, and the guest needs a retry surface.
 */
export type GuestConversionPhase = "idle" | "covering" | "failed"

export type ResultSurface = "workspace" | "guest_lock" | "feedback_view"

/**
 * Decides what the interview page's result region renders. Extracted from the
 * page's inline conditional after the 2026-08-25 incident where the slot and
 * the SignupPrompt gate disagreed about a guest's post-submit state and the
 * whole conversion flow dead-ended: this seam is now a pure, tested table.
 */
export function resolveResultSurface(state: {
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  hasUser: boolean
  guestConversion: GuestConversionPhase
}): ResultSurface {
  if (!state.showFeedback && !state.showPostInterviewDiscussion) return "workspace"
  if (!state.hasUser) return "guest_lock"
  // Until migration settles, the authenticated view has no safe session to
  // render. Failure uses the same lock with retry semantics.
  if (state.guestConversion !== "idle") return "guest_lock"
  return "feedback_view"
}
