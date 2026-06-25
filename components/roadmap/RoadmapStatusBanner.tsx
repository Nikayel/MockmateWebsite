"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Archive,
  Trophy,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  Calendar,
  Target,
  PartyPopper,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Circle,
  SkipForward,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"

export type RoadmapStatusType = "expired" | "archived" | "completed" | "abandoned"

interface RoadmapStatusBannerProps {
  type: RoadmapStatusType
  roadmap: {
    companyName: string
    questionsCompleted: number
    totalQuestions: number
    actualHoursSpent: number
    interviewDate: Date
    patternCoverage?: any[]
  }
  onCreateNew: () => void
  onArchive?: () => void
  onReactivate?: () => void
  isArchiving?: boolean
  className?: string
}

const statusConfig = {
  expired: {
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/5",
    title: "Interview Date Passed",
    expandedTitle: "Your interview date has passed",
  },
  archived: {
    icon: Archive,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-500 dark:text-slate-400",
    borderColor: "border-slate-500/30",
    bgColor: "bg-slate-500/5",
    title: "Roadmap Archived",
    expandedTitle: "This roadmap was ended early",
  },
  completed: {
    icon: Trophy,
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600 dark:text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/5",
    title: "Roadmap Completed!",
    expandedTitle: "Congratulations! You completed all questions",
  },
  abandoned: {
    icon: XCircle,
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-500 dark:text-slate-400",
    borderColor: "border-slate-500/30",
    bgColor: "bg-slate-500/5",
    title: "Roadmap Replaced",
    expandedTitle: "This roadmap was replaced by a new one",
  },
}

