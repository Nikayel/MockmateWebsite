"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Circle, CalendarDays } from "lucide-react"
import { DailyPlan } from "@/lib/data/company-questions/types"
import { cn } from "@/lib/utils"

interface WeeklyCalendarProps {
  dailyPlans: DailyPlan[]
  selectedDayIndex: number
  onSelectDay: (index: number) => void
}

export function WeeklyCalendar({ dailyPlans, selectedDayIndex, onSelectDay }: WeeklyCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()

  // Find today's index using date component comparison to avoid timezone issues
  const todayIndex = dailyPlans.findIndex((plan) => {
    const planDate = new Date(plan.date)
    return (
      planDate.getFullYear() === todayYear &&
      planDate.getMonth() === todayMonth &&
      planDate.getDate() === todayDay
    )
  })

  // Get current week view (show 7 days centered around today or selected day)
  const weekStart = Math.max(0, selectedDayIndex - 3)
  const weekEnd = Math.min(dailyPlans.length, weekStart + 7)
  const visibleDays = dailyPlans.slice(weekStart, weekEnd)

  const canScrollLeft = weekStart > 0
  const canScrollRight = weekEnd < dailyPlans.length
  const showJumpToToday = todayIndex >= 0 && Math.abs(todayIndex - selectedDayIndex) > 3

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

  const jumpToToday = () => {
    if (todayIndex >= 0) {
      onSelectDay(todayIndex)
    }
  }

  return (
    <div className="bg-card border-border rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="text-primary h-5 w-5" />
          Weekly Schedule
        </h3>
        <div className="flex items-center gap-2">
          {showJumpToToday && (
            <button
              onClick={jumpToToday}
              className="text-primary hover:bg-primary/10 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
            >
              Jump to Today
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              aria-label="Previous week"
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                canScrollLeft
                  ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={scrollRight}
              disabled={!canScrollRight}
              aria-label="Next week"
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                canScrollRight
                  ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredDay !== null && dailyPlans[hoveredDay] && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-muted mb-3 rounded-lg p-2 text-center text-sm"
          >
            <span className="font-medium">{dailyPlans[hoveredDay].theme}</span>
            {dailyPlans[hoveredDay].questions.length > 0 && (
              <span className="text-muted-foreground ml-2">
                ({dailyPlans[hoveredDay].questions.length} questions)
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-7 gap-2">
        {visibleDays.map((plan, index) => {
          const actualIndex = weekStart + index
          const planDate = new Date(plan.date)

          // Compare using date components to avoid timezone issues
          const isToday =
            planDate.getFullYear() === todayYear &&
            planDate.getMonth() === todayMonth &&
            planDate.getDate() === todayDay

          // For past comparison, use date-only midnight values
          const planDateMidnight = new Date(
            planDate.getFullYear(),
            planDate.getMonth(),
            planDate.getDate()
          )
          const todayMidnight = new Date(todayYear, todayMonth, todayDay)
          const isPast = planDateMidnight < todayMidnight
          const isSelected = actualIndex === selectedDayIndex

          const completedCount = plan.questions.filter((q) => q.status === "completed").length
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
              onHover={() => setHoveredDay(actualIndex)}
              onLeave={() => setHoveredDay(null)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-primary h-3 w-3 rounded-full" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="bg-muted h-3 w-3 rounded-full" />
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
  onHover,
  onLeave,
}: {
  plan: DailyPlan
  isToday: boolean
  isPast: boolean
  isSelected: boolean
  completedCount: number
  totalCount: number
  allComplete: boolean
  onClick: () => void
  onHover: () => void
  onLeave: () => void
}) {
  const date = new Date(plan.date)
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
  const dayNum = date.getDate()

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      aria-label={`${dayName} ${dayNum}: ${plan.theme}. ${completedCount} of ${totalCount} completed.`}
      className={cn(
        "relative cursor-pointer rounded-lg p-2 text-center transition-all",
        isSelected && "ring-primary bg-primary/5 ring-2 ring-offset-2",
        allComplete && !isSelected && "bg-green-100",
        isToday && !allComplete && !isSelected && "bg-primary/10",
        isPast && !allComplete && !isSelected && "bg-yellow-50",
        !isToday && !isPast && !allComplete && !isSelected && "bg-muted/50 hover:bg-muted"
      )}
    >
      {/* Day name */}
      <p className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
        {dayName}
      </p>

      {/* Day number */}
      <p
        className={cn(
          "text-lg font-bold",
          allComplete && "text-green-600",
          isToday && !allComplete && "text-primary"
        )}
      >
        {dayNum}
      </p>

      {/* Progress indicator */}
      <div className="mt-1 flex justify-center">
        {totalCount === 0 ? (
          <span className="text-muted-foreground text-xs">Rest</span>
        ) : allComplete ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
              <Circle
                key={i}
                className={cn(
                  "h-1.5 w-1.5",
                  i < completedCount ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Today indicator */}
      {isToday && <div className="bg-primary absolute -top-1 -right-1 h-3 w-3 rounded-full" />}
    </motion.button>
  )
}
