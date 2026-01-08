"use client"

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

interface AnnouncementBannerProps {
  announcement: Announcement
  onDismiss: () => void
}

const priorityConfig = {
  info: {
    bg: "bg-blue-600",
    border: "border-blue-500",
    icon: Info,
    iconColor: "text-blue-100",
  },
  warning: {
    bg: "bg-yellow-600",
    border: "border-yellow-500",
    icon: AlertTriangle,
    iconColor: "text-yellow-100",
  },
  critical: {
    bg: "bg-red-600",
    border: "border-red-500",
    icon: AlertCircle,
    iconColor: "text-red-100",
  },
  success: {
    bg: "bg-green-600",
    border: "border-green-500",
    icon: CheckCircle,
    iconColor: "text-green-100",
  },
}

export function AnnouncementBanner({ announcement, onDismiss }: AnnouncementBannerProps) {
  const config = priorityConfig[announcement.priority]
  const Icon = config.icon

  return (
    <div
      className={`${config.bg} border-b ${config.border} px-4 py-3 text-white`}
      role="alert"
      aria-live={announcement.priority === "critical" ? "assertive" : "polite"}
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
            <span className="font-semibold">{announcement.title}</span>
            <span className="hidden sm:inline text-white/80">—</span>
            <span className="text-white/90 text-sm sm:text-base">{announcement.message}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {announcement.cta && (
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs sm:text-sm"
              onClick={() => window.open(announcement.cta!.url, "_blank")}
            >
              {announcement.cta.text}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          )}

          {announcement.dismissible && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
