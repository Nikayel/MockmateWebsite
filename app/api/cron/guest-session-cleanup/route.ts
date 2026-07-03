/**
 * Guest-session cleanup cron
 *
 * Guest interview sessions (`is_guest: true`) carry an `expires_at` (ISO-8601, ~7 days out), but
 * nothing ever purged them — so every guest session document (with its code, chat transcript and
 * feedback) accumulated in Firestore forever. `expires_at` was only ever READ (for quota gating),
 * never used to delete. This job deletes expired guest sessions in bounded batches.
 *
 * SAFETY: the query is strictly scoped to `is_guest == true`, and each doc is re-checked before
 * deletion, so real / migrated (`is_guest: false`) user history is never touched. Pass `?dryRun=true`
 * to count what WOULD be deleted without deleting.
 *
 * Schedule: daily. Auth: `Bearer <CRON_SECRET>` (timing-safe), matching the other cron routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"

const cronLogger = logger.child({ service: "cron-guest-session-cleanup" })
const CRON_SECRET = process.env.CRON_SECRET

// Bounded per run to stay within the function timeout and one Firestore batch (max 500 ops). A daily
// run drains a backlog over successive days; `hasMore` signals when more remain.
const MAX_DELETES_PER_RUN = 300

export async function GET(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      cronLogger.error("CRON_SECRET not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }
    // SECURITY: timing-safe Bearer comparison (same pattern as subscription-expiry).
    const expectedToken = `Bearer ${CRON_SECRET}`
    const headerValue = request.headers.get("authorization") || ""
    const isValid =
      headerValue.length === expectedToken.length &&
      timingSafeEqual(Buffer.from(headerValue), Buffer.from(expectedToken))
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dryRun = new URL(request.url).searchParams.get("dryRun") === "true"
    const now = new Date().toISOString()

    // ISO-8601 strings sort chronologically, so a string `<=` is a valid "expired" check.
    const snapshot = await adminDb
      .collection("interview_sessions")
      .where("is_guest", "==", true)
      .where("expires_at", "<=", now)
      .limit(MAX_DELETES_PER_RUN)
      .get()

    let toDelete = 0
    let skippedNonGuest = 0
    const batch = adminDb.batch()
    for (const doc of snapshot.docs) {
      // Defense in depth: never delete a non-guest doc, even if the query/index ever drifted.
      if (doc.data()?.is_guest !== true) {
        skippedNonGuest++
        continue
      }
      if (!dryRun) batch.delete(doc.ref)
      toDelete++
    }

    if (!dryRun && toDelete > 0) {
      await batch.commit()
    }

    const result = {
      matched: snapshot.size,
      deleted: dryRun ? 0 : toDelete,
      wouldDelete: dryRun ? toDelete : undefined,
      skippedNonGuest,
      hasMore: snapshot.size === MAX_DELETES_PER_RUN,
      dryRun,
    }
    cronLogger.info("Guest-session cleanup completed", result)
    return NextResponse.json({ success: true, ...result, timestamp: now })
  } catch (error) {
    cronLogger.error("Fatal error in guest-session cleanup cron", { error })
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility (mirrors the other cron routes).
export async function POST(request: NextRequest) {
  return GET(request)
}
