/**
 * Admin Audit Logging
 *
 * THE single writer for the `admin_audit_log` collection. Every admin mutation
 * must go through `logAdminAction()` so that one document shape holds for every
 * row: an audit log whose fields depend on which code path wrote it cannot
 * answer a forensics question.
 *
 * Design rules that the rest of this file exists to enforce:
 *
 *  - Every field is ALWAYS present. A missing actor email and an actor with no
 *    email are different facts, and only an explicit `null` can tell them
 *    apart. Silently omitting the key makes "we never captured it" look
 *    identical to "there was nothing to capture".
 *  - IP and user agent come from the real request. Passing the `NextRequest`
 *    is the whole point of the `options.request` argument; when a call site
 *    genuinely has no request (a cron job, a script) the fields are recorded
 *    as `null` rather than invented.
 *  - The timestamp is stamped by Firestore, not by the process doing the
 *    write, so an actor cannot backdate their own trail.
 */

import type { NextRequest } from "next/server"
import { adminDb } from "../firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { getClientIdentifier } from "../rate-limit"

/** The one collection admin actions are written to. */
export const AUDIT_COLLECTION = "admin_audit_log"

/**
 * Bumped whenever the record shape changes so a reader can tell a v2 row (which
 * always carries actor email, target, before/after, IP and user agent keys)
 * from the pre-consolidation rows that carried an arbitrary subset.
 */
export const AUDIT_SCHEMA_VERSION = 2

/**
 * Firestore rejects a document containing `undefined`, and the old helper wrote
 * caller-supplied objects straight through inside a try/catch that swallowed
 * the resulting error. A single stray `undefined` in a details payload silently
 * dropped the entire audit entry, which is the failure mode an audit log can
 * least afford. Everything caller-supplied is normalised before it is written.
 */
const MAX_DETAILS_BYTES = 32_000

/** An actor identified by uid, optionally with the email from their ID token. */
export interface AuditActor {
  userId: string
  email?: string | null
}

/**
 * Accepts a bare uid or anything with `{ userId, email }`, which includes the
 * `AdminContext` returned by `verifyAdminAccess()`. Adoption at a call site is
 * therefore `logAdminAction(adminContext, ...)` with no unpacking.
 */
export type AuditActorInput = string | AuditActor

/** What the action acted on. `type` is a collection or entity name. */
export interface AuditTarget {
  type: string
  id: string
  /** Human-readable name for the target, when one is known. */
  label?: string | null
}

export interface AuditLogOptions {
  /**
   * The request that triggered the action. Supply it whenever one exists: it
   * is the only source of the IP and user agent.
   */
  request?: NextRequest | null
  /** What was acted on, when the action names a specific document. */
  target?: AuditTarget | null
  /** Document state before the mutation, for actions that changed a document. */
  before?: Record<string, unknown> | null
  /** Document state after the mutation, for actions that changed a document. */
  after?: Record<string, unknown> | null
}

/**
 * The fourth argument accepts a bare `NextRequest` as shorthand for
 * `{ request }`, which is what most mutation routes need and what the one
 * pre-existing call site already passed. Both forms are supported so adopting
 * the helper never requires reshaping an existing call.
 */
export type AuditLogOptionsInput = AuditLogOptions | NextRequest

function normalizeOptions(input: AuditLogOptionsInput | undefined): AuditLogOptions {
  if (!input) return {}
  // A NextRequest carries `headers`; the options object never does.
  if ("headers" in input) return { request: input as NextRequest }
  return input as AuditLogOptions
}

/**
 * The document shape written to `admin_audit_log`. Every key is always present;
 * `null` means "explicitly not available", never "not applicable to this row".
 */
export interface AuditRecord {
  schemaVersion: number
  adminId: string
  adminEmail: string | null
  action: string
  target: { type: string; id: string; label: string | null } | null
  details: Record<string, unknown>
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  /** `FieldValue.serverTimestamp()` on write; a `Timestamp` when read back. */
  timestamp: unknown
}

