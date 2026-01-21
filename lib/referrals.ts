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
 *
 * ELIGIBILITY REQUIREMENTS:
 * - Referred user must complete at least 1 session before $10 is payable
 * - Account must be 7 days old before payout is processed
 * - Max 10 referrals per user per month
 * - Rewards expire after 90 days if not claimed
 * - Rewards voided if referred user refunds within 14 days
 *
 * TERMS:
 * - This is a beta program, we reserve the right to modify or terminate
 * - We may void rewards if fraud or abuse is detected
 * - Rewards are non-transferable
 */

import { adminDb } from "./firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { logger } from "./logger"
import { customAlphabet } from "nanoid"

// Generate URL-safe, easy-to-share referral codes
const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8)

// Reward amounts
const SIGNUP_REWARD_MONTHS = 1 // 1 free month per signup
const CONVERSION_REWARD_CASH = 10 // $10 when referral upgrades to Pro
const CONVERSION_REWARD_MONTHS = 1 // 1 extra free month when referral upgrades

// Eligibility & Limits
const MIN_SESSIONS_FOR_REWARD = 1 // Referred user must complete 1 session
const MIN_ACCOUNT_AGE_DAYS = 7 // Account must be 7 days old for payout
const MAX_REFERRALS_PER_MONTH = 10 // Cap referrals per user per month
const REWARD_EXPIRY_DAYS = 90 // Pending rewards expire after 90 days
const REFUND_CLAWBACK_DAYS = 14 // Void rewards if refund within 14 days

export interface ReferralRecord {
  referrerId: string
  referredUserId: string
  referralCode: string
  signupDate: Date
  convertedToPro: boolean
  convertedDate?: Date
  // Reward tracking
  signupRewardMonths: number // 1 free month on signup
  signupRewardCredited: boolean
  signupRewardCreditedAt?: Date
  conversionRewardCash: number // $10 on Pro upgrade
  conversionRewardCashPaid: boolean
  conversionRewardCashPaidAt?: Date
  conversionRewardMonths: number // 1 extra free month on Pro upgrade
  conversionRewardCredited: boolean
  conversionRewardCreditedAt?: Date
}

