/**
 * Admin Payments API
 *
 * Endpoints for monitoring payments, refunds, and webhook activity.
 *
 * Two scopes live here and the response keeps them apart. The totals are
 * aggregated across the whole `payment_history` collection; the tables show the
 * most recent records. They used to be the same thing: the route fetched 100
 * documents for its tables, summed those, and labelled the result "Total
 * Revenue", so the headline stopped growing once the hundred-and-first payment
 * arrived.
 *
 * `payment_history.amount` is in CENTS. `referral_rewards.amount` is in DOLLARS
 * (or in whole months for a credit). Only the first is converted below.
 */

import { NextRequest, NextResponse } from 'next/server'
import { AggregateField } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'
import {
  centsToDollars,
  summarizePaymentAggregates,
} from '@/lib/admin/revenue-metrics'

interface PaymentRecord {
  id: string
  userId: string
  userEmail?: string
  type: 'subscription' | 'one_time'
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'refunded'
  description?: string
  createdAt: string
}

interface WebhookEvent {
  id: string
  eventType: string
  processedAt: string
  eventId: string
}

interface VoidedReward {
  id: string
  referrerId: string
  referrerEmail: string
  referredUserId: string
  referredEmail: string
  type: 'signup_cash' | 'conversion_credit'
  amount: number
  voidedReason: string
  processedAt: string
}

/** All-time money, aggregated across the whole collection. Dollars. */
interface PaymentTotals {
  revenue: number
  refunds: number
  net: number
  paymentCount: number
  refundCount: number
  /** Share of payment events that were refunds, 0-100. Cannot exceed 100. */
  refundShareOfEventsPercent: number
}

interface PaymentStats {
  /** Every payment ever recorded. Not the sample in the tables below. */
  allTime: PaymentTotals
  /** How many documents fed the recent-activity tables. */
  recentSampleSize: number
  recentPayments: PaymentRecord[]
  recentRefunds: PaymentRecord[]
  recentWebhooks: WebhookEvent[]
  voidedRewards: VoidedReward[]
  provenance: {
    allTime: string
    recent: string
  }
}

/** How many recent documents the activity tables sample. */
const RECENT_PAYMENT_SAMPLE = 100

