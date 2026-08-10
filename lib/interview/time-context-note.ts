/**
 * "[TIME: 14 min elapsed of ~25 min expected]" annotation for interviewer sends.
 *
 * An interviewer turn previously carried zero timing signal, so the model could
 * not pace itself: in a real session it pressed one line of questioning until
 * the interview ran 26 minutes against a 15-minute expectation. The PACING core
 * rule in interviewer-prompts.ts tells the model what to do with this note.
 *
 * The note rides the outgoing `message` string - the same carrier and contract
 * as code-change-note.ts: it reaches the model once, is never rendered, and is
 * never replayed as history, so the request schema and payload contract stay
 * untouched.
 */

/** Bracketed elapsed/expected-time note, or "" inside the first minute. */
export function buildTimeContextNote(
  elapsedSeconds: number | null | undefined,
  estimatedMinutes: number | null | undefined
): string {
  if (elapsedSeconds == null || elapsedSeconds < 60) {
    return ""
  }
  const elapsed = Math.floor(elapsedSeconds / 60)
  const expected =
    estimatedMinutes && estimatedMinutes > 0 ? ` of ~${estimatedMinutes} min expected` : ""
  return `\n\n[TIME: ${elapsed} min elapsed${expected}]`
}
