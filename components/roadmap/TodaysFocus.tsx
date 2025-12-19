'use client'

import { motion } from 'framer-motion'
import { Play, Check, SkipForward, Clock, Zap, Star, Calendar, Coffee } from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface TodaysFocusProps {
  plan: DailyPlan
  onStartQuestion: (scenarioId: string) => void
  onSkipQuestion: (scenarioId: string) => void
  onMarkComplete: (scenarioId: string) => void
}

export function TodaysFocus({
  plan,
  onStartQuestion,
  onSkipQuestion,
  onMarkComplete,
}: TodaysFocusProps) {
  const completedCount = plan.questions.filter((q) => q.status === 'completed').length
  const totalCount = plan.questions.length
  const allComplete = totalCount > 0 && completedCount === totalCount

  // Determine if this is today, past, or future
  const planDate = new Date(plan.date)
  planDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = planDate.getTime() === today.getTime()
  const isPast = planDate < today
  const isFuture = planDate > today

  // Format date for display
  const dateLabel = isToday
    ? "Today's Focus"
    : planDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  // Handle rest/review days (no questions)
  if (totalCount === 0) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent p-6 text-center">
          <Coffee className="h-12 w-12 mx-auto text-blue-500 mb-3" />
          <h2 className="text-lg font-bold">{dateLabel}</h2>
          <p className="text-muted-foreground mt-1">{plan.theme}</p>
          {plan.notes && (
            <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">{plan.notes}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border",
        isToday && "bg-gradient-to-r from-primary/10 to-transparent",
        isPast && "bg-gradient-to-r from-muted/50 to-transparent",
        isFuture && "bg-gradient-to-r from-blue-500/5 to-transparent"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              {isToday ? (
                <Zap className="h-5 w-5 text-primary" />
              ) : (
                <Calendar className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-lg font-bold">{dateLabel}</h2>
              {isPast && !allComplete && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                  Catch up
                </span>
              )}
              {isFuture && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  Upcoming
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{plan.theme}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">
              {completedCount}/{totalCount}
            </p>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / Math.max(totalCount, 1)) * 100}%` }}
            className={cn(
              "h-full rounded-full",
              allComplete ? "bg-green-500" : "bg-primary"
            )}
          />
        </div>
      </div>

      {/* Questions list */}
      <div className="divide-y divide-border">
        {plan.questions.map((question, index) => (
          <QuestionRow
            key={question.scenarioId}
            question={question}
            index={index}
            onStart={() => onStartQuestion(question.scenarioId)}
            onSkip={() => onSkipQuestion(question.scenarioId)}
            onComplete={() => onMarkComplete(question.scenarioId)}
          />
        ))}
      </div>

      {/* All complete celebration */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border-t border-green-200 text-center"
        >
          <div className="inline-flex items-center gap-2 text-green-700 font-medium">
            <Star className="h-5 w-5 fill-green-500" />
            Great job! You've completed today's goals!
          </div>
        </motion.div>
      )}

      {/* Notes if present */}
      {plan.notes && (
        <div className="p-4 bg-muted/50 border-t border-border">
          <p className="text-sm text-muted-foreground">{plan.notes}</p>
        </div>
      )}
    </div>
  )
}

function QuestionRow({
  question,
  index,
  onStart,
  onSkip,
  onComplete,
}: {
  question: DailyPlan['questions'][0]
  index: number
  onStart: () => void
  onSkip: () => void
  onComplete: () => void
}) {
  const isCompleted = question.status === 'completed'
  const isSkipped = question.status === 'skipped'
  const isInProgress = question.status === 'in_progress'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'p-4 flex items-center gap-4 transition-colors',
        isCompleted && 'bg-green-50/50',
        isSkipped && 'bg-muted/50 opacity-60'
      )}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isCompleted
            ? 'bg-green-500 text-white'
            : isSkipped
            ? 'bg-muted text-muted-foreground'
            : isInProgress
            ? 'bg-primary text-primary-foreground animate-pulse'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isCompleted ? (
          <Check className="h-4 w-4" />
        ) : isSkipped ? (
          <SkipForward className="h-4 w-4" />
        ) : (
          <span className="text-sm font-medium">{index + 1}</span>
        )}
      </div>

      {/* Question info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium truncate',
            isCompleted && 'line-through text-muted-foreground',
            isSkipped && 'line-through text-muted-foreground'
          )}
        >
          {question.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <DifficultyBadge difficulty={question.difficulty} />
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{question.estimatedMinutes} min
          </span>
          {question.score !== undefined && (
            <span className="text-green-600 font-medium">Score: {question.score}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {!isCompleted && !isSkipped && (
          <>
            <button
              onClick={onSkip}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              title="Skip"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
          </>
        )}
        {isSkipped && (
          <button
            onClick={onStart}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            Retry
          </button>
        )}
        {isCompleted && question.score === undefined && (
          <span className="text-green-600 text-sm font-medium">Completed</span>
        )}
      </div>
    </motion.div>
  )
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium',
        difficulty === 'easy' && 'bg-green-100 text-green-700',
        difficulty === 'medium' && 'bg-yellow-100 text-yellow-700',
        difficulty === 'hard' && 'bg-red-100 text-red-700'
      )}
    >
      {difficulty}
    </span>
  )
}
