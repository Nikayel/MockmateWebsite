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
import { verifyAuth } from '@/lib/auth-helpers'
import { recordNPSResponse, shouldShowNPSSurvey } from '@/lib/nps'
import { adminDb } from '@/lib/firebase-admin'

/**
 * GET /api/nps
 *
 * Check if user should see NPS survey
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json({ shouldShow: false })
  }

  try {
    // Get user's completed session count
    const sessionsSnapshot = await adminDb
      .collection('interview_sessions')
      .where('user_id', '==', authResult.userId)
      .where('completed_at', '!=', null)
      .get()

    const completedSessions = sessionsSnapshot.size

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
  const authResult = await verifyAuth(request)
  if (!authResult.authenticated || !authResult.userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { score, feedback } = body

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 10) {
      return NextResponse.json(
        { error: 'Score must be a number between 0 and 10' },
        { status: 400 }
      )
    }

    // Get user info
    const userDoc = await adminDb.collection('users').doc(authResult.userId).get()
    const userData = userDoc.data()

    // Get session count
    const sessionsSnapshot = await adminDb
      .collection('interview_sessions')
      .where('user_id', '==', authResult.userId)
      .where('completed_at', '!=', null)
      .get()

    await recordNPSResponse({
      userId: authResult.userId,
      score,
      feedback: feedback || undefined,
      triggerContext: 'session_complete',
      sessionCount: sessionsSnapshot.size,
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
