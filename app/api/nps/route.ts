/**
 * NPS API
 *
 * User-facing endpoint for submitting NPS responses.
 *
 * Wired to the in-app NPS survey (components/nps/NpsSurvey.tsx), mounted on the dashboard:
 * GET reports whether the user is due (shouldShowNPSSurvey), POST records the 0-10 score plus
 * optional feedback. Responses feed the admin Growth NPS dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth-helpers'
import { recordNPSResponse, shouldShowNPSSurvey } from '@/lib/nps'
import { adminDb } from '@/lib/firebase-admin'
import { apiRateLimit } from '@/lib/rate-limit'

// Matches the survey payload exactly: score is a 0-10 number, feedback is an
// optional free-text string (bounded so a forged payload cannot store megabytes).
const npsSubmissionSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string().max(2000).optional(),
})

/**
 * Count the user's completed sessions with a Firestore count() aggregate so the
 * check never streams session documents (this runs on every dashboard load).
 */
async function countCompletedSessions(userId: string): Promise<number> {
  const countSnapshot = await adminDb
    .collection('interview_sessions')
    .where('user_id', '==', userId)
    .where('completed_at', '!=', null)
    .count()
    .get()

  return countSnapshot.data().count
}

/**
 * GET /api/nps
 *
 * Check if user should see NPS survey
 */
export async function GET(request: NextRequest) {
  // Shared per-IP API limit: this endpoint is hit by NpsSurvey on every
  // dashboard load for every signed-in user, so it must not be stricter.
  const rateLimitResponse = await apiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ shouldShow: false })
  }

  try {
    // Get user's completed session count (bounded aggregate, no document reads)
    const completedSessions = await countCompletedSessions(authResult.userId)

    const shouldShow = await shouldShowNPSSurvey(authResult.userId, completedSessions)

    return NextResponse.json({
      shouldShow,
      completedSessions,
    })
  } catch (error) {
    console.error('[NPS API] Error checking NPS eligibility:', error)
    return NextResponse.json({ shouldShow: false })
  }
}

/**
 * POST /api/nps
 *
 * Submit NPS response
 *
 * Body:
 * - score: number (0-10)
 * - feedback?: string
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await apiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Validate score and bound feedback length
    const parsed = npsSubmissionSchema.safeParse(await request.json())
    if (!parsed.success) {
      const invalidField = parsed.error.issues[0]?.path[0]
      return NextResponse.json(
        {
          error:
            invalidField === 'feedback'
              ? 'Feedback must be at most 2000 characters'
              : 'Score must be a number between 0 and 10',
        },
        { status: 400 }
      )
    }
    const { score, feedback } = parsed.data

    // Get user info
    const userDoc = await adminDb.collection('users').doc(authResult.userId).get()
    const userData = userDoc.data()

    // Get session count (bounded aggregate, no document reads)
    const sessionCount = await countCompletedSessions(authResult.userId)

    await recordNPSResponse({
      userId: authResult.userId,
      score,
      feedback: feedback || undefined,
      triggerContext: 'session_complete',
      sessionCount,
      subscriptionTier: userData?.subscription_tier || 'free',
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    })
  } catch (error) {
    console.error('[NPS API] Error submitting NPS:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
