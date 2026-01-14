/**
 * Admin Payments API
 *
 * Endpoints for monitoring payments, refunds, and webhook activity.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import {
  requirePermission,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/admin/middleware'
import { PERMISSIONS } from '@/lib/admin/rbac'

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

interface PaymentStats {
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  paymentCount: number
  refundCount: number
  refundRate: number
  recentPayments: PaymentRecord[]
  recentRefunds: PaymentRecord[]
  recentWebhooks: WebhookEvent[]
  voidedRewards: VoidedReward[]
}

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
    const stats: PaymentStats = {
      totalRevenue: 0,
      totalRefunds: 0,
      netRevenue: 0,
      paymentCount: 0,
      refundCount: 0,
      refundRate: 0,
      recentPayments: [],
      recentRefunds: [],
      recentWebhooks: [],
      voidedRewards: [],
    }

    // Get payment history
    const paymentsSnapshot = await adminDb
      .collection('payment_history')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()

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

    // Process payments
    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data()
      const amount = data.amount || 0

      const payment: PaymentRecord = {
        id: doc.id,
        userId: data.user_id,
        userEmail: userEmails.get(data.user_id),
        type: data.type,
        amount: amount / 100, // Convert cents to dollars
        currency: data.currency || 'usd',
        status: data.status,
        description: data.description,
        createdAt: data.created_at,
      }

      if (data.status === 'succeeded' && amount > 0) {
        stats.totalRevenue += amount / 100
        stats.paymentCount++
        if (stats.recentPayments.length < 20) {
          stats.recentPayments.push(payment)
        }
      } else if (data.status === 'refunded' || amount < 0) {
        stats.totalRefunds += Math.abs(amount) / 100
        stats.refundCount++
        if (stats.recentRefunds.length < 20) {
          stats.recentRefunds.push({
            ...payment,
            amount: Math.abs(payment.amount),
          })
        }
      }
    }

    stats.netRevenue = stats.totalRevenue - stats.totalRefunds
    stats.refundRate = stats.paymentCount > 0
      ? (stats.refundCount / stats.paymentCount) * 100
      : 0

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
