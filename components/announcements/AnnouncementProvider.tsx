"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { AnnouncementBanner } from "./AnnouncementBanner"
import { AnnouncementModal } from "./AnnouncementModal"

interface Announcement {
  id: string
  title: string
  message: string
  type: "banner" | "modal" | "toast" | "page"
  priority: "info" | "warning" | "critical" | "success"
  dismissible: boolean
  cta?: {
    text: string
    url: string
  }
}

interface AnnouncementContextValue {
  announcements: Announcement[]
  dismissAnnouncement: (id: string) => Promise<void>
  refreshAnnouncements: () => Promise<void>
  getBannerAnnouncements: () => Announcement[]
  getModalAnnouncements: () => Announcement[]
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

const STORAGE_KEY = "dismissed_announcements"
const FETCH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useAnnouncements() {
  const context = useContext(AnnouncementContext)
  if (!context) {
    throw new Error("useAnnouncements must be used within an AnnouncementProvider")
  }
  return context
}

interface AnnouncementProviderProps {
  children: React.ReactNode
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const { firebaseUser } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set())
  const [shownModalIds, setShownModalIds] = useState<Set<string>>(new Set())
  const [currentModal, setCurrentModal] = useState<Announcement | null>(null)

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setDismissedIds(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}

      if (firebaseUser) {
        const token = await firebaseUser.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }

      // Send dismissed IDs for non-logged-in users
      if (!firebaseUser && dismissedIds.length > 0) {
        headers["X-Dismissed-Announcements"] = JSON.stringify(dismissedIds)
      }

      const response = await fetch("/api/announcements", { headers })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.announcements) {
          // Filter out locally dismissed announcements
          const filtered = data.announcements.filter(
            (a: Announcement) => !dismissedIds.includes(a.id)
          )
          setAnnouncements(filtered)
        }
      }
    } catch (error) {
      console.error("Error fetching announcements:", error)
    }
  }, [firebaseUser, dismissedIds])

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAnnouncements()

    const interval = setInterval(fetchAnnouncements, FETCH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  // Show toast announcements when they arrive
  useEffect(() => {
    announcements
      .filter((a) => a.type === "toast" && !shownToastIds.has(a.id))
      .forEach((announcement) => {
        setShownToastIds((prev) => new Set([...prev, announcement.id]))

        const toastOptions = {
          id: announcement.id,
          duration: announcement.dismissible ? 10000 : Infinity,
          action: announcement.cta
            ? {
                label: announcement.cta.text,
                onClick: () => window.open(announcement.cta!.url, "_blank"),
              }
            : undefined,
          onDismiss: announcement.dismissible
            ? () => dismissAnnouncement(announcement.id)
            : undefined,
        }

        switch (announcement.priority) {
          case "success":
            toast.success(announcement.title, {
              description: announcement.message,
              ...toastOptions,
            })
            break
          case "warning":
            toast.warning(announcement.title, {
              description: announcement.message,
              ...toastOptions,
            })
            break
          case "critical":
            toast.error(announcement.title, {
              description: announcement.message,
              ...toastOptions,
            })
            break
          default:
            toast.info(announcement.title, {
              description: announcement.message,
              ...toastOptions,
            })
        }
      })
  }, [announcements, shownToastIds])

  // Show modal announcements one at a time
  useEffect(() => {
    if (currentModal) return // Don't show another if one is open

    const modalAnnouncement = announcements.find(
      (a) => a.type === "modal" && !shownModalIds.has(a.id)
    )

    if (modalAnnouncement) {
      setShownModalIds((prev) => new Set([...prev, modalAnnouncement.id]))
      setCurrentModal(modalAnnouncement)
    }
  }, [announcements, currentModal, shownModalIds])

  // Dismiss announcement
  const dismissAnnouncement = useCallback(
    async (id: string) => {
      // Update local state immediately
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
      setDismissedIds((prev) => {
        const updated = [...prev, id]
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // Ignore localStorage errors
        }
        return updated
      })

      // Close modal if it's the current one
      if (currentModal?.id === id) {
        setCurrentModal(null)
      }

      // Dismiss toast
      toast.dismiss(id)

      // Notify server
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }

        if (firebaseUser) {
          const token = await firebaseUser.getIdToken()
          headers["Authorization"] = `Bearer ${token}`
        }

        await fetch("/api/announcements", {
          method: "POST",
          headers,
          body: JSON.stringify({ announcementId: id }),
        })
      } catch {
        // Ignore server errors - local dismissal is sufficient
      }
    },
    [firebaseUser, currentModal]
  )

  // Get banner announcements (shown at top of page)
  const getBannerAnnouncements = useCallback(() => {
    return announcements.filter((a) => a.type === "banner")
  }, [announcements])

  // Get modal announcements
  const getModalAnnouncements = useCallback(() => {
    return announcements.filter((a) => a.type === "modal")
  }, [announcements])

  const handleModalClose = useCallback(() => {
    if (currentModal) {
      if (currentModal.dismissible) {
        dismissAnnouncement(currentModal.id)
      } else {
        setCurrentModal(null)
      }
    }
  }, [currentModal, dismissAnnouncement])

  const value: AnnouncementContextValue = {
    announcements,
    dismissAnnouncement,
    refreshAnnouncements: fetchAnnouncements,
    getBannerAnnouncements,
    getModalAnnouncements,
  }

  return (
    <AnnouncementContext.Provider value={value}>
      {/* Render banner announcements at the top */}
      <AnnouncementBanners
        announcements={getBannerAnnouncements()}
        onDismiss={dismissAnnouncement}
      />

      {children}

      {/* Render modal */}
      {currentModal && (
        <AnnouncementModal
          announcement={currentModal}
          onClose={handleModalClose}
          onDismiss={() => dismissAnnouncement(currentModal.id)}
        />
      )}
    </AnnouncementContext.Provider>
  )
}

// Component to render all banner announcements
function AnnouncementBanners({
  announcements,
  onDismiss,
}: {
  announcements: Announcement[]
  onDismiss: (id: string) => void
}) {
  if (announcements.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col">
      {announcements.map((announcement) => (
        <AnnouncementBanner
          key={announcement.id}
          announcement={announcement}
          onDismiss={() => onDismiss(announcement.id)}
        />
      ))}
    </div>
  )
}
