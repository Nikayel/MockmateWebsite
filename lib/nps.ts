/**
 * NPS (Net Promoter Score) Tracking System
 *
 * Tracks user satisfaction through simple 0-10 surveys.
 * - Promoters: 9-10 (likely to recommend)
 * - Passives: 7-8 (satisfied but not enthusiastic)
 * - Detractors: 0-6 (unhappy, may damage brand)
 *
 * NPS = % Promoters - % Detractors (ranges from -100 to +100)
 */

import { adminDb } from './firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { logger } from './logger'

export interface NPSResponse {
  id?: string
  userId: string
  score: number // 0-10
  feedback?: string // Optional text feedback
  triggerContext: 'session_complete' | 'manual' | 'milestone'
  sessionCount: number // How many sessions user had when surveyed
  subscriptionTier: 'free' | 'pro' | 'enterprise'
  createdAt: Date | Timestamp
}

export interface NPSStats {
  totalResponses: number
  averageScore: number
  npsScore: number // -100 to +100
  promoters: number // 9-10
  passives: number // 7-8
  detractors: number // 0-6
  responsesByTier: {
    free: { count: number; avgScore: number; nps: number }
    pro: { count: number; avgScore: number; nps: number }
    enterprise: { count: number; avgScore: number; nps: number }
  }
  recentTrend: {
    last7Days: { count: number; nps: number }
    last30Days: { count: number; nps: number }
  }
}

/**
 * Record an NPS response
 */
export async function recordNPSResponse(response: Omit<NPSResponse, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await adminDb.collection('nps_responses').add({
      ...response,
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info('NPS response recorded', {
      userId: response.userId,
      score: response.score,
      npsCategory: getNPSCategory(response.score)
    })

    return docRef.id
  } catch (error) {
    logger.error('Failed to record NPS response', { error, userId: response.userId })
    throw error
  }
}

/**
 * Check if user should see NPS survey
 * Shows survey after 3rd, 10th, and every 20th completed session
 */
export async function shouldShowNPSSurvey(userId: string, completedSessions: number): Promise<boolean> {
  // Trigger points: 3rd session, 10th session, then every 20 sessions
  const triggerPoints = [3, 10]
  const isTriggerPoint = triggerPoints.includes(completedSessions) ||
    (completedSessions > 10 && (completedSessions - 10) % 20 === 0)

  if (!isTriggerPoint) return false

  // Check if user already responded recently (within 30 days)
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentResponse = await adminDb
      .collection('nps_responses')
      .where('userId', '==', userId)
      .where('createdAt', '>=', thirtyDaysAgo)
      .limit(1)
      .get()

    return recentResponse.empty
  } catch (error) {
    logger.error('Failed to check NPS eligibility', { error, userId })
    return false
  }
}

/**
 * Get user's last NPS response
 */
export async function getUserLastNPSResponse(userId: string): Promise<NPSResponse | null> {
  try {
    const snapshot = await adminDb
      .collection('nps_responses')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    } as NPSResponse
  } catch (error) {
    logger.error('Failed to get user NPS response', { error, userId })
    return null
  }
}

/**
 * Calculate NPS category from score
 */
export function getNPSCategory(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

/**
 * Calculate NPS score from responses
 */
function calculateNPS(responses: Array<{ score: number }>): { nps: number; promoters: number; passives: number; detractors: number } {
  if (responses.length === 0) {
    return { nps: 0, promoters: 0, passives: 0, detractors: 0 }
  }

  let promoters = 0
  let passives = 0
  let detractors = 0

  for (const r of responses) {
    const category = getNPSCategory(r.score)
    if (category === 'promoter') promoters++
    else if (category === 'passive') passives++
    else detractors++
  }

  const total = responses.length
  const nps = Math.round(((promoters / total) - (detractors / total)) * 100)

  return { nps, promoters, passives, detractors }
}

/**
 * Get NPS statistics for admin dashboard
 */
export async function getNPSStats(): Promise<NPSStats> {
  const stats: NPSStats = {
    totalResponses: 0,
    averageScore: 0,
    npsScore: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    responsesByTier: {
      free: { count: 0, avgScore: 0, nps: 0 },
      pro: { count: 0, avgScore: 0, nps: 0 },
      enterprise: { count: 0, avgScore: 0, nps: 0 },
    },
    recentTrend: {
      last7Days: { count: 0, nps: 0 },
      last30Days: { count: 0, nps: 0 },
    },
  }

  try {
    // Get all responses
    const allResponsesSnapshot = await adminDb
      .collection('nps_responses')
      .orderBy('createdAt', 'desc')
      .get()

    if (allResponsesSnapshot.empty) return stats

    const allResponses: Array<{ score: number; subscriptionTier: string; createdAt: Date }> = []
    const tierResponses: Record<string, Array<{ score: number }>> = {
      free: [],
      pro: [],
      enterprise: [],
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const last7Days: Array<{ score: number }> = []
    const last30Days: Array<{ score: number }> = []

    for (const doc of allResponsesSnapshot.docs) {
      const data = doc.data()
      const score = data.score as number
      const tier = (data.subscriptionTier || 'free') as string
      const createdAt = data.createdAt?.toDate() || new Date()

      allResponses.push({ score, subscriptionTier: tier, createdAt })

      if (tierResponses[tier]) {
        tierResponses[tier].push({ score })
      }

      if (createdAt >= sevenDaysAgo) {
        last7Days.push({ score })
      }
      if (createdAt >= thirtyDaysAgo) {
        last30Days.push({ score })
      }
    }

    // Calculate overall stats
    stats.totalResponses = allResponses.length
    stats.averageScore = allResponses.reduce((sum, r) => sum + r.score, 0) / allResponses.length

    const overall = calculateNPS(allResponses)
    stats.npsScore = overall.nps
    stats.promoters = overall.promoters
    stats.passives = overall.passives
    stats.detractors = overall.detractors

    // Calculate by tier
    for (const tier of ['free', 'pro', 'enterprise'] as const) {
      const tierData = tierResponses[tier]
      if (tierData.length > 0) {
        const tierNPS = calculateNPS(tierData)
        stats.responsesByTier[tier] = {
          count: tierData.length,
          avgScore: tierData.reduce((sum, r) => sum + r.score, 0) / tierData.length,
          nps: tierNPS.nps,
        }
      }
    }

    // Calculate trends
    if (last7Days.length > 0) {
      stats.recentTrend.last7Days = {
        count: last7Days.length,
        nps: calculateNPS(last7Days).nps,
      }
    }
    if (last30Days.length > 0) {
      stats.recentTrend.last30Days = {
        count: last30Days.length,
        nps: calculateNPS(last30Days).nps,
      }
    }

  } catch (error) {
    logger.error('Failed to get NPS stats', { error })
  }

  return stats
}
