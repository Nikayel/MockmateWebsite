/**
 * System Health API
 *
 * Answers one question honestly: which of the services CodeSparring depends on
 * are actually working right now.
 *
 * What this replaced: four service cards initialised to `healthy`, of which
 * exactly one (`database`) was ever reassigned. `storage` and `auth` were
 * literals, and `api` timed its own handler, which cannot fail without the
 * request already having failed. Stripe, the AI providers, Deepgram, Brevo and
 * Sentry were not represented at all, so a total vendor outage rendered green.
 *
 * Every card now comes from `PLATFORM_PROBES`, which is a real check per
 * dependency or an explicit `unknown`. `unknown` never counts as healthy.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { Timestamp } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"
import { logger } from "@/lib/logger"
import { PLATFORM_PROBES } from "@/lib/admin/platform-probes"
import {
  deriveDependencyAlerts,
  runDependencyProbes,
  summarizeProbes,
  type DependencyAlert,
} from "@/lib/admin/dependency-probes"

export const dynamic = "force-dynamic"

/**
 * Acknowledgements live here, one document per alert id. The alerts themselves
 * are derived on every request and never stored: an alert that is no longer true
 * should disappear, not linger in a table.
 */
const ACK_COLLECTION = "health_alert_acknowledgements"

interface StoredAcknowledgement {
  signature: string
  acknowledgedBy: string
  acknowledgedAt: string
}

export interface HealthAlert extends DependencyAlert {
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
}

/**
 * Attach acknowledgement state, and drop records that no longer describe
 * anything.
 *
 * An acknowledgement is bound to the signature it silenced. If Stripe recovers
 * and later fails differently, the signature no longer matches and the alert
 * comes back unacknowledged, which is the whole point: acknowledging an outage
 * must not pre-acknowledge the next one.
 */
async function applyAcknowledgements(alerts: DependencyAlert[]): Promise<HealthAlert[]> {
  if (!adminDb) {
    return alerts.map((alert) => ({
      ...alert,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
    }))
  }

  let stored = new Map<string, StoredAcknowledgement>()
  try {
    const snapshot = await adminDb.collection(ACK_COLLECTION).get()
    stored = new Map(
      snapshot.docs.map((doc) => [doc.id, doc.data() as StoredAcknowledgement])
    )
  } catch (error) {
    // A read failure must not hide the alerts themselves.
    logger.error("Failed to read health alert acknowledgements", { error })
  }

  const live = new Set(alerts.map((alert) => alert.id))
  const applied = alerts.map((alert) => {
    const ack = stored.get(alert.id)
    const matches = ack?.signature === alert.signature
    return {
      ...alert,
      acknowledged: Boolean(matches),
      acknowledgedBy: matches ? (ack?.acknowledgedBy ?? null) : null,
      acknowledgedAt: matches ? (ack?.acknowledgedAt ?? null) : null,
    }
  })

  // Sweep acknowledgements whose alert has cleared or changed shape. Bounded:
  // there is at most one document per dependency, and deletes only happen on
  // the poll where the underlying state actually moved.
  const bySignature = new Map(alerts.map((alert) => [alert.id, alert.signature]))
  const stale = [...stored.entries()].filter(
    ([id, ack]) => !live.has(id) || bySignature.get(id) !== ack.signature
  )
  if (stale.length > 0) {
    try {
      await Promise.all(
        stale.map(([id]) => adminDb!.collection(ACK_COLLECTION).doc(id).delete())
      )
    } catch (error) {
      logger.error("Failed to clear stale health alert acknowledgements", { error })
    }
  }

  return applied
}

/**
 * Volume of product events in the last 24 hours.
 *
 * This is a counter, not a health signal, and it is labelled as one. The card it
 * replaces said "Requests (24h)", which this collection has never held: it holds
 * the events that lib/analytics-server.ts writes (chat, code execution, feedback
 * generation, purchases). Returns null when the count cannot be taken, so the UI
 * can say so instead of showing a zero.
 */
