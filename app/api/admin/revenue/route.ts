/**
 * Admin Revenue API
 *
 * Two different kinds of number live here, and the response keeps them apart:
 *
 * - Point in time: how much recurring revenue the subscriptions billing us
 *   today represent. This does NOT move with the time picker. It used to: MRR
 *   was headcount times list price plus (range-limited yearly revenue) / 12, so
 *   switching from 90d to 7d "lowered MRR".
 * - Windowed: money that actually moved inside the selected range, read from
 *   the payment_history collection the Stripe webhook writes.
 *
 * Money is handled in cents end to end and converted once, at the response
 * boundary, because payment_history stores cents and refunds as negative cents.
 *
 * GET /api/admin/revenue
 * Query params:
 * - timeRange: '7d' | '30d' | '90d' | 'all'
 * - live: 'true' to also fetch fresh charge totals from Stripe (slower)
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminAccess, parseAdminQueryParams } from '@/lib/admin/middleware'
import { adminCache, getCacheKey, CACHE_TTL } from '@/lib/admin/cache'
import { countBillingSubscriptions } from '@/lib/admin/subscription-state'
import {
  buildRevenueTimeSeries,
  centsToDollars,
  computeArrCents,
  computeMrrCents,
  summarizePaymentWindow,
  summarizeStripeCharges,
  type PaymentRecordInput,
} from '@/lib/admin/revenue-metrics'
import { describeWindow } from '@/lib/admin/funnel-metrics'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-12-15.clover' as any })
  : null

/** Plain-language provenance rendered next to each block, so no figure appears unsourced. */
const PROVENANCE = {
  recurring:
    'Point in time. Subscriptions billing us today, priced from the live list prices. Does not move with the range selector.',
  collected: 'Firestore payment_history, written by the Stripe webhook. Amounts stored in cents.',
  stripe: 'Live Stripe API. Charges created inside the range, all pages fetched.',
} as const

/** Hard ceiling on charges pulled from Stripe in one request, so the route cannot run away. */
const MAX_STRIPE_CHARGES = 1000

