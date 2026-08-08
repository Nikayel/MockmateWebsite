/**
 * Query planning for the admin session list.
 *
 * `interview_sessions` is written by createInterviewSession (lib/firestore-helpers.ts)
 * and the guest path (app/api/guest-session/route.ts). Two facts about that
 * document shape drive everything here:
 *
 * 1. `created_at` / `started_at` are ISO 8601 strings, not Firestore Timestamps.
 *    ISO strings sort lexicographically in timestamp order, so range filters and
 *    `orderBy` work directly on the stored string. Every bound this module emits
 *    is therefore normalised through `toISOString()` so it compares against the
 *    same format the writers produce.
 *
 * 2. There is no `status` field. A finished round is stamped with `completed_at`
 *    plus a `feedback_status`; an unfinished one simply has neither. Firestore
 *    cannot index the ABSENCE of a field: `where(f, "==", null)` matches only an
 *    explicit null, and `!=` / `not-in` / `orderBy(f)` all drop documents that
 *    lack the field. So the statuses split into two kinds, and this module labels
 *    which is which rather than pretending they are the same:
 *
 *    - completed / scoring / failed are pure equality filters on `feedback_status`
 *      and run entirely in the index;
 *    - in progress / abandoned are "no completed_at", which no index can answer.
 *      They are planned as an indexed `created_at` range plus an explicit
 *      `openOnly` flag, and the caller applies that last predicate to a scan
 *      bounded by SESSION_SCAN_CEILING. Bounded, disclosed, and never a full scan.
 *
 * Everything numeric goes through parseBoundedInt, because an unclamped value
 * reaching `.limit()` is a Firestore bill rather than a bad chart.
 */

import { parseBoundedInt } from "./query-params"

/** Rows returned when the caller does not ask for a page size. */
export const SESSION_PAGE_SIZE_DEFAULT = 25

/** Largest page a caller may request. `?limit=100000` clamps to this. */
export const SESSION_PAGE_SIZE_MAX = 100

/**
 * Hard ceiling on documents read while resolving a status that Firestore cannot
 * index (in progress / abandoned). The route over-fetches up to this many rows
 * to fill one page and then stops, so the worst case is a known number of reads
 * rather than "however many sessions exist".
 */
export const SESSION_SCAN_CEILING = 500

/**
 * A round with no `completed_at` this long after it started is treated as
 * abandoned rather than in progress. Sessions are single-sitting, so anything
 * still open after this is not coming back.
 */
export const ABANDONED_AFTER_HOURS = 6

/** Statuses the list can filter on. */
export const SESSION_LIST_STATUSES = [
  "all",
  "completed",
  "scoring",
  "failed",
  "in_progress",
  "abandoned",
] as const

export type SessionListStatus = (typeof SESSION_LIST_STATUSES)[number]

export type SortDirection = "asc" | "desc"

/**
 * The only column the list can order by.
 *
 * Ordering on `completed_at` or `performance_score` would silently drop every
 * unfinished round (Firestore excludes documents missing the ordered field), so
 * offering those as sortable columns would quietly change the result set rather
 * than reorder it. One honest sort beats three misleading ones.
 */
export const SESSION_SORT_COLUMN = "startedAt"

/** Firestore field behind SESSION_SORT_COLUMN. */
export const SESSION_ORDER_FIELD = "created_at"

/** Position in the ordering, carried across pages instead of an offset. */
export interface SessionCursor {
  /** `created_at` of the last row of the previous page. */
  startedAt: string
  /** Document id of that same row, breaking ties between identical timestamps. */
  sessionId: string
}

/** An indexed equality filter on `feedback_status`. */
export type FeedbackStatusFilter = { op: "=="; value: string } | { op: "in"; values: string[] }

