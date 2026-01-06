/**
 * Server-side Firestore helpers for the notification system
 * Uses Firebase Admin SDK for server-side operations (API routes, cron jobs)
 *
 * IMPORTANT: Use this file in API routes instead of notification-helpers.ts
 */

import { adminDb } from './firebase-admin'
import type {
  NotificationPreferences,
  InAppNotification,
  NotificationAnalytics,
} from './types/notifications'
import type { NotificationType } from './rag/knowledge-base/notification-knowledge'

const db = adminDb

// Default notification preferences for new users
const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  timezone: 'UTC', // Default timezone, can be updated by user
  channels: {
    email: true,
    in_app: true,
    push: false,
  },
  typePreferences: {
    welcome: { enabled: true, channels: ['email', 'in_app'] },
    spaced_repetition_review: { enabled: true, channels: ['email', 'in_app'] },
    daily_practice_reminder: { enabled: true, channels: ['email', 'in_app'] },
    streak_maintenance: { enabled: true, channels: ['in_app'] },
    milestone_celebration: { enabled: true, channels: ['email', 'in_app'] },
    interview_countdown: { enabled: true, channels: ['email', 'in_app'] },
    roadmap_behind: { enabled: true, channels: ['email', 'in_app'] },
  },
  quietHours: {
    enabled: false,
    start: 22,
    end: 8,
  },
}

// ============================================================================
// NOTIFICATION PREFERENCES (Server-side)
// ============================================================================

/**
 * Get user notification preferences, creating defaults if none exist
 */
