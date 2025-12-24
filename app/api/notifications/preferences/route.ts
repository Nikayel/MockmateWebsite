/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences - Get user notification preferences
 * PUT /api/notifications/preferences - Update user notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateFCMToken,
  toggleNotificationType,
} from '@/lib/notification-helpers'
import type { NotificationType } from '@/lib/rag/knowledge-base/notification-knowledge'
import type { NotificationChannel } from '@/lib/types/notifications'

/**
 * GET /api/notifications/preferences
 * Returns user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getNotificationPreferences(authResult.userId)

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notifications/preferences
 *
 * Body options:
 *   1. Full update: { preferences: Partial<NotificationPreferences> }
 *
 *   2. FCM token update: { fcmToken: string }
 *
 *   3. Toggle type: { toggleType: NotificationType, enabled: boolean }
 *
 *   4. Update channels: {
 *        type: NotificationType,
 *        channels: NotificationChannel[]
 *      }
 *
 *   5. Update quiet hours: {
 *        quietHours: { enabled: boolean, start: number, end: number }
 *      }
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    const body = await request.json()

    // Handle FCM token update
    if (body.fcmToken !== undefined) {
      await updateFCMToken(userId, body.fcmToken)
      return NextResponse.json({ success: true, message: 'FCM token updated' })
    }

    // Handle type toggle
    if (body.toggleType !== undefined) {
      await toggleNotificationType(
        userId,
        body.toggleType as NotificationType,
        body.enabled ?? true
      )
      return NextResponse.json({ success: true, message: 'Type preference updated' })
    }

    // Handle channel update for specific type
    if (body.type && body.channels) {
      const prefs = await getNotificationPreferences(userId)
      const typePreferences = {
        ...prefs.typePreferences,
        [body.type]: {
          ...prefs.typePreferences[body.type as NotificationType],
          channels: body.channels as NotificationChannel[],
        },
      }
      await updateNotificationPreferences(userId, { typePreferences })
      return NextResponse.json({ success: true, message: 'Channel preferences updated' })
    }

    // Handle quiet hours update
    if (body.quietHours !== undefined) {
      await updateNotificationPreferences(userId, {
        quietHours: body.quietHours,
      })
      return NextResponse.json({ success: true, message: 'Quiet hours updated' })
    }

    // Handle global enabled toggle
    if (body.enabled !== undefined) {
      await updateNotificationPreferences(userId, {
        enabled: body.enabled,
      })
      return NextResponse.json({ success: true, message: 'Notifications toggled' })
    }

    // Handle global channel toggles
    if (body.channels !== undefined) {
      await updateNotificationPreferences(userId, {
        channels: body.channels,
      })
      return NextResponse.json({ success: true, message: 'Channels updated' })
    }

    // Handle timezone update
    if (body.timezone !== undefined) {
      await updateNotificationPreferences(userId, {
        timezone: body.timezone,
      })
      return NextResponse.json({ success: true, message: 'Timezone updated' })
    }

    // Handle full preferences update
    if (body.preferences) {
      const updated = await updateNotificationPreferences(userId, body.preferences)
      return NextResponse.json({ success: true, preferences: updated })
    }

    return NextResponse.json(
      { error: 'No valid update field provided' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
