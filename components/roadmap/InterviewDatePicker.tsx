'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getEstimatedPrepTime } from '@/lib/data/company-questions'
import { CompanyId } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface InterviewDatePickerProps {
  companyId: CompanyId
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
  onSelect: (date: Date) => void
  selectedDate?: Date | null
}

export function InterviewDatePicker({
  companyId,
  experienceLevel = 'intermediate',
  onSelect,
  selectedDate,
}: InterviewDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  const prepTime = useMemo(
    () => getEstimatedPrepTime(companyId, experienceLevel),
    [companyId, experienceLevel]
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.year, currentMonth.month, 1).getDay()

  const getDaysRemaining = (date: Date) => {
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getDateStatus = (daysRemaining: number) => {
    if (daysRemaining < 7) return 'urgent'
    if (daysRemaining < prepTime.minWeeks * 7) return 'tight'
    if (daysRemaining >= prepTime.minWeeks * 7) return 'good'
    return 'neutral'
  }

  const prevMonth = () => {
    setCurrentMonth((prev) => ({
      month: prev.month === 0 ? 11 : prev.month - 1,
      year: prev.month === 0 ? prev.year - 1 : prev.year,
    }))
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => ({
      month: prev.month === 11 ? 0 : prev.month + 1,
      year: prev.month === 11 ? prev.year + 1 : prev.year,
    }))
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const daysRemaining = selectedDate ? getDaysRemaining(selectedDate) : 0
  const dateStatus = selectedDate ? getDateStatus(daysRemaining) : 'neutral'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">When is Your Interview?</h2>
        <p className="mt-2 text-muted-foreground">
          We'll create a study schedule leading up to your interview
        </p>
      </div>

      {/* Prep time recommendation */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium">Recommended prep time:</span>
          <span className="text-muted-foreground">
            {prepTime.minWeeks}-{prepTime.maxWeeks} weeks ({prepTime.recommendedHoursPerWeek}h/week)
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="font-semibold">{monthName}</h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(currentMonth.year, currentMonth.month, day)
            const isPast = date < today
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            const daysFromNow = getDaysRemaining(date)
            const status = getDateStatus(daysFromNow)

            return (
              <button
                key={day}
                onClick={() => !isPast && onSelect(date)}
                disabled={isPast}
                className={cn(
                  'p-2 rounded-lg text-sm font-medium transition-all relative',
                  isPast && 'text-muted-foreground/50 cursor-not-allowed',
                  !isPast && !isSelected && 'hover:bg-muted',
                  isSelected && 'bg-primary text-primary-foreground',
                  !isPast && !isSelected && status === 'urgent' && 'text-red-500',
                  !isPast && !isSelected && status === 'tight' && 'text-yellow-600',
                  !isPast && !isSelected && status === 'good' && 'text-green-600'
                )}
              >
                {day}
                {isSelected && (
                  <motion.div
                    layoutId="selected-date"
                    className="absolute inset-0 bg-primary rounded-lg -z-10"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>{'< 7 days (urgent)'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Limited time</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Good prep time</span>
          </div>
        </div>
      </div>

      {/* Selected date info */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-lg p-4 flex items-start gap-3',
            dateStatus === 'urgent' && 'bg-red-500/10 border border-red-500/20',
            dateStatus === 'tight' && 'bg-yellow-500/10 border border-yellow-500/20',
            dateStatus === 'good' && 'bg-green-500/10 border border-green-500/20'
          )}
        >
          {dateStatus === 'urgent' && <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          {dateStatus === 'tight' && <Clock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />}
          {dateStatus === 'good' && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />}

          <div>
            <p className="font-medium">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {daysRemaining === 0
                ? "That's today!"
                : daysRemaining === 1
                ? "That's tomorrow!"
                : `${daysRemaining} days from now`}
            </p>
            {dateStatus === 'urgent' && (
              <p className="text-sm text-red-600 mt-2">
                Very limited time! We'll focus only on must-know questions.
              </p>
            )}
            {dateStatus === 'tight' && (
              <p className="text-sm text-yellow-700 mt-2">
                Tight timeline. We'll prioritize high-impact questions.
              </p>
            )}
            {dateStatus === 'good' && (
              <p className="text-sm text-green-700 mt-2">
                Great! You have enough time for comprehensive preparation.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
