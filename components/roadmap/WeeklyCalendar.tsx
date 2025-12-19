'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check, Circle } from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface WeeklyCalendarProps {
  dailyPlans: DailyPlan[]
  selectedDayIndex: number
  onSelectDay: (index: number) => void
}

export function WeeklyCalendar({
  dailyPlans,
  selectedDayIndex,
  onSelectDay,
}: WeeklyCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get current week view (show 7 days centered around today or selected day)
  const weekStart = Math.max(0, selectedDayIndex - 3)
  const weekEnd = Math.min(dailyPlans.length, weekStart + 7)
  const visibleDays = dailyPlans.slice(weekStart, weekEnd)

  const canScrollLeft = weekStart > 0
  const canScrollRight = weekEnd < dailyPlans.length

  const scrollLeft = () => {
    if (canScrollLeft) {
      onSelectDay(Math.max(0, selectedDayIndex - 7))
    }
  }

  const scrollRight = () => {
    if (canScrollRight) {
      onSelectDay(Math.min(dailyPlans.length - 1, selectedDayIndex + 7))
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Weekly Schedule</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              canScrollLeft
                ? 'hover:bg-muted text-foreground'
                : 'text-muted-foreground/50 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              canScrollRight
                ? 'hover:bg-muted text-foreground'
                : 'text-muted-foreground/50 cursor-not-allowed'
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {visibleDays.map((plan, index) => {
          const actualIndex = weekStart + index
          const planDate = new Date(plan.date)
          planDate.setHours(0, 0, 0, 0)

          const isToday = planDate.getTime() === today.getTime()
          const isPast = planDate < today
          const isSelected = actualIndex === selectedDayIndex

          const completedCount = plan.questions.filter(
            (q) => q.status === 'completed'
          ).length
          const totalCount = plan.questions.length
          const allComplete = totalCount > 0 && completedCount === totalCount

          return (
            <DayCell
              key={actualIndex}
              plan={plan}
              isToday={isToday}
              isPast={isPast}
              isSelected={isSelected}
              completedCount={completedCount}
              totalCount={totalCount}
              allComplete={allComplete}
              onClick={() => onSelectDay(actualIndex)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  )
}

function DayCell({
  plan,
  isToday,
  isPast,
  isSelected,
  completedCount,
  totalCount,
  allComplete,
  onClick,
}: {
  plan: DailyPlan
  isToday: boolean
  isPast: boolean
  isSelected: boolean
  completedCount: number
  totalCount: number
  allComplete: boolean
  onClick: () => void
}) {
  const date = new Date(plan.date)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = date.getDate()

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg text-center transition-all',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        allComplete && 'bg-green-100',
        isToday && !allComplete && 'bg-primary/10',
        isPast && !allComplete && 'bg-yellow-50',
        !isToday && !isPast && !allComplete && 'bg-muted/50 hover:bg-muted'
      )}
    >
      {/* Day name */}
      <p
        className={cn(
          'text-xs font-medium',
          isToday ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {dayName}
      </p>

      {/* Day number */}
      <p
        className={cn(
          'text-lg font-bold',
          allComplete && 'text-green-600',
          isToday && !allComplete && 'text-primary'
        )}
      >
        {dayNum}
      </p>

      {/* Progress indicator */}
      <div className="mt-1 flex justify-center">
        {totalCount === 0 ? (
          <span className="text-xs text-muted-foreground">Rest</span>
        ) : allComplete ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
              <Circle
                key={i}
                className={cn(
                  'h-1.5 w-1.5',
                  i < completedCount ? 'fill-primary text-primary' : 'text-muted-foreground'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Today indicator */}
      {isToday && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
      )}
    </motion.button>
  )
}
