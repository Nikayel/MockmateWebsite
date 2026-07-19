/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences - Get user notification preferences
 * PUT /api/notifications/preferences - Update user notification preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth-helpers'
import {
  getNotificationPreferencesServer,
  updateNotificationPreferencesServer,
} from '@/lib/notification-helpers-server'

// Mirrors NotificationType in lib/rag/knowledge-base/notification-knowledge.ts.
const notificationTypeSchema = z.enum([
  'welcome',
  'spaced_repetition_review',
  'pattern_decay_alert',
  'daily_practice_reminder',
  'streak_maintenance',
  'interview_countdown',
  'milestone_celebration',
  'weak_pattern_focus',
  'roadmap_behind',
  'optimal_review_time',
  'new_challenge_unlock',
  'rest_reminder',
  'mock_interview_due',
])

const channelSchema = z.enum(['push', 'email', 'in_app'])

const channelTogglesSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  in_app: z.boolean(),
})

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.number().int().min(0).max(23),
  end: z.number().int().min(0).max(23),
})

const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_+/-]+$/)

/**
 * API-VALID-2: every PUT mode's payload is clamped before it reaches the merge
 * write — enums enforced, numerics ranged, unknown keys STRIPPED (zod default)
 * — so junk values can no longer pollute the preferences document shape.
 */
const updateSchema = z.object({
  fcmToken: z.string().min(10).max(4096).optional(),
  toggleType: notificationTypeSchema.optional(),
  enabled: z.boolean().optional(),
  type: notificationTypeSchema.optional(),
  channels: z.union([z.array(channelSchema).max(3), channelTogglesSchema]).optional(),
  quietHours: quietHoursSchema.optional(),
  timezone: timezoneSchema.optional(),
  preferences: z
    .object({
      enabled: z.boolean().optional(),
      timezone: timezoneSchema.optional(),
      channels: channelTogglesSchema.optional(),
      quietHours: quietHoursSchema.optional(),
      typePreferences: z
        .record(
          notificationTypeSchema,
          z.object({
            enabled: z.boolean(),
            channels: z.array(channelSchema).max(3),
          })
        )
        .optional(),
    })
    .optional(),
})

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

    const preferences = await getNotificationPreferencesServer(authResult.userId)

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

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 })
    }

    const parsedUpdate = updateSchema.safeParse(rawBody)
    if (!parsedUpdate.success) {
      return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 })
    }
    const update = parsedUpdate.data

    // Handle FCM token update
    if (update.fcmToken !== undefined) {
      await updateNotificationPreferencesServer(userId, { fcmToken: update.fcmToken })
      return NextResponse.json({ success: true, message: 'FCM token updated' })
    }

    // Handle type toggle
    if (update.toggleType !== undefined) {
      const prefs = await getNotificationPreferencesServer(userId)
      const typePreferences = {
        ...prefs.typePreferences,
        [update.toggleType]: {
          ...prefs.typePreferences[update.toggleType],
          enabled: update.enabled ?? true,
        },
      }
      await updateNotificationPreferencesServer(userId, { typePreferences })
      return NextResponse.json({ success: true, message: 'Type preference updated' })
    }

    // Handle channel update for specific type
    if (update.type && Array.isArray(update.channels)) {
      const prefs = await getNotificationPreferencesServer(userId)
      const typePreferences = {
        ...prefs.typePreferences,
        [update.type]: {
          ...prefs.typePreferences[update.type],
          channels: update.channels,
        },
      }
      await updateNotificationPreferencesServer(userId, { typePreferences })
      return NextResponse.json({ success: true, message: 'Channel preferences updated' })
    }

    // Handle quiet hours update
    if (update.quietHours !== undefined) {
      await updateNotificationPreferencesServer(userId, {
        quietHours: update.quietHours,
      })
      return NextResponse.json({ success: true, message: 'Quiet hours updated' })
    }

    // Handle global enabled toggle
    if (update.enabled !== undefined) {
      await updateNotificationPreferencesServer(userId, {
        enabled: update.enabled,
      })
      return NextResponse.json({ success: true, message: 'Notifications toggled' })
    }

    // Handle global channel toggles
    if (update.channels !== undefined && !Array.isArray(update.channels)) {
      await updateNotificationPreferencesServer(userId, {
        channels: update.channels,
      })
      return NextResponse.json({ success: true, message: 'Channels updated' })
    }

    // Handle timezone update
    if (update.timezone !== undefined) {
      await updateNotificationPreferencesServer(userId, {
        timezone: update.timezone,
      })
      return NextResponse.json({ success: true, message: 'Timezone updated' })
    }

    // Handle full preferences update
    if (update.preferences) {
      const updated = await updateNotificationPreferencesServer(userId, update.preferences)
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
