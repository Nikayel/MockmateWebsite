"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Brain, Calendar, Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DueItem } from "@/lib/hooks/useSpacedRepetition"

interface ReviewCalendarProps {
  dueItems: DueItem[]
  upcoming: DueItem[]
  onDateSelect?: (date: Date, items: DueItem[]) => void
  className?: string
}

interface DayData {
  date: Date
  items: DueItem[]
  isToday: boolean
  isCurrentMonth: boolean
  isPast: boolean
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function getDifficultyColor(difficulty: string | undefined): string {
  switch (difficulty?.toLowerCase()) {
    case "hard":
      return "bg-rose-500"
    case "medium":
      return "bg-amber-500"
    case "easy":
      return "bg-emerald-500"
    default:
      return "bg-indigo-500"
  }
}

function getDifficultyBorder(difficulty: string | undefined): string {
  switch (difficulty?.toLowerCase()) {
    case "hard":
      return "border-rose-500/40 bg-rose-500/10"
    case "medium":
      return "border-amber-500/40 bg-amber-500/10"
    case "easy":
      return "border-emerald-500/40 bg-emerald-500/10"
    default:
      return "border-indigo-500/40 bg-indigo-500/10"
  }
}

function CalendarDay({
  day,
  onSelect,
  selectedDate,
}: {
  day: DayData
  onSelect: (date: Date, items: DueItem[]) => void
  selectedDate: Date | null
}) {
  const isSelected = selectedDate?.toDateString() === day.date.toDateString()
  const hasItems = day.items.length > 0
  const maxDifficulty = day.items.reduce((max, item) => {
    const diff = item.difficulty?.toLowerCase()
    if (diff === "hard") return "hard"
    if (diff === "medium" && max !== "hard") return "medium"
    if (diff === "easy" && max !== "hard" && max !== "medium") return "easy"
    return max
  }, "" as string)

  return (
    <button
      onClick={() => onSelect(day.date, day.items)}
      disabled={!day.isCurrentMonth}
      className={cn(
        "relative flex h-12 w-12 flex-col items-center justify-center rounded-xl transition-all",
        day.isCurrentMonth ? "hover:bg-white/5" : "opacity-30",
        day.isToday && "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0a0a0a]",
        isSelected && "bg-indigo-500/20",
        hasItems && day.isCurrentMonth && getDifficultyBorder(maxDifficulty),
        day.isPast && day.isCurrentMonth && !day.isToday && "opacity-50"
      )}
    >
      <span
        className={cn(
          "text-sm font-medium",
          day.isToday ? "text-indigo-400" : day.isCurrentMonth ? "text-white" : "text-gray-600",
          day.isPast && !day.isToday && "text-gray-500"
        )}
      >
        {day.date.getDate()}
      </span>
      {hasItems && day.isCurrentMonth && (
        <div className="absolute bottom-1.5 flex gap-0.5">
          {day.items.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className={cn("h-1 w-1 rounded-full", getDifficultyColor(item.difficulty))}
            />
          ))}
          {day.items.length > 3 && (
            <span className="text-[8px] text-gray-500">+{day.items.length - 3}</span>
          )}
        </div>
      )}
    </button>
  )
}

