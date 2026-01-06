'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clock,
  Play,
  RotateCcw,
  SkipForward,
} from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'
import { DifficultyBadge } from './FocusSharedComponents'

interface QuestionCardProps {
  question: DailyPlan['questions'][0]
  index: number
  onStart: () => void
  onSkip: () => void
  isFirst: boolean
}

export function QuestionCard({
  question,
  index,
  onStart,
  onSkip,
  isFirst,
}: QuestionCardProps) {
  const isSkipped = question.status === 'skipped'
  const isInProgress = question.status === 'in_progress'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'group relative p-4 rounded-xl border transition-all',
        isFirst && !isSkipped
          ? 'bg-primary/5 border-primary/30 shadow-sm'
          : 'bg-background border-border hover:border-primary/30 hover:shadow-sm',
        isSkipped && 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30',
        isInProgress && 'ring-2 ring-primary/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Number/status indicator */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold',
            isFirst && !isSkipped
              ? 'bg-primary text-primary-foreground'
              : isSkipped
              ? 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-700 dark:text-yellow-300'
              : isInProgress
              ? 'bg-primary/20 text-primary animate-pulse'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isSkipped ? (
            <SkipForward className="h-4 w-4" />
          ) : (
            index + 1
          )}
        </div>

        {/* Question info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{question.title}</h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <DifficultyBadge difficulty={question.difficulty} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {question.estimatedMinutes} min
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {question.pattern.replace(/-/g, ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isSkipped && (
            <button
              onClick={onSkip}
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              title="Skip for now"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onStart}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              isFirst && !isSkipped
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : isSkipped
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-muted hover:bg-primary hover:text-primary-foreground'
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
                <span className="hidden sm:inline">{isFirst ? 'Start' : 'Practice'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* First question highlight */}
      {isFirst && !isSkipped && (
        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-2 text-xs text-primary">
          <ArrowRight className="h-3 w-3" />
          <span>Recommended next</span>
        </div>
      )}
    </motion.div>
  )
}
