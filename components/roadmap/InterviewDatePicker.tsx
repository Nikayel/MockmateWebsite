"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getEstimatedPrepTime } from "@/lib/data/company-questions"
import { CompanyId } from "@/lib/data/company-questions/types"
import { cn } from "@/lib/utils"
import { calendarDaysUntil } from "@/lib/roadmap/calendar-days"

interface InterviewDatePickerProps {
  companyId: CompanyId
  experienceLevel?: "beginner" | "intermediate" | "advanced"
  onSelect: (date: Date) => void
  selectedDate?: Date | null
}

export function InterviewDatePicker({
  companyId,
  experienceLevel = "intermediate",
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

  const getDaysRemaining = (date: Date) => calendarDaysUntil(date, today) ?? 0

  const getDateStatus = (daysRemaining: number) => {
    if (daysRemaining < 7) return "urgent"
    if (daysRemaining < prepTime.minWeeks * 7) return "tight"
    if (daysRemaining >= prepTime.minWeeks * 7) return "good"
    return "neutral"
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

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  })

  const daysRemaining = selectedDate ? getDaysRemaining(selectedDate) : 0
  const dateStatus = selectedDate ? getDateStatus(daysRemaining) : "neutral"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-foreground text-2xl font-bold">When is Your Interview?</h2>
        <p className="text-muted-foreground mt-2">
          We'll create a study schedule leading up to your interview
        </p>
      </div>

      {/* Prep time recommendation */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="text-primary h-4 w-4" />
          <span className="font-medium">Recommended prep time:</span>
          <span className="text-muted-foreground">
            {prepTime.minWeeks}-{prepTime.maxWeeks} weeks ({prepTime.recommendedHoursPerWeek}h/week)
          </span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border-border rounded-xl border p-4">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prevMonth} className="hover:bg-muted rounded-lg p-2 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="font-semibold">{monthName}</h3>
          <button onClick={nextMonth} className="hover:bg-muted rounded-lg p-2 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-muted-foreground py-2 text-center text-xs font-medium">
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
                  "relative rounded-lg p-2 text-sm font-medium transition-all",
                  isPast && "text-muted-foreground/50 cursor-not-allowed",
                  !isPast && !isSelected && "hover:bg-muted",
                  isSelected && "bg-primary text-primary-foreground",
                  !isPast && !isSelected && status === "urgent" && "text-red-500",
                  !isPast && !isSelected && status === "tight" && "text-yellow-600",
                  !isPast && !isSelected && status === "good" && "text-green-600"
                )}
              >
                {day}
                {isSelected && (
                  <motion.div
                    layoutId="selected-date"
                    className="bg-primary absolute inset-0 -z-10 rounded-lg"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="text-muted-foreground mt-4 flex flex-wrap justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>{"< 7 days (urgent)"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-yellow-500" />
            <span>Limited time</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500" />
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
            "flex items-start gap-3 rounded-lg p-4",
            dateStatus === "urgent" && "border border-red-500/20 bg-red-500/10",
            dateStatus === "tight" && "border border-yellow-500/20 bg-yellow-500/10",
            dateStatus === "good" && "border border-green-500/20 bg-green-500/10"
          )}
        >
          {dateStatus === "urgent" && (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          )}
          {dateStatus === "tight" && <Clock className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />}
          {dateStatus === "good" && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          )}

          <div>
            <p className="font-medium">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {daysRemaining === 0
                ? "That's today!"
                : daysRemaining === 1
                  ? "That's tomorrow!"
                  : `${daysRemaining} days from now`}
            </p>
            {dateStatus === "urgent" && (
              <p className="mt-2 text-sm text-red-600">
                Very limited time! We'll focus only on must-know questions.
              </p>
            )}
            {dateStatus === "tight" && (
              <p className="mt-2 text-sm text-yellow-700">
                Tight timeline. We'll prioritize high-impact questions.
              </p>
            )}
            {dateStatus === "good" && (
              <p className="mt-2 text-sm text-green-700">
                Great! You have enough time for comprehensive preparation.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
