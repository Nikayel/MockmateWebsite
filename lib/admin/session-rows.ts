/**
 * Projections from an `interview_sessions` document to what the admin UI renders.
 *
 * These are allowlists, built by naming every field. That is deliberate: a
 * previous admin audit found `stripe_customer_id` shipped to the browser for
 * every row of a table that never rendered it, which happened because the route
 * spread the whole document into the response. Spreading is how a document grows
 * a field one day and leaks it the next, so nothing here spreads.
 *
 * Two things stay on the server permanently:
 * - `structured_feedback.rawFeedback`, the entire model output for the round;
 * - `silent_notes`, the interviewer's private observations.
 * The drill-in reports that they exist and how big they are, which is what an
 * admin inspecting a session actually needs, without shipping the contents.
 */

import { sessionTitle, sessionType, type SessionDocFields } from "./session-fields"
import { ABANDONED_AFTER_HOURS, type SessionListStatus } from "./session-query"

/** Coarse Vercel-geo location captured when a guest session was created. */
export interface SessionGuestGeo {
  /** ISO 3166-1 alpha-2, e.g. "BD". */
  country: string
  region: string | null
  city: string | null
}

/** One row of the session list. Every field here is rendered by the table. */
export interface SessionListRow {
  sessionId: string
  /** Rendered in the user column, and the value the "sessions by this user" filter uses. */
  userId: string | null
  /** Email for a registered user, "Guest" for a guest, the id when no profile exists. */
  userLabel: string
  isGuest: boolean
  /**
   * Where the guest trial came from, at country/region/city resolution (the
   * raw IP is never stored). Null for registered users' sessions and for
   * guest documents written before capture existed.
   */
  guestGeo: SessionGuestGeo | null
  scenarioTitle: string
  sessionType: string
  difficulty: string
  status: SessionListStatus
  performanceScore: number | null
  startedAt: string | null
  completedAt: string | null
  /** Wall-clock minutes from start to completion; null while a round is still open. */
  durationMinutes: number | null
}

/** Everything the drill-in shows about one session. */
export interface SessionDetail extends SessionListRow {
  scenarioId: string | null
  pattern: string | null
  targetCompany: string | null
  /** Raw `feedback_status`, which the derived status flattens. */
  feedbackStatus: string | null
  technicalScore: number | null
  efficiencyScore: number | null
  masteryScore: number | null
  scoreBreakdown: SessionScoreBreakdown | null
  /** The short summary line of the feedback, not the full model output. */
  feedbackSummary: string | null
  isGuidedLab: boolean
  updatedAt: string | null
  feedbackPersistedAt: string | null
  /** How many private interviewer notes exist, without their contents. */
  silentNoteCount: number
  /** Whether a full feedback body is stored server-side for this session. */
  hasStoredFeedback: boolean
}

/** The five-dimension breakdown persisted by the feedback writer. */
export interface SessionScoreBreakdown {
  understanding: number | null
  problemSolving: number | null
  codeQuality: number | null
  communication: number | null
  overall: number | null
}

/** The document fields these projections read. */
export interface SessionRowSource extends SessionDocFields {
  user_id?: unknown
  is_guest?: unknown
  geo?: unknown
  difficulty?: unknown
  pattern?: unknown
  target_company?: unknown
  created_at?: unknown
  started_at?: unknown
  updated_at?: unknown
  performance_score?: unknown
  technical_score?: unknown
  efficiency_score?: unknown
  mastery_score?: unknown
  score_breakdown?: unknown
  structured_feedback?: unknown
  silent_notes?: unknown
  is_guided_lab?: unknown
  feedback_persisted_at?: unknown
}

/**
 * `created_at` is an ISO string from both writers, but `updated_at` and
 * `feedback_persisted_at` are overwritten with a server Timestamp once feedback
 * lands, so a single document genuinely mixes both shapes.
 */