/**
 * Recursively drop `undefined` and coerce values Firestore cannot store.
 * Returns a plain object safe to hand to `.add()`.
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null
  if (depth > 8) return "[truncated: nesting depth]"

  const type = typeof value
  if (type === "string" || type === "boolean") return value
  if (type === "number") return Number.isFinite(value as number) ? value : String(value)
  if (type === "bigint") return (value as bigint).toString()
  if (type === "function" || type === "symbol") return `[${type}]`

  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return `${value.name}: ${value.message}`

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const out: Record<string, unknown> = {}
  for (const [key, item] of entries) {
    if (item === undefined) continue
    out[key] = sanitizeValue(item, depth + 1)
  }
  return out
}

/**
 * Normalise a caller-supplied payload into a Firestore-safe object, capping it
 * so an oversized payload cannot push the document past Firestore's 1 MiB limit
 * and lose the audit entry entirely. A capped entry that records the action is
 * worth far more than a rejected write.
 */
export function sanitizeAuditPayload(
  payload: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (payload === null || payload === undefined) return null

  const sanitized = sanitizeValue(payload) as Record<string, unknown>
  const encoded = JSON.stringify(sanitized) ?? "{}"
  if (encoded.length <= MAX_DETAILS_BYTES) return sanitized

  return {
    truncated: true,
    reason: `payload exceeded ${MAX_DETAILS_BYTES} characters and was truncated to keep the audit entry writable`,
    preview: encoded.slice(0, MAX_DETAILS_BYTES),
  }
}

function normalizeActor(actor: AuditActorInput): { adminId: string; adminEmail: string | null } {
  if (typeof actor === "string") {
    // Legacy positional call site that only had a uid on hand. The email is
    // genuinely unknown here, so say so rather than leaving the field off.
    return { adminId: actor, adminEmail: null }
  }
  return {
    adminId: actor.userId,
    adminEmail: actor.email ?? null,
  }
}

/**
 * Pull the IP and user agent off the request.
 *
 * IP extraction reuses `getClientIdentifier()` from the rate limiter rather
 * than reading `x-forwarded-for` directly. That function deliberately trusts
 * only headers the platform edge writes and falls back to the RIGHTMOST
 * forwarded entry, because the leftmost entries are client-supplied. Recording
 * a client-forgeable IP in a forensics log is worse than recording none.
 */
function extractRequestMetadata(request: NextRequest | null | undefined): {
  ip: string | null
  userAgent: string | null
} {
  if (!request) {
    return { ip: null, userAgent: null }
  }

  const ip = getClientIdentifier(request)
  const userAgent = request.headers.get("user-agent")

  return {
    // getClientIdentifier() returns the literal "unknown" when no trusted
    // header is present; normalise that to null so the UI has one way to
    // render "we do not know" instead of two.
    ip: ip && ip !== "unknown" ? ip : null,
    userAgent: userAgent?.trim() || null,
  }
}

/**
 * Build the audit document without writing it. Exported so the record shape can
 * be asserted in tests without a Firestore instance.
 */
export function buildAuditRecord(
  actor: AuditActorInput,
  action: string,
  details: Record<string, unknown> = {},
  optionsInput: AuditLogOptionsInput = {}
): AuditRecord {
  const options = normalizeOptions(optionsInput)
  const { adminId, adminEmail } = normalizeActor(actor)
  const { ip, userAgent } = extractRequestMetadata(options.request)
  const target = options.target
    ? {
        type: options.target.type,
        id: options.target.id,
        label: options.target.label ?? null,
      }
    : null

  return {
    schemaVersion: AUDIT_SCHEMA_VERSION,
    adminId,
    adminEmail,
    action,
    target,
    details: sanitizeAuditPayload(details) ?? {},
    before: sanitizeAuditPayload(options.before),
    after: sanitizeAuditPayload(options.after),
    ip,
    userAgent,
    timestamp: FieldValue.serverTimestamp(),
  }
}

/**
 * Log an admin action for the audit trail.
 *
 * @param actor - The admin performing the action. Pass the `AdminContext` from
 *   `verifyAdminAccess()` so the actor's email is recorded; a bare uid string
 *   still works but records the email as explicitly unknown.
 * @param action - The action performed, ideally from `AUDIT_ACTIONS`.
 * @param details - Action-specific context. Sanitised before writing.
 * @param options - `{ request, target, before, after }`, or a bare `NextRequest`
 *   as shorthand for `{ request }`.
 *
 * Never throws: a failed audit write must not roll back the action the admin
 * actually performed. It is logged loudly instead.
 */
