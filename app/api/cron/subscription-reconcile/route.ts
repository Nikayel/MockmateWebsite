/**
 * Subscription reconciliation cron — upgrade recovery (chore #2 / webhook safety net)
 *
 * If a paid checkout's webhook failed AND its retry failed AND the user never re-triggered a client
 * sync, they can be stuck on Free despite paying. This sweeps for those users and restores access.
 *
 * Three passes, because monthly and yearly leave completely different traces in Firestore:
 *
 *   1. MONTHLY — Free profiles carrying a `stripe_subscription_id`, re-synced from the subscription.
 *   2. YEARLY, already labelled — Free profiles whose `subscription_type` is "yearly" (so the
 *      webhook did land at some point and the entitlement was lost later).
 *   3. YEARLY, never labelled — the case that actually strands people. A yearly purchase is a
 *      one-time payment: it creates no subscription, and `subscription_type` is written ONLY by the
 *      webhook, so a buyer whose webhook never ran has NEITHER field. The only thing linking them to
 *      their money is the `stripe_customer_id` that /api/create-checkout stores before redirecting,
 *      so pass 3 scans on that and asks Stripe for a redeemable checkout session.
 *
 * SAFETY: every pass is scoped to `subscription_tier == "free"` and both recovery functions only
 * ever grant. syncSubscriptionFromStripe downgrades only when the profile is already `pro`, and
 * recoverYearlyProFromRecentCheckout returns early unless the profile is `free`. So even during a
 * Stripe outage the worst case is "no recovery this run", never a mass downgrade. The riskier
 * stale-Pro-after-cancel reconciliation (which needs the downgrade branch guarded behind a
 * DEFINITIVE Stripe status, not merely "not found") is intentionally NOT done here and is deferred
 * to the /security-review (see docs/plans/technical-chores.md).
 *
 * INDEXES: passes 1 and 2 are served by existing composite indexes in firestore.indexes.json
 * (subscription_tier + stripe_subscription_id, and subscription_tier + subscription_type + ...).
 * Pass 3 deliberately filters on a SINGLE field so Firestore's automatic index serves it and this
 * job cannot break on an undeployed composite; the tier filter is applied in memory instead.
 *
 * Auth: Bearer CRON_SECRET (timing-safe). `?dryRun=true` counts candidates without syncing.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { adminDb } from "@/lib/firebase-admin"
import {
  recoverYearlyProFromRecentCheckout,
  syncSubscriptionFromStripe,
} from "@/lib/stripe-helpers"
import { logger } from "@/lib/logger"

const cronLogger = logger.child({ service: "cron-subscription-reconcile" })
const MAX_PER_RUN = 50

/**
 * Pass 3 reads more documents than it will act on (every profile that ever reached Stripe checkout,
 * including churned monthly users) and narrows them in memory, so it scans a wider window than the
 * per-run recovery cap. Recovery attempts are still capped at MAX_PER_RUN.
 *
 * At this population size a single window covers everyone. If the churned-customer set ever outgrows
 * it, the fix is a (subscription_tier, stripe_customer_id) composite index plus a cursor, not a
 * bigger number here: an unordered limit always returns the same leading documents.
 */
const CUSTOMER_SCAN_LIMIT = 300

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

    // Pass 1 — monthly. Free-tier profiles that carry a Stripe subscription id = paid but possibly
    // stuck on Free. Never Pro users, so no downgrade can ever happen from this job.
    const monthlyCandidates = await collectCandidates("monthly", () =>
      adminDb
        .collection("profiles")
        .where("subscription_tier", "==", "free")
        .where("stripe_subscription_id", "!=", null)
        .limit(MAX_PER_RUN)
        .get()
    )

    // Pass 2 — yearly buyers the webhook labelled before their entitlement was lost.
    const labelledYearlyCandidates = await collectCandidates("yearly-labelled", () =>
      adminDb
        .collection("profiles")
        .where("subscription_tier", "==", "free")
        .where("subscription_type", "==", "yearly")
        .limit(MAX_PER_RUN)
        .get()
    )

    // Pass 3 — yearly buyers with no label at all, found by their Stripe customer id.
    const unlabelledYearlyCandidates = await collectCandidates("yearly-unlabelled", async () => {
      const snapshot = await adminDb
        .collection("profiles")
        .where("stripe_customer_id", "!=", null)
        .limit(CUSTOMER_SCAN_LIMIT)
        .get()
      // Narrow in memory: only Free users, and only those pass 1 will not already handle.
      return {
        docs: snapshot.docs.filter(
          (doc) => doc.get("subscription_tier") === "free" && !doc.get("stripe_subscription_id")
        ),
      }
    })

    const monthlyIds = new Set(monthlyCandidates)
    // A user reachable by their subscription id is a monthly case; pass 1 owns them.
    const yearlyIds = new Set(
      [...labelledYearlyCandidates, ...unlabelledYearlyCandidates].filter(
        (userId) => !monthlyIds.has(userId)
      )
    )

    let recovered = 0
    let checked = 0

    for (const userId of monthlyIds) {
      checked++
      if (dryRun) continue
      try {
        const updated = await syncSubscriptionFromStripe(userId)
        if (updated?.subscription_tier === "pro") {
          recovered++
          cronLogger.info("Recovered a paid user stuck on Free back to Pro", { userId })
        }
      } catch (error) {
        // A single user's sync failure must not abort the batch or downgrade anyone.
        cronLogger.error("Reconcile sync failed for user", { userId, error })
      }
    }

    for (const userId of [...yearlyIds].slice(0, MAX_PER_RUN)) {
      checked++
      if (dryRun) continue
      try {
        const outcome = await recoverYearlyProFromRecentCheckout(userId)
        if (outcome.status === "granted") {
          recovered++
          cronLogger.info("Recovered a yearly buyer stranded on Free by a failed webhook", {
            userId,
            periodEnd: outcome.periodEnd,
          })
        }
      } catch (error) {
        cronLogger.error("Yearly reconcile failed for user", { userId, error })
      }
    }

    const result = {
      candidates: monthlyIds.size + yearlyIds.size,
      monthlyCandidates: monthlyIds.size,
      yearlyCandidates: yearlyIds.size,
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

/**
 * Run one candidate query and return its user ids. A pass that fails (most likely an undeployed
 * composite index) must not take the other passes down with it: this job is the last safety net
 * under a customer who has already been charged.
 */
async function collectCandidates(
  pass: string,
  runQuery: () => Promise<{ docs: Array<{ id: string }> }>
): Promise<string[]> {
  try {
    const snapshot = await runQuery()
    return snapshot.docs.map((doc) => doc.id)
  } catch (error) {
    cronLogger.error("Reconcile candidate query failed", { pass, error })
    return []
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
