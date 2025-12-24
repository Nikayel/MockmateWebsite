/**
 * Notifications API
 *
 * GET /api/notifications - Get in-app notifications for notification center
 * POST /api/notifications - Trigger notification evaluation for user
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth-helpers'
import {
  getInAppNotifications,
  getUnreadInAppNotifications,
  markInAppNotificationRead,
  markAllInAppNotificationsRead,
  getNotificationAnalytics,
} from '@/lib/notification-helpers'
import {
  processUserNotifications,
  sendNotification,
} from '@/lib/services/notification-service'
import type { NotificationType } from '@/lib/rag/knowledge-base/notification-knowledge'
import type { NotificationTriggerContext } from '@/lib/types/notifications'

/**
 * GET /api/notifications
 * Query params:
 *   - unread=true: Get only unread notifications
 *   - limit=20: Number of notifications to return
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limitParam = parseInt(searchParams.get('limit') || '20', 10)

    const notifications = unreadOnly
      ? await getUnreadInAppNotifications(userId, limitParam)
      : await getInAppNotifications(userId, limitParam)

    // Get unread count
    const unreadCount = unreadOnly
      ? notifications.length
      : (await getUnreadInAppNotifications(userId, 100)).length

    // Get analytics summary
    const analytics = await getNotificationAnalytics(userId)

    return NextResponse.json({
      notifications,
      unreadCount,
      analytics: {
        openRate: analytics.openRate,
        totalSent: analytics.totalSent,
      },
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Body options:
 *   1. { action: 'evaluate', context: NotificationTriggerContext }
 *      - Evaluate triggers and send applicable notifications
 *
 *   2. { action: 'send', type: NotificationType, variables: Record<string, any> }
 *      - Send a specific notification
 *
 *   3. { action: 'read', notificationId: string }
 *      - Mark a notification as read
 *
 *   4. { action: 'readAll' }
 *      - Mark all notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = authResult.userId
    const body = await request.json()

    switch (body.action) {
      case 'evaluate': {
        const context: NotificationTriggerContext = {
          userId,
          ...body.context,
        }

        const result = await processUserNotifications(userId, context)

        return NextResponse.json({
          success: true,
          processed: result.processed,
          sent: result.sent,
          errors: result.errors,
        })
      }

      case 'send': {
        if (!body.type) {
          return NextResponse.json(
            { error: 'Notification type required' },
            { status: 400 }
          )
        }

        const result = await sendNotification(
          userId,
          body.type as NotificationType,
          body.variables || {},
          body.priority || 'medium'
        )

        return NextResponse.json(result)
      }

      case 'read': {
        if (!body.notificationId) {
          return NextResponse.json(
            { error: 'Notification ID required' },
            { status: 400 }
          )
        }

        await markInAppNotificationRead(body.notificationId)

        return NextResponse.json({ success: true })
      }

      case 'readAll': {
        await markAllInAppNotificationsRead(userId)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: evaluate, send, read, or readAll' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Error processing notification action:', error)
    return NextResponse.json(
      { error: 'Failed to process notification action' },
      { status: 500 }
    )
  }
}
