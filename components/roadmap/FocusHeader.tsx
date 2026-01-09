"use client"

import { motion } from "framer-motion"
import { Calendar, Clock, Flame, HelpCircle, SkipForward, Target, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { DailyPlan, PersonalizedRoadmap } from "@/lib/data/company-questions/types"

type RAGEnhancements = NonNullable<PersonalizedRoadmap["ragEnhancements"]>

interface FocusHeaderProps {
  plan: DailyPlan
  completedCount: number
  totalCount: number
  pendingCount: number
  skippedCount: number
  completedMinutes: number
  totalMinutes: number
  progressPercent: number
  allComplete: boolean
  onShowRAGExplanation: () => void
  ragEnhancements?: RAGEnhancements
}

export function FocusHeader({
  plan,
  completedCount,
  totalCount,
  pendingCount,
  skippedCount,
  completedMinutes,
  totalMinutes,
  progressPercent,
  allComplete,
  onShowRAGExplanation,
  ragEnhancements,
}: FocusHeaderProps) {
  // Determine if this is today, past, or future
  // Compare using local date components to avoid timezone issues with UTC dates
  const planDate = new Date(plan.date)
  const today = new Date()
  const isToday =
    planDate.getFullYear() === today.getFullYear() &&
    planDate.getMonth() === today.getMonth() &&
    planDate.getDate() === today.getDate()

  // For past/future comparison, use date-only (midnight local time)
  const planDateMidnight = new Date(planDate.getFullYear(), planDate.getMonth(), planDate.getDate())
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const isPast = planDateMidnight < todayMidnight
  const isFuture = planDateMidnight > todayMidnight

  // Format date for display
  const dateLabel = isToday
    ? "Today's Focus"
    : planDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })

  return (
    <div
      className={cn(
        "p-4 md:p-5",
        isToday && "bg-accent/5 border-accent/10 border-b",
        isPast && !allComplete && "border-b border-amber-500/10 bg-amber-500/5",
        allComplete && "border-b border-green-500/10 bg-green-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isToday ? (
              <Flame className="text-primary h-5 w-5" />
            ) : (
              <Calendar className="text-muted-foreground h-5 w-5" />
            )}
            <h2 className="text-lg font-bold">{dateLabel}</h2>
            {isPast && !allComplete && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                Catch up
              </span>
            )}
            {isFuture && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Upcoming
              </span>
            )}
            {allComplete && (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Trophy className="h-3 w-3" />
                Complete
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{plan.theme}</p>
          {ragEnhancements?.enabled && (
            <button
              onClick={onShowRAGExplanation}
              className="text-primary hover:bg-primary/10 mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Why these questions?</span>
            </button>
          )}
        </div>

        {/* Circular progress */}
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <motion.circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 88" }}
              animate={{ strokeDasharray: `${(progressPercent / 100) * 88} 88` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(allComplete ? "text-green-500" : "text-primary")}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {completedMinutes}/{totalMinutes} min
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          <span>{pendingCount} remaining</span>
        </div>
        {skippedCount > 0 && (
          <div className="flex items-center gap-1.5 text-yellow-600">
            <SkipForward className="h-3.5 w-3.5" />
            <span>{skippedCount} skipped</span>
          </div>
        )}
      </div>
    </div>
  )
}
