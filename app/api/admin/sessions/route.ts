/**
 * Admin Sessions API
 *
 * GET /api/admin/sessions            paginated, filtered list of interview sessions
 * GET /api/admin/sessions?sessionId=  everything the platform knows about one session
 *
 * Before this route, /admin/sessions rendered four stat cards from the Overview
 * computation and there was no way to look at a single interview at all. That
 * page paid for an unbounded scan of every user, session and event to draw four
 * numbers, so this route deliberately does the opposite: every read is bounded
 * before it is issued, by a page size that a query parameter cannot raise past
 * SESSION_PAGE_SIZE_MAX and a scan ceiling for the one predicate Firestore
 * cannot index.
 *
 * A failure here is a failure. Several admin routes catch a Firestore error and
 * substitute `{ size: 0, docs: [] }`, which renders a broken query as "0 sessions"
 * under a green HTTP 200 and hides the outage from the only people who could fix
 * it. Nothing in this file does that: a query that throws returns 500.
 */

import { FieldPath } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission, successResponse, errorResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { fetchProfilesById, profileEmail } from "@/lib/usage/profile-lookup"
import {
  parseSessionListQuery,
  encodeSessionCursor,
  scanBudgetFor,
  canCountExactly,
  SESSION_ORDER_FIELD,
  SESSION_SCAN_CEILING,
  type SessionQueryPlan,
} from "@/lib/admin/session-query"
import {
  toSessionListRow,
  toSessionDetail,
  type SessionListRow,
  type SessionRowSource,
} from "@/lib/admin/session-rows"
import { assembleSessionPage } from "@/lib/admin/session-page"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const SESSIONS_COLLECTION = "interview_sessions"

/** Same shape the planner validates user ids against. */
const SESSION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/

/**
 * Translate a validated plan into the Firestore query.
 *
 * Every clause here is an indexed one. The equality filters and the `created_at`
 * range compose into the composite indexes declared in firestore.indexes.json;
 * the `openOnly` predicate is deliberately absent because no index can express
 * it, and the caller applies it to the bounded result instead.
 */
function buildSessionQuery(plan: SessionQueryPlan): FirebaseFirestore.Query {
  let query: FirebaseFirestore.Query = adminDb.collection(SESSIONS_COLLECTION)

  if (plan.userId) {
    query = query.where("user_id", "==", plan.userId)
  }
  if (plan.sessionType) {
    query = query.where("type", "==", plan.sessionType)
  }
  if (plan.feedbackStatus) {
    query =
      plan.feedbackStatus.op === "=="
        ? query.where("feedback_status", "==", plan.feedbackStatus.value)
        : query.where("feedback_status", "in", plan.feedbackStatus.values)
  }
  if (plan.startedFrom) {
    query = query.where(SESSION_ORDER_FIELD, ">=", plan.startedFrom)
  }
  if (plan.startedTo) {
    query = query.where(SESSION_ORDER_FIELD, "<=", plan.startedTo)
  }

  return query
}

/**
 * Add ordering, the cursor and the read bound.
 *
 * The document id is an explicit second sort key so that sessions sharing a
 * `created_at` to the millisecond still have one total order. Without it a
 * cursor sitting on a tie can skip or repeat rows, which is the classic way a
 * paginated list quietly loses records. Firestore's automatic index for a single
 * ordered field already carries `__name__` in the same direction, so this costs
 * no extra index.
 */
function orderAndBound(query: FirebaseFirestore.Query, plan: SessionQueryPlan) {
  let ordered = query
    .orderBy(SESSION_ORDER_FIELD, plan.direction)
    .orderBy(FieldPath.documentId(), plan.direction)

  if (plan.cursor) {
    ordered = ordered.startAfter(plan.cursor.startedAt, plan.cursor.sessionId)
  }

  return ordered.limit(scanBudgetFor(plan))
}

interface ListPage {
  rows: SessionListRow[]
  nextCursor: string | null
  /** Documents actually read, so the UI can say how far the scan reached. */
  scanned: number
  /** True when an `openOnly` scan hit its ceiling and stopped early. */
  scanCapped: boolean
}

