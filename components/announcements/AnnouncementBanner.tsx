"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, AlertTriangle, CheckCircle, Info, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/lib/types/announcements"

interface AnnouncementBannerProps {
  announcement: Announcement
  onDismiss: () => void
}

// Priority shows up as the accent strip and the icon chip only; the copy stays
// on theme foreground/muted tokens so contrast holds in both themes. The old
// design painted white text over the accent gradient, which fails AA on the
// light-mode clay accent.
const priorityConfig = {
  info: {
    icon: Info,
    strip: "bg-accent",
    chip: "bg-accent/10 text-accent",
  },
  warning: {
    icon: AlertTriangle,
    strip: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  critical: {
    icon: AlertCircle,
    strip: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
  success: {
    icon: CheckCircle,
    strip: "bg-neural",
    chip: "bg-neural/10 text-neural",
  },
}

export function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const config = priorityConfig[announcement.priority]
  const Icon = config.icon

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }

  const handleCtaClick = () => {
    if (announcement.cta?.url) {
      window.open(announcement.cta.url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div
      className={cn(
        "w-full transition-all duration-300 ease-out",
        isVisible && !isExiting ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
      role="alert"
      aria-live={announcement.priority === "critical" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="bg-card/95 border-border relative border-b shadow-sm backdrop-blur">
        {/* Priority accent strip */}
        <div className={cn("absolute inset-x-0 top-0 h-0.5", config.strip)} aria-hidden="true" />

        <div className="container mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Icon and Content */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                  config.chip
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              {/* Text content: the message may wrap to two lines rather than
                  being cut off; the provider measures the real height. */}
              <p className="min-w-0 flex-1 text-sm leading-snug">
                <span className="text-foreground font-semibold">{announcement.title}</span>
                {announcement.message && (
                  <>
                    <span className="text-muted-foreground" aria-hidden="true">
                      {" · "}
                    </span>
                    <span className="text-muted-foreground">{announcement.message}</span>
                  </>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {announcement.cta && (
                <Button
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={handleCtaClick}
                >
                  <span className="hidden sm:inline">{announcement.cta.text}</span>
                  <span className="sm:hidden">View</span>
                  <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" />
                </Button>
              )}

              {announcement.dismissible && (
                <button
                  onClick={handleDismiss}
                  className={cn(
                    "text-muted-foreground hover:text-foreground hover:bg-muted flex h-7 w-7 items-center justify-center rounded-full",
                    "transition-colors duration-200",
                    "focus-visible:ring-ring focus:outline-none focus-visible:ring-2"
                  )}
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