function toIsoString(value: unknown): string | null {
  if (typeof value === "string") {
    return Number.isNaN(new Date(value).getTime()) ? null : value
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const asDate = (value as { toDate: () => Date }).toDate()
    return asDate instanceof Date && !Number.isNaN(asDate.getTime()) ? asDate.toISOString() : null
  }
  return null
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

/** `created_at` and `started_at` are written together; either answers "when did this start". */
export function sessionStartedAt(session: SessionRowSource): string | null {
  return toIsoString(session.created_at) ?? toIsoString(session.started_at)
}

/**
 * The status the list filter uses, derived from the same two fields the filter
 * queries so the label and the filter cannot disagree about a document.
 *
 * One honest limitation: the indexed `completed` filter matches
 * `feedback_status == "complete"`, so a document written before feedback_status
 * existed is labelled completed here but is not returned by that filter. No
 * index can match a missing field, and backfilling is a write-path change this
 * module has no business making.
 */
export function deriveSessionStatus(
  session: SessionRowSource,
  now: Date = new Date()
): SessionListStatus {
  if (!session.completed_at) {
    const startedAt = sessionStartedAt(session)
    if (!startedAt) return "in_progress"
    const ageMs = now.getTime() - new Date(startedAt).getTime()
    return ageMs > ABANDONED_AFTER_HOURS * 60 * 60 * 1000 ? "abandoned" : "in_progress"
  }

  const feedbackStatus = toOptionalString(session.feedback_status)
  if (feedbackStatus === "complete") return "completed"
  if (feedbackStatus === "pending" || feedbackStatus === "processing") return "scoring"
  if (feedbackStatus === "failed") return "failed"
  return "completed"
}

/** Whole minutes between start and completion, or null while the round is open. */
export function sessionDurationMinutes(session: SessionRowSource): number | null {
  const startedAt = sessionStartedAt(session)
  const completedAt = toIsoString(session.completed_at)
  if (!startedAt || !completedAt) return null

  const elapsedMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  // A clock skew or a re-stamped completed_at can invert these; a negative
  // duration is worse than no duration.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null
  return Math.round(elapsedMs / 60000)
}

/**
 * Who to show in the user column.
 *
 * Guests have no profile document by design, so they are labelled rather than
 * reported as a failed lookup. A registered user with no profile falls back to
 * the id, which is at least something an admin can search on.
 */
export function sessionUserLabel(session: SessionRowSource, email: string | null): string {
  if (session.is_guest === true) return "Guest"
  return email ?? toOptionalString(session.user_id) ?? "Unknown"
}

/**
 * The geo block written by the guest-session route, validated field by field.
 * Only guest sessions carry it; anything malformed reads as absent.
 */
export function toGuestGeo(session: SessionRowSource): SessionGuestGeo | null {
  if (session.is_guest !== true) return null
  const geo = session.geo
  if (!geo || typeof geo !== "object") return null
  const raw = geo as Record<string, unknown>
  const country = toOptionalString(raw.country)
  if (!country) return null
  return {
    country,
    region: toOptionalString(raw.region),
    city: toOptionalString(raw.city),
  }
}

export function toSessionListRow(
  sessionId: string,
  session: SessionRowSource,
  email: string | null,
  now: Date = new Date()
): SessionListRow {
  return {
    sessionId,
    userId: toOptionalString(session.user_id),
    userLabel: sessionUserLabel(session, email),
    isGuest: session.is_guest === true,
    guestGeo: toGuestGeo(session),
    scenarioTitle: sessionTitle(session),
    sessionType: sessionType(session),
    difficulty: toOptionalString(session.difficulty) ?? "unknown",
    status: deriveSessionStatus(session, now),
    performanceScore: toNumber(session.performance_score),
    startedAt: sessionStartedAt(session),
    completedAt: toIsoString(session.completed_at),
    durationMinutes: sessionDurationMinutes(session),
  }
}

/** Read the persisted five-dimension breakdown, tolerating its absence. */
function toScoreBreakdown(value: unknown): SessionScoreBreakdown | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  const breakdown: SessionScoreBreakdown = {
    understanding: toNumber(raw.understandingScore),
    problemSolving: toNumber(raw.problemSolvingScore),
    codeQuality: toNumber(raw.codeQualityScore),
    communication: toNumber(raw.communicationScore),
    overall: toNumber(raw.overallScore),
  }
  return Object.values(breakdown).some((score) => score !== null) ? breakdown : null
}

/** The one-line summary from structured feedback; the body stays on the server. */
function toFeedbackSummary(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  return toOptionalString((value as { tldr?: unknown }).tldr)
}

export function toSessionDetail(
  sessionId: string,
  session: SessionRowSource,
  email: string | null,
  now: Date = new Date()
): SessionDetail {
  const structuredFeedback = session.structured_feedback
  const rawFeedback =
    structuredFeedback && typeof structuredFeedback === "object"
      ? (structuredFeedback as { rawFeedback?: unknown }).rawFeedback
      : undefined

  return {
    ...toSessionListRow(sessionId, session, email, now),
    scenarioId: toOptionalString(session.scenario_id),
    pattern: toOptionalString(session.pattern),
    targetCompany: toOptionalString(session.target_company),
    feedbackStatus: toOptionalString(session.feedback_status),
    technicalScore: toNumber(session.technical_score),
    efficiencyScore: toNumber(session.efficiency_score),
    masteryScore: toNumber(session.mastery_score),
    scoreBreakdown: toScoreBreakdown(session.score_breakdown),
    feedbackSummary: toFeedbackSummary(structuredFeedback),
    isGuidedLab: session.is_guided_lab === true,
    updatedAt: toIsoString(session.updated_at),
    feedbackPersistedAt: toIsoString(session.feedback_persisted_at),
    // The count, not the notes. These are the interviewer's private read on the
    // candidate and have no place in a list view.
    silentNoteCount: Array.isArray(session.silent_notes) ? session.silent_notes.length : 0,
    hasStoredFeedback: typeof rawFeedback === "string" && rawFeedback.trim() !== "",
  }
}
