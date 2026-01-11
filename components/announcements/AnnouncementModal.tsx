"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Announcement } from "@/lib/types/announcements"

interface AnnouncementModalProps {
  announcement: Announcement
  onClose: () => void
  onDismiss: () => void
}

const priorityConfig = {
  info: {
    gradient: "from-accent/20 via-accent/10 to-transparent",
    iconGradient: "from-accent to-blue-400",
    iconBg: "bg-accent/20",
    iconRing: "ring-accent/30",
    icon: Info,
    iconColor: "text-accent",
    titleColor: "text-foreground",
    buttonPrimary: "bg-accent hover:bg-accent/90 text-accent-foreground",
    buttonSecondary: "border-accent/30 text-accent hover:bg-accent/10",
    accentColor: "accent",
  },
  warning: {
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    iconGradient: "from-amber-500 to-orange-400",
    iconBg: "bg-amber-500/20",
    iconRing: "ring-amber-500/30",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    titleColor: "text-foreground",
    buttonPrimary: "bg-amber-500 hover:bg-amber-500/90 text-white",
    buttonSecondary: "border-amber-500/30 text-amber-400 hover:bg-amber-500/10",
    accentColor: "amber-500",
  },
  critical: {
    gradient: "from-destructive/20 via-destructive/10 to-transparent",
    iconGradient: "from-destructive to-red-400",
    iconBg: "bg-destructive/20",
    iconRing: "ring-destructive/30",
    icon: AlertCircle,
    iconColor: "text-destructive",
    titleColor: "text-foreground",
    buttonPrimary: "bg-destructive hover:bg-destructive/90 text-white",
    buttonSecondary: "border-destructive/30 text-destructive hover:bg-destructive/10",
    accentColor: "destructive",
  },
  success: {
    gradient: "from-neural/20 via-neural/10 to-transparent",
    iconGradient: "from-neural to-emerald-400",
    iconBg: "bg-neural/20",
    iconRing: "ring-neural/30",
    icon: CheckCircle,
    iconColor: "text-neural",
    titleColor: "text-foreground",
    buttonPrimary: "bg-neural hover:bg-neural/90 text-black",
    buttonSecondary: "border-neural/30 text-neural hover:bg-neural/10",
    accentColor: "neural",
  },
}

export function AnnouncementModal({ announcement, onClose, onDismiss }: AnnouncementModalProps) {
  const config = priorityConfig[announcement.priority]
  const Icon = config.icon
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Handle exit animation
  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 200)
  }, [onClose])

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 200)
  }, [onDismiss])

  // Focus trap and keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && announcement.dismissible) {
        handleDismiss()
      }

      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    // Focus the first focusable element
    closeButtonRef.current?.focus()

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [announcement.dismissible, handleDismiss])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && announcement.dismissible) {
      handleDismiss()
    }
  }

  const handleCtaClick = () => {
    if (announcement.cta?.url) {
      window.open(announcement.cta.url, "_blank", "noopener,noreferrer")
      if (announcement.dismissible) {
        handleDismiss()
      }
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6",
        "transition-all duration-200 ease-out",
        isVisible && !isExiting ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      aria-describedby="announcement-message"
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-200"
        )}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md overflow-hidden",
          "bg-card border-border rounded-2xl border shadow-2xl",
          "transition-all duration-200 ease-out",
          isVisible && !isExiting
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0"
        )}
      >
        {/* Gradient header background */}
        <div
          className={cn(
            "absolute top-0 right-0 left-0 h-32 bg-gradient-to-b opacity-50",
            config.gradient
          )}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative p-6 sm:p-8">
          {/* Close button */}
          {announcement.dismissible && (
            <button
              ref={closeButtonRef}
              onClick={handleDismiss}
              className={cn(
                "absolute top-4 right-4 rounded-full p-2",
                "text-muted-foreground hover:text-foreground",
                "bg-secondary/50 hover:bg-secondary",
                "transition-all duration-200",
                "focus-visible:ring-ring focus:outline-none focus-visible:ring-2"
              )}
              aria-label="Close announcement"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          {/* Icon */}
          <div className="mb-6">
            <div
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-2xl",
                config.iconBg,
                "ring-1",
                config.iconRing,
                "transition-transform duration-300 hover:scale-105"
              )}
            >
              <Icon className={cn("h-7 w-7", config.iconColor)} aria-hidden="true" />
            </div>
          </div>

          {/* Title */}
          <h2
            id="announcement-title"
            className={cn(
              "mb-3 text-xl font-semibold tracking-tight sm:text-2xl",
              config.titleColor
            )}
          >
            {announcement.title}
          </h2>

          {/* Message */}
          <p
            id="announcement-message"
            className="text-muted-foreground mb-8 text-sm leading-relaxed sm:text-base"
          >
            {announcement.message}
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {announcement.dismissible && (
              <Button
                variant="outline"
                className={cn(
                  "h-11 flex-1 rounded-xl font-medium",
                  "border-border text-muted-foreground",
                  "hover:bg-secondary hover:text-foreground",
                  "transition-all duration-200"
                )}
                onClick={handleDismiss}
              >
                {announcement.cta ? "Maybe Later" : "Got it"}
              </Button>
            )}

            {announcement.cta && (
              <Button
                className={cn(
                  "h-11 flex-1 rounded-xl font-medium",
                  config.buttonPrimary,
                  "transition-all duration-200",
                  "shadow-lg hover:shadow-xl"
                )}
                onClick={handleCtaClick}
              >
                {announcement.cta.text}
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            )}

            {!announcement.dismissible && !announcement.cta && (
              <Button
                variant="outline"
                className={cn(
                  "h-11 flex-1 rounded-xl font-medium",
                  "border-border text-foreground",
                  "hover:bg-secondary",
                  "transition-all duration-200"
                )}
                onClick={handleClose}
              >
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className={cn(
            "absolute right-0 bottom-0 left-0 h-1",
            `bg-gradient-to-r from-transparent via-${config.accentColor} to-transparent`,
            "opacity-50"
          )}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
