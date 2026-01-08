"use client"

import { useEffect, useRef } from "react"
import { X, AlertCircle, AlertTriangle, CheckCircle, Info, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

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

interface AnnouncementModalProps {
  announcement: Announcement
  onClose: () => void
  onDismiss: () => void
}

const priorityConfig = {
  info: {
    bg: "bg-blue-500/20",
    border: "border-blue-500/50",
    icon: Info,
    iconBg: "bg-blue-500/30",
    iconColor: "text-blue-400",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
  },
  warning: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    icon: AlertTriangle,
    iconBg: "bg-yellow-500/30",
    iconColor: "text-yellow-400",
    buttonBg: "bg-yellow-600 hover:bg-yellow-700",
  },
  critical: {
    bg: "bg-red-500/20",
    border: "border-red-500/50",
    icon: AlertCircle,
    iconBg: "bg-red-500/30",
    iconColor: "text-red-400",
    buttonBg: "bg-red-600 hover:bg-red-700",
  },
  success: {
    bg: "bg-green-500/20",
    border: "border-green-500/50",
    icon: CheckCircle,
    iconBg: "bg-green-500/30",
    iconColor: "text-green-400",
    buttonBg: "bg-green-600 hover:bg-green-700",
  },
}

export function AnnouncementModal({ announcement, onClose, onDismiss }: AnnouncementModalProps) {
  const config = priorityConfig[announcement.priority]
  const Icon = config.icon
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap and escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && announcement.dismissible) {
        onDismiss()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    // Focus the modal
    modalRef.current?.focus()

    // Prevent body scroll
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [announcement.dismissible, onDismiss])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && announcement.dismissible) {
      onDismiss()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
      aria-describedby="announcement-message"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full max-w-md rounded-lg border ${config.border} ${config.bg} bg-gray-900 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Close button */}
        {announcement.dismissible && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            aria-label="Close announcement"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Icon */}
        <div className={`mb-4 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h2 id="announcement-title" className="text-xl font-semibold text-white mb-2">
          {announcement.title}
        </h2>

        {/* Message */}
        <p id="announcement-message" className="text-gray-300 mb-6 leading-relaxed">
          {announcement.message}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {announcement.cta && (
            <Button
              className={`flex-1 ${config.buttonBg} text-white`}
              onClick={() => {
                window.open(announcement.cta!.url, "_blank")
                if (announcement.dismissible) {
                  onDismiss()
                }
              }}
            >
              {announcement.cta.text}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}

          {announcement.dismissible && (
            <Button
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={onDismiss}
            >
              {announcement.cta ? "Maybe Later" : "Got it"}
            </Button>
          )}

          {!announcement.dismissible && !announcement.cta && (
            <Button
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