export async function logAdminAction(
  actor: AuditActorInput,
  action: string,
  details: Record<string, unknown> = {},
  options: AuditLogOptionsInput = {}
): Promise<void> {
  if (!adminDb) {
    console.warn("[Audit] Database not available, skipping audit log", { action })
    return
  }

  try {
    const record = buildAuditRecord(actor, action, details, options)
    await adminDb.collection(AUDIT_COLLECTION).add(record)
  } catch (error) {
    // An audit gap is a compliance event in its own right, so this is an error
    // rather than a warning even though the caller's work already succeeded.
    console.error("[Audit] FAILED to write audit entry", { action, error })
  }
}

/**
 * A resolved audit date filter. `from` is inclusive and `until` is EXCLUSIVE,
 * which is what makes the final day of a range actually appear: an inclusive
 * `<= "2026-08-07"` resolves to midnight and silently drops every entry from
 * the day the operator asked for.
 */
export interface AuditDateRange {
  from: Date | null
  until: Date | null
}

export type AuditDateRangeResult =
  | { ok: true; range: AuditDateRange }
  | { ok: false; field: "startDate" | "endDate" | "range"; message: string }

/** Matches the YYYY-MM-DD that an `<input type="date">` produces. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function parseInstant(raw: string): Date | null {
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Resolve the `startDate` / `endDate` query parameters into a half-open range.
 *
 * Two things were wrong before and both are fixed here:
 *
 *  - `new Date(input)` was handed straight to Firestore. An unparseable value
 *    produced an Invalid Date, which Firestore rejects, which surfaced to the
 *    operator as an opaque 500. Bad input is now a 400 that names the field.
 *  - `endDate` was applied as `timestamp <= new Date("2026-08-07")`, and a
 *    date-only string parses to 00:00:00 UTC, so the entire final day was
 *    excluded. A date-only bound now extends to the end of that day.
 *
 * Bounds are interpreted in UTC, matching how `new Date("YYYY-MM-DD")` parses,
 * so the range does not shift with the server's timezone.
 */
export function resolveAuditDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): AuditDateRangeResult {
  let from: Date | null = null
  let until: Date | null = null

  const rawStart = startDate?.trim()
  if (rawStart) {
    const parsed = parseInstant(rawStart)
    if (!parsed) {
      return { ok: false, field: "startDate", message: "startDate is not a valid date" }
    }
    from = parsed
  }

  const rawEnd = endDate?.trim()
  if (rawEnd) {
    const parsed = parseInstant(rawEnd)
    if (!parsed) {
      return { ok: false, field: "endDate", message: "endDate is not a valid date" }
    }
    // endDate is inclusive for the operator; the query bound is exclusive.
    // A date-only bound covers the whole named day; a full timestamp covers
    // the named instant itself.
    until = DATE_ONLY_PATTERN.test(rawEnd)
      ? new Date(parsed.getTime() + ONE_DAY_MS)
      : new Date(parsed.getTime() + 1)
  }

  if (from && until && from.getTime() >= until.getTime()) {
    return {
      ok: false,
      field: "range",
      message: "startDate must be on or before endDate",
    }
  }

  return { ok: true, range: { from, until } }
}

/**
 * Common audit action types
 */
export const AUDIT_ACTIONS = {
  // User management
  DELETE_USER: "delete_user",
  UPDATE_USER: "update_user",
  VIEW_USER_PROFILE: "view_user_profile",

  // Budget management
  SET_USER_BUDGET: "set_user_budget",

  // System actions
  CLEAR_CACHE: "clear_cache",
  CLEANUP_ORPHANS: "cleanup_orphans",

  // Admin management
  GRANT_ROLE: "grant_role",
  REVOKE_ROLE: "revoke_role",

  // Settings
  UPDATE_SETTINGS: "update_settings",

  // Announcements. Every user sees these, so who published one, from where, and
  // what the message said before an edit are all forensic facts.
  CREATE_ANNOUNCEMENT: "create_announcement",
  UPDATE_ANNOUNCEMENT: "update_announcement",
  DELETE_ANNOUNCEMENT: "delete_announcement",

  // Algorithm research
  END_AB_SWITCH_FSRS: "end_ab_switch_fsrs",

  // Open learner model (co-regulation study)
  VIEW_LEARNER_MODEL_STATS: "view_learner_model_stats",

  // Audit surface itself
  EXPORT_AUDIT_LOG: "export_audit_log",
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]
