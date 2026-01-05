/**
 * Guest Session Migration API
 *
 * Migrates guest sessions to authenticated user accounts.
 * Called after user signs up/logs in with an existing guest session.
 *
 * POST /api/guest-session/migrate
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Mark route as dynamic
export const dynamic = 'force-dynamic'

/**
 * Validate guest ID format
 */
function isValidGuestId(guestId: string | null): boolean {
  if (!guestId) return false
  return /^guest-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId)
}

/**
 * Get user ID from Authorization header
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    logger.warn('Failed to verify auth token for migration', { error })
    return null
  }
}

/**
 * POST /api/guest-session/migrate
 * Migrate guest sessions to authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { guestId, sessionId } = body

    // Validate guest ID
    if (!isValidGuestId(guestId)) {
      return NextResponse.json(
        { error: 'Invalid guest ID format' },
        { status: 400 }
      )
    }

    let migratedCount = 0
    let failedCount = 0
    const migratedSessions: string[] = []

    // If specific session ID provided, migrate just that session
    if (sessionId) {
      const sessionDoc = await adminDb
        .collection('interview_sessions')
        .doc(sessionId)
        .get()

      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      const sessionData = sessionDoc.data()

      // Verify this is a guest session belonging to the provided guestId
      if (sessionData?.user_id !== guestId || !sessionData?.is_guest) {
        return NextResponse.json(
          { error: 'Session not found or already migrated' },
          { status: 404 }
        )
      }

      // Migrate the session
      await adminDb
        .collection('interview_sessions')
        .doc(sessionId)
        .update({
          user_id: userId,
          is_guest: false,
          migrated_from_guest: guestId,
          migrated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      migratedCount = 1
      migratedSessions.push(sessionId)
    } else {
      // Migrate all guest sessions for this guestId
      const sessionsQuery = await adminDb
        .collection('interview_sessions')
        .where('user_id', '==', guestId)
        .where('is_guest', '==', true)
        .limit(10) // Safety limit
        .get()

      for (const doc of sessionsQuery.docs) {
        try {
          await doc.ref.update({
            user_id: userId,
            is_guest: false,
            migrated_from_guest: guestId,
            migrated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          migratedCount++
          migratedSessions.push(doc.id)
        } catch (err) {
          logger.error('Failed to migrate session', { sessionId: doc.id, error: err })
          failedCount++
        }
      }
    }

    logger.info('Guest sessions migrated', {
      userId,
      guestId,
      migratedCount,
      failedCount,
      sessionIds: migratedSessions,
    })

    return NextResponse.json({
      success: true,
      migrated: migratedCount,
      failed: failedCount,
      sessionIds: migratedSessions,
      message: migratedCount > 0
        ? `Successfully migrated ${migratedCount} session(s) to your account`
        : 'No sessions to migrate',
    })
  } catch (error) {
    logger.error('Failed to migrate guest sessions', { error })
    return NextResponse.json(
      { error: 'Failed to migrate sessions' },
      { status: 500 }
    )
  }
}
