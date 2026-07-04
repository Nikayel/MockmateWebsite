"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, ChevronDown, ChevronUp, Circle, SkipForward } from "lucide-react"
import { DailyPlan } from "@/lib/data/company-questions/types"
import { QuestionCard } from "./FocusQuestionCard"
import { CompletedQuestionCard } from "./FocusSharedComponents"

interface FocusQuestionsListProps {
  pendingQuestions: DailyPlan["questions"]
  skippedQuestions: DailyPlan["questions"]
  completedQuestions: DailyPlan["questions"]
  onStartQuestion: (scenarioId: string) => void
  onSkipQuestion: (scenarioId: string) => void
  onDeferQuestion: (scenarioId: string) => void
  canDefer: boolean
}

export function FocusQuestionsList({
  pendingQuestions,
  skippedQuestions,
  completedQuestions,
  onStartQuestion,
  onSkipQuestion,
  onDeferQuestion,
  canDefer,
}: FocusQuestionsListProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  return (
    <div className="divide-border divide-y">
      {/* Pending Questions - Always visible */}
      {pendingQuestions.length > 0 && (
        <div className="p-4">
          <h3 className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
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
                onDefer={() => onDeferQuestion(question.scenarioId)}
                canDefer={canDefer}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Skipped Questions */}
      {skippedQuestions.length > 0 && (
        <div className="bg-yellow-50/50 p-4 dark:bg-yellow-900/5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-yellow-700 uppercase dark:text-yellow-400">
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
                onDefer={() => onDeferQuestion(question.scenarioId)}
                canDefer={canDefer}
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
            className="flex w-full items-center justify-between p-4 transition-colors hover:bg-green-100/50 dark:hover:bg-green-900/10"
          >
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-green-700 uppercase dark:text-green-400">
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
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 px-4 pb-4">
                  {completedQuestions.map((question) => (
                    <CompletedQuestionCard key={question.scenarioId} question={question} />
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
