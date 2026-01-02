/**
 * Admin Revenue API
 *
 * Returns accurate revenue metrics from actual Stripe payments.
 * Uses payment_history collection (populated by webhooks) and can optionally
 * fetch live data from Stripe.
 *
 * GET /api/admin/revenue
 * Query params:
 * - timeRange: '7d' | '30d' | '90d' | 'all'
 * - live: 'true' to fetch fresh data from Stripe (slower)
 *
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminAccess, parseAdminQueryParams } from '@/lib/admin/middleware'
import { adminCache, getCacheKey, CACHE_TTL } from '@/lib/admin/cache'
import { getMonthlyPrice, getAnnualPrice } from '@/lib/pricing'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-10-29.clover' })
  : null

interface RevenueMetrics {
  // Actual revenue from payments
  actual: {
    total_collected: number // Total collected in time range
    mrr_equivalent: number // Estimated MRR from actual payments
    refunds: number
    net_revenue: number
  }
  // Calculated revenue (for comparison)
  calculated: {
    mrr: number // Based on subscriber counts
    arr: number
  }
  // Breakdown by subscription type
  byType: {
    monthly: {
      subscribers: number
      revenue: number
      avgPayment: number
    }
    yearly: {
      subscribers: number
      revenue: number
      avgPayment: number
      mrrEquivalent: number
    }
  }
  // Payments with discounts
  discounts: {
    paymentsWithDiscount: number
    totalDiscountAmount: number
    avgDiscountPercent: number
  }
  // Recent payments
  recentPayments: Array<{
    id: string
    user_id: string
    amount: number
    currency: string
    type: 'subscription' | 'one_time'
    status: string
    description?: string
    created_at: string
  }>
  // Time series for charts
  timeSeries: Array<{
    date: string
    revenue: number
    payments: number
    refunds: number
  }>
}

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
    const { timeRange, startDate } = parseAdminQueryParams(request)
    const fetchLive = searchParams.get('live') === 'true'

    // Check cache (skip if fetching live data)
    const cacheKey = getCacheKey('revenue', { timeRange })
    if (!fetchLive) {
      const cached = adminCache.get<any>(cacheKey)
      if (cached) {
        return NextResponse.json({ ...cached, cached: true })
      }
    }

    // Fetch payment history from Firestore
    let paymentsQuery = adminDb.collection('payment_history')
    if (startDate) {
      paymentsQuery = paymentsQuery.where('created_at', '>=', startDate.toISOString()) as any
    }
    const paymentsSnapshot = await paymentsQuery.orderBy('created_at', 'desc').get()

    // Fetch profiles to count subscribers by type
    const profilesSnapshot = await adminDb.collection('profiles').get()

    // Calculate subscriber breakdown
    const subscribersByType = {
      monthly: { count: 0, totalRevenue: 0 },
      yearly: { count: 0, totalRevenue: 0 },
    }

    profilesSnapshot.docs.forEach((doc) => {
      const profile = doc.data()
      if (profile.subscription_tier === 'pro' && profile.subscription_status === 'active') {
        if (profile.subscription_type === 'yearly') {
          subscribersByType.yearly.count++
        } else {
          subscribersByType.monthly.count++
        }
      }
    })

    // Process payment history
    let totalCollected = 0
    let totalRefunds = 0
    let paymentsWithDiscount = 0
    let totalDiscountAmount = 0

    const monthlyPayments: number[] = []
    const yearlyPayments: number[] = []
    const recentPayments: RevenueMetrics['recentPayments'] = []
    const dailyRevenue: Record<string, { revenue: number; payments: number; refunds: number }> = {}

    paymentsSnapshot.docs.forEach((doc) => {
      const payment = doc.data()
      const amountInDollars = (payment.amount || 0) / 100

      // Track by date
      const dateKey = payment.created_at?.split('T')[0] || 'unknown'
      if (!dailyRevenue[dateKey]) {
        dailyRevenue[dateKey] = { revenue: 0, payments: 0, refunds: 0 }
      }

      if (payment.status === 'succeeded') {
        totalCollected += amountInDollars
        dailyRevenue[dateKey].revenue += amountInDollars
        dailyRevenue[dateKey].payments++

        // Track by type
        if (payment.type === 'one_time' || payment.description?.toLowerCase().includes('yearly')) {
          yearlyPayments.push(amountInDollars)
          subscribersByType.yearly.totalRevenue += amountInDollars
        } else {
          monthlyPayments.push(amountInDollars)
          subscribersByType.monthly.totalRevenue += amountInDollars
        }

        // Check for discounts (if payment is less than standard price)
        const expectedMonthly = getMonthlyPrice('pro')
        const expectedYearly = getAnnualPrice('pro')
        if (payment.type === 'subscription' && amountInDollars < expectedMonthly && amountInDollars > 0) {
          paymentsWithDiscount++
          totalDiscountAmount += expectedMonthly - amountInDollars
        } else if (payment.type === 'one_time' && amountInDollars < expectedYearly && amountInDollars > 0) {
          paymentsWithDiscount++
          totalDiscountAmount += expectedYearly - amountInDollars
        }
      } else if (payment.status === 'refunded') {
        totalRefunds += Math.abs(amountInDollars)
        dailyRevenue[dateKey].refunds += Math.abs(amountInDollars)
      }

      // Add to recent payments (first 50)
      if (recentPayments.length < 50) {
        recentPayments.push({
          id: doc.id,
          user_id: payment.user_id,
          amount: amountInDollars,
          currency: payment.currency || 'usd',
          type: payment.type,
          status: payment.status,
          description: payment.description,
          created_at: payment.created_at,
        })
      }
    })

    // Calculate MRR equivalent from actual payments
    // Monthly payments contribute directly
    // Yearly payments contribute 1/12 per month
    const monthlyMRR = subscribersByType.monthly.count * getMonthlyPrice('pro')
    const yearlyMRREquivalent = (subscribersByType.yearly.totalRevenue / 12) || 0

    // Calculate averages
    const avgMonthlyPayment = monthlyPayments.length > 0
      ? monthlyPayments.reduce((a, b) => a + b, 0) / monthlyPayments.length
      : 0
    const avgYearlyPayment = yearlyPayments.length > 0
      ? yearlyPayments.reduce((a, b) => a + b, 0) / yearlyPayments.length
      : 0
    const avgDiscountPercent = paymentsWithDiscount > 0
      ? (totalDiscountAmount / paymentsWithDiscount) / getMonthlyPrice('pro') * 100
      : 0

    // Create time series
    const timeSeries = Object.entries(dailyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        payments: data.payments,
        refunds: Math.round(data.refunds * 100) / 100,
      }))

    // Calculated revenue (for comparison)
    const tierCounts = { free: 0, pro: 0, enterprise: 0 }
    profilesSnapshot.docs.forEach((doc) => {
      const tier = doc.data().subscription_tier || 'free'
      if (tier in tierCounts) {
        tierCounts[tier as keyof typeof tierCounts]++
      }
    })

    const calculatedMRR = tierCounts.pro * getMonthlyPrice('pro') +
      tierCounts.enterprise * getMonthlyPrice('enterprise')

    // Optionally fetch live data from Stripe
    let stripeData = null
    if (fetchLive && stripe) {
      try {
        const now = Math.floor(Date.now() / 1000)
        const rangeStart = startDate ? Math.floor(startDate.getTime() / 1000) : now - 30 * 24 * 60 * 60

        // Get balance
        const balance = await stripe.balance.retrieve()

        // Get recent charges
        const charges = await stripe.charges.list({
          created: { gte: rangeStart },
          limit: 100,
        })

        let stripeTotal = 0
        let stripeRefunds = 0
        charges.data.forEach((charge) => {
          if (charge.status === 'succeeded') {
            stripeTotal += charge.amount
          }
          if (charge.refunded) {
            stripeRefunds += charge.amount_refunded
          }
        })

        stripeData = {
          available: balance.available.reduce((sum, b) => sum + b.amount, 0) / 100,
          pending: balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100,
          totalCharges: stripeTotal / 100,
          totalRefunds: stripeRefunds / 100,
          chargeCount: charges.data.length,
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe data:', stripeError)
      }
    }

    const response = {
      success: true,
      timeRange,
      metrics: {
        actual: {
          total_collected: Math.round(totalCollected * 100) / 100,
          mrr_equivalent: Math.round((monthlyMRR + yearlyMRREquivalent) * 100) / 100,
          refunds: Math.round(totalRefunds * 100) / 100,
          net_revenue: Math.round((totalCollected - totalRefunds) * 100) / 100,
        },
        calculated: {
          mrr: calculatedMRR,
          arr: calculatedMRR * 12,
        },
        byType: {
          monthly: {
            subscribers: subscribersByType.monthly.count,
            revenue: Math.round(subscribersByType.monthly.totalRevenue * 100) / 100,
            avgPayment: Math.round(avgMonthlyPayment * 100) / 100,
          },
          yearly: {
            subscribers: subscribersByType.yearly.count,
            revenue: Math.round(subscribersByType.yearly.totalRevenue * 100) / 100,
            avgPayment: Math.round(avgYearlyPayment * 100) / 100,
            mrrEquivalent: Math.round(yearlyMRREquivalent * 100) / 100,
          },
        },
        discounts: {
          paymentsWithDiscount,
          totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
          avgDiscountPercent: Math.round(avgDiscountPercent * 10) / 10,
        },
        recentPayments,
        timeSeries,
        stripe: stripeData,
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
