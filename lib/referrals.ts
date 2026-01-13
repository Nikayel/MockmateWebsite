/**
 * Referral Tracking System
 *
 * Simple referral tracking to measure organic growth.
 * - Each user gets a unique 8-character referral code
 * - Track who referred who
 * - Calculate viral coefficient
 *
 * No rewards system - just tracking for now.
 */

import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from './logger'
import { customAlphabet } from 'nanoid'

// Generate URL-safe, easy-to-share referral codes
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

export interface ReferralRecord {
  referrerId: string
  referredUserId: string
  referralCode: string
  signupDate: Date
  convertedToPro: boolean
  convertedDate?: Date
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

    // Record the referral
    await adminDb.collection('referrals').add({
      referrerId,
      referredUserId,
      referralCode: referralCode.toUpperCase(),
      signupDate: FieldValue.serverTimestamp(),
      convertedToPro: false,
    })

    // Update referred user's profile
    await adminDb.collection('users').doc(referredUserId).update({
      referredBy: referrerId,
      referredByCode: referralCode.toUpperCase(),
      referredAt: FieldValue.serverTimestamp(),
    })

    // Increment referrer's count
    await adminDb.collection('users').doc(referrerId).update({
      referralCount: FieldValue.increment(1),
    })

    logger.info('Referral recorded', {
      referrerId,
      referredUserId,
      referralCode,
    })

    return true
  } catch (error) {
    logger.error('Failed to record referral', { error, referredUserId, referralCode })
    return false
  }
}

/**
 * Mark a referral as converted (when referred user upgrades to Pro)
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

    await doc.ref.update({
      convertedToPro: true,
      convertedDate: FieldValue.serverTimestamp(),
    })

    // Increment referrer's conversion count
    const referrerId = doc.data().referrerId
    await adminDb.collection('users').doc(referrerId).update({
      referralConversions: FieldValue.increment(1),
    })

    logger.info('Referral marked as converted', {
      referrerId,
      referredUserId,
    })
  } catch (error) {
    logger.error('Failed to mark referral converted', { error, referredUserId })
  }
}

/**
 * Get user's referral statistics
 */
export async function getUserReferralStats(userId: string): Promise<{
  referralCode: string
  referralCount: number
  conversions: number
  referredUsers: Array<{ signupDate: Date; converted: boolean }>
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
    }
  } catch (error) {
    logger.error('Failed to get user referral stats', { error, userId })
    return {
      referralCode: code,
      referralCount: 0,
      conversions: 0,
      referredUsers: [],
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
