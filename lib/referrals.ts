/**
 * Referral Tracking System
 *
 * Complete referral tracking with rewards:
 * - Each user gets a unique 8-character referral code
 * - Track who referred who
 * - Calculate viral coefficient
 *
 * REWARDS:
 * - $10 cash when someone signs up with your code (manual payout)
 * - 1 free month when your referral upgrades to Pro (Stripe credit)
 */

import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from './logger'
import { customAlphabet } from 'nanoid'

// Generate URL-safe, easy-to-share referral codes
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

// Reward amounts
const SIGNUP_REWARD_CASH = 10 // $10 per signup (manual payout)
const CONVERSION_REWARD_MONTHS = 1 // 1 free month when referral upgrades

export interface ReferralRecord {
  referrerId: string
  referredUserId: string
  referralCode: string
  signupDate: Date
  convertedToPro: boolean
  convertedDate?: Date
  // Reward tracking
  signupRewardAmount: number // $10
  signupRewardPaid: boolean
  signupRewardPaidAt?: Date
  conversionRewardCredited: boolean
  conversionRewardCreditedAt?: Date
}

export interface ReferralReward {
  id?: string
  referrerId: string
  referredUserId: string
  type: 'signup_cash' | 'conversion_credit'
  amount: number // $ for cash, months for credit
  status: 'pending' | 'paid' | 'credited' | 'expired'
  createdAt: Date
  processedAt?: Date
  processedBy?: string // Admin who processed it
  notes?: string
}

export interface ReferralStats {
  totalReferrals: number
  totalConversions: number // Referred users who upgraded to Pro
  conversionRate: number
  viralCoefficient: number // Average referrals per user
  topReferrers: Array<{
    userId: string
    email: string
    referralCount: number
    conversions: number
  }>
  referralsBySource: {
    organic: number // Direct signups (no referral)
    referred: number // Came through referral
  }
  weeklyTrend: Array<{
    week: string
    referrals: number
    conversions: number
  }>
}

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Check if user already has a code
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const existingCode = userDoc.data()?.referralCode

  if (existingCode) {
    return existingCode
  }

  // Generate new unique code
  let code = generateCode()
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    // Check if code already exists
    const existing = await adminDb
      .collection('users')
      .where('referralCode', '==', code)
      .limit(1)
      .get()

    if (existing.empty) break

    code = generateCode()
    attempts++
  }

  // Save code to user
  await adminDb.collection('users').doc(userId).update({
    referralCode: code,
    referralCodeCreatedAt: FieldValue.serverTimestamp(),
  })

  logger.info('Generated referral code', { userId, code })

  return code
}

/**
 * Get user's referral code (generate if doesn't exist)
 */
export async function getUserReferralCode(userId: string): Promise<string> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const existingCode = userDoc.data()?.referralCode

  if (existingCode) {
    return existingCode
  }

  return generateReferralCode(userId)
}

/**
 * Look up user by referral code
 */
export async function getUserByReferralCode(code: string): Promise<string | null> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .where('referralCode', '==', code.toUpperCase())
      .limit(1)
      .get()

    if (snapshot.empty) return null

    return snapshot.docs[0].id
  } catch (error) {
    logger.error('Failed to lookup referral code', { error, code })
    return null
  }
}

/**
 * Record a referral when a new user signs up with a referral code
 * Creates a $10 cash reward for the referrer (pending manual payout)
 */
