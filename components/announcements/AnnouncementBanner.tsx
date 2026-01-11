"use client"

import { useState, useEffect } from "react"
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/lib/types/announcements"

interface AnnouncementBannerProps {
  announcement: Announcement
  onDismiss: () => void
}

const priorityConfig = {
  info: {
    gradient: "from-accent/90 via-accent/80 to-accent/70",
    bgSubtle: "bg-accent/10",
    border: "border-accent/30",
    icon: Info,
    iconBg: "bg-white/20",
    iconColor: "text-white",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    buttonBg: "bg-white/20 hover:bg-white/30",
    buttonText: "text-white",
    dismissHover: "hover:bg-white/20",
    glowColor: "shadow-accent/20",
  },
  warning: {
    gradient: "from-amber-500/90 via-amber-500/80 to-orange-500/70",
    bgSubtle: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    iconBg: "bg-white/20",
    iconColor: "text-white",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    buttonBg: "bg-white/20 hover:bg-white/30",
    buttonText: "text-white",
    dismissHover: "hover:bg-white/20",
    glowColor: "shadow-amber-500/20",
  },
  critical: {
    gradient: "from-destructive/90 via-destructive/80 to-red-600/70",
    bgSubtle: "bg-destructive/10",
    border: "border-destructive/30",
    icon: AlertCircle,
    iconBg: "bg-white/20",
    iconColor: "text-white",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    buttonBg: "bg-white/20 hover:bg-white/30",
    buttonText: "text-white",
    dismissHover: "hover:bg-white/20",
    glowColor: "shadow-destructive/20",
  },
  success: {
    gradient: "from-neural/90 via-neural/80 to-emerald-500/70",
    bgSubtle: "bg-neural/10",
    border: "border-neural/30",
    icon: CheckCircle,
    iconBg: "bg-white/20",
    iconColor: "text-white",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
    buttonBg: "bg-white/20 hover:bg-white/30",
    buttonText: "text-white",
    dismissHover: "hover:bg-white/20",
    glowColor: "shadow-neural/20",
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
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-r",
          config.gradient,
          "shadow-lg",
          config.glowColor
        )}
      >
        {/* Subtle animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="animate-shimmer absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%]" />
        </div>

        <div className="relative container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Icon and Content */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* Icon with subtle background */}
              <div
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                  config.iconBg,
                  "transition-transform duration-200 hover:scale-105"
                )}
              >
                <Icon className={cn("h-4 w-4", config.iconColor)} aria-hidden="true" />
              </div>

              {/* Text content */}
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className={cn("text-sm font-semibold tracking-tight", config.textPrimary)}>
                  {announcement.title}
                </span>
                <span
                  className={cn("hidden sm:inline-block", config.textSecondary)}
                  aria-hidden="true"
                >
                  -
                </span>
                <span className={cn("truncate text-sm", config.textSecondary)}>
                  {announcement.message}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-2">
              {announcement.cta && (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-full px-3 text-xs font-medium",
                    config.buttonBg,
                    config.buttonText,
                    "transition-all duration-200",
                    "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0"
                  )}
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
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    "transition-all duration-200",
                    config.dismissHover,
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  )}
                  aria-label="Dismiss announcement"
                >
                  <X className={cn("h-4 w-4", config.iconColor)} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom highlight line */}
        <div className="absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
    </div>
  )
}
