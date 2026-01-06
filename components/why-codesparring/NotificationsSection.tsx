"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/lib/motion"
import {
  Bell,
  Calendar,
  Flame,
  Trophy,
  Clock,
  Moon,
  AlertTriangle,
  Target,
  Timer,
} from "lucide-react"

// Icon mapping for dynamic icons
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Bell,
  Calendar,
  Flame,
  Trophy,
  Clock,
  Moon,
  AlertTriangle,
  Target,
  Timer,
}

interface NotificationType {
  icon: string
  title: string
  example: string
}

interface NotificationsSectionProps {
  notificationTypes: NotificationType[]
}

export function NotificationsSection({ notificationTypes }: NotificationsSectionProps) {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-6">
              <Bell className="w-4 h-4 mr-2 inline" />
              Smart Notifications
            </Badge>
            <h2 className="text-4xl font-heading font-bold text-white mb-4">
              10 Types of <span className="text-amber-400">Intelligent Alerts</span>
            </h2>
            <p className="text-gray-400">
              Never miss the optimal moment to practice.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {notificationTypes.map((notification) => {
              const IconComponent = iconMap[notification.icon] || Bell
              return (
                <div
                  key={notification.title}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/60 border border-gray-800/50 hover:border-amber-500/30 hover:bg-gray-900/80 transition-all cursor-default"
                >
                  <IconComponent className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-gray-300">{notification.title}</span>
                </div>
              )
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