async function listSessions(plan: SessionQueryPlan): Promise<ListPage> {
  const snapshot = await orderAndBound(buildSessionQuery(plan), plan).get()

  // Which documents belong on the page, and where the next one resumes, is pure
  // logic over what was read, so it lives in session-page.ts where tests can
  // exercise every branch without a live Firestore.
  const page = assembleSessionPage(
    snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as SessionRowSource })),
    plan
  )

  if (page.hasMore && page.nextCursor === null) {
    // More matches exist but no resume position could be built from the last row,
    // which only happens when its created_at is not the ISO string both writers
    // produce. The admin silently loses everything past here, so it is logged.
    logger.warn("[Admin Sessions] More results exist but no cursor could be built", {
      returned: page.items.length,
      scanned: page.scanned,
    })
  }

  // One batched getAll for the whole page instead of a point read per row.
  const userIds = page.items
    .map((row) => row.data.user_id)
    .filter((id): id is string => typeof id === "string" && id !== "")
  const profiles = await fetchProfilesById(userIds)

  const now = new Date()
  const rows = page.items.map((row) => {
    const userId = typeof row.data.user_id === "string" ? row.data.user_id : null
    // Only the email is read off the profile. Nothing else from that document
    // belongs in a session list, and a spread here is exactly how the last audit
    // found stripe_customer_id in a table payload.
    const email = userId ? profileEmail(profiles.get(userId), "") : ""
    return toSessionListRow(row.id, row.data, email === "" ? null : email, now)
  })

  return {
    rows,
    nextCursor: page.nextCursor ? encodeSessionCursor(page.nextCursor) : null,
    scanned: page.scanned,
    scanCapped: page.scanCapped,
  }
}

/** Exact row count for this filter set, or null when the plan cannot be counted. */
async function countSessions(plan: SessionQueryPlan): Promise<number | null> {
  if (!canCountExactly(plan)) return null
  const snapshot = await buildSessionQuery(plan).count().get()
  return snapshot.data().count
}

async function respondWithDetail(sessionId: string) {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return errorResponse("sessionId is not a valid session id", 400)
  }

  const doc = await adminDb.collection(SESSIONS_COLLECTION).doc(sessionId).get()
  if (!doc.exists) {
    return errorResponse("Session not found", 404)
  }

  const session = doc.data() as SessionRowSource
  const userId = typeof session.user_id === "string" ? session.user_id : null
  const profiles = userId ? await fetchProfilesById([userId]) : null
  const email = userId && profiles ? profileEmail(profiles.get(userId), "") : ""

  return successResponse({
    session: toSessionDetail(doc.id, session, email === "" ? null : email),
  })
}

export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (request) => {
  if (!adminDb) {
    return errorResponse("Database not available", 503)
  }

  const { searchParams } = new URL(request.url)

  const sessionId = searchParams.get("sessionId")
  if (sessionId !== null && sessionId.trim() !== "") {
    try {
      return await respondWithDetail(sessionId.trim())
    } catch (error) {
      logger.error("[Admin Sessions] Failed to load session detail", { error, sessionId })
      return errorResponse("Failed to load session", 500)
    }
  }

  const parsed = parseSessionListQuery(searchParams)
  if (!parsed.ok) {
    return errorResponse(parsed.error, 400)
  }
  const plan = parsed.plan

  try {
    // The count is a separate aggregation over the same filters, so it runs
    // alongside the page read rather than after it.
    const [page, total] = await Promise.all([listSessions(plan), countSessions(plan)])

    return successResponse({
      sessions: page.rows,
      pagination: {
        pageSize: plan.pageSize,
        returned: page.rows.length,
        nextCursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        // Null when the filter's defining predicate lives outside the index, so
        // the UI can say "showing 12" instead of "12 of some wrong number".
        total,
      },
      filters: {
        status: plan.status,
        type: plan.sessionType,
        userId: plan.userId,
        from: plan.startedFrom,
        to: plan.startedTo,
        direction: plan.direction,
      },
      scan: {
        documentsRead: page.scanned,
        // True when in-progress or abandoned stopped at the ceiling. The page is
        // real, it just does not prove there is nothing older.
        capped: page.scanCapped,
        ceiling: plan.openOnly ? SESSION_SCAN_CEILING : plan.pageSize + 1,
      },
    })
  } catch (error) {
    // A missing composite index and a malformed range both land here. Reporting
    // an empty list would render either as "no sessions match", so the admin
    // gets a 500 and the detail goes to the log.
    logger.error("[Admin Sessions] Failed to list sessions", {
      error,
      status: plan.status,
      type: plan.sessionType,
      hasUserFilter: plan.userId !== null,
    })
    return errorResponse("Failed to load sessions", 500)
  }
})