export function RoadmapStatusBanner({
  type,
  roadmap,
  onCreateNew,
  onArchive,
  onReactivate,
  isArchiving = false,
  className,
}: RoadmapStatusBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = statusConfig[type]
  const Icon = config.icon

  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysUntil = Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysUntil < 0
  const canReactivate = (type === "archived" || type === "abandoned") && !isExpired

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-xl border transition-all",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", config.iconBg)}>
            <Icon className={cn("h-4 w-4", config.iconColor)} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium">{config.title}</span>
              {type === "completed" && <Sparkles className="h-3.5 w-3.5 text-yellow-500" />}
            </div>
            <span className="text-muted-foreground text-xs">
              {roadmap.companyName} • {progress}% complete
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick action buttons - visible in collapsed state */}
          <div className="hidden items-center gap-2 sm:flex">
            {type === "expired" && onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                }}
                disabled={isArchiving}
                className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isArchiving ? "Archiving..." : "Archive"}
              </button>
            )}
            {canReactivate && onReactivate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onReactivate()
                }}
                className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <RefreshCw className="mr-1 inline h-3 w-3" />
                Resume
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCreateNew()
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <Plus className="mr-1 inline h-3 w-3" />
              New
            </button>
          </div>

          {isExpanded ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-border/50 border-t px-4 pt-1 pb-4">
              {/* Status-specific message */}
              <p className="text-muted-foreground mb-4 text-sm">
                {type === "expired" && (
                  <>
                    Your interview was on{" "}
                    <span className="text-foreground font-medium">
                      {interviewDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    . Archive this roadmap to clear it, or create a new one.
                  </>
                )}
                {type === "archived" && (
                  <>
                    This roadmap was ended early.
                    {canReactivate &&
                      " You can resume it since the interview date hasn't passed yet."}
                  </>
                )}
                {type === "completed" && (
                  <>
                    Amazing work! You've completed all {roadmap.totalQuestions} questions.
                    {daysUntil > 0 && ` ${daysUntil} days until your interview.`}
                  </>
                )}
                {type === "abandoned" && (
                  <>
                    This roadmap was replaced when you created a new one.
                    {canReactivate && " You can still resume it."}
                  </>
                )}
              </p>

              {/* Progress Stats - Compact Grid */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p
                    className={cn(
                      "text-lg font-bold",
                      type === "completed"
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground"
                    )}
                  >
                    {progress}%
                  </p>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Completed
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-foreground text-lg font-bold">
                    {roadmap.questionsCompleted}/{roadmap.totalQuestions}
                  </p>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Questions
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-2.5 text-center">
                  <p className="text-foreground text-lg font-bold">
                    {Math.round(roadmap.actualHoursSpent || 0)}h
                  </p>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Studied
                  </p>
                </div>
              </div>

              {/* Interview Date Info */}
              {type !== "completed" && (
                <div
                  className={cn(
                    "mb-4 flex items-center gap-2 rounded-lg p-2.5 text-xs",
                    isExpired
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Interview:{" "}
                    {interviewDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {isExpired ? " (passed)" : ` (${daysUntil} days)`}
                  </span>
                </div>
              )}

              {/* Completed celebration */}
              {type === "completed" && daysUntil > 0 && (
                <div className="bg-primary/5 border-primary/20 text-primary mb-4 flex items-center gap-2 rounded-lg border p-2.5 text-xs">
                  <PartyPopper className="h-3.5 w-3.5" />
                  <span>{daysUntil} days to polish your skills before the interview!</span>
                </div>
              )}

              {/* Action Buttons - Mobile friendly */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={onCreateNew}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create New Roadmap
                </button>

                {type === "expired" && onArchive && (
                  <button
                    onClick={onArchive}
                    disabled={isArchiving}
                    className="border-border hover:bg-muted flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" />
                    {isArchiving ? "Archiving..." : "Archive & Clear"}
                  </button>
                )}

                {canReactivate && onReactivate && (
                  <button
                    onClick={onReactivate}
                    className="border-border hover:bg-muted flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Resume Roadmap
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Compact archived roadmaps list - shows as small cards/badges
 * For displaying multiple archived roadmaps without taking up space
 */
interface ArchivedRoadmapQuestion {
  scenarioId: string
  title: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  status: "pending" | "in_progress" | "completed" | "skipped" | "evaluating"
  score?: number
}

interface ArchivedRoadmapItemProps {
  roadmap: {
    id: string
    companyName: string
    status: "archived" | "completed" | "abandoned"
    questionsCompleted: number
    totalQuestions: number
    interviewDate: Date
    actualHoursSpent?: number
    patternCoverage?: Array<{
      pattern: string
      total: number
      completed: number
      percentage: number
    }>
    dailyPlans?: Array<{
      dayNumber: number
      theme: string
      questions: ArchivedRoadmapQuestion[]
    }>
    assessment?: {
      experienceLevel?: string
      hoursPerDay?: number
    }
  }
  onReactivate?: (id: string) => void
  isReactivating?: boolean
}

export function ArchivedRoadmapItem({
  roadmap,
  onReactivate,
  isReactivating = false,
}: ArchivedRoadmapItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
  const interviewDate = new Date(roadmap.interviewDate)
  const isExpired = interviewDate < new Date()
  const canReactivate = !isExpired && roadmap.status !== "completed"

  // Collect all questions from daily plans
  const allQuestions = roadmap.dailyPlans?.flatMap((day) => day.questions) || []
  const completedQuestions = allQuestions.filter((q) => q.status === "completed")
  const skippedQuestions = allQuestions.filter((q) => q.status === "skipped")
  const pendingQuestions = allQuestions.filter(
    (q) => q.status === "pending" || q.status === "in_progress"
  )

  const getStatusIcon = () => {
    switch (roadmap.status) {
      case "completed":
        return <Trophy className="h-3 w-3 text-green-600" />
      case "archived":
        return <Archive className="h-3 w-3 text-slate-500" />
      case "abandoned":
        return <XCircle className="h-3 w-3 text-slate-500" />
      default:
        return <Target className="h-3 w-3 text-slate-500" />
    }
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Expired
        </span>
      )
    }
    switch (roadmap.status) {
      case "completed":
        return (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Completed
          </span>
        )
      case "archived":
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Archived
          </span>
        )
      case "abandoned":
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Replaced
          </span>
        )
      default:
        return null
    }
  }

  const getDifficultyColor = (difficulty: string) =>
    difficultyColorClass(difficulty, "badgeOnLight")

  const getQuestionStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      case "skipped":
        return <SkipForward className="h-3.5 w-3.5 text-slate-400" />
      default:
        return <Circle className="text-muted-foreground h-3.5 w-3.5" />
    }
  }

  const hasDetails = roadmap.dailyPlans && roadmap.dailyPlans.length > 0

  return (
    <div className="bg-muted/30 border-border overflow-hidden rounded-lg border">
      {/* Header - Always Visible */}
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={cn(
          "flex w-full items-center justify-between p-3 transition-colors",
          hasDetails && "hover:bg-muted/50 cursor-pointer"
        )}
        disabled={!hasDetails}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            {getStatusIcon()}
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-foreground truncate text-sm font-medium">
                {roadmap.companyName}
              </span>
              {getStatusBadge()}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span>{progress}% complete</span>
              <span>•</span>
              <span>
                {roadmap.questionsCompleted}/{roadmap.totalQuestions}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canReactivate && onReactivate && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReactivate(roadmap.id)
              }}
              disabled={isReactivating}
              className="border-border hover:bg-muted shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isReactivating ? (
                <span className="flex items-center gap-1">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Resume
                </span>
              )}
            </button>
          )}
          {hasDetails &&
            (isExpanded ? (
              <ChevronUp className="text-muted-foreground h-4 w-4" />
            ) : (
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            ))}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-border/50 border-t px-3 pt-0 pb-3">
              {/* High-Level Stats */}
              <div className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-4">
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <Calendar className="text-muted-foreground mx-auto mb-1 h-3.5 w-3.5" />
                  <p className="text-foreground text-xs font-medium">
                    {interviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-muted-foreground text-[10px]">Interview</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <Clock className="text-muted-foreground mx-auto mb-1 h-3.5 w-3.5" />
                  <p className="text-foreground text-xs font-medium">
                    {Math.round(roadmap.actualHoursSpent || 0)}h
                  </p>
                  <p className="text-muted-foreground text-[10px]">Studied</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <CheckCircle2 className="mx-auto mb-1 h-3.5 w-3.5 text-green-600" />
                  <p className="text-foreground text-xs font-medium">{completedQuestions.length}</p>
                  <p className="text-muted-foreground text-[10px]">Completed</p>
                </div>
                <div className="bg-background/50 rounded-lg p-2 text-center">
                  <SkipForward className="mx-auto mb-1 h-3.5 w-3.5 text-slate-400" />
                  <p className="text-foreground text-xs font-medium">{skippedQuestions.length}</p>
                  <p className="text-muted-foreground text-[10px]">Skipped</p>
                </div>
              </div>

              {/* Pattern Coverage (if available) */}
              {roadmap.patternCoverage && roadmap.patternCoverage.length > 0 && (
                <div className="mb-3">
                  <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                    <Target className="h-3 w-3" />
                    Pattern Coverage
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {roadmap.patternCoverage.slice(0, 6).map((pattern) => (
                      <span
                        key={pattern.pattern}
                        className="bg-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                      >
                        <span className="text-foreground capitalize">
                          {pattern.pattern.replace(/-/g, " ")}
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            pattern.percentage >= 75
                              ? "text-green-600"
                              : pattern.percentage >= 50
                                ? "text-yellow-600"
                                : "text-muted-foreground"
                          )}
                        >
                          {pattern.percentage}%
                        </span>
                      </span>
                    ))}
                    {roadmap.patternCoverage.length > 6 && (
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px]">
                        +{roadmap.patternCoverage.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div>
                <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                  <BookOpen className="h-3 w-3" />
                  Questions ({allQuestions.length})
                </p>
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {allQuestions.map((question, idx) => (
                    <div
                      key={`${question.scenarioId}-${idx}`}
                      className="bg-background/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
                    >
                      {getQuestionStatusIcon(question.status)}
                      <span
                        className={cn(
                          "flex-1 truncate",
                          question.status === "completed"
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {question.title}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          getDifficultyColor(question.difficulty)
                        )}
                      >
                        {question.difficulty}
                      </span>
                      {question.score !== undefined && (
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {question.score}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Collapsible list of archived roadmaps
 * Shows a count, expands to show items
 */
interface ArchivedRoadmapsListProps {
  roadmaps: Array<{
    id: string
    companyName: string
    status: "archived" | "completed" | "abandoned"
    questionsCompleted: number
    totalQuestions: number
    interviewDate: Date
    actualHoursSpent?: number
    patternCoverage?: Array<{
      pattern: string
      total: number
      completed: number
      percentage: number
    }>
    dailyPlans?: Array<{
      dayNumber: number
      theme: string
      questions: ArchivedRoadmapQuestion[]
    }>
    assessment?: {
      experienceLevel?: string
      hoursPerDay?: number
    }
  }>
  onReactivate?: (id: string) => void
  reactivatingId?: string | null
}

export function ArchivedRoadmapsList({
  roadmaps,
  onReactivate,
  reactivatingId,
}: ArchivedRoadmapsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (roadmaps.length === 0) return null

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-muted/30 hover:bg-muted/50 flex w-full items-center justify-between px-4 py-2.5 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Archive className="text-muted-foreground h-4 w-4" />
          <span className="text-foreground font-medium">Archived Roadmaps</span>
          <span className="text-muted-foreground">({roadmaps.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-background space-y-2 p-3">
              {roadmaps.map((roadmap) => (
                <ArchivedRoadmapItem
                  key={roadmap.id}
                  roadmap={roadmap}
                  onReactivate={onReactivate}
                  isReactivating={reactivatingId === roadmap.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