export interface ReferralReward {
  id?: string
  referrerId: string
  referredUserId: string
  type: "signup_credit" | "conversion_cash" | "conversion_credit"
  amount: number // $ for cash, months for credit
  status: "pending" | "paid" | "credited" | "expired" | "voided"
  createdAt: Date
  processedAt?: Date
  processedBy?: string // Admin who processed it
  notes?: string
  // Eligibility tracking
  eligibleAt?: Date // When reward becomes eligible for payout
  expiresAt?: Date // When reward expires if not claimed
  voidedReason?: string
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
 * Uses transaction to prevent race conditions when multiple requests
 * try to generate a code for the same user simultaneously
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Use transaction to ensure atomicity
  const code = await adminDb.runTransaction(async (transaction) => {
    // Check if user already has a code (inside transaction)
    const userRef = adminDb.collection("users").doc(userId)
    const userDoc = await transaction.get(userRef)
    const existingCode = userDoc.data()?.referralCode

    if (existingCode) {
      return existingCode
    }

    // Generate new unique code
    // Note: We generate multiple candidates and check uniqueness outside transaction
    // since we can't do collection queries inside a transaction easily
    let newCode = generateCode()
    let attempts = 0
    const maxAttempts = 10

    // Check code uniqueness (this is a read, acceptable before writes)
    while (attempts < maxAttempts) {
      const existing = await adminDb
        .collection("users")
        .where("referralCode", "==", newCode)
        .limit(1)
        .get()

      if (existing.empty) break

      newCode = generateCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique referral code after max attempts")
    }

    // Save code to user (use set with merge in case user doc doesn't exist yet)
    transaction.set(
      userRef,
      {
        referralCode: newCode,
        referralCodeCreatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    logger.info("Generated referral code", { userId, code: newCode })

    return newCode
  })

  return code
}

/**
 * Get user's referral code (generate if doesn't exist)
 */
export async function getUserReferralCode(userId: string): Promise<string> {
  const userDoc = await adminDb.collection("users").doc(userId).get()
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
      .collection("users")
      .where("referralCode", "==", code.toUpperCase())
      .limit(1)
      .get()

    if (snapshot.empty) return null

    return snapshot.docs[0].id
  } catch (error) {
    logger.error("Failed to lookup referral code", { error, code })
    return null
  }
}

/**
 * Record a referral when a new user signs up with a referral code
 * Creates a signup credit reward for the referrer (1 free month)
 *
 * Eligibility requirements:
 * - Referrer must not have hit monthly cap (10/month)
 * - Reward becomes eligible after 7 days
 * - Reward expires after 90 days
 *
 * Uses Firestore transaction for atomicity to prevent race conditions
 */
export async function recordReferral(
  referredUserId: string,
  referralCode: string
): Promise<boolean> {
  try {
    // Find the referrer (outside transaction - read-only lookup)
    const referrerId = await getUserByReferralCode(referralCode)

    if (!referrerId) {
      logger.warn("Invalid referral code", { code: referralCode })
      return false
    }

    // Don't allow self-referrals
    if (referrerId === referredUserId) {
      logger.warn("Self-referral attempted", { userId: referredUserId })
      return false
    }

    // Calculate eligibility and expiry dates (before transaction)
    const now = new Date()
    const eligibleAt = new Date(now.getTime() + MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000)
    const expiresAt = new Date(now.getTime() + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Use transaction to ensure atomicity of all writes
    const result = await adminDb.runTransaction(async (transaction) => {
      // Check if this referral already exists (inside transaction for consistency)
      const existingSnapshot = await transaction.get(
        adminDb.collection("referrals").where("referredUserId", "==", referredUserId).limit(1)
      )

      if (!existingSnapshot.empty) {
        logger.warn("User already has a referrer", { referredUserId })
        return { success: false, reason: "already_referred" }
      }

      // Check monthly referral cap (inside transaction)
      const monthlyReferrals = await transaction.get(
        adminDb
          .collection("referrals")
          .where("referrerId", "==", referrerId)
          .where("signupDate", ">=", startOfMonth)
      )

      if (monthlyReferrals.size >= MAX_REFERRALS_PER_MONTH) {
        logger.warn("Referrer has hit monthly cap", { referrerId, cap: MAX_REFERRALS_PER_MONTH })
        return { success: false, reason: "monthly_cap_reached" }
      }

      // Create referral record
      const referralRef = adminDb.collection("referrals").doc()
      transaction.set(referralRef, {
        referrerId,
        referredUserId,
        referralCode: referralCode.toUpperCase(),
        signupDate: FieldValue.serverTimestamp(),
        convertedToPro: false,
        // Reward tracking - 1 free month on signup
        signupRewardMonths: SIGNUP_REWARD_MONTHS,
        signupRewardCredited: false,
        // Conversion rewards (pending until they upgrade)
        conversionRewardCash: CONVERSION_REWARD_CASH,
        conversionRewardCashPaid: false,
        conversionRewardMonths: CONVERSION_REWARD_MONTHS,
        conversionRewardCredited: false,
      })

      // Create the signup credit reward (pending with eligibility dates)
      const rewardRef = adminDb.collection("referral_rewards").doc()
      transaction.set(rewardRef, {
        referrerId,
        referredUserId,
        referralId: referralRef.id,
        type: "signup_credit",
        amount: SIGNUP_REWARD_MONTHS,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        eligibleAt: eligibleAt,
        expiresAt: expiresAt,
      })

      // Update referred user's profile
      const referredUserRef = adminDb.collection("users").doc(referredUserId)
      transaction.set(
        referredUserRef,
        {
          referredBy: referrerId,
          referredByCode: referralCode.toUpperCase(),
          referredAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )

      // Increment referrer's count and pending rewards
      const referrerRef = adminDb.collection("users").doc(referrerId)
      transaction.set(
        referrerRef,
        {
          referralCount: FieldValue.increment(1),
          referralCountThisMonth: FieldValue.increment(1),
          pendingFreeMonths: FieldValue.increment(SIGNUP_REWARD_MONTHS),
        },
        { merge: true }
      )

      return { success: true, referralId: referralRef.id }
    })

    if (!result.success) {
      return false
    }

    logger.info("Referral recorded with signup credit reward", {
      referrerId,
      referredUserId,
      referralCode,
      rewardMonths: SIGNUP_REWARD_MONTHS,
    })

    return true
  } catch (error) {
    logger.error("Failed to record referral", { error, referredUserId, referralCode })
    return false
  }
}

/**
 * Mark a referral as converted (when referred user upgrades to Pro)
 * Creates $10 cash + 1 extra free month reward for the referrer
 *
 * Uses Firestore transaction for atomicity
 */
export async function markReferralConverted(referredUserId: string): Promise<void> {
  try {
    // First, find the referral (outside transaction since it's a query)
    const snapshot = await adminDb
      .collection("referrals")
      .where("referredUserId", "==", referredUserId)
      .limit(1)
      .get()

    if (snapshot.empty) return

    const referralDoc = snapshot.docs[0]
    const referralData = referralDoc.data()

    if (referralData.convertedToPro) return // Already marked

    const referrerId = referralData.referrerId
    const referralId = referralDoc.id

    // Calculate expiry date for rewards
    const now = new Date()
    const expiresAt = new Date(now.getTime() + REWARD_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    // Use transaction to ensure atomicity of all writes
    await adminDb.runTransaction(async (transaction) => {
      // Re-read the referral doc inside transaction to ensure it hasn't changed
      const referralRef = adminDb.collection("referrals").doc(referralId)
      const currentDoc = await transaction.get(referralRef)

      if (!currentDoc.exists || currentDoc.data()?.convertedToPro) {
        // Already converted or deleted - abort
        return
      }

      // Update the referral record
      transaction.update(referralRef, {
        convertedToPro: true,
        convertedDate: FieldValue.serverTimestamp(),
      })

      // Create the $10 cash reward (pending)
      const cashRewardRef = adminDb.collection("referral_rewards").doc()
      transaction.set(cashRewardRef, {
        referrerId,
        referredUserId,
        referralId,
        type: "conversion_cash",
        amount: CONVERSION_REWARD_CASH,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        eligibleAt: now, // Conversion rewards are immediately eligible
        expiresAt: expiresAt,
      })

      // Create the 1 extra free month credit reward (pending)
      const creditRewardRef = adminDb.collection("referral_rewards").doc()
      transaction.set(creditRewardRef, {
        referrerId,
        referredUserId,
        referralId,
        type: "conversion_credit",
        amount: CONVERSION_REWARD_MONTHS,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        eligibleAt: now,
        expiresAt: expiresAt,
      })

      // Increment referrer's conversion count, pending cash, and pending credits
      const referrerRef = adminDb.collection("users").doc(referrerId)
      transaction.set(
        referrerRef,
        {
          referralConversions: FieldValue.increment(1),
          pendingCashRewards: FieldValue.increment(CONVERSION_REWARD_CASH),
          pendingFreeMonths: FieldValue.increment(CONVERSION_REWARD_MONTHS),
        },
        { merge: true }
      )
    })

    logger.info("Referral converted - $10 cash + 1 free month created", {
      referrerId,
      referredUserId,
      cashReward: CONVERSION_REWARD_CASH,
      creditMonths: CONVERSION_REWARD_MONTHS,
    })
  } catch (error) {
    logger.error("Failed to mark referral converted", { error, referredUserId })
  }
}

/**
 * Void all rewards for a referred user (called on refund)
 * This is used for refund clawback within the clawback window
 */
export async function voidReferralRewards(referredUserId: string, reason: string): Promise<void> {
  try {
    // Find all rewards for this referred user
    const rewardsSnapshot = await adminDb
      .collection("referral_rewards")
      .where("referredUserId", "==", referredUserId)
      .where("status", "==", "pending")
      .get()

    if (rewardsSnapshot.empty) {
      logger.info("No pending rewards to void", { referredUserId })
      return
    }

    // Void each reward
    for (const doc of rewardsSnapshot.docs) {
      const data = doc.data()

      await doc.ref.update({
        status: "voided",
        voidedReason: reason,
        processedAt: FieldValue.serverTimestamp(),
      })

      // Decrement referrer's pending amounts based on reward type
      if (data.type === "signup_credit") {
        // Signup credits grant free months, tracked in pendingFreeMonths
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingFreeMonths: FieldValue.increment(-data.amount),
          })
      } else if (data.type === "conversion_cash") {
        // Conversion cash rewards are tracked in pendingCashRewards
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingCashRewards: FieldValue.increment(-data.amount),
          })
      } else if (data.type === "conversion_credit") {
        // Conversion credits grant free months
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingFreeMonths: FieldValue.increment(-data.amount),
          })
      }

