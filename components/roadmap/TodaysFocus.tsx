'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Check,
  SkipForward,
  Clock,
  Zap,
  Star,
  Calendar,
  Coffee,
  ChevronDown,
  ChevronUp,
  Trophy,
  Target,
  Flame,
  RotateCcw,
  CheckCircle2,
  Circle,
  ArrowRight,
  HelpCircle,
  X,
  Lightbulb,
  Building2,
  TrendingUp
} from 'lucide-react'
import { DailyPlan } from '@/lib/data/company-questions/types'
import { cn } from '@/lib/utils'
import type { PatternInsight } from '@/lib/rag/roadmap-rag'

interface RAGEnhancements {
  enabled: boolean
  patternInsights: PatternInsight[]
  companyTips: string[]
  personalizedAdvice: string[]
  adaptiveAdjustments: { type: string; description: string; reason: string; impact: string }[]
  studyStrategies: { name: string; description: string; priority: number }[]
}

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
  const [showCompleted, setShowCompleted] = useState(false)
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
      {/* Header with progress - subtle accent based on status */}
      <div className={cn(
        "p-4 md:p-5",
        isToday && "bg-accent/5 border-b border-accent/10",
        isPast && !allComplete && "bg-amber-500/5 border-b border-amber-500/10",
        allComplete && "bg-green-500/5 border-b border-green-500/10"
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isToday ? (
                <Flame className="h-5 w-5 text-primary" />
              ) : (
                <Calendar className="h-5 w-5 text-muted-foreground" />
              )}
              <h2 className="text-lg font-bold">{dateLabel}</h2>
              {isPast && !allComplete && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                  Catch up
                </span>
              )}
              {isFuture && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                  Upcoming
                </span>
              )}
              {allComplete && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  Complete
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{plan.theme}</p>
            {/* RAG Explanation Button */}
            {ragEnhancements?.enabled && (
              <button
                onClick={() => setShowRAGExplanation(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Why these questions?</span>
              </button>
            )}
          </div>

          {/* Circular progress */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/30"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 88" }}
                animate={{ strokeDasharray: `${(progressPercent / 100) * 88} 88` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  allComplete ? 'text-green-500' : 'text-primary'
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold">{completedCount}/{totalCount}</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{completedMinutes}/{totalMinutes} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span>{pendingQuestions.length} remaining</span>
          </div>
          {skippedQuestions.length > 0 && (
            <div className="flex items-center gap-1.5 text-yellow-600">
              <SkipForward className="h-3.5 w-3.5" />
              <span>{skippedQuestions.length} skipped</span>
            </div>
          )}
        </div>
      </div>

      {/* Questions sections */}
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
                    {completedQuestions.map((question, index) => (
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

      {/* All complete celebration */}
      {allComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-green-500/10 border-t border-green-200 dark:border-green-800/30"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-green-700 dark:text-green-400">
                Excellent work! You've completed today's goals!
              </p>
              <p className="text-sm text-green-600/70 dark:text-green-400/70">
                {completedMinutes} minutes of focused practice
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notes if present */}
      {plan.notes && (
        <div className="p-4 bg-muted/30 border-t border-border">
          <p className="text-sm text-muted-foreground italic">{plan.notes}</p>
        </div>
      )}

      {/* RAG Explanation Modal */}
      <AnimatePresence>
        {showRAGExplanation && ragEnhancements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRAGExplanation(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-accent/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">AI-Powered Selection</h3>
                    <p className="text-xs text-muted-foreground">Why these questions were chosen for you</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRAGExplanation(false)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {/* Company-Specific Tips */}
                {ragEnhancements.companyTips.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      {companyName ? `${companyName} Interview Tips` : 'Company Interview Tips'}
                    </div>
                    <ul className="space-y-1.5 pl-6">
                      {ragEnhancements.companyTips.slice(0, 4).map((tip, i) => (
                        <li key={i} className="text-sm text-muted-foreground list-disc">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pattern Insights */}
                {ragEnhancements.patternInsights.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Pattern Focus for Today
                    </div>
                    <div className="space-y-2">
                      {ragEnhancements.patternInsights.slice(0, 3).map((insight, i) => (
                        <div key={i} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground capitalize">
                              {insight.pattern.replace(/-/g, ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {insight.companyFrequency}% frequency
                            </span>
                          </div>
                          {insight.suggestedApproach && (
                            <p className="text-xs text-muted-foreground">{insight.suggestedApproach}</p>
                          )}
                          {insight.tips.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {insight.tips.slice(0, 2).map((tip, j) => (
                                <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-primary mt-1">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personalized Advice */}
                {ragEnhancements.personalizedAdvice.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Personalized for You
                    </div>
                    <ul className="space-y-1.5 pl-6">
                      {ragEnhancements.personalizedAdvice.slice(0, 3).map((advice, i) => (
                        <li key={i} className="text-sm text-muted-foreground list-disc">
                          {advice}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Study Strategies */}
                {ragEnhancements.studyStrategies.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Target className="h-4 w-4 text-purple-500" />
                      Recommended Strategies
                    </div>
                    <div className="space-y-2">
                      {ragEnhancements.studyStrategies.slice(0, 2).map((strategy, i) => (
                        <div key={i} className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                          <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{strategy.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adaptive Adjustments */}
                {ragEnhancements.adaptiveAdjustments.length > 0 && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      📊 Adaptive Adjustments Made
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ragEnhancements.adaptiveAdjustments[0].description}
                      {ragEnhancements.adaptiveAdjustments[0].reason && (
                        <span className="italic"> — {ragEnhancements.adaptiveAdjustments[0].reason}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Questions are selected using our AI-powered RAG system based on your target company, experience level, and progress.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Card for pending/skipped questions
function QuestionCard({
  question,
  index,
  onStart,
  onSkip,
  isFirst,
}: {
  question: DailyPlan['questions'][0]
  index: number
  onStart: () => void
  onSkip: () => void
  isFirst: boolean
}) {
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

// Card for completed questions
function CompletedQuestionCard({
  question,
}: {
  question: DailyPlan['questions'][0]
}) {
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

function DifficultyBadge({ difficulty, small = false }: { difficulty: 'easy' | 'medium' | 'hard', small?: boolean }) {
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
