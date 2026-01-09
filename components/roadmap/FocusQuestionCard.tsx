"use client"

import { motion } from "framer-motion"
import { ArrowRight, Clock, Loader2, Play, RotateCcw, SkipForward } from "lucide-react"
import { DailyPlan } from "@/lib/data/company-questions/types"
import { cn } from "@/lib/utils"
import { DifficultyBadge } from "./FocusSharedComponents"

interface QuestionCardProps {
  question: DailyPlan["questions"][0]
  index: number
  onStart: () => void
  onSkip: () => void
  isFirst: boolean
}

export function QuestionCard({ question, index, onStart, onSkip, isFirst }: QuestionCardProps) {
  const isSkipped = question.status === "skipped"
  const isInProgress = question.status === "in_progress"
  const isEvaluating = question.status === "evaluating"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative rounded-xl border p-4 transition-all",
        isFirst && !isSkipped && !isEvaluating
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-background border-border hover:border-primary/30 hover:shadow-sm",
        isSkipped &&
          "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/30 dark:bg-yellow-900/10",
        isInProgress && "ring-primary/50 ring-2",
        isEvaluating && "border-blue-200 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-900/10"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Number/status indicator */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            isFirst && !isSkipped && !isEvaluating
              ? "bg-primary text-primary-foreground"
              : isSkipped
                ? "bg-yellow-200 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300"
                : isEvaluating
                  ? "bg-blue-200 text-blue-700 dark:bg-blue-800/50 dark:text-blue-300"
                  : isInProgress
                    ? "bg-primary/20 text-primary animate-pulse"
                    : "bg-muted text-muted-foreground"
          )}
        >
          {isSkipped ? (
            <SkipForward className="h-4 w-4" />
          ) : isEvaluating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            index + 1
          )}
        </div>

        {/* Question info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-foreground truncate font-medium">{question.title}</h4>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={question.difficulty} />
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {question.estimatedMinutes} min
                </span>
                <span className="text-muted-foreground text-xs capitalize">
                  {question.pattern.replace(/-/g, " ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!isSkipped && !isEvaluating && (
            <button
              onClick={onSkip}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 opacity-0 transition-colors group-hover:opacity-100"
              title="Skip for now"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          {isEvaluating ? (
            <button
              onClick={onStart}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-all hover:bg-blue-600"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">View Results</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all",
                isFirst && !isSkipped
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : isSkipped
                    ? "bg-yellow-500 text-white hover:bg-yellow-600"
                    : "bg-muted hover:bg-primary hover:text-primary-foreground"
              )}
            >
              {isSkipped ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Retry</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span className="hidden sm:inline">{isFirst ? "Start" : "Practice"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* First question highlight */}
      {isFirst && !isSkipped && !isEvaluating && (
        <div className="border-primary/20 text-primary mt-3 flex items-center gap-2 border-t pt-3 text-xs">
          <ArrowRight className="h-3 w-3" />
          <span>Recommended next</span>
        </div>
      )}

      {/* Evaluating message */}
      {isEvaluating && (
        <div className="mt-3 flex items-center gap-2 border-t border-blue-200 pt-3 text-xs text-blue-600 dark:border-blue-800/30 dark:text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>We are evaluating your submission...</span>
        </div>
      )}
    </motion.div>
  )
}