      logger.info("Referral reward voided", {
        rewardId: doc.id,
        type: data.type,
        amount: data.amount,
        referrerId: data.referrerId,
        referredUserId,
        reason,
      })
    }
  } catch (error) {
    logger.error("Failed to void referral rewards", { error, referredUserId })
  }
}

/**
 * Void all pending conversion rewards for a referrer (called when referrer refunds)
 * This handles the case where a Pro user who referred others refunds their subscription.
 * We only void conversion rewards (not signup rewards) since signup rewards are for
 * the referrer's effort in getting someone to sign up, not dependent on referrer's Pro status.
 */
export async function voidReferrerConversionRewards(
  referrerId: string,
  reason: string
): Promise<void> {
  try {
    // Find all pending conversion rewards where this user is the referrer
    const rewardsSnapshot = await adminDb
      .collection("referral_rewards")
      .where("referrerId", "==", referrerId)
      .where("status", "==", "pending")
      .get()

    if (rewardsSnapshot.empty) {
      logger.info("No pending rewards to void for referrer", { referrerId })
      return
    }

    // Void each conversion reward (but keep signup rewards - those are earned)
    for (const doc of rewardsSnapshot.docs) {
      const data = doc.data()

      // Only void conversion rewards, not signup rewards
      // Signup rewards are earned by getting someone to sign up, regardless of referrer's status
      if (data.type !== "conversion_cash" && data.type !== "conversion_credit") {
        continue
      }

      await doc.ref.update({
        status: "voided",
        voidedReason: reason,
        processedAt: FieldValue.serverTimestamp(),
      })

      // Decrement referrer's pending amounts based on reward type
      if (data.type === "conversion_cash") {
        await adminDb
          .collection("users")
          .doc(referrerId)
          .update({
            pendingCashRewards: FieldValue.increment(-data.amount),
          })
      } else if (data.type === "conversion_credit") {
        await adminDb
          .collection("users")
          .doc(referrerId)
          .update({
            pendingFreeMonths: FieldValue.increment(-data.amount),
          })
      }

      logger.info("Referrer conversion reward voided", {
        rewardId: doc.id,
        type: data.type,
        amount: data.amount,
        referrerId,
        reason,
      })
    }
  } catch (error) {
    logger.error("Failed to void referrer conversion rewards", { error, referrerId })
  }
}

