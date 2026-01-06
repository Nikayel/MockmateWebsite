"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bell, Check, X, ExternalLink, RefreshCw } from "lucide-react"
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
  const { firebaseUser, initialized } = useAuth()

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications({
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
  const getNotificationStyle = (type: string) => {
    const styles: Record<string, { color: string; icon: string }> = {
      welcome: { color: "text-green-400", icon: "party" },
      spaced_repetition_review: { color: "text-accent", icon: "repeat" },
      pattern_decay_alert: { color: "text-red-400", icon: "alert" },
      daily_practice_reminder: { color: "text-blue-400", icon: "calendar" },
      streak_maintenance: { color: "text-orange-400", icon: "flame" },
      interview_countdown: { color: "text-purple-400", icon: "clock" },
      milestone_celebration: { color: "text-yellow-400", icon: "trophy" },
      weak_pattern_focus: { color: "text-red-400", icon: "target" },
      roadmap_behind: { color: "text-orange-400", icon: "map" },
      optimal_review_time: { color: "text-neural", icon: "zap" },
      rest_reminder: { color: "text-indigo-400", icon: "moon" },
    }
    return styles[type] || { color: "text-gray-400", icon: "bell" }
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
        onClick={handleBellClick}
        className="relative p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-accent rounded-full"
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
            className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-white/5"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      markAllRead()
                    }}
                    className="text-xs text-accent hover:text-accent/80 transition-colors"
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent" />
                </div>
              ) : error ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  Failed to load notifications
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => {
                  const style = getNotificationStyle(notification.type)
                  const isHovered = hoveredNotificationId === notification.id

                  return (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={false}
                      animate={{
                        backgroundColor: isHovered ? "rgba(255,255,255,0.08)" : (!notification.read ? "rgba(0,217,255,0.05)" : "transparent")
                      }}
                      className={`relative px-4 py-3 border-b border-gray-800/50 cursor-pointer transition-all duration-200`}
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
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                      )}

                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 ${style.color}`}>
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-white ${isHovered ? '' : 'truncate'}`}>
                            {notification.title}
                          </p>
                          {/* Body - expands on hover */}
                          <motion.div
                            initial={false}
                            animate={{
                              height: isHovered ? "auto" : "2.5rem",
                              opacity: 1
                            }}
                            className="overflow-hidden"
                          >
                            <p className={`text-xs text-gray-400 mt-0.5 ${isHovered ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                              {notification.body}
                            </p>
                          </motion.div>
                          <p className="text-[10px] text-gray-600 mt-1">
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
                            className="flex-shrink-0 text-gray-500 hover:text-accent transition-colors"
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
                          className="mt-2 pt-2 border-t border-gray-800/50"
                        >
                          <Link
                            href={notification.link}
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
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
              <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
                <Link
                  href="/account"
                  className="text-xs text-gray-500 hover:text-accent transition-colors"
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