/** A validated, fully bounded description of one session-list query. */
export interface SessionQueryPlan {
  status: SessionListStatus
  /** Indexed part of the status filter, or null when the status needs no equality. */
  feedbackStatus: FeedbackStatusFilter | null
  /**
   * True when the status is defined by the ABSENCE of `completed_at`, which no
   * index can express. The caller must apply it after reading, within
   * SESSION_SCAN_CEILING documents.
   */
  openOnly: boolean
  /** `type ==` filter, or null. */
  sessionType: string | null
  /** `user_id ==` filter, or null. */
  userId: string | null
  /** Inclusive lower bound on `created_at`, ISO string, or null. */
  startedFrom: string | null
  /** Inclusive upper bound on `created_at`, ISO string, or null. */
  startedTo: string | null
  direction: SortDirection
  pageSize: number
  cursor: SessionCursor | null
  /** Whether the caller wants the `.count()` aggregation for this filter set. */
  includeTotal: boolean
}

export type SessionQueryParse = { ok: true; plan: SessionQueryPlan } | { ok: false; error: string }

/** Firestore ids and scenario types; deliberately narrow so nothing odd reaches a query. */
const ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/
const TYPE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

function isSessionListStatus(value: string): value is SessionListStatus {
  return (SESSION_LIST_STATUSES as readonly string[]).includes(value)
}

/**
 * Normalise a caller-supplied date into the ISO form the writers store.
 *
 * A date-only value covers the whole day: `from=2026-08-01` means from the first
 * instant of the 1st, `to=2026-08-01` means through its last instant. Treating
 * `to` as midnight would silently exclude every session on the day the admin
 * asked for.
 */
export function parseDateBound(raw: string | null, edge: "start" | "end"): string | null | false {
  if (raw === null || raw.trim() === "") return null

  const trimmed = raw.trim()
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
  const parsed = new Date(dateOnly ? `${trimmed}T00:00:00.000Z` : trimmed)
  if (Number.isNaN(parsed.getTime())) return false

  if (dateOnly && edge === "end") {
    parsed.setUTCHours(23, 59, 59, 999)
  }

  return parsed.toISOString()
}

/** Later of two optional ISO bounds; used to intersect a status window with a user's range. */
function laterBound(a: string | null, b: string | null): string | null {
  if (a === null) return b
  if (b === null) return a
  return a > b ? a : b
}

/** Earlier of two optional ISO bounds. */
function earlierBound(a: string | null, b: string | null): string | null {
  if (a === null) return b
  if (b === null) return a
  return a < b ? a : b
}

/** Encode a cursor as one opaque, URL-safe token. */
export function encodeSessionCursor(cursor: SessionCursor): string {
  const payload = JSON.stringify({ s: cursor.startedAt, i: cursor.sessionId })
  return Buffer.from(payload, "utf8").toString("base64url")
}

/**
 * Decode a cursor token, or null when it is not a usable position.
 *
 * A malformed cursor must not be silently dropped: doing so restarts the caller
 * at page one, which looks like an endless list rather than an error.
 */
export function decodeSessionCursor(raw: string | null | undefined): SessionCursor | null {
  if (!raw) return null

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8")
    const parsed: unknown = JSON.parse(decoded)
    if (!parsed || typeof parsed !== "object") return null

    const { s, i } = parsed as { s?: unknown; i?: unknown }
    if (typeof s !== "string" || typeof i !== "string") return null
    if (s === "" || i === "") return null
    if (Number.isNaN(new Date(s).getTime())) return null

    return { startedAt: s, sessionId: i }
  } catch {
    return null
  }
}

/**
 * Validate and clamp one session-list request.
 *
 * Returns a plan whose every bound is already safe to hand to Firestore, or the
 * message for a 400. Nothing here reads the database.
 */
export function parseSessionListQuery(
  params: URLSearchParams,
  now: Date = new Date()
): SessionQueryParse {
  const limit = parseBoundedInt(params.get("limit"), {
    min: 1,
    max: SESSION_PAGE_SIZE_MAX,
    fallback: SESSION_PAGE_SIZE_DEFAULT,
  })
  if (!limit.ok) {
    return { ok: false, error: "limit must be an integer" }
  }

  const rawStatus = (params.get("status") || "all").trim()
  if (!isSessionListStatus(rawStatus)) {
    return {
      ok: false,
      error: `status must be one of: ${SESSION_LIST_STATUSES.join(", ")}`,
    }
  }

  const rawType = (params.get("type") || "").trim()
  if (rawType !== "" && !TYPE_PATTERN.test(rawType)) {
    return { ok: false, error: "type is not a valid session type" }
  }

  const rawUserId = (params.get("userId") || "").trim()
  if (rawUserId !== "" && !ID_PATTERN.test(rawUserId)) {
    return { ok: false, error: "userId is not a valid user id" }
  }

  const from = parseDateBound(params.get("from"), "start")
  if (from === false) return { ok: false, error: "from must be a valid date" }
  const to = parseDateBound(params.get("to"), "end")
  if (to === false) return { ok: false, error: "to must be a valid date" }
  if (from !== null && to !== null && from > to) {
    return { ok: false, error: "from must not be after to" }
  }

  const rawSort = (params.get("sortBy") || SESSION_SORT_COLUMN).trim()
  if (rawSort !== SESSION_SORT_COLUMN) {
    return { ok: false, error: `sortBy must be ${SESSION_SORT_COLUMN}` }
  }

  const rawDirection = (params.get("direction") || "desc").trim()
  if (rawDirection !== "asc" && rawDirection !== "desc") {
    return { ok: false, error: "direction must be asc or desc" }
  }

  const rawCursor = params.get("cursor")
  const cursor = decodeSessionCursor(rawCursor)
  if (rawCursor !== null && rawCursor.trim() !== "" && cursor === null) {
    return { ok: false, error: "cursor is not a valid pagination cursor" }
  }

  const abandonedCutoff = new Date(
    now.getTime() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000
  ).toISOString()

  let feedbackStatus: FeedbackStatusFilter | null = null
  let openOnly = false
  let startedFrom = from
  let startedTo = to

  switch (rawStatus) {
    case "completed":
      feedbackStatus = { op: "==", value: "complete" }
      break
    case "scoring":
      feedbackStatus = { op: "in", values: ["pending", "processing"] }
      break
    case "failed":
      feedbackStatus = { op: "==", value: "failed" }
      break
    case "in_progress":
      // Still open and young enough to plausibly be live. The cutoff is an
      // indexed created_at bound, so only the "no completed_at" half is
      // resolved after reading.
      openOnly = true
      startedFrom = laterBound(startedFrom, abandonedCutoff)
      break
    case "abandoned":
      openOnly = true
      startedTo = earlierBound(startedTo, abandonedCutoff)
      break
    default:
      break
  }

  return {
    ok: true,
    plan: {
      status: rawStatus,
      feedbackStatus,
      openOnly,
      sessionType: rawType === "" ? null : rawType,
      userId: rawUserId === "" ? null : rawUserId,
      startedFrom,
      startedTo,
      direction: rawDirection,
      pageSize: limit.value,
      cursor,
      // The count aggregation costs a separate Firestore call, and the total for
      // a filter set does not change as the admin pages through it. Charge for it
      // on the first page only.
      includeTotal: cursor === null,
    },
  }
}

/**
 * How many documents one request may read for this plan.
 *
 * A fully indexed plan reads exactly one page plus a probe row that tells the
 * caller whether a next page exists. A plan with `openOnly` must over-fetch,
 * because an unknown fraction of each batch will be discarded, so it is allowed
 * up to SESSION_SCAN_CEILING before it gives up and reports a partial page.
 */
export function scanBudgetFor(plan: SessionQueryPlan): number {
  return plan.openOnly ? SESSION_SCAN_CEILING : plan.pageSize + 1
}
