/**
 * AI-cache cleanup cron
 *
 * `ai_cache` entries carry an `expiresAt` Timestamp, but the only deletion path was the
 * manual "clear cache" button on the admin usage page — nothing scheduled ever purged
 * them, so expired entries accumulated forever (2,507 of 2,517 docs were expired when
 * this route was written). Expired entries are pure dead weight: reads treat them as
 * misses, so deleting them changes no behavior.
 *
 * A Firestore TTL policy on `expiresAt` (set in the console, zero code) is the better
 * long-term mechanism; this cron is the in-repo fallback and drains any backlog either
 * way. Pass `?dryRun=true` to count what WOULD be deleted without deleting.
 *
 * Schedule: daily on cron-job.org (see app/api/cron/README.md — never vercel.json).
 * Auth: `Bearer <CRON_SECRET>` (timing-safe), matching the other cron routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { verifyCronRequest } from "@/lib/cron-auth"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"

const cronLogger = logger.child({ service: "cron-ai-cache-cleanup" })

// Bounded per run: stays within the function timeout and one Firestore batch (max 500
// ops). A daily run drains a backlog over successive days; `hasMore` signals when more
// remain.
const MAX_DELETES_PER_RUN = 500

export async function GET(request: NextRequest) {
  try {
    const auth = verifyCronRequest(request)
    if (!auth.ok) {
      if (auth.status === 500) {
        cronLogger.error("CRON_SECRET not configured")
      }
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const dryRun = new URL(request.url).searchParams.get("dryRun") === "true"
    const now = Timestamp.now()

    const snapshot = await adminDb
      .collection("ai_cache")
      .where("expiresAt", "<", now)
      .limit(MAX_DELETES_PER_RUN)
      .get()

    let toDelete = 0
    const batch = adminDb.batch()
    for (const doc of snapshot.docs) {
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
      hasMore: snapshot.size === MAX_DELETES_PER_RUN,
      dryRun,
    }
    cronLogger.info("AI-cache cleanup completed", result)
    return NextResponse.json({ success: true, ...result, timestamp: now.toDate().toISOString() })
  } catch (error) {
    cronLogger.error("Fatal error in ai-cache cleanup cron", { error })
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
