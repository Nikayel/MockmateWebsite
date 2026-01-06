'use client'

import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Flame,
  HelpCircle,
  SkipForward,
  Target,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyPlan, PersonalizedRoadmap } from '@/lib/data/company-questions/types'

type RAGEnhancements = NonNullable<PersonalizedRoadmap['ragEnhancements']>

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
  const planDate = new Date(plan.date)
  planDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = planDate.getTime() === today.getTime()
  const isPast = planDate < today
  const isFuture = planDate > today

  // Format date for display
  const dateLabel = isToday
    ? "Today's Focus"
    : planDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className={cn(
      "p-4 md:p-5",
      isToday && "bg-accent/5 border-b border-accent/10",
      isPast && !allComplete && "bg-amber-500/5 border-b border-amber-500/10",
      allComplete && "bg-green-500/5 border-b border-green-500/10"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isToday ? (
              <Flame className="h-5 w-5 text-primary" />
            ) : (
              <Calendar className="h-5 w-5 text-muted-foreground" />
            )}
            <h2 className="text-lg font-bold">{dateLabel}</h2>
            {isPast && !allComplete && (
              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                Catch up
              </span>
            )}
            {isFuture && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                Upcoming
              </span>
            )}
            {allComplete && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Complete
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{plan.theme}</p>
          {ragEnhancements?.enabled && (
            <button
              onClick={onShowRAGExplanation}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Why these questions?</span>
            </button>
          )}
        </div>

        {/* Circular progress */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
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
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                allComplete ? 'text-green-500' : 'text-primary'
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold">{completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{completedMinutes}/{totalMinutes} min</span>
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