/**
 * Check if a reward is eligible for payout
 * Requirements:
 * - Account must be MIN_ACCOUNT_AGE_DAYS old
 * - Referred user must have completed MIN_SESSIONS_FOR_REWARD sessions
 * - Reward must not be expired
 */
export async function checkRewardEligibility(rewardId: string): Promise<{
  eligible: boolean
  reason?: string
}> {
  try {
    const rewardDoc = await adminDb.collection("referral_rewards").doc(rewardId).get()
    if (!rewardDoc.exists) {
      return { eligible: false, reason: "Reward not found" }
    }

    const data = rewardDoc.data()!
    const now = new Date()

    // Check if expired
    if (data.expiresAt && data.expiresAt.toDate() < now) {
      return { eligible: false, reason: "Reward has expired" }
    }

    // Check if eligible date has passed
    if (data.eligibleAt && data.eligibleAt.toDate() > now) {
      const daysRemaining = Math.ceil(
        (data.eligibleAt.toDate().getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      )
      return { eligible: false, reason: `${daysRemaining} days until eligible` }
    }

    // For signup credit rewards, check if referred user completed a session
    if (data.type === "signup_credit") {
      const sessionsSnapshot = await adminDb
        .collection("sessions")
        .where("userId", "==", data.referredUserId)
        .where("status", "==", "completed")
        .limit(MIN_SESSIONS_FOR_REWARD)
        .get()

      if (sessionsSnapshot.size < MIN_SESSIONS_FOR_REWARD) {
        return {
          eligible: false,
          reason: `Referred user needs ${MIN_SESSIONS_FOR_REWARD - sessionsSnapshot.size} more session(s)`,
        }
      }
    }

    return { eligible: true }
  } catch (error) {
    logger.error("Failed to check reward eligibility", { error, rewardId })
    return { eligible: false, reason: "Error checking eligibility" }
  }
}

/**
 * Expire old pending rewards (run periodically)
 */
export async function expireOldRewards(): Promise<number> {
  let expiredCount = 0

  try {
    const now = new Date()
    const expiredSnapshot = await adminDb
      .collection("referral_rewards")
      .where("status", "==", "pending")
      .where("expiresAt", "<", now)
      .get()

    for (const doc of expiredSnapshot.docs) {
      const data = doc.data()

      await doc.ref.update({
        status: "expired",
        processedAt: FieldValue.serverTimestamp(),
      })

      // Decrement referrer's pending amounts based on reward type
      if (data.type === "signup_credit") {
        // Signup credits grant free months
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingFreeMonths: FieldValue.increment(-data.amount),
          })
      } else if (data.type === "conversion_cash") {
        // Conversion cash rewards
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingCashRewards: FieldValue.increment(-data.amount),
          })
      } else if (data.type === "conversion_credit") {
        // Conversion credits grant free months
        await adminDb
          .collection("users")
          .doc(data.referrerId)
          .update({
            pendingFreeMonths: FieldValue.increment(-data.amount),
          })
      }

      expiredCount++
    }

    if (expiredCount > 0) {
      logger.info("Expired old referral rewards", { count: expiredCount })
    }
  } catch (error) {
    logger.error("Failed to expire old rewards", { error })
  }

  return expiredCount
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
      .collection("referral_rewards")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get()

    for (const doc of pendingSnapshot.docs) {
      const data = doc.data()

      // Get user emails
      const [referrerDoc, referredDoc] = await Promise.all([
        adminDb.collection("users").doc(data.referrerId).get(),
        adminDb.collection("users").doc(data.referredUserId).get(),
      ])

      const reward = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        referrerEmail: referrerDoc.data()?.email || "Unknown",
        referredEmail: referredDoc.data()?.email || "Unknown",
      } as ReferralReward & { referrerEmail: string; referredEmail: string }

      if (data.type === "conversion_cash") {
        result.cashRewards.push(reward)
        result.totals.pendingCash += data.amount
      } else if (data.type === "signup_credit" || data.type === "conversion_credit") {
        result.creditRewards.push(reward)
        result.totals.pendingCredits += data.amount
      }
    }
  } catch (error) {
    logger.error("Failed to get pending rewards", { error })
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
    const rewardRef = adminDb.collection("referral_rewards").doc(rewardId)
    const rewardDoc = await rewardRef.get()

    if (!rewardDoc.exists) return false
    if (rewardDoc.data()?.status !== "pending") return false

    const { referrerId, amount, type } = rewardDoc.data()!

    // Determine the new status based on reward type
    // - conversion_cash: "paid" (actual cash payout)
    // - signup_credit, conversion_credit: "credited" (free months applied)
    const newStatus = type === "conversion_cash" ? "paid" : "credited"

    await rewardRef.update({
      status: newStatus,
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUserId,
      notes: notes || undefined,
    })

    // Update user's pending and earned amounts based on reward type
    if (type === "conversion_cash") {
      // Cash rewards - decrement pending cash, increment earned cash
      await adminDb
        .collection("users")
        .doc(referrerId)
        .update({
          pendingCashRewards: FieldValue.increment(-amount),
          totalCashEarned: FieldValue.increment(amount),
        })
    } else {
      // Credit rewards (signup_credit, conversion_credit) - handle free months
      await adminDb
        .collection("users")
        .doc(referrerId)
        .update({
          pendingFreeMonths: FieldValue.increment(-amount),
          totalFreeMonthsEarned: FieldValue.increment(amount),
        })
    }

    logger.info("Reward marked as processed", {
      rewardId,
      type,
      amount,
      adminUserId,
    })

    return true
  } catch (error) {
    logger.error("Failed to mark reward paid", { error, rewardId })
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
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    const referralsSnapshot = await adminDb
      .collection("referrals")
      .where("referrerId", "==", userId)
      .orderBy("signupDate", "desc")
      .limit(50)
      .get()

    const referredUsers = referralsSnapshot.docs.map((doc) => ({
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
    logger.error("Failed to get user referral stats", { error, userId })
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

export interface DetailedReferral {
  id: string
  referrerEmail: string
  referrerId: string
  referredEmail: string
  referredUserId: string
  referralCode: string
  signupDate: Date
  convertedToPro: boolean
  convertedDate?: Date
  // Reward status
  signupRewardStatus: "pending" | "credited" // 1 free month on signup
  conversionRewardStatus: "pending" | "credited" | "n/a" // $10 + 1 month on Pro upgrade
}

/**
 * Get all referrals with detailed information for admin view
 */
export async function getAllReferralsDetailed(): Promise<DetailedReferral[]> {
  const referrals: DetailedReferral[] = []

  try {
    const referralsSnapshot = await adminDb
      .collection("referrals")
      .orderBy("signupDate", "desc")
      .limit(100)
      .get()

    // Get all rewards to check status
    const rewardsSnapshot = await adminDb.collection("referral_rewards").get()

    // Build a map of rewards by referral
    const rewardsByReferral = new Map<string, { signup: string; conversion: string }>()
    for (const doc of rewardsSnapshot.docs) {
      const data = doc.data()
      const referralId = data.referralId
      if (!rewardsByReferral.has(referralId)) {
        rewardsByReferral.set(referralId, { signup: "pending", conversion: "n/a" })
      }
      const entry = rewardsByReferral.get(referralId)!
      if (data.type === "signup_credit") {
        entry.signup = data.status === "credited" ? "credited" : "pending"
      } else if (data.type === "conversion_credit" || data.type === "conversion_cash") {
        // Mark conversion as credited if any conversion reward is processed
        if (data.status === "credited" || data.status === "paid") {
          entry.conversion = "credited"
        } else if (entry.conversion === "n/a") {
          entry.conversion = "pending"
        }
      }
    }

    // Collect unique user IDs
    const userIds = new Set<string>()
    for (const doc of referralsSnapshot.docs) {
      const data = doc.data()
      userIds.add(data.referrerId)
      userIds.add(data.referredUserId)
    }

    // Fetch all users in parallel
    const userEmails = new Map<string, string>()
    const userPromises = Array.from(userIds).map(async (userId) => {
      const userDoc = await adminDb.collection("users").doc(userId).get()
      userEmails.set(userId, userDoc.data()?.email || "Unknown")
    })
    await Promise.all(userPromises)

    // Build detailed referral list
    for (const doc of referralsSnapshot.docs) {
      const data = doc.data()
      const rewards = rewardsByReferral.get(doc.id) || { signup: "pending", conversion: "n/a" }

      referrals.push({
        id: doc.id,
        referrerEmail: userEmails.get(data.referrerId) || "Unknown",
        referrerId: data.referrerId,
        referredEmail: userEmails.get(data.referredUserId) || "Unknown",
        referredUserId: data.referredUserId,
        referralCode: data.referralCode,
        signupDate: data.signupDate?.toDate() || new Date(),
        convertedToPro: data.convertedToPro || false,
        convertedDate: data.convertedDate?.toDate(),
        signupRewardStatus: rewards.signup as "pending" | "credited",
        conversionRewardStatus: rewards.conversion as "pending" | "credited" | "n/a",
      })
    }
  } catch (error) {
    logger.error("Failed to get detailed referrals", { error })
  }

  return referrals
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
      .collection("referrals")
      .orderBy("signupDate", "desc")
      .get()

    stats.totalReferrals = referralsSnapshot.size
    stats.totalConversions = referralsSnapshot.docs.filter(
      (doc) => doc.data().convertedToPro
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
      const weekKey = weekStart.toISOString().split("T")[0]

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
    const usersSnapshot = await adminDb.collection("users").get()
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
      const userDoc = await adminDb.collection("users").doc(userId).get()
      stats.topReferrers.push({
        userId,
        email: userDoc.data()?.email || "Unknown",
        referralCount: counts.count,
        conversions: counts.conversions,
      })
    }
  } catch (error) {
    logger.error("Failed to get referral stats", { error })
  }

  return stats
}
