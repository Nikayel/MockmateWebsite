'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  SkipForward,
} from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { QuestionCard } from './FocusQuestionCard'
import { CompletedQuestionCard } from './FocusSharedComponents'

interface FocusQuestionsListProps {
  pendingQuestions: DailyPlan['questions']
  skippedQuestions: DailyPlan['questions']
  completedQuestions: DailyPlan['questions']
  onStartQuestion: (scenarioId: string) => void
  onSkipQuestion: (scenarioId: string) => void
}

export function FocusQuestionsList({
  pendingQuestions,
  skippedQuestions,
  completedQuestions,
  onStartQuestion,
  onSkipQuestion,
}: FocusQuestionsListProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  return (
    <div className="divide-y divide-border">
      {/* Pending Questions - Always visible */}
      {pendingQuestions.length > 0 && (
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Circle className="h-3 w-3" />
            Up Next ({pendingQuestions.length})
          </h3>
          <div className="space-y-2">
            {pendingQuestions.map((question, index) => (
              <QuestionCard
                key={question.scenarioId}
                question={question}
                index={index}
                onStart={() => onStartQuestion(question.scenarioId)}
                onSkip={() => onSkipQuestion(question.scenarioId)}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Skipped Questions */}
      {skippedQuestions.length > 0 && (
        <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/5">
          <h3 className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <SkipForward className="h-3 w-3" />
            Skipped ({skippedQuestions.length})
          </h3>
          <div className="space-y-2">
            {skippedQuestions.map((question, index) => (
              <QuestionCard
                key={question.scenarioId}
                question={question}
                index={index}
                onStart={() => onStartQuestion(question.scenarioId)}
                onSkip={() => onSkipQuestion(question.scenarioId)}
                isFirst={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Questions - Collapsible */}
      {completedQuestions.length > 0 && (
        <div className="bg-green-50/50 dark:bg-green-900/5">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full p-4 flex items-center justify-between hover:bg-green-100/50 dark:hover:bg-green-900/10 transition-colors"
          >
            <h3 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Completed ({completedQuestions.length})
            </h3>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4 text-green-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-green-600" />
            )}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {completedQuestions.map((question) => (
                    <CompletedQuestionCard
                      key={question.scenarioId}
                      question={question}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
