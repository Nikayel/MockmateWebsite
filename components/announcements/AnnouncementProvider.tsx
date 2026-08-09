"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { AnnouncementBanner } from "./AnnouncementBanner"
import { AnnouncementModal } from "./AnnouncementModal"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/lib/types/announcements"

interface AnnouncementContextValue {
  announcements: Announcement[]
  dismissAnnouncement: (id: string) => Promise<void>
  refreshAnnouncements: () => Promise<void>
  getBannerAnnouncements: () => Announcement[]
  getModalAnnouncements: () => Announcement[]
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

const STORAGE_KEY = "dismissed_announcements"
const SEEN_STORAGE_KEY = "seen_announcements"
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

/**
 * Read dismissed IDs synchronously so the very first fetch/render already knows
 * them. Loading these in an effect was the "dismissed banner flashes for a
 * second" bug: the initial fetch closed over an empty list, rendered the
 * dismissed banner, and only a refetch made it disappear.
 */
function readStoredDismissedIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []
  } catch {
    return []
  }
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const { firebaseUser, initialized } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>(readStoredDismissedIds)
  const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set())
  const [shownModalIds, setShownModalIds] = useState<Set<string>>(new Set())
  const [currentModal, setCurrentModal] = useState<Announcement | null>(null)
  const [bannerHeight, setBannerHeight] = useState(0)
  const bannerContainerRef = useRef<HTMLDivElement>(null)

  // Read through a ref inside the fetch so dismissing does not trigger a
  // refetch: local state already removed the announcement.
  const dismissedIdsRef = useRef(dismissedIds)
  dismissedIdsRef.current = dismissedIds

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}

      if (firebaseUser) {
        const token = await firebaseUser.getIdToken()
        headers["Authorization"] = `Bearer ${token}`
      }

      // Send dismissed IDs for non-logged-in users
      if (!firebaseUser && dismissedIdsRef.current.length > 0) {
        headers["X-Dismissed-Announcements"] = JSON.stringify(dismissedIdsRef.current)
      }

      // Tell the server which announcements this browser has already been
      // counted as viewing, so the 5-minute poll doesn't inflate view counts
      // (and burn a write per announcement) on every tick.
      let seenIds: string[] = []
      try {
        const storedSeen = sessionStorage.getItem(SEEN_STORAGE_KEY)
        const parsed = storedSeen ? JSON.parse(storedSeen) : []
        if (Array.isArray(parsed)) seenIds = parsed.filter((id) => typeof id === "string")
      } catch {
        // Ignore storage errors
      }
      if (seenIds.length > 0) {
        headers["X-Seen-Announcements"] = JSON.stringify(seenIds)
      }

      const response = await fetch("/api/announcements", { headers })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.announcements) {
          setAnnouncements(data.announcements)

          try {
            const returnedIds = (data.announcements as Announcement[]).map((a) => a.id)
            const merged = Array.from(new Set([...seenIds, ...returnedIds]))
            sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(merged))
          } catch {
            // Ignore storage errors
          }
        }
      }
    } catch (error) {
      console.error("[Announcements] Error fetching:", error)
    }
  }, [firebaseUser])

  // Initial fetch and periodic refresh. Waits for auth to initialize so the
  // first fetch already carries the user's credentials: an anonymous pre-fetch
  // does not know about server-side dismissals and briefly showed banners the
  // user had dismissed on another device.
  useEffect(() => {
    if (!initialized) return

    fetchAnnouncements()

    const interval = setInterval(fetchAnnouncements, FETCH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchAnnouncements, initialized])

  // Everything downstream works from the visible list: filtering at render
  // time (rather than at fetch time) means a dismissal can never flash back in,
  // whichever of the fetch and the dismissal finishes last.
  const visibleAnnouncements = useMemo(
    () => announcements.filter((a) => !dismissedIds.includes(a.id)),
    [announcements, dismissedIds]
  )

  // Show toast announcements when they arrive
  useEffect(() => {
    visibleAnnouncements
      .filter((a) => a.type === "toast" && !shownToastIds.has(a.id))
      .forEach((announcement) => {
        setShownToastIds((prev) => new Set([...prev, announcement.id]))

        const toastOptions = {
          id: announcement.id,
          duration: announcement.dismissible ? 8000 : 15000,
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
  }, [visibleAnnouncements, shownToastIds])

  // Show modal announcements one at a time
  useEffect(() => {
    if (currentModal) return // Don't show another if one is open

    const modalAnnouncement = visibleAnnouncements.find(
      (a) => a.type === "modal" && !shownModalIds.has(a.id)
    )

    if (modalAnnouncement) {
      setShownModalIds((prev) => new Set([...prev, modalAnnouncement.id]))
      setCurrentModal(modalAnnouncement)
    }
  }, [visibleAnnouncements, currentModal, shownModalIds])

  // Measure the real banner height instead of assuming 52px per banner: a
  // message that wraps (narrow viewports, long copy) made the fixed banner
  // overlap the header and page content by however much the estimate was off.
  useEffect(() => {
    const container = bannerContainerRef.current

    const apply = (height: number) => {
      setBannerHeight(height)
      document.documentElement.style.setProperty("--announcement-banner-height", `${height}px`)
    }

    if (!container) {
      apply(0)
      return
    }

    apply(container.offsetHeight)
    const observer = new ResizeObserver(() => apply(container.offsetHeight))
    observer.observe(container)

    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty("--announcement-banner-height", "0px")
    }
    // Re-run when the set of banners changes so the ref is (un)mounted fresh.
  }, [visibleAnnouncements])

  // Dismiss announcement
  const dismissAnnouncement = useCallback(
    async (id: string) => {
      // Update local state immediately; visibleAnnouncements filters on
      // dismissedIds, so this hides every surface at once.
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
    return visibleAnnouncements.filter((a) => a.type === "banner")
  }, [visibleAnnouncements])

  // Get modal announcements
  const getModalAnnouncements = useCallback(() => {
    return visibleAnnouncements.filter((a) => a.type === "modal")
  }, [visibleAnnouncements])

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
    announcements: visibleAnnouncements,
    dismissAnnouncement,
    refreshAnnouncements: fetchAnnouncements,
    getBannerAnnouncements,
    getModalAnnouncements,
  }

  const bannerAnnouncements = getBannerAnnouncements()

  return (
    <AnnouncementContext.Provider value={value}>
      {/* Render banner announcements at the top */}
      {bannerAnnouncements.length > 0 && (
        <div
          ref={bannerContainerRef}
          className={cn(
            "fixed top-0 right-0 left-0 z-[100]",
            "flex flex-col",
            "transition-all duration-300 ease-out"
          )}
          role="region"
          aria-label="Announcements"
        >
          {bannerAnnouncements.map((announcement, index) => (
            <div
              key={announcement.id}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <AnnouncementBanner
                announcement={announcement}
                onDismiss={() => dismissAnnouncement(announcement.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Spacer to push content down when banners are visible */}
      {bannerHeight > 0 && (
        <div
          style={{ height: bannerHeight }}
          className="transition-all duration-300 ease-out"
          aria-hidden="true"
        />
      )}

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
