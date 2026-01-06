'use client'

import { Check, Star } from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'

interface DifficultyBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard'
  small?: boolean
}

export function DifficultyBadge({ difficulty, small = false }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'font-medium rounded-full',
        small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        difficulty === 'easy' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        difficulty === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        difficulty === 'hard' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {difficulty}
    </span>
  )
}

interface CompletedQuestionCardProps {
  question: DailyPlan['questions'][0]
}

export function CompletedQuestionCard({ question }: CompletedQuestionCardProps) {
  return (
    <div className="p-3 rounded-lg bg-green-100/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
          <Check className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground/80 truncate text-sm">{question.title}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <DifficultyBadge difficulty={question.difficulty} small />
            {question.score !== undefined && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {question.score}%
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {question.estimatedMinutes} min
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