export async function recordReferral(
  referredUserId: string,
  referralCode: string
): Promise<boolean> {
  try {
    // Find the referrer
    const referrerId = await getUserByReferralCode(referralCode)

    if (!referrerId) {
      logger.warn('Invalid referral code', { code: referralCode })
      return false
    }

    // Don't allow self-referrals
    if (referrerId === referredUserId) {
      logger.warn('Self-referral attempted', { userId: referredUserId })
      return false
    }

    // Check if this referral already exists
    const existing = await adminDb
      .collection('referrals')
      .where('referredUserId', '==', referredUserId)
      .limit(1)
      .get()

    if (!existing.empty) {
      logger.warn('User already has a referrer', { referredUserId })
      return false
    }

    // Record the referral with reward tracking
    const referralRef = await adminDb.collection('referrals').add({
      referrerId,
      referredUserId,
      referralCode: referralCode.toUpperCase(),
      signupDate: FieldValue.serverTimestamp(),
      convertedToPro: false,
      // Reward tracking
      signupRewardAmount: SIGNUP_REWARD_CASH,
      signupRewardPaid: false,
      conversionRewardCredited: false,
    })

    // Create the $10 signup reward (pending)
    await adminDb.collection('referral_rewards').add({
      referrerId,
      referredUserId,
      referralId: referralRef.id,
      type: 'signup_cash',
      amount: SIGNUP_REWARD_CASH,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update referred user's profile
    await adminDb.collection('users').doc(referredUserId).update({
      referredBy: referrerId,
      referredByCode: referralCode.toUpperCase(),
      referredAt: FieldValue.serverTimestamp(),
    })

    // Increment referrer's count and pending rewards
    await adminDb.collection('users').doc(referrerId).update({
      referralCount: FieldValue.increment(1),
      pendingCashRewards: FieldValue.increment(SIGNUP_REWARD_CASH),
    })

    logger.info('Referral recorded with $10 reward', {
      referrerId,
      referredUserId,
      referralCode,
      rewardAmount: SIGNUP_REWARD_CASH,
    })

    return true
  } catch (error) {
    logger.error('Failed to record referral', { error, referredUserId, referralCode })
    return false
  }
}

/**
 * Mark a referral as converted (when referred user upgrades to Pro)
 * Creates a free month credit reward for the referrer
 */
export async function markReferralConverted(referredUserId: string): Promise<void> {
  try {
    const snapshot = await adminDb
      .collection('referrals')
      .where('referredUserId', '==', referredUserId)
      .limit(1)
      .get()

    if (snapshot.empty) return

    const doc = snapshot.docs[0]
    if (doc.data().convertedToPro) return // Already marked

    const referrerId = doc.data().referrerId

    // Update the referral record
    await doc.ref.update({
      convertedToPro: true,
      convertedDate: FieldValue.serverTimestamp(),
    })

    // Create the free month credit reward (pending)
    // This will be applied when admin processes it, or auto-applied via Stripe
    await adminDb.collection('referral_rewards').add({
      referrerId,
      referredUserId,
      referralId: doc.id,
      type: 'conversion_credit',
      amount: CONVERSION_REWARD_MONTHS,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Increment referrer's conversion count and pending credits
    await adminDb.collection('users').doc(referrerId).update({
      referralConversions: FieldValue.increment(1),
      pendingFreeMonths: FieldValue.increment(CONVERSION_REWARD_MONTHS),
    })

    logger.info('Referral converted - free month credit created', {
      referrerId,
      referredUserId,
      creditMonths: CONVERSION_REWARD_MONTHS,
    })
  } catch (error) {
    logger.error('Failed to mark referral converted', { error, referredUserId })
  }
}

/**
 * Get pending rewards for admin to process
 */
export async function getPendingRewards(): Promise<{
  cashRewards: Array<ReferralReward & { referrerEmail: string; referredEmail: string }>
  creditRewards: Array<ReferralReward & { referrerEmail: string; referredEmail: string }>
  totals: { pendingCash: number; pendingCredits: number }
}> {
  const result = {
    cashRewards: [] as Array<ReferralReward & { referrerEmail: string; referredEmail: string }>,
    creditRewards: [] as Array<ReferralReward & { referrerEmail: string; referredEmail: string }>,
    totals: { pendingCash: 0, pendingCredits: 0 },
  }

  try {
    const pendingSnapshot = await adminDb
      .collection('referral_rewards')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get()

    for (const doc of pendingSnapshot.docs) {
      const data = doc.data()

      // Get user emails
      const [referrerDoc, referredDoc] = await Promise.all([
        adminDb.collection('users').doc(data.referrerId).get(),
        adminDb.collection('users').doc(data.referredUserId).get(),
      ])

      const reward = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        referrerEmail: referrerDoc.data()?.email || 'Unknown',
        referredEmail: referredDoc.data()?.email || 'Unknown',
      } as ReferralReward & { referrerEmail: string; referredEmail: string }

      if (data.type === 'signup_cash') {
        result.cashRewards.push(reward)
        result.totals.pendingCash += data.amount
      } else if (data.type === 'conversion_credit') {
        result.creditRewards.push(reward)
        result.totals.pendingCredits += data.amount
      }
    }
  } catch (error) {
    logger.error('Failed to get pending rewards', { error })
  }

  return result
}

/**
 * Mark a cash reward as paid (admin action)
 */
export async function markRewardPaid(
  rewardId: string,
  adminUserId: string,
  notes?: string
): Promise<boolean> {
  try {
    const rewardRef = adminDb.collection('referral_rewards').doc(rewardId)
    const rewardDoc = await rewardRef.get()

    if (!rewardDoc.exists) return false
    if (rewardDoc.data()?.status !== 'pending') return false

    const { referrerId, amount, type } = rewardDoc.data()!

    await rewardRef.update({
      status: type === 'signup_cash' ? 'paid' : 'credited',
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUserId,
      notes: notes || undefined,
    })

    // Update user's pending amount
    if (type === 'signup_cash') {
      await adminDb.collection('users').doc(referrerId).update({
        pendingCashRewards: FieldValue.increment(-amount),
        totalCashEarned: FieldValue.increment(amount),
      })
    } else {
      await adminDb.collection('users').doc(referrerId).update({
        pendingFreeMonths: FieldValue.increment(-amount),
        totalFreeMonthsEarned: FieldValue.increment(amount),
      })
    }

    logger.info('Reward marked as processed', {
      rewardId,
      type,
      amount,
      adminUserId,
    })

    return true
  } catch (error) {
    logger.error('Failed to mark reward paid', { error, rewardId })
    return false
  }
}

/**
 * Get user's referral statistics including rewards
 */
export async function getUserReferralStats(userId: string): Promise<{
  referralCode: string
  referralCount: number
  conversions: number
  referredUsers: Array<{ signupDate: Date; converted: boolean }>
  rewards: {
    pendingCash: number // $10 per signup, not yet paid
    totalCashEarned: number // Total paid out
    pendingFreeMonths: number // Free months not yet applied
    totalFreeMonthsEarned: number // Total free months credited
  }
}> {
  const code = await getUserReferralCode(userId)

  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    const referralsSnapshot = await adminDb
      .collection('referrals')
      .where('referrerId', '==', userId)
      .orderBy('signupDate', 'desc')
      .limit(50)
      .get()

    const referredUsers = referralsSnapshot.docs.map(doc => ({
      signupDate: doc.data().signupDate?.toDate() || new Date(),
      converted: doc.data().convertedToPro || false,
    }))

    return {
      referralCode: code,
      referralCount: userData?.referralCount || 0,
      conversions: userData?.referralConversions || 0,
      referredUsers,
      rewards: {
        pendingCash: userData?.pendingCashRewards || 0,
        totalCashEarned: userData?.totalCashEarned || 0,
        pendingFreeMonths: userData?.pendingFreeMonths || 0,
        totalFreeMonthsEarned: userData?.totalFreeMonthsEarned || 0,
      },
    }
  } catch (error) {
    logger.error('Failed to get user referral stats', { error, userId })
    return {
      referralCode: code,
      referralCount: 0,
      conversions: 0,
      referredUsers: [],
      rewards: {
        pendingCash: 0,
        totalCashEarned: 0,
        pendingFreeMonths: 0,
        totalFreeMonthsEarned: 0,
      },
    }
  }
}

/**
 * Get admin referral statistics
 */
export async function getReferralStats(): Promise<ReferralStats> {
  const stats: ReferralStats = {
    totalReferrals: 0,
    totalConversions: 0,
    conversionRate: 0,
    viralCoefficient: 0,
    topReferrers: [],
    referralsBySource: {
      organic: 0,
      referred: 0,
    },
    weeklyTrend: [],
  }

  try {
    // Get all referrals
    const referralsSnapshot = await adminDb
      .collection('referrals')
      .orderBy('signupDate', 'desc')
      .get()

    stats.totalReferrals = referralsSnapshot.size
    stats.totalConversions = referralsSnapshot.docs.filter(
      doc => doc.data().convertedToPro
    ).length

    if (stats.totalReferrals > 0) {
      stats.conversionRate = (stats.totalConversions / stats.totalReferrals) * 100
    }

    // Calculate weekly trend
    const weeklyMap = new Map<string, { referrals: number; conversions: number }>()
    const now = new Date()

    for (const doc of referralsSnapshot.docs) {
      const data = doc.data()
      const signupDate = data.signupDate?.toDate() || new Date()

      // Get week key (ISO week)
      const weekStart = new Date(signupDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { referrals: 0, conversions: 0 })
      }

      const week = weeklyMap.get(weekKey)!
      week.referrals++
      if (data.convertedToPro) week.conversions++
    }

    stats.weeklyTrend = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week.localeCompare(a.week))
      .slice(0, 12) // Last 12 weeks

    // Count organic vs referred signups
    const usersSnapshot = await adminDb.collection('users').get()
    const totalUsers = usersSnapshot.size

    stats.referralsBySource.referred = stats.totalReferrals
    stats.referralsBySource.organic = totalUsers - stats.totalReferrals

    // Calculate viral coefficient
    // Viral coefficient = (total referrals / total users)
    if (totalUsers > 0) {
      stats.viralCoefficient = stats.totalReferrals / totalUsers
    }

    // Get top referrers
    const referrerCounts = new Map<string, { count: number; conversions: number }>()

    for (const doc of referralsSnapshot.docs) {
      const referrerId = doc.data().referrerId
      const converted = doc.data().convertedToPro

      if (!referrerCounts.has(referrerId)) {
        referrerCounts.set(referrerId, { count: 0, conversions: 0 })
      }

      const referrer = referrerCounts.get(referrerId)!
      referrer.count++
      if (converted) referrer.conversions++
    }

    // Sort by count and get top 10
    const topReferrerIds = Array.from(referrerCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)

    // Fetch user details for top referrers
    for (const [userId, counts] of topReferrerIds) {
      const userDoc = await adminDb.collection('users').doc(userId).get()
      stats.topReferrers.push({
        userId,
        email: userDoc.data()?.email || 'Unknown',
        referralCount: counts.count,
        conversions: counts.conversions,
      })
    }

  } catch (error) {
    logger.error('Failed to get referral stats', { error })
  }

  return stats
}