function TodayFocusCard({ items, onStart }: { items: DueItem[]; onStart?: () => void }) {
  if (items.length === 0) return null

  const hardCount = items.filter((i) => i.difficulty?.toLowerCase() === "hard").length
  const mediumCount = items.filter((i) => i.difficulty?.toLowerCase() === "medium").length
  const easyCount = items.filter((i) => i.difficulty?.toLowerCase() === "easy").length

  // Get the highest priority item
  const topItem = items[0]

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
          Today's Review
        </span>
        <span className="text-xs text-gray-500">{items.length} problems</span>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-white">{topItem.title}</h3>

      <div className="mb-4 flex flex-wrap gap-2">
        {hardCount > 0 && (
          <span className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-400">
            {hardCount} Hard
          </span>
        )}
        {mediumCount > 0 && (
          <span className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
            {mediumCount} Medium
          </span>
        )}
        {easyCount > 0 && (
          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
            {easyCount} Easy
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Last practiced:{" "}
          {topItem.last_reviewed_at
            ? new Date(topItem.last_reviewed_at).toLocaleDateString()
            : "Never"}
        </span>
        {onStart && (
          <button
            onClick={onStart}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
          >
            Start Session →
          </button>
        )}
      </div>
    </div>
  )
}

function SelectedDayPanel({
  date,
  items,
  onClose,
}: {
  date: Date
  items: DueItem[]
  onClose: () => void
}) {
  const isToday = date.toDateString() === new Date().toDateString()
  const isFuture = date > new Date()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {isToday ? "Today" : isFuture ? "Scheduled" : "Past Due"}
          </span>
          <h3 className="text-lg font-semibold text-white">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews scheduled for this day</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.problem_id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-gray-500">{item.pattern}</p>
              </div>
              <span
                className={cn(
                  "rounded-lg px-2 py-1 text-xs font-medium",
                  item.difficulty?.toLowerCase() === "hard" && "bg-rose-500/20 text-rose-400",
                  item.difficulty?.toLowerCase() === "medium" && "bg-amber-500/20 text-amber-400",
                  item.difficulty?.toLowerCase() === "easy" && "bg-emerald-500/20 text-emerald-400"
                )}
              >
                {item.difficulty}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReviewCalendar({
  dueItems,
  upcoming,
  onDateSelect,
  className,
}: ReviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedItems, setSelectedItems] = useState<DueItem[]>([])

  // Combine all items for calendar display
  const allItems = useMemo(() => [...dueItems, ...upcoming], [dueItems, upcoming])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())

    const days: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const dateStr = date.toDateString()
      const itemsForDay = allItems.filter((item) => {
        const itemDate = new Date(item.next_review_at)
        return itemDate.toDateString() === dateStr
      })

      days.push({
        date,
        items: itemsForDay,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === month,
        isPast: date < today,
      })
    }

    return days
  }, [currentDate, allItems])

  // Get today's items
  const todayItems = useMemo(() => {
    const today = new Date().toDateString()
    return dueItems.filter((item) => {
      const itemDate = new Date(item.next_review_at)
      return itemDate.toDateString() === today || itemDate < new Date()
    })
  }, [dueItems])

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const handleDateSelect = (date: Date, items: DueItem[]) => {
    setSelectedDate(date)
    setSelectedItems(items)
    onDateSelect?.(date, items)
  }

  // Stats for the month
  const monthStats = useMemo(() => {
    const monthDays = calendarDays.filter((d) => d.isCurrentMonth)
    const daysWithReviews = monthDays.filter((d) => d.items.length > 0).length
    const totalReviews = monthDays.reduce((sum, d) => sum + d.items.length, 0)
    return { daysWithReviews, totalReviews }
  }, [calendarDays])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Spaced Repetition</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>{monthStats.daysWithReviews} days</span>
          <span>•</span>
          <span>{monthStats.totalReviews} reviews</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-white">
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button
          onClick={handleNextMonth}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* Day Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="flex h-8 items-center justify-center text-xs font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <CalendarDay
              key={index}
              day={day}
              onSelect={handleDateSelect}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-gray-500">Easy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-gray-500">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="text-gray-500">Hard</span>
        </div>
      </div>

      {/* Today's Focus Card */}
      {todayItems.length > 0 && !selectedDate && <TodayFocusCard items={todayItems} />}

      {/* Selected Day Panel */}
      {selectedDate && (
        <SelectedDayPanel
          date={selectedDate}
          items={selectedItems}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* How It Works */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">How Spaced Repetition Works</span>
        </div>
        <p className="text-xs leading-relaxed text-gray-400">
          Problems you struggle with appear more frequently. As you improve, intervals increase
          automatically. This scientifically-proven method maximizes long-term retention with
          minimal study time.
        </p>
      </div>
    </div>
  )
}
