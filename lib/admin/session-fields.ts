/**
 * Readers for the `interview_sessions` document shape.
 *
 * The writers store the problem title under `topic` and the scenario kind under
 * `type`:
 * - createInterviewSession in lib/firestore-helpers.ts
 * - the guest path in app/api/guest-session/route.ts
 *
 * The admin usage route previously read `scenario_title` / `scenario_type` /
 * `status` directly. No writer produces any of those three fields, so every row
 * in the admin AI-usage tables rendered "Unknown". These readers own the
 * mapping so a future consumer cannot reintroduce the same guess.
 *
 * The legacy `scenario_*` names are kept as a second choice in case older
 * documents carry them.
 */

/** The subset of an interview_sessions document these readers depend on. */
export interface SessionDocFields {
  topic?: unknown
  scenario_title?: unknown
  scenario_id?: unknown
  type?: unknown
  scenario_type?: unknown
  completed_at?: unknown
  feedback_status?: unknown
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

/** Human-readable problem title, falling back to the scenario id. */
export function sessionTitle(session: SessionDocFields): string {
  return (
    readString(session.topic) ??
    readString(session.scenario_title) ??
    readString(session.scenario_id) ??
    "Unknown"
  )
}

/** Scenario kind (dsa, bugfix, system-design, ...). */
export function sessionType(session: SessionDocFields): string {
  return readString(session.type) ?? readString(session.scenario_type) ?? "dsa"
}

/**
 * Sessions carry no `status` field. completeInterviewSession stamps
 * `completed_at` plus a `feedback_status`, so derive the state from those.
 */
export function sessionStatus(session: SessionDocFields): string {
  if (!session.completed_at) return "in_progress"
  return readString(session.feedback_status) ?? "completed"
}
