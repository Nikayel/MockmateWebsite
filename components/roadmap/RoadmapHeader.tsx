'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Target, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { PersonalizedRoadmap } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface RoadmapHeaderProps {
  roadmap: PersonalizedRoadmap
}

export function RoadmapHeader({ roadmap }: RoadmapHeaderProps) {
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)

  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/20">
      {/* Single row layout - more compact */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left: Title & Date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-foreground truncate">
              {roadmap.companyName}
            </h1>
            <StatusBadge isOnTrack={roadmap.isOnTrack} daysAhead={roadmap.daysAhead} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {interviewDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className={cn(
              "font-medium",
              daysRemaining <= 7 ? "text-yellow-600" : "text-foreground"
            )}>
              {daysRemaining}d left
            </span>
          </p>
        </div>

        {/* Right: Stats in compact row */}
        <div className="flex items-center gap-4 sm:gap-6">
          <CompactStat
            icon={Target}
            value={`${roadmap.questionsCompleted}/${roadmap.totalQuestions}`}
            label="done"
          />
          <CompactStat
            icon={Clock}
            value={`${Math.round(roadmap.actualHoursSpent)}h`}
            label="studied"
          />
          {/* Progress circle */}
          <div className="relative h-10 w-10 shrink-0">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
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
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn(
                  progress >= 75 ? 'text-green-500' :
                  progress >= 50 ? 'text-primary' :
                  progress >= 25 ? 'text-yellow-500' : 'text-orange-500'
                )}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({
  isOnTrack,
  daysAhead,
}: {
  isOnTrack: boolean
  daysAhead: number
}) {
  if (daysAhead > 2) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <TrendingUp className="h-2.5 w-2.5" />
        +{daysAhead}d
      </span>
    )
  }

  if (daysAhead < -2) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <TrendingDown className="h-2.5 w-2.5" />
        {daysAhead}d
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
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
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-left">
        <p className="text-sm font-semibold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