export async function getNotificationPreferencesServer(
  userId: string
): Promise<NotificationPreferences> {
  const prefRef = db.collection('notification_preferences').doc(userId)
  const prefSnap = await prefRef.get()

  if (prefSnap.exists) {
    return prefSnap.data() as NotificationPreferences
  }

  // Create default preferences
  const defaults: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await prefRef.set(defaults)
  return defaults
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferencesServer(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'userId' | 'createdAt'>>
): Promise<NotificationPreferences> {
  const prefRef = db.collection('notification_preferences').doc(userId)

  // Get existing preferences first
  const existing = await getNotificationPreferencesServer(userId)

  const updatedPrefs: NotificationPreferences = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await prefRef.set(updatedPrefs, { merge: true })
  return updatedPrefs
}

// ============================================================================
// IN-APP NOTIFICATIONS (Server-side)
// ============================================================================

/**
 * Get all in-app notifications for a user
 */
export async function getInAppNotificationsServer(
  userId: string,
  limitCount: number = 50
): Promise<InAppNotification[]> {
  const snapshot = await db
    .collection('in_app_notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get()

  return snapshot.docs.map((doc) => doc.data() as InAppNotification)
}

/**
 * Get unread in-app notifications
 */
export async function getUnreadInAppNotificationsServer(
  userId: string,
  limitCount: number = 20
): Promise<InAppNotification[]> {
  const snapshot = await db
    .collection('in_app_notifications')
    .where('userId', '==', userId)
    .where('read', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(limitCount)
    .get()

  return snapshot.docs.map((doc) => doc.data() as InAppNotification)
}

/**
 * Mark in-app notification as read
 */
export async function markInAppNotificationReadServer(
  notificationId: string,
  userId?: string
): Promise<boolean> {
  const notifRef = db.collection('in_app_notifications').doc(notificationId)
  const notifSnap = await notifRef.get()

  if (!notifSnap.exists) {
    return false
  }

  // If userId provided, verify ownership
  if (userId) {
    const notifData = notifSnap.data()
    if (notifData?.userId !== userId) {
      console.warn(`[Notification] User ${userId} attempted to mark notification ${notificationId} owned by ${notifData?.userId}`)
      return false
    }
  }

  await notifRef.update({ read: true })
  return true
}

/**
 * Mark all in-app notifications as read
 */
export async function markAllInAppNotificationsReadServer(
  userId: string
): Promise<void> {
  const unread = await getUnreadInAppNotificationsServer(userId, 100)

  if (unread.length === 0) return

  const batch = db.batch()

  unread.forEach((notif) => {
    const ref = db.collection('in_app_notifications').doc(notif.id)
    batch.update(ref, { read: true })
  })

  await batch.commit()
}

/**
 * Create an in-app notification
 */
export async function createInAppNotificationServer(
  notification: Omit<InAppNotification, 'id' | 'createdAt'>
): Promise<InAppNotification> {
  const notifRef = db.collection('in_app_notifications').doc()

  const newNotification: InAppNotification = {
    ...notification,
    id: notifRef.id,
    createdAt: new Date().toISOString(),
  }

  await notifRef.set(newNotification)
  return newNotification
}

// ============================================================================
// NOTIFICATION ANALYTICS (Server-side)
// ============================================================================

/**
 * Get or create notification analytics for a user
 */
export async function getNotificationAnalyticsServer(
  userId: string
): Promise<NotificationAnalytics> {
  const analyticsRef = db.collection('notification_analytics').doc(userId)
  const snap = await analyticsRef.get()

  if (snap.exists) {
    return snap.data() as NotificationAnalytics
  }

  const defaults: NotificationAnalytics = {
    userId,
    totalSent: 0,
    totalOpened: 0,
    totalDismissed: 0,
    byType: {},
    openRate: 0,
    updatedAt: new Date().toISOString(),
  }

  await analyticsRef.set(defaults)
  return defaults
}

/**
 * Record notification sent for analytics
 */
export async function recordNotificationSentServer(
  userId: string,
  type: NotificationType
): Promise<void> {
  const analyticsRef = db.collection('notification_analytics').doc(userId)

  await analyticsRef.set(
    {
      totalSent: (await analyticsRef.get()).data()?.totalSent + 1 || 1,
      [`byType.${type}.sent`]: ((await analyticsRef.get()).data()?.byType?.[type]?.sent || 0) + 1,
      [`byType.${type}.lastSentAt`]: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Check if a notification should be sent based on preferences, quiet hours, and rate limits
 */
export async function shouldSendNotificationServer(
  userId: string,
  type: NotificationType,
  cooldownHours: number = 24,
  maxPerDay: number = 1
): Promise<{ shouldSend: boolean; reason?: string }> {
  const prefs = await getNotificationPreferencesServer(userId)

  // Check global enabled
  if (!prefs.enabled) {
    return { shouldSend: false, reason: 'notifications_disabled' }
  }

  // Check type enabled
  const typePref = prefs.typePreferences[type]
  if (typePref && !typePref.enabled) {
    return { shouldSend: false, reason: 'type_disabled' }
  }

  // Check quiet hours
  if (prefs.quietHours?.enabled) {
    const now = new Date()
    const currentHour = now.getHours()
    const { start, end } = prefs.quietHours

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      if (currentHour >= start || currentHour < end) {
        return { shouldSend: false, reason: 'quiet_hours' }
      }
    } else {
      if (currentHour >= start && currentHour < end) {
        return { shouldSend: false, reason: 'quiet_hours' }
      }
    }
  }

  // Check cooldown - look for recent notifications of this type
  const analytics = await getNotificationAnalyticsServer(userId)
  const lastSent = analytics.byType?.[type]?.lastSentAt
  if (lastSent) {
    const lastSentTime = new Date(lastSent).getTime()
    const cooldownMs = cooldownHours * 60 * 60 * 1000
    if (Date.now() - lastSentTime < cooldownMs) {
      return { shouldSend: false, reason: 'cooldown' }
    }
  }

  // Check daily limit
  const today = new Date().toISOString().split('T')[0]
  const sentToday = analytics.byType?.[type]?.lastSentAt?.startsWith(today)
    ? (analytics.byType?.[type]?.sent || 0)
    : 0

  if (sentToday >= maxPerDay) {
    return { shouldSend: false, reason: 'daily_limit' }
  }

  return { shouldSend: true }
}