async function countProductEvents(since: Date): Promise<number | null> {
  if (!adminDb) return null
  try {
    const snapshot = await adminDb
      .collection("analytics_events")
      .where("timestamp", ">=", Timestamp.fromDate(since))
      .count()
      .get()
    return snapshot.data().count
  } catch (error) {
    logger.error("Failed to count product events", { error })
    return null
  }
}

/**
 * Reading system health is VIEW_ERRORS, which every admin role holds. The
 * hand-rolled preamble this replaces gated on `if (!role)`, which is not a
 * permission check at all: it passed anyone the role lookup returned truthy for.
 */
export const GET = withPermission(PERMISSIONS.VIEW_ERRORS, async () => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Probes are raced against their own timeouts inside runDependencyProbes, so
    // the slowest vendor costs this route one timeout rather than the request.
    const [dependencies, productEvents24h] = await Promise.all([
      runDependencyProbes(PLATFORM_PROBES),
      countProductEvents(since),
    ])

    const summary = summarizeProbes(dependencies)
    const alerts = await applyAcknowledgements(deriveDependencyAlerts(dependencies))

    // The error count that used to live here queried analytics_events for
    // `event_name == "error"`, a value nothing in the codebase has ever written,
    // so it was a permanent zero driving a "High Error Rate" alert that could
    // never fire. Errors go to Sentry via lib/logger; counting them here would
    // need a Firestore sink that does not exist.

    // V8 heap of the instance serving this request. The previous 256/512 literal was justified
    // by a comment claiming memory is unavailable in serverless, which is not true of the Node
    // runtime. This is per-instance rather than platform-wide, and labelled as such in the UI,
    // but it is measured: a leak shows up here as a heap that climbs and does not come back.
    const heap = process.memoryUsage()
    const usedMb = Math.round(heap.heapUsed / 1024 / 1024)
    const totalMb = Math.round(heap.heapTotal / 1024 / 1024)

    return NextResponse.json({
      success: true,
      health: {
        status: summary.status,
        lastChecked: new Date().toISOString(),
        dependencies,
        summary,
        metrics: { productEvents24h },
        memory: {
          used: usedMb,
          total: totalMb,
          percentage: totalMb > 0 ? Math.round((usedMb / totalMb) * 100) : 0,
        },
        alerts,
      },
    })
  } catch (error) {
    logger.error("Failed to build system health report", { error })
    return NextResponse.json(
      { success: false, error: "Failed to fetch health data" },
      { status: 500 }
    )
  }
})

const acknowledgeSchema = z.object({
  alertId: z.string().min(1).max(200),
  /** The state being acknowledged. Sent back so a stale tab cannot silence a newer failure. */
  signature: z.string().min(1).max(400),
  acknowledged: z.boolean().default(true),
})

/**
 * POST - acknowledge or un-acknowledge an alert.
 *
 * This used to parse the body, do nothing, and return `{ success: true }`, so
 * the button reported success and the alert came back on the next poll. The
 * acknowledgement is now a document, and GET reads it back.
 */
export const POST = withPermission(PERMISSIONS.MANAGE_SETTINGS, async (request, context) => {
  try {
    const parsed = acknowledgeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "alertId and signature are required" },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Acknowledgements are unavailable: database not initialised" },
        { status: 503 }
      )
    }

    const { alertId, signature, acknowledged } = parsed.data
    const doc = adminDb.collection(ACK_COLLECTION).doc(alertId)

    if (acknowledged) {
      const record: StoredAcknowledgement = {
        signature,
        acknowledgedBy: context.userId,
        acknowledgedAt: new Date().toISOString(),
      }
      await doc.set(record)
    } else {
      await doc.delete()
    }

    await logAdminAction(context, acknowledged ? "acknowledge_health_alert" : "unacknowledge_health_alert", {
      alertId,
      signature,
    })

    return NextResponse.json({ success: true, alertId, acknowledged })
  } catch (error) {
    logger.error("Failed to acknowledge health alert", { error })
    return NextResponse.json(
      { success: false, error: "Failed to acknowledge alert" },
      { status: 500 }
    )
  }
})