export async function GET(request: NextRequest) {
  try {
    // Verify Admin SDK is initialized
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK not initialized.' },
        { status: 500 }
      )
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status || 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const { timeRange, startDate, endDate } = parseAdminQueryParams(request)
    const fetchLive = searchParams.get('live') === 'true'

    // Check cache (skip if fetching live data)
    const cacheKey = getCacheKey('revenue', { timeRange })
    if (!fetchLive) {
      const cached = adminCache.get<unknown>(cacheKey)
      if (cached) {
        return NextResponse.json({ ...(cached as object), cached: true })
      }
    }

    // Payments inside the selected window.
    let paymentsQuery: FirebaseFirestore.Query = adminDb.collection('payment_history')
    if (startDate) {
      paymentsQuery = paymentsQuery.where('created_at', '>=', startDate.toISOString())
    }
    const paymentsSnapshot = await paymentsQuery.orderBy('created_at', 'desc').get()
    const payments = paymentsSnapshot.docs.map((doc) => doc.data() as PaymentRecordInput)

    // Subscriptions billing us right now. Not scoped to the window, because no
    // date picker can change who is paying today.
    const profilesSnapshot = await adminDb.collection('profiles').get()
    const subscriptions = countBillingSubscriptions(
      profilesSnapshot.docs.map((doc) => {
        const profile = doc.data()
        return {
          userId: doc.id,
          subscription_tier: profile.subscription_tier,
          subscription_status: profile.subscription_status,
          subscription_type: profile.subscription_type,
        }
      })
    )
    const mrr = computeMrrCents(subscriptions)

    const collected = summarizePaymentWindow(payments)

    // Payments split by what the webhook recorded them as. `one_time` is what a
    // yearly checkout writes. The old split also sniffed the description string
    // for the word "yearly", which classified refund and proration rows by
    // whatever text Stripe happened to send.
    const monthlyPayments = summarizePaymentWindow(
      payments.filter((payment) => payment.type === 'subscription')
    )
    const yearlyPayments = summarizePaymentWindow(
      payments.filter((payment) => payment.type === 'one_time')
    )

    // There is deliberately no "discounts applied" block. It used to infer a
    // discount from any payment below list price and report the shortfall as a
    // discount amount, which counted prorations, partial periods, currency
    // differences, and plan changes as discounts. payment_history stores no
    // coupon or discount field, so the platform does not measure this. Stripe
    // does, and the dashboard link below goes there.

    const timeSeries = buildRevenueTimeSeries(payments).map((point) => ({
      date: point.date,
      revenue: centsToDollars(point.revenueCents),
      payments: point.payments,
      refunds: centsToDollars(point.refundsCents),
    }))

    const recentPayments = paymentsSnapshot.docs.slice(0, 50).map((doc) => {
      const payment = doc.data()
      return {
        id: doc.id,
        user_id: typeof payment.user_id === 'string' ? payment.user_id : '',
        amount: centsToDollars(typeof payment.amount === 'number' ? payment.amount : 0),
        currency: typeof payment.currency === 'string' ? payment.currency : 'usd',
        type: payment.type,
        status: payment.status,
        description: payment.description,
        created_at: payment.created_at,
      }
    })

    // Optionally fetch live data from Stripe
    let stripeData: {
      available: number
      pending: number
      totalCharges: number
      refundedAgainstTheseCharges: number
      chargeCount: number
      truncated: boolean
    } | null = null
    if (fetchLive && stripe) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const rangeStart = startDate ? Math.floor(startDate.getTime() / 1000) : now - 30 * 24 * 60 * 60

        const balance = await stripe.balance.retrieve()

        // Every page inside the range, not the first hundred charges. The old
        // call passed limit:100 with no pagination, so a busy range silently
        // reported a fraction of itself as the total.
        const charges = await stripe.charges
          .list({ created: { gte: rangeStart }, limit: 100 })
          .autoPagingToArray({ limit: MAX_STRIPE_CHARGES })

        const chargeSummary = summarizeStripeCharges(charges)

        stripeData = {
          available: centsToDollars(balance.available.reduce((sum, b) => sum + b.amount, 0)),
          pending: centsToDollars(balance.pending.reduce((sum, b) => sum + b.amount, 0)),
          totalCharges: centsToDollars(chargeSummary.collectedCents),
          // Named for what it is: refunds booked against charges created in the
          // range, whenever the refund itself happened. It is not "refunds in
          // the range", and calling it that was the bug.
          refundedAgainstTheseCharges: centsToDollars(
            chargeSummary.refundedAgainstTheseChargesCents
          ),
          chargeCount: chargeSummary.chargeCount,
          truncated: chargeSummary.chargeCount >= MAX_STRIPE_CHARGES,
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError)
      }
    }

    const response = {
      success: true,
      timeRange,
      metrics: {
        window: {
          timeRange,
          label: describeWindow(timeRange),
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate.toISOString(),
        },
        // Point in time. Independent of `window` above by construction.
        recurring: {
          mrr: centsToDollars(mrr.total),
          arr: centsToDollars(computeArrCents(mrr.total)),
          breakdown: {
            proMonthly: centsToDollars(mrr.proMonthly),
            proYearly: centsToDollars(mrr.proYearly),
            enterprise: centsToDollars(mrr.enterprise),
          },
          subscriptions,
        },
        // Money that moved inside `window`.
        collected: {
          total: centsToDollars(collected.collectedCents),
          refunds: centsToDollars(collected.refundedCents),
          net: centsToDollars(collected.netCents),
          paymentCount: collected.succeededCount,
          refundCount: collected.refundedCount,
          refundShareOfEventsPercent:
            Math.round(collected.refundShareOfEventsPercent * 10) / 10,
        },
        byType: {
          monthly: {
            collected: centsToDollars(monthlyPayments.collectedCents),
            paymentCount: monthlyPayments.succeededCount,
          },
          yearly: {
            collected: centsToDollars(yearlyPayments.collectedCents),
            paymentCount: yearlyPayments.succeededCount,
          },
        },
        recentPayments,
        timeSeries,
        stripe: stripeData,
        provenance: PROVENANCE,
      },
    }

    // Cache for 60 seconds
    adminCache.set(cacheKey, response, CACHE_TTL.REVENUE || 60)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Admin revenue API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
