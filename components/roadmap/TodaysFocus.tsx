'use client'

import { useState } from 'react'
import { Coffee } from 'lucide-react'
import { DailyPlan, PersonalizedRoadmap } from '@/lib/data/company-questions/types'
import { FocusHeader } from './FocusHeader'
import { FocusQuestionsList } from './FocusQuestionsList'
import { FocusCompletionBanner } from './FocusCompletionBanner'
import { RAGExplanationModal } from './RAGExplanationModal'

type RAGEnhancements = NonNullable<PersonalizedRoadmap['ragEnhancements']>

interface TodaysFocusProps {
  plan: DailyPlan
  onStartQuestion: (scenarioId: string) => void
  onSkipQuestion: (scenarioId: string) => void
  onMarkComplete: (scenarioId: string) => void
  ragEnhancements?: RAGEnhancements
  companyName?: string
}

export function TodaysFocus({
  plan,
  onStartQuestion,
  onSkipQuestion,
  onMarkComplete,
  ragEnhancements,
  companyName,
}: TodaysFocusProps) {
  const [showRAGExplanation, setShowRAGExplanation] = useState(false)

  const completedQuestions = plan.questions.filter((q) => q.status === 'completed')
  const pendingQuestions = plan.questions.filter((q) => q.status === 'pending' || q.status === 'in_progress')
  const skippedQuestions = plan.questions.filter((q) => q.status === 'skipped')

  const completedCount = completedQuestions.length
  const totalCount = plan.questions.length
  const allComplete = totalCount > 0 && completedCount === totalCount
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Calculate total time
  const totalMinutes = plan.questions.reduce((sum, q) => sum + q.estimatedMinutes, 0)
  const completedMinutes = completedQuestions.reduce((sum, q) => sum + q.estimatedMinutes, 0)

  // Determine if this is today, past, or future
  const planDate = new Date(plan.date)
  planDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = planDate.getTime() === today.getTime()

  // Format date for display
  const dateLabel = isToday
    ? "Today's Focus"
    : planDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  // Handle rest/review days (no questions)
  if (totalCount === 0) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 text-center bg-blue-500/5">
          <Coffee className="h-12 w-12 mx-auto text-blue-400 mb-3" />
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
      <FocusHeader
        plan={plan}
        completedCount={completedCount}
        totalCount={totalCount}
        pendingCount={pendingQuestions.length}
        skippedCount={skippedQuestions.length}
        completedMinutes={completedMinutes}
        totalMinutes={totalMinutes}
        progressPercent={progressPercent}
        allComplete={allComplete}
        onShowRAGExplanation={() => setShowRAGExplanation(true)}
        ragEnhancements={ragEnhancements}
      />

      <FocusQuestionsList
        pendingQuestions={pendingQuestions}
        skippedQuestions={skippedQuestions}
        completedQuestions={completedQuestions}
        onStartQuestion={onStartQuestion}
        onSkipQuestion={onSkipQuestion}
      />

      {allComplete && <FocusCompletionBanner completedMinutes={completedMinutes} />}

      {plan.notes && (
        <div className="p-4 bg-muted/30 border-t border-border">
          <p className="text-sm text-muted-foreground italic">{plan.notes}</p>
        </div>
      )}

      {ragEnhancements && (
        <RAGExplanationModal
          isOpen={showRAGExplanation}
          onClose={() => setShowRAGExplanation(false)}
          ragEnhancements={ragEnhancements}
          companyName={companyName}
        />
      )}
    </div>
  )
}
