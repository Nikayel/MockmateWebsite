"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Brain, Calendar, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
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

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getDifficultyColor(difficulty: string | undefined): string {
  return difficultyColorClass(difficulty?.toLowerCase(), "dot")
}

function getDifficultyBorder(difficulty: string | undefined): string {
  switch (difficulty?.toLowerCase()) {
    case "hard":
      return "border-red-500/40 bg-red-500/10"
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
        "relative flex h-9 w-full flex-col items-center justify-center rounded-lg transition-all",
        day.isCurrentMonth ? "hover:bg-white/5" : "opacity-30",
        day.isToday && "bg-indigo-500/10 ring-1 ring-indigo-500",
        isSelected && !day.isToday && "bg-white/10",
        hasItems &&
          day.isCurrentMonth &&
          !day.isToday &&
          !isSelected &&
          getDifficultyBorder(maxDifficulty),
        day.isPast && day.isCurrentMonth && !day.isToday && "opacity-50"
      )}
    >
      <span
        className={cn(
          "text-xs font-medium",
          day.isToday ? "text-indigo-400" : day.isCurrentMonth ? "text-white" : "text-gray-600",
          day.isPast && !day.isToday && "text-gray-500"
        )}
      >
        {day.date.getDate()}
      </span>
      {hasItems && day.isCurrentMonth && (
        <div className="absolute bottom-0.5 flex gap-0.5">
          {day.items.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className={cn("h-1 w-1 rounded-full", getDifficultyColor(item.difficulty))}
            />
          ))}
        </div>
      )}
    </button>
  )
}

function TodayFocusCard({ items }: { items: DueItem[] }) {
  if (items.length === 0) return null

  const hardCount = items.filter((i) => i.difficulty?.toLowerCase() === "hard").length
  const mediumCount = items.filter((i) => i.difficulty?.toLowerCase() === "medium").length
  const easyCount = items.filter((i) => i.difficulty?.toLowerCase() === "easy").length

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-1.5">
        {hardCount > 0 && (
          <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            {hardCount} Hard
          </span>
        )}
        {mediumCount > 0 && (
          <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            {mediumCount} Medium
          </span>
        )}
        {easyCount > 0 && (
          <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {easyCount} Easy
          </span>
        )}
      </div>

      {/* Problem list */}
      <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
        {items.slice(0, 8).map((item) => (
          <div
            key={item.problem_id}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="truncate text-xs text-gray-500">{item.pattern}</p>
            </div>
            <span
              className={cn(
                "ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                item.difficulty?.toLowerCase() === "hard" && "bg-red-500/20 text-red-400",
                item.difficulty?.toLowerCase() === "medium" && "bg-amber-500/20 text-amber-400",
                item.difficulty?.toLowerCase() === "easy" && "bg-emerald-500/20 text-emerald-400"
              )}
            >
              {item.difficulty?.charAt(0)}
            </span>
          </div>
        ))}
        {items.length > 8 && (
          <p className="text-center text-xs text-gray-500">+{items.length - 8} more</p>
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            {isToday ? "Today" : isFuture ? "Scheduled" : "Past Due"}
          </span>
          <h3 className="text-sm font-semibold text-white">
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-lg leading-none text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500">No reviews scheduled</p>
      ) : (
        <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.problem_id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="truncate text-xs text-gray-500">{item.pattern}</p>
              </div>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                  item.difficulty?.toLowerCase() === "hard" && "bg-red-500/20 text-red-400",
                  item.difficulty?.toLowerCase() === "medium" && "bg-amber-500/20 text-amber-400",
                  item.difficulty?.toLowerCase() === "easy" && "bg-emerald-500/20 text-emerald-400"
                )}
              >
                {item.difficulty?.charAt(0)}
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

  // Generate calendar days - only 35 days (5 weeks) for compact view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)

    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())

    const days: DayData[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 35; i++) {
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
    // Toggle selection if clicking same date
    if (selectedDate?.toDateString() === date.toDateString()) {
      setSelectedDate(null)
      setSelectedItems([])
    } else {
      setSelectedDate(date)
      setSelectedItems(items)
      onDateSelect?.(date, items)
    }
  }

  // Stats for the month
  const monthStats = useMemo(() => {
    const monthDays = calendarDays.filter((d) => d.isCurrentMonth)
    const daysWithReviews = monthDays.filter((d) => d.items.length > 0).length
    const totalReviews = monthDays.reduce((sum, d) => sum + d.items.length, 0)
    return { daysWithReviews, totalReviews }
  }, [calendarDays])

  // Determine what to show in the side panel
  const showTodayPanel = todayItems.length > 0 && !selectedDate
  const showSelectedPanel = selectedDate !== null
  const showEmptyState = !showTodayPanel && !showSelectedPanel

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Review Schedule</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Easy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span>Hard</span>
          </div>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div className="flex gap-4">
        {/* Calendar - Left side */}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            {/* Month Navigation */}
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-white">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={handleNextMonth}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={idx}
                  className="flex h-6 items-center justify-center text-[10px] font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, index) => (
                <CalendarDay
                  key={index}
                  day={day}
                  onSelect={handleDateSelect}
                  selectedDate={selectedDate}
                />
              ))}
            </div>

            {/* Stats footer */}
            <div className="mt-2 flex items-center justify-center gap-3 border-t border-white/5 pt-2 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{monthStats.daysWithReviews} days scheduled</span>
              </div>
              <span>•</span>
              <span>{monthStats.totalReviews} reviews</span>
            </div>
          </div>
        </div>

        {/* Side Panel - Right side */}
        <div className="w-64 shrink-0">
          <div className="h-full rounded-xl border border-white/10 bg-white/5 p-3">
            {/* Panel Header */}
            <div className="mb-3 flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-white">
                {showTodayPanel ? "Today's Review" : showSelectedPanel ? "Selected Day" : "Reviews"}
              </span>
              {(showTodayPanel || showSelectedPanel) && (
                <span className="ml-auto rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                  {showTodayPanel ? todayItems.length : selectedItems.length}
                </span>
              )}
            </div>

            {/* Panel Content */}
            {showTodayPanel && <TodayFocusCard items={todayItems} />}

            {showSelectedPanel && (
              <SelectedDayPanel
                date={selectedDate}
                items={selectedItems}
                onClose={() => setSelectedDate(null)}
              />
            )}

            {showEmptyState && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-2 h-8 w-8 text-gray-600" />
                <p className="text-xs text-gray-500">No reviews due today</p>
                <p className="mt-1 text-[10px] text-gray-600">
                  Click a date to see scheduled reviews
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
