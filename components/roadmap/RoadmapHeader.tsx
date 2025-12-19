'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border border-primary/20">
      {/* Top row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {roadmap.companyName} Interview Prep
            </h1>
            <StatusBadge isOnTrack={roadmap.isOnTrack} daysAhead={roadmap.daysAhead} />
          </div>
          <p className="text-muted-foreground mt-1">
            {interviewDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <StatBox
            icon={Calendar}
            value={daysRemaining.toString()}
            label="days left"
            variant={daysRemaining < 7 ? 'warning' : 'default'}
          />
          <StatBox
            icon={Target}
            value={`${roadmap.questionsCompleted}/${roadmap.totalQuestions}`}
            label="completed"
            variant="default"
          />
          <StatBox
            icon={Clock}
            value={`${Math.round(roadmap.actualHoursSpent)}h`}
            label="studied"
            variant="default"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              progress >= 75
                ? 'bg-green-500'
                : progress >= 50
                ? 'bg-primary'
                : progress >= 25
                ? 'bg-yellow-500'
                : 'bg-orange-500'
            )}
          />
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
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <TrendingUp className="h-3 w-3" />
        {daysAhead} days ahead
      </span>
    )
  }

  if (daysAhead < -2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <TrendingDown className="h-3 w-3" />
        {Math.abs(daysAhead)} days behind
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
      <Minus className="h-3 w-3" />
      On track
    </span>
  )
}

function StatBox({
  icon: Icon,
  value,
  label,
  variant = 'default',
}: {
  icon: typeof Calendar
  value: string
  label: string
  variant?: 'default' | 'warning'
}) {
  return (
    <div className="text-center">
      <div
        className={cn(
          'inline-flex items-center justify-center w-10 h-10 rounded-lg mb-1',
          variant === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
