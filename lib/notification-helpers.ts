/**
 * Firestore helpers for the notification system
 *
 * Handles all database operations for:
 * - User notification preferences
 * - Notification history
 * - In-app notification center
 * - Notification analytics
 */

import { db } from "./firebase"
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore"
import type {
  NotificationPreferences,
  Notification,
  InAppNotification,
  NotificationAnalytics,
  NotificationQueueItem,
  NotificationStatus,
  NotificationChannel,
} from "./types/notifications"
import type { NotificationType } from "./rag/knowledge-base/notification-knowledge"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./types/notifications"

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get user notification preferences, creating defaults if none exist
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const prefRef = doc(db, "notification_preferences", userId)
  const prefSnap = await getDoc(prefRef)

  if (prefSnap.exists()) {
    return prefSnap.data() as NotificationPreferences
  }

  // Create default preferences
  const defaults: NotificationPreferences = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(prefRef, defaults)
  return defaults
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, "userId" | "createdAt">>
): Promise<NotificationPreferences> {
  const prefRef = doc(db, "notification_preferences", userId)

  // Get existing preferences first
  const existing = await getNotificationPreferences(userId)

  const updatedPrefs: NotificationPreferences = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await setDoc(prefRef, updatedPrefs, { merge: true })
  return updatedPrefs
}

/**
 * Update FCM token for push notifications
 */
