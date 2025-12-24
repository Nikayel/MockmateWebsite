/**
 * Notification System Types
 *
 * Complete type definitions for the notification delivery infrastructure.
 * Works in conjunction with the notification knowledge base for RAG-powered messages.
 */

import type { NotificationType } from '@/lib/rag/knowledge-base/notification-knowledge'

/**
 * Notification delivery channels
 */
export type NotificationChannel = 'push' | 'email' | 'in_app'

/**
 * Notification status for tracking
 */
export type NotificationStatus =
  | 'pending'      // Scheduled but not yet sent
  | 'sent'         // Successfully delivered
  | 'delivered'    // Confirmed received (push only)
  | 'opened'       // User opened/viewed
  | 'dismissed'    // User dismissed
  | 'failed'       // Delivery failed
  | 'cancelled'    // Cancelled before sending

/**
 * User notification preferences
 * Stored in Firestore: notification_preferences/{userId}
 */
export interface NotificationPreferences {
  userId: string

  // Global settings
  enabled: boolean
  timezone: string // IANA timezone (e.g., "America/New_York")

  // Channel preferences
  channels: {
    push: boolean
    email: boolean
    in_app: boolean
  }

  // Quiet hours (in user's timezone)
  quietHours: {
    enabled: boolean
    start: number // Hour (0-23)
    end: number   // Hour (0-23)
  }

  // Per-type settings
  typePreferences: {
    [K in NotificationType]?: {
      enabled: boolean
      channels: NotificationChannel[]
      frequency?: 'all' | 'daily_digest' | 'weekly_digest'
    }
  }

  // FCM token for push notifications
  fcmToken?: string
  fcmTokenUpdatedAt?: string

  // Metadata
  createdAt: string
  updatedAt: string
}

/**
 * Default notification preferences for new users
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  timezone: 'America/New_York',
  channels: {
    push: true,
    email: true,
    in_app: true,
  },
  quietHours: {
    enabled: true,
    start: 22, // 10 PM
    end: 8,    // 8 AM
  },
  typePreferences: {
    spaced_repetition_review: { enabled: true, channels: ['push', 'in_app'] },
    pattern_decay_alert: { enabled: true, channels: ['push', 'email', 'in_app'] },
    daily_practice_reminder: { enabled: true, channels: ['push', 'in_app'] },
    streak_maintenance: { enabled: true, channels: ['push', 'in_app'] },
    interview_countdown: { enabled: true, channels: ['push', 'email', 'in_app'] },
    milestone_celebration: { enabled: true, channels: ['push', 'in_app'] },
    weak_pattern_focus: { enabled: true, channels: ['push', 'in_app'] },
    roadmap_behind: { enabled: true, channels: ['push', 'email', 'in_app'] },
    optimal_review_time: { enabled: true, channels: ['in_app'] },
    rest_reminder: { enabled: true, channels: ['push', 'in_app'] },
  },
}

/**
 * A scheduled or sent notification
 * Stored in Firestore: notifications/{notificationId}
 */
export interface Notification {
  id: string
  userId: string

  // Notification content
  type: NotificationType
  title: string
  body: string
  data?: Record<string, any> // Additional payload

  // Scheduling
  scheduledFor: string // ISO date
  priority: 'critical' | 'high' | 'medium' | 'low'

  // Delivery
  channels: NotificationChannel[]
  status: NotificationStatus

  // Delivery tracking per channel
  channelStatus?: {
    push?: { status: NotificationStatus; sentAt?: string; error?: string }
    email?: { status: NotificationStatus; sentAt?: string; messageId?: string; error?: string }
    in_app?: { status: NotificationStatus; sentAt?: string }
  }

  // User interaction
  openedAt?: string
  dismissedAt?: string
  actionTaken?: string // e.g., "started_practice", "opened_roadmap"

  // Metadata
  createdAt: string
  updatedAt: string
}

/**
 * Notification trigger context
 * Used to evaluate when notifications should be sent
 */
export interface NotificationTriggerContext {
  userId: string

  // User state
  lastPracticeDate?: string
  streakDays?: number
  todayPracticed?: boolean

  // Performance data
  patternProficiencies?: Record<string, {
    level: string
    trend: 'improving' | 'stable' | 'declining'
    lastScore: number
    daysSincePractice: number
  }>

  // Roadmap data
  interviewDate?: string
  roadmapProgress?: number
  expectedProgress?: number
  targetCompany?: string

  // Session data
  practiceHoursToday?: number
  consecutivePracticeDays?: number

  // Review schedule
  dueReviews?: Array<{
    problemId: string
    problemName: string
    pattern: string
    dueDate: string
    estimatedRetention: number
  }>
}

/**
 * Notification queue item for batch processing
 * Stored in Firestore: notification_queue/{itemId}
 */
export interface NotificationQueueItem {
  id: string
  userId: string
  type: NotificationType
  triggerData: Record<string, any>
  scheduledFor: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  attempts: number
  maxAttempts: number
  lastAttemptAt?: string
  lastError?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
}

/**
 * Notification analytics for a user
 * Stored in Firestore: notification_analytics/{userId}
 */
export interface NotificationAnalytics {
  userId: string

  // Overall stats
  totalSent: number
  totalOpened: number
  totalDismissed: number

  // Per-type stats
  byType: {
    [K in NotificationType]?: {
      sent: number
      opened: number
      dismissed: number
      lastSentAt?: string
    }
  }

  // Engagement metrics
  openRate: number // 0-100
  bestHourForEngagement?: number // 0-23
  preferredChannel?: NotificationChannel

  // Last updated
  updatedAt: string
}

/**
 * Response from notification send operation
 */
export interface NotificationSendResult {
  success: boolean
  notificationId?: string
  channels: {
    push?: { success: boolean; error?: string }
    email?: { success: boolean; messageId?: string; error?: string }
    in_app?: { success: boolean }
  }
  error?: string
}

/**
 * Batch notification request
 */
export interface BatchNotificationRequest {
  userId: string
  type: NotificationType
  variables: Record<string, string>
  scheduledFor?: string // If not provided, send immediately
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * In-app notification for the notification center
 */
export interface InAppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string // Internal link to navigate to
  icon?: string
  read: boolean
  createdAt: string
}
