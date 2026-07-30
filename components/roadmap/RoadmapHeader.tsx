"use client"

import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from "lucide-react"
import { PersonalizedRoadmap } from "@/lib/data/company-questions/types"
import { roadmapProgressPercent } from "@/lib/roadmap/progress"
import { calendarDaysRemaining } from "@/lib/roadmap/calendar-days"
import { cn } from "@/lib/utils"

interface RoadmapHeaderProps {
  roadmap: PersonalizedRoadmap
}

export function RoadmapHeader({ roadmap }: RoadmapHeaderProps) {
  const progress = roadmapProgressPercent(roadmap.questionsCompleted, roadmap.totalQuestions)

  const interviewDate = new Date(roadmap.interviewDate)
  const daysRemaining = calendarDaysRemaining(roadmap.interviewDate) ?? 0

  return (
    <div className="bg-card border-border rounded-lg border p-2.5 shadow-sm">
      {/* Single row layout - more compact */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Left: Title & Date */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="text-foreground truncate text-sm font-bold">{roadmap.companyName}</h1>
            <StatusBadge isOnTrack={roadmap.isOnTrack} daysAhead={roadmap.daysAhead} />
          </div>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
            <Calendar className="h-2.5 w-2.5" />
            {interviewDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            <ChevronRight className="text-muted-foreground/50 h-2.5 w-2.5" />
            <span
              className={cn(
                "font-medium",
                daysRemaining <= 7 ? "text-yellow-600" : "text-foreground"
              )}
            >
              {daysRemaining}d left
            </span>
          </p>
        </div>

        {/* Right: Stats in compact row */}
        <div className="flex items-center gap-3 sm:gap-4">
          <CompactStat
            icon={Target}
            value={`${roadmap.questionsCompleted}/${roadmap.totalQuestions}`}
            label="done"
          />
          <CompactStat
            icon={Clock}
            value={`${Math.round(roadmap.actualHoursSpent || 0)}h`}
            label="studied"
          />
          {/* Progress circle */}
          <div className="relative h-8 w-8 shrink-0">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${progress} 100` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  progress >= 75
                    ? "text-green-500"
                    : progress >= 50
                      ? "text-primary"
                      : progress >= 25
                        ? "text-yellow-500"
                        : "text-orange-500"
                )}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ isOnTrack, daysAhead }: { isOnTrack: boolean; daysAhead: number }) {
  if (daysAhead > 2) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <TrendingUp className="h-2.5 w-2.5" />+{daysAhead}d
      </span>
    )
  }

  if (daysAhead < -2) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <TrendingDown className="h-2.5 w-2.5" />
        {daysAhead}d
      </span>
    )
  }

  return (
    <span className="bg-primary/10 text-primary inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
      <Minus className="h-2.5 w-2.5" />
      On track
    </span>
  )
}

function CompactStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Calendar
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon className="text-muted-foreground h-3 w-3" />
      <div className="text-left">
        <p className="text-xs leading-none font-semibold">{value}</p>
        <p className="text-muted-foreground text-[9px]">{label}</p>
      </div>
    </div>
  )
}