export async function updateFCMToken(userId: string, fcmToken: string): Promise<void> {
  const prefRef = doc(db, "notification_preferences", userId)

  await setDoc(
    prefRef,
    {
      fcmToken,
      fcmTokenUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Toggle a specific notification type
 */
export async function toggleNotificationType(
  userId: string,
  type: NotificationType,
  enabled: boolean
): Promise<void> {
  const prefs = await getNotificationPreferences(userId)

  const typePreferences = {
    ...prefs.typePreferences,
    [type]: {
      ...prefs.typePreferences[type],
      enabled,
    },
  }

  await updateNotificationPreferences(userId, { typePreferences })
}

// ============================================================================
// NOTIFICATIONS (History & Delivery)
// ============================================================================

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<Notification, "id" | "createdAt" | "updatedAt">
): Promise<Notification> {
  const notifRef = doc(collection(db, "notifications"))

  const newNotification: Notification = {
    ...notification,
    id: notifRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(notifRef, newNotification)
  return newNotification
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  channelStatus?: Notification["channelStatus"]
): Promise<void> {
  const notifRef = doc(db, "notifications", notificationId)

  const updates: Partial<Notification> = {
    status,
    updatedAt: new Date().toISOString(),
  }

  if (channelStatus) {
    updates.channelStatus = channelStatus
  }

  await updateDoc(notifRef, updates)
}

/**
 * Mark notification as opened
 */
export async function markNotificationOpened(
  notificationId: string,
  actionTaken?: string
): Promise<void> {
  const notifRef = doc(db, "notifications", notificationId)

  await updateDoc(notifRef, {
    status: "opened",
    openedAt: new Date().toISOString(),
    actionTaken: actionTaken || null,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Mark notification as dismissed
 */
export async function markNotificationDismissed(notificationId: string): Promise<void> {
  const notifRef = doc(db, "notifications", notificationId)

  await updateDoc(notifRef, {
    status: "dismissed",
    dismissedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Get recent notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as Notification)
}

/**
 * Get notifications by type for cooldown checking
 */
export async function getRecentNotificationsByType(
  userId: string,
  type: NotificationType,
  hoursBack: number = 24
): Promise<Notification[]> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - hoursBack)

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("type", "==", type),
    where("createdAt", ">=", cutoff.toISOString()),
    orderBy("createdAt", "desc")
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as Notification)
}

/**
 * Check if notification is in cooldown period
 */
export async function isNotificationInCooldown(
  userId: string,
  type: NotificationType,
  cooldownHours: number
): Promise<boolean> {
  const recent = await getRecentNotificationsByType(userId, type, cooldownHours)

  // Check if any were dismissed recently
  const dismissed = recent.filter((n) => n.status === "dismissed" && n.dismissedAt)

  if (dismissed.length > 0) {
    return true
  }

  // Check frequency limit
  return recent.length > 0
}

// ============================================================================
// IN-APP NOTIFICATIONS (Notification Center)
// ============================================================================

/**
 * Create an in-app notification
 */
export async function createInAppNotification(
  notification: Omit<InAppNotification, "id" | "createdAt">
): Promise<InAppNotification> {
  const notifRef = doc(collection(db, "in_app_notifications"))

  const newNotification: InAppNotification = {
    ...notification,
    id: notifRef.id,
    createdAt: new Date().toISOString(),
  }

  await setDoc(notifRef, newNotification)
  return newNotification
}

/**
 * Get unread in-app notifications
 */
export async function getUnreadInAppNotifications(
  userId: string,
  limitCount: number = 20
): Promise<InAppNotification[]> {
  const q = query(
    collection(db, "in_app_notifications"),
    where("userId", "==", userId),
    where("read", "==", false),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as InAppNotification)
}

/**
 * Get all in-app notifications (for notification center)
 */
export async function getInAppNotifications(
  userId: string,
  limitCount: number = 50
): Promise<InAppNotification[]> {
  const q = query(
    collection(db, "in_app_notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as InAppNotification)
}

/**
 * Mark in-app notification as read
 */
export async function markInAppNotificationRead(
  notificationId: string,
  userId?: string
): Promise<boolean> {
  const notifRef = doc(db, "in_app_notifications", notificationId)
  const notifSnap = await getDoc(notifRef)

  if (!notifSnap.exists()) {
    return false
  }

  // If userId provided, verify ownership
  if (userId) {
    const notifData = notifSnap.data()
    if (notifData.userId !== userId) {
      console.warn(
        `[Notification] User ${userId} attempted to mark notification ${notificationId} owned by ${notifData.userId}`
      )
      return false
    }
  }

  await updateDoc(notifRef, { read: true })
  return true
}

/**
 * Mark all in-app notifications as read
 */
export async function markAllInAppNotificationsRead(userId: string): Promise<void> {
  const unread = await getUnreadInAppNotifications(userId, 100)

  if (unread.length === 0) return

  const batch = writeBatch(db)

  unread.forEach((notif) => {
    const ref = doc(db, "in_app_notifications", notif.id)
    batch.update(ref, { read: true })
  })

  await batch.commit()
}

/**
 * Delete old in-app notifications (cleanup)
 */
export async function cleanupOldInAppNotifications(
  userId: string,
  daysOld: number = 30
): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysOld)

  const q = query(
    collection(db, "in_app_notifications"),
    where("userId", "==", userId),
    where("createdAt", "<", cutoff.toISOString()),
    limit(100)
  )

  const snap = await getDocs(q)

  if (snap.empty) return 0

  const batch = writeBatch(db)
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  return snap.size
}

// ============================================================================
// NOTIFICATION ANALYTICS
// ============================================================================

/**
 * Get or create notification analytics for a user
 */
export async function getNotificationAnalytics(userId: string): Promise<NotificationAnalytics> {
  const analyticsRef = doc(db, "notification_analytics", userId)
  const snap = await getDoc(analyticsRef)

  if (snap.exists()) {
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

  await setDoc(analyticsRef, defaults)
  return defaults
}

/**
 * Record notification sent for analytics
 */
export async function recordNotificationSent(
  userId: string,
  type: NotificationType
): Promise<void> {
  const analyticsRef = doc(db, "notification_analytics", userId)

  await setDoc(
    analyticsRef,
    {
      totalSent: increment(1),
      [`byType.${type}.sent`]: increment(1),
      [`byType.${type}.lastSentAt`]: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Record notification opened for analytics
 */
export async function recordNotificationOpened(
  userId: string,
  type: NotificationType
): Promise<void> {
  const analyticsRef = doc(db, "notification_analytics", userId)
  const analytics = await getNotificationAnalytics(userId)

  const newTotalOpened = analytics.totalOpened + 1
  const openRate =
    analytics.totalSent > 0 ? Math.round((newTotalOpened / analytics.totalSent) * 100) : 0

  await setDoc(
    analyticsRef,
    {
      totalOpened: increment(1),
      [`byType.${type}.opened`]: increment(1),
      openRate,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

/**
 * Record notification dismissed for analytics
 */
export async function recordNotificationDismissed(
  userId: string,
  type: NotificationType
): Promise<void> {
  const analyticsRef = doc(db, "notification_analytics", userId)

  await setDoc(
    analyticsRef,
    {
      totalDismissed: increment(1),
      [`byType.${type}.dismissed`]: increment(1),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}

// ============================================================================
// NOTIFICATION QUEUE
// ============================================================================

/**
 * Add item to notification queue
 */
export async function addToNotificationQueue(
  item: Omit<NotificationQueueItem, "id" | "createdAt" | "updatedAt" | "attempts" | "status">
): Promise<NotificationQueueItem> {
  const queueRef = doc(collection(db, "notification_queue"))

  const queueItem: NotificationQueueItem = {
    ...item,
    id: queueRef.id,
    attempts: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await setDoc(queueRef, queueItem)
  return queueItem
}

/**
 * Get pending queue items ready to process
 */
export async function getPendingQueueItems(
  limitCount: number = 100
): Promise<NotificationQueueItem[]> {
  const now = new Date().toISOString()

  const q = query(
    collection(db, "notification_queue"),
    where("status", "==", "pending"),
    where("scheduledFor", "<=", now),
    orderBy("scheduledFor", "asc"),
    orderBy("priority", "asc"),
    limit(limitCount)
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => doc.data() as NotificationQueueItem)
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  itemId: string,
  status: NotificationQueueItem["status"],
  error?: string
): Promise<void> {
  const queueRef = doc(db, "notification_queue", itemId)

  await updateDoc(queueRef, {
    status,
    attempts: increment(1),
    lastAttemptAt: new Date().toISOString(),
    lastError: error || null,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Delete completed queue items (cleanup)
 */
export async function cleanupCompletedQueueItems(hoursOld: number = 24): Promise<number> {
  const cutoff = new Date()
  cutoff.setHours(cutoff.getHours() - hoursOld)

  const q = query(
    collection(db, "notification_queue"),
    where("status", "in", ["completed", "failed"]),
    where("updatedAt", "<", cutoff.toISOString()),
    limit(500)
  )

  const snap = await getDocs(q)

  if (snap.empty) return 0

  const batch = writeBatch(db)
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()

  return snap.size
}

// ============================================================================
// HELPER: Check if should send notification now
// ============================================================================

/**
 * Determine if we should send a notification right now
 * Checks: enabled, quiet hours, cooldown, frequency limits
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  cooldownHours: number,
  maxPerDay: number
): Promise<{ shouldSend: boolean; reason?: string }> {
  const prefs = await getNotificationPreferences(userId)

  // Check global enabled
  if (!prefs.enabled) {
    return { shouldSend: false, reason: "notifications_disabled" }
  }

  // Check type enabled
  const typePref = prefs.typePreferences[type]
  if (typePref && !typePref.enabled) {
    return { shouldSend: false, reason: "type_disabled" }
  }

  // Check quiet hours (respecting user's timezone)
  if (prefs.quietHours.enabled) {
    const now = new Date()
    // Get current hour in user's timezone
    const userTimezone = prefs.timezone || "America/Los_Angeles"
    let currentHour: number

    try {
      // Use Intl.DateTimeFormat to get the hour in the user's timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        hour: "numeric",
        hour12: false,
      })
      currentHour = parseInt(formatter.format(now), 10)
    } catch {
      // Fallback to UTC if timezone is invalid
      currentHour = now.getUTCHours()
    }

    const { start, end } = prefs.quietHours

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (start > end) {
      if (currentHour >= start || currentHour < end) {
        return { shouldSend: false, reason: "quiet_hours" }
      }
    } else {
      if (currentHour >= start && currentHour < end) {
        return { shouldSend: false, reason: "quiet_hours" }
      }
    }
  }

  // Check cooldown
  if (await isNotificationInCooldown(userId, type, cooldownHours)) {
    return { shouldSend: false, reason: "cooldown" }
  }

  // Check daily limit
  const todayNotifications = await getRecentNotificationsByType(userId, type, 24)
  if (todayNotifications.length >= maxPerDay) {
    return { shouldSend: false, reason: "daily_limit" }
  }

  return { shouldSend: true }
}