/**
 * GET /api/admin/payments
 *
 * Get payment statistics, refunds, and webhook activity
 */
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.VIEW_ANALYTICS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 403)
  }

  try {
    // All-time totals, computed by Firestore across every document rather than
    // by summing the page fetched below. Two aggregation queries cost the same
    // whether the collection holds a hundred payments or a million.
    const [succeededAggregate, refundedAggregate] = await Promise.all([
      adminDb
        .collection('payment_history')
        .where('status', '==', 'succeeded')
        .aggregate({
          total: AggregateField.sum('amount'),
          count: AggregateField.count(),
        })
        .get(),
      adminDb
        .collection('payment_history')
        .where('status', '==', 'refunded')
        .aggregate({
          total: AggregateField.sum('amount'),
          count: AggregateField.count(),
        })
        .get(),
    ])

    const totals = summarizePaymentAggregates({
      succeededTotalCents: succeededAggregate.data().total ?? 0,
      succeededCount: succeededAggregate.data().count ?? 0,
      refundedTotalCents: refundedAggregate.data().total ?? 0,
      refundedCount: refundedAggregate.data().count ?? 0,
    })

    const stats: PaymentStats = {
      allTime: {
        revenue: centsToDollars(totals.collectedCents),
        refunds: centsToDollars(totals.refundedCents),
        net: centsToDollars(totals.netCents),
        paymentCount: totals.succeededCount,
        refundCount: totals.refundedCount,
        refundShareOfEventsPercent: Math.round(totals.refundShareOfEventsPercent * 10) / 10,
      },
      recentSampleSize: 0,
      recentPayments: [],
      recentRefunds: [],
      recentWebhooks: [],
      voidedRewards: [],
      provenance: {
        allTime:
          'Firestore aggregation over the whole payment_history collection, written by the Stripe webhook. Amounts stored in cents.',
        recent: `The ${RECENT_PAYMENT_SAMPLE} most recent payment_history documents. A sample, not a total.`,
      },
    }

    // The most recent records, for the activity tables only.
    const paymentsSnapshot = await adminDb
      .collection('payment_history')
      .orderBy('created_at', 'desc')
      .limit(RECENT_PAYMENT_SAMPLE)
      .get()
    stats.recentSampleSize = paymentsSnapshot.size

    // Collect user IDs to fetch emails
    const userIds = new Set<string>()
    for (const doc of paymentsSnapshot.docs) {
      userIds.add(doc.data().user_id)
    }

    // Fetch user emails
    const userEmails = new Map<string, string>()
    const userPromises = Array.from(userIds).map(async (userId) => {
      const userDoc = await adminDb.collection('profiles').doc(userId).get()
      userEmails.set(userId, userDoc.data()?.email || 'Unknown')
    })
    await Promise.all(userPromises)

    // Fill the activity tables. Nothing here contributes to a total.
    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data()
      const amount = typeof data.amount === 'number' ? data.amount : 0

      const payment: PaymentRecord = {
        id: doc.id,
        userId: data.user_id,
        userEmail: userEmails.get(data.user_id),
        type: data.type,
        amount: centsToDollars(amount),
        currency: data.currency || 'usd',
        status: data.status,
        description: data.description,
        createdAt: data.created_at,
      }

      if (data.status === 'succeeded' && amount > 0) {
        if (stats.recentPayments.length < 20) {
          stats.recentPayments.push(payment)
        }
      } else if (data.status === 'refunded' || amount < 0) {
        if (stats.recentRefunds.length < 20) {
          stats.recentRefunds.push({
            ...payment,
            amount: Math.abs(payment.amount),
          })
        }
      }
    }

    // Get recent webhook events
    const webhooksSnapshot = await adminDb
      .collection('webhook_events')
      .orderBy('processed_at', 'desc')
      .limit(50)
      .get()

    stats.recentWebhooks = webhooksSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        eventType: data.event_type,
        processedAt: data.processed_at,
        eventId: data.event_id,
      }
    })

    // Get voided rewards (clawbacks)
    const voidedSnapshot = await adminDb
      .collection('referral_rewards')
      .where('status', '==', 'voided')
      .orderBy('processedAt', 'desc')
      .limit(20)
      .get()

    // Collect user IDs for voided rewards
    const voidedUserIds = new Set<string>()
    for (const doc of voidedSnapshot.docs) {
      const data = doc.data()
      voidedUserIds.add(data.referrerId)
      voidedUserIds.add(data.referredUserId)
    }

    // Fetch emails for voided reward users
    const voidedUserEmails = new Map<string, string>()
    const voidedUserPromises = Array.from(voidedUserIds).map(async (userId) => {
      if (!userEmails.has(userId)) {
        const userDoc = await adminDb.collection('profiles').doc(userId).get()
        voidedUserEmails.set(userId, userDoc.data()?.email || 'Unknown')
      } else {
        voidedUserEmails.set(userId, userEmails.get(userId)!)
      }
    })
    await Promise.all(voidedUserPromises)

    stats.voidedRewards = voidedSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        referrerId: data.referrerId,
        referrerEmail: voidedUserEmails.get(data.referrerId) || 'Unknown',
        referredUserId: data.referredUserId,
        referredEmail: voidedUserEmails.get(data.referredUserId) || 'Unknown',
        type: data.type,
        // Dollars for cash, whole months for a credit. Not cents; do not divide.
        amount: data.amount,
        voidedReason: data.voidedReason || 'Unknown',
        processedAt: data.processedAt?.toDate?.()?.toISOString() || '',
      }
    })

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('[Admin Payments API] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch payment data',
      500
    )
  }
}
