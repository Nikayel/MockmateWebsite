"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bell, ExternalLink, RefreshCw } from "lucide-react"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { useAuth } from "@/lib/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread count badge.
 * Opens a dropdown with recent notifications.
 * Fetches notifications immediately when user is authenticated.
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredNotificationId, setHoveredNotificationId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { firebaseUser } = useAuth()

  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotifications({
      // Poll every 60 seconds when authenticated
      pollInterval: firebaseUser ? 60000 : 0,
      // Fetch immediately when user is authenticated
      fetchOnMount: true,
    })

  // Handle bell click
  const handleBellClick = useCallback(() => {
    setIsOpen(!isOpen)
    // Refresh on open
    if (!isOpen) {
      refresh()
    }
  }, [isOpen, refresh])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Get icon and color for notification type
  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      welcome: "text-emerald-600 dark:text-emerald-400",
      spaced_repetition_review: "text-accent-strong",
      pattern_decay_alert: "text-red-600 dark:text-red-400",
      daily_practice_reminder: "text-blue-600 dark:text-blue-400",
      streak_maintenance: "text-orange-600 dark:text-orange-400",
      interview_countdown: "text-purple-600 dark:text-purple-400",
      milestone_celebration: "text-amber-600 dark:text-amber-400",
      weak_pattern_focus: "text-red-600 dark:text-red-400",
      roadmap_behind: "text-orange-600 dark:text-orange-400",
      optimal_review_time: "text-neural-strong",
      rest_reminder: "text-indigo-600 dark:text-indigo-400",
    }
    return colors[type] || "text-muted-foreground"
  }

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleBellClick}
        className="border-accent/25 bg-accent/10 text-accent-strong hover:border-accent/40 hover:bg-accent/15 focus-visible:ring-accent/50 relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-accent text-accent-foreground absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="border-border bg-popover text-popover-foreground absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-xl shadow-black/15"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-foreground font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refresh}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-accent/50 rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  title="Refresh"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllRead()
                    }}
                    className="text-accent-strong hover:text-accent-strong/80 focus-visible:ring-accent/50 rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="border-accent h-6 w-6 animate-spin rounded-full border-b-2" />
                </div>
              ) : error ? (
                <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                  Failed to load notifications
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-muted-foreground px-4 py-8 text-center text-sm">
                  <Bell className="mx-auto mb-2 h-8 w-8 opacity-60" />
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const iconColor = getNotificationColor(notification.type)
                  const isHovered = hoveredNotificationId === notification.id

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={false}
                      className={`border-border/60 hover:bg-muted/60 relative cursor-pointer border-b px-4 py-3 transition-colors duration-200 ${!notification.read ? "bg-accent/5" : ""}`}
                      onMouseEnter={() => setHoveredNotificationId(notification.id)}
                      onMouseLeave={() => setHoveredNotificationId(null)}
                      onClick={() => {
                        if (!notification.read) {
                          markRead(notification.id)
                        }
                        if (notification.link) {
                          setIsOpen(false)
                        }
                      }}
                    >
                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="bg-accent absolute top-1/2 left-1.5 h-1.5 w-1.5 -translate-y-1/2 rounded-full" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-foreground text-sm font-medium ${isHovered ? "" : "truncate"}`}
                          >
                            {notification.title}
                          </p>
                          {/* Body - expands on hover */}
                          <motion.div
                            initial={false}
                            animate={{
                              height: isHovered ? "auto" : "2.5rem",
                              opacity: 1,
                            }}
                            className="overflow-hidden"
                          >
                            <p
                              className={`text-muted-foreground mt-0.5 text-xs ${isHovered ? "whitespace-pre-wrap" : "line-clamp-2"}`}
                            >
                              {notification.body}
                            </p>
                          </motion.div>
                          <p className="text-muted-foreground/80 mt-1 text-[10px]">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsOpen(false)
                            }}
                            className="text-muted-foreground hover:text-accent-strong focus-visible:ring-accent/50 shrink-0 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            aria-label={`Open ${notification.title}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>

                      {/* Hover hint */}
                      {isHovered && notification.link && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-border/60 mt-2 border-t pt-2"
                        >
                          <Link
                            href={notification.link}
                            onClick={() => setIsOpen(false)}
                            className="text-accent-strong hover:text-accent-strong/80 focus-visible:ring-accent/50 flex items-center gap-1 rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <span>View details</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-border bg-muted/30 border-t px-4 py-2">
                <Link
                  href="/account"
                  className="text-muted-foreground hover:text-accent-strong focus-visible:ring-accent/50 rounded-sm text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  onClick={() => setIsOpen(false)}
                >
                  Notification settings
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationBell
