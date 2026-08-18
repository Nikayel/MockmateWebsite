/**
 * Reap sessions whose feedback generation was orphaned.
 *
 * "pending" and "processing" are transit states owned by the feedback
 * pipeline. Since 2026-08-18 the stream route persists server-side (waitUntil
 * + disconnect-tolerant streaming), so orphans should be rare - but the whole
 * lesson of the stuck-feedback incident is that "the client will finish the
 * job" is not a guarantee, so neither is "the server will". Any completed
 * session still in transit past the stall threshold is flipped to "failed",
 * which is the state with an honest message and a Retry button.
 *
 * Never touches "complete", never touches sessions still being taken
 * (no completed_at), and caps its batch so a pathological backlog cannot blow
 * the invocation budget.
 *
 * Schedule: hourly on cron-job.org (NOT vercel.json - see ../README.md).
 * Auth: `Bearer <CRON_SECRET>` (timing-safe), matching the other cron routes.
 */

import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { verifyCronRequest } from "@/lib/cron-auth"
import { logger } from "@/lib/logger"
import { FEEDBACK_STALL_THRESHOLD_MS } from "@/lib/feedback/generation-stalled"

const cronLogger = logger.child({ service: "cron-reap-stale-feedback" })

const TRANSIT_STATUSES = ["pending", "processing"] as const
const MAX_REAPED_PER_RUN = 100

function completedAtMs(value: unknown): number | null {
  if (!value) return null
  if (typeof value === "string") {
    const ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }
  const maybeTimestamp = value as { toDate?: () => Date }
  if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().getTime()
  return null
}

export async function GET(request: NextRequest) {
  const auth = verifyCronRequest(request)
  if (!auth.ok) {
    if (auth.status === 500) {
      cronLogger.error("CRON_SECRET not configured")
    }
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const cutoffMs = Date.now() - FEEDBACK_STALL_THRESHOLD_MS

  try {
    // One equality query per transit status: needs no composite index at this
    // collection size (a few hundred docs, a handful in transit at any time).
    // completed_at is filtered in memory because legacy docs store it as an
    // ISO string, which a Firestore range query would compare lexically
    // against serverTimestamp docs.
    const reaped: string[] = []
    let scanned = 0

    for (const status of TRANSIT_STATUSES) {
      const snapshot = await adminDb
        .collection("interview_sessions")
        .where("feedback_status", "==", status)
        .limit(500)
        .get()
      scanned += snapshot.size

      for (const doc of snapshot.docs) {
        if (reaped.length >= MAX_REAPED_PER_RUN) break
        const completedMs = completedAtMs(doc.get("completed_at"))
        if (completedMs === null || completedMs > cutoffMs) continue

        await doc.ref.update({
          feedback_status: "failed",
          feedback_error: `Reaped: feedback generation never completed (was "${status}")`,
          updated_at: FieldValue.serverTimestamp(),
        })
        reaped.push(doc.id)
      }
    }

    if (reaped.length > 0) {
      cronLogger.warn("Reaped sessions stuck in feedback transit states", {
        count: reaped.length,
        sessionIds: reaped.slice(0, 20),
      })
    }

    return NextResponse.json({ success: true, scanned, reaped: reaped.length })
  } catch (error) {
    cronLogger.error("Reap run failed", { error })
    return NextResponse.json({ error: "Reap run failed" }, { status: 500 })
  }
}
