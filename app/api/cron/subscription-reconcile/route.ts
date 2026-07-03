/**
 * Subscription reconciliation cron — upgrade recovery (chore #2 / webhook safety net)
 *
 * If a paid checkout's webhook failed AND its retry failed AND the user never re-triggered a client
 * sync, they can be stuck on Free despite paying. This finds Free-tier profiles that carry a
 * `stripe_subscription_id` (i.e. they paid) and re-syncs each from Stripe, which upgrades them to Pro
 * when Stripe confirms an active subscription.
 *
 * SAFETY: deliberately scoped to `subscription_tier == "free"`. syncSubscriptionFromStripe only
 * DOWNGRADES when the profile is already `pro`, so these candidates can never be wrongly downgraded —
 * even during a Stripe outage, the worst case is "no recovery this run", never a mass downgrade. The
 * riskier stale-Pro-after-cancel reconciliation (which needs the downgrade branch guarded behind a
 * DEFINITIVE Stripe status, not merely "not found") is intentionally NOT done here and is deferred to
 * the /security-review (see docs/plans/technical-chores.md).
 *
 * Auth: Bearer CRON_SECRET (timing-safe). `?dryRun=true` counts candidates without syncing.
 */

import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { adminDb } from "@/lib/firebase-admin"
import { syncSubscriptionFromStripe } from "@/lib/stripe-helpers"
import { logger } from "@/lib/logger"

const cronLogger = logger.child({ service: "cron-subscription-reconcile" })
const CRON_SECRET = process.env.CRON_SECRET
const MAX_PER_RUN = 50

export async function GET(request: NextRequest) {
  try {
    if (!CRON_SECRET) {
      cronLogger.error("CRON_SECRET not configured")
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
    }
    const expectedToken = `Bearer ${CRON_SECRET}`
    const headerValue = request.headers.get("authorization") || ""
    const isValid =
      headerValue.length === expectedToken.length &&
      timingSafeEqual(Buffer.from(headerValue), Buffer.from(expectedToken))
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dryRun = new URL(request.url).searchParams.get("dryRun") === "true"

    // Free-tier profiles that carry a Stripe subscription id = paid but possibly stuck on Free.
    // Never Pro users, so no downgrade can ever happen from this job.
    const snapshot = await adminDb
      .collection("profiles")
      .where("subscription_tier", "==", "free")
      .where("stripe_subscription_id", "!=", null)
      .limit(MAX_PER_RUN)
      .get()

    let recovered = 0
    let checked = 0
    for (const doc of snapshot.docs) {
      checked++
      if (dryRun) continue
      try {
        const updated = await syncSubscriptionFromStripe(doc.id)
        if (updated?.subscription_tier === "pro") {
          recovered++
          cronLogger.info("Recovered a paid user stuck on Free back to Pro", { userId: doc.id })
        }
      } catch (error) {
        // A single user's sync failure must not abort the batch or downgrade anyone.
        cronLogger.error("Reconcile sync failed for user", { userId: doc.id, error })
      }
    }

    const result = {
      candidates: snapshot.size,
      checked,
      recovered: dryRun ? 0 : recovered,
      wouldCheck: dryRun ? checked : undefined,
      dryRun,
    }
    cronLogger.info("Subscription reconciliation completed", result)
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    cronLogger.error("Fatal error in subscription reconcile cron", { error })
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
