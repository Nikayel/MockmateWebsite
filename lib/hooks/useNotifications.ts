/**
 * useNotifications Hook
 *
 * React hook for managing notifications in the UI.
 * Provides:
 * - Real-time notification fetching
 * - Read/unread state management
 * - Preference updates
 * - Notification actions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { InAppNotification, NotificationPreferences } from '@/lib/types/notifications'
import type { NotificationType } from '@/lib/rag/knowledge-base/notification-knowledge'

export interface UseNotificationsOptions {
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number
  /** Initial fetch on mount */
  fetchOnMount?: boolean
}

export interface UseNotificationsReturn {
  /** In-app notifications */
  notifications: InAppNotification[]
  /** Number of unread notifications */
  unreadCount: number
  /** User preferences */
  preferences: NotificationPreferences | null
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null

  /** Fetch notifications */
  refresh: () => Promise<void>
  /** Mark single notification as read */
  markRead: (notificationId: string) => Promise<void>
  /** Mark all notifications as read */
  markAllRead: () => Promise<void>

  /** Update preferences */
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  /** Toggle notification type */
  toggleType: (type: NotificationType, enabled: boolean) => Promise<void>
  /** Toggle global notifications */
  toggleGlobal: (enabled: boolean) => Promise<void>
  /** Update quiet hours */
  updateQuietHours: (start: number, end: number, enabled: boolean) => Promise<void>
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { pollInterval = 60000, fetchOnMount = true } = options

  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch notifications
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications')

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - not an error state
          return
        }
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()

      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences')

      if (!response.ok) {
        if (response.status === 401) return
        throw new Error('Failed to fetch preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences)
    } catch (err: any) {
      console.error('Error fetching notification preferences:', err)
    }
  }, [])

  // Mark single notification as read
  const markRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', notificationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'readAll' }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark all as read')
      }

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  // Update preferences (generic)
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: updates }),
        })

        if (!response.ok) {
          throw new Error('Failed to update preferences')
        }

        const data = await response.json()
        if (data.preferences) {
          setPreferences(data.preferences)
        }
      } catch (err: any) {
        setError(err.message)
        throw err
      }
    },
    []
  )

  // Toggle notification type
  const toggleType = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toggleType: type, enabled }),
        })

        if (!response.ok) {
          throw new Error('Failed to toggle notification type')
        }

        // Optimistic update
        setPreferences((prev) =>
          prev
            ? {
                ...prev,
                typePreferences: {
                  ...prev.typePreferences,
                  [type]: {
                    ...prev.typePreferences[type],
                    enabled,
                  },
                },
              }
            : null
        )
      } catch (err: any) {
        setError(err.message)
      }
    },
    []
  )

  // Toggle global notifications
  const toggleGlobal = useCallback(async (enabled: boolean) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle notifications')
      }

      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, enabled } : null))
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  // Update quiet hours
  const updateQuietHours = useCallback(
    async (start: number, end: number, enabled: boolean) => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quietHours: { start, end, enabled } }),
        })

        if (!response.ok) {
          throw new Error('Failed to update quiet hours')
        }

        // Optimistic update
        setPreferences((prev) =>
          prev ? { ...prev, quietHours: { start, end, enabled } } : null
        )
      } catch (err: any) {
        setError(err.message)
      }
    },
    []
  )

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false)

  // Initial fetch - only runs once when fetchOnMount becomes true
  useEffect(() => {
    if (fetchOnMount && !initialFetchDone.current) {
      initialFetchDone.current = true
      refresh()
      fetchPreferences()
    }
  }, [fetchOnMount, refresh, fetchPreferences])

  // Polling - only active when pollInterval > 0
  useEffect(() => {
    // Clear any existing interval
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }

    // Only start polling if interval is positive
    if (pollInterval > 0) {
      pollRef.current = setInterval(refresh, pollInterval)
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [pollInterval, refresh])

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    updatePreferences,
    toggleType,
    toggleGlobal,
    updateQuietHours,
  }
}

export default useNotifications
