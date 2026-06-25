'use client'

/**
 * Smart Recommendations Component
 *
 * Displays personalized problem recommendations with rich explanations,
 * visual symbols, and evidence-backed reasoning.
 *
 * Features:
 * - Visual priority symbols (emoji icons)
 * - Expandable explanations with "why" reasoning
 * - Evidence badges showing data-backed insights
 * - User readiness indicators
 * - Session insights and tips
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Clock, Target, TrendingUp, Zap, AlertTriangle, BookOpen } from 'lucide-react'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import { difficultyColorClass } from '@/lib/ui/difficulty-colors'

// Types matching our backend
interface RecommendationSymbol {
  icon: string
  label: string
  color: string
  priority: number
}

interface RecommendationTag {
  text: string
  color: string
  icon?: string
}

interface ExplanationEvidence {
  type: 'performance' | 'timing' | 'pattern' | 'interview' | 'misconception' | 'decay'
  icon: string
  text: string
  value?: number | string
}

interface RecommendationExplanation {
  headline: string
  reasoning: string[]
  evidence: ExplanationEvidence[]
  confidence: number
  alternativeAction?: string
}

interface SmartRecommendation {
  id: string
  problemId: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  symbol: RecommendationSymbol
  tags: RecommendationTag[]
  explanation: RecommendationExplanation
  score: number
  userReadiness: number
  interviewRelevance: number
  estimatedMinutes: number
  prerequisitesMet: boolean
}

interface SessionInsight {
  icon: string
  title: string
  description: string
  actionable: boolean
  action?: string
}

interface UserSummary {
  level: 'beginner' | 'intermediate' | 'advanced'
  interviewReadiness: number
  strengths: { pattern: DSAPattern; score: number }[]
  focusAreas: { pattern: DSAPattern; reason: string }[]
  streak: number
  trend: 'improving' | 'stable' | 'declining'
}

interface SmartRecommendationsProps {
  recommendations: SmartRecommendation[]
  sessionInsights: SessionInsight[]
  userSummary: UserSummary
  onSelectProblem: (problemId: string) => void
  isLoading?: boolean
}

// Pattern display names
const patternNames: Record<string, string> = {
  'arrays-hashing': 'Arrays & Hashing',
  'two-pointers': 'Two Pointers',
  'sliding-window': 'Sliding Window',
  'stack': 'Stack',
  'binary-search': 'Binary Search',
  'linked-list': 'Linked List',
  'trees': 'Trees',
  'heap': 'Heap',
  'backtracking': 'Backtracking',
  'graphs': 'Graphs',
  'dp-1d': '1D DP',
  'dp-2d': '2D DP',
  'greedy': 'Greedy',
  'intervals': 'Intervals',
  'bit-manipulation': 'Bit Manipulation',
  'trie': 'Trie',
  'union-find': 'Union Find',
}

// Readiness indicator component
function ReadinessIndicator({ readiness }: { readiness: number }) {
  const getColor = () => {
    if (readiness >= 70) return 'bg-green-500'
    if (readiness >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getLabel = () => {
    if (readiness >= 70) return 'Ready'
    if (readiness >= 40) return 'Challenging'
    return 'Stretch'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${readiness}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{getLabel()}</span>
    </div>
  )
}

// Evidence badge component
function EvidenceBadge({ evidence }: { evidence: ExplanationEvidence }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
      <span>{evidence.icon}</span>
      <span className="text-gray-600 dark:text-gray-300">{evidence.text}</span>
      {evidence.value !== undefined && (
        <span className="font-medium text-gray-900 dark:text-white">{evidence.value}</span>
      )}
    </div>
  )
}

// Single recommendation card
function RecommendationCard({
  recommendation,
  index,
  onSelect,
}: {
  recommendation: SmartRecommendation
  index: number
  onSelect: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`border rounded-lg overflow-hidden ${recommendation.symbol.color} transition-shadow hover:shadow-md`}
    >
      {/* Main card content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Priority symbol */}
            <div className="text-2xl" title={recommendation.symbol.label}>
              {recommendation.symbol.icon}
            </div>

            <div>
              {/* Problem title */}
              <h3 className="font-medium text-gray-900 dark:text-white">
                {recommendation.title}
              </h3>

              {/* Tags row */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColorClass(recommendation.difficulty, 'badgeOnLight')}`}>
                  {recommendation.difficulty.charAt(0).toUpperCase() + recommendation.difficulty.slice(1)}
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                  {patternNames[recommendation.pattern] || recommendation.pattern}
                </span>
                {recommendation.symbol.label !== 'Daily Practice' && (
                  <span className={`px-2 py-0.5 rounded text-xs ${recommendation.symbol.color}`}>
                    {recommendation.symbol.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Time estimate */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{recommendation.estimatedMinutes}m</span>
          </div>
        </div>

        {/* Explanation headline */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {recommendation.explanation.headline}
        </p>

        {/* Readiness and expand button row */}
        <div className="flex items-center justify-between">
          <ReadinessIndicator readiness={recommendation.userReadiness} />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Why?
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={onSelect}
              className="px-4 py-1.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </div>

      {/* Expandable explanation section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="p-4 space-y-3">
              {/* Reasoning bullets */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Why this problem?</h4>
                <ul className="space-y-1">
                  {recommendation.explanation.reasoning.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-primary mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Evidence badges */}
              {recommendation.explanation.evidence.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Based on</h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.explanation.evidence.map((ev, i) => (
                      <EvidenceBadge key={i} evidence={ev} />
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500">
                  Recommendation confidence: {recommendation.explanation.confidence}%
                </span>

                {recommendation.explanation.alternativeAction && (
                  <button className="text-xs text-gray-500 hover:text-gray-700 underline">
                    {recommendation.explanation.alternativeAction}
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

// Session insights panel
function SessionInsightsPanel({ insights }: { insights: SessionInsight[] }) {
  if (insights.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        Session Insights
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm"
          >
            <span className="text-xl">{insight.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                {insight.title}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">{insight.description}</p>
              {insight.actionable && insight.action && (
                <button className="text-xs text-primary font-medium mt-1 hover:underline">
                  {insight.action} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// User summary header
function UserSummaryHeader({ summary }: { summary: UserSummary }) {
  const levelColors = {
    beginner: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    intermediate: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    advanced: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  }

  const trendIcons = {
    improving: <TrendingUp className="w-4 h-4 text-green-500" />,
    stable: <Target className="w-4 h-4 text-gray-500" />,
    declining: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        {/* Level badge */}
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${levelColors[summary.level]}`}>
          {summary.level.charAt(0).toUpperCase() + summary.level.slice(1)}
        </span>

        {/* Interview readiness */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Interview Readiness:</span>
          <div className="flex items-center gap-1">
            <span className="font-bold text-lg">{summary.interviewReadiness}%</span>
            {trendIcons[summary.trend]}
          </div>
        </div>
      </div>

      {/* Strengths preview */}
      {summary.strengths.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Strong at:</span>
          <div className="flex gap-1">
            {summary.strengths.slice(0, 2).map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs"
              >
                {patternNames[s.pattern] || s.pattern}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Main component
export function SmartRecommendations({
  recommendations,
  sessionInsights,
  userSummary,
  onSelectProblem,
  isLoading = false,
}: SmartRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse" />
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Recommended for You
        </h2>
        <span className="text-sm text-gray-500">
          Personalized based on your profile
        </span>
      </div>

      {/* User summary */}
      <UserSummaryHeader summary={userSummary} />

      {/* Session insights */}
      <SessionInsightsPanel insights={sessionInsights} />

      {/* Recommendations list */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            index={index}
            onSelect={() => onSelectProblem(rec.problemId)}
          />
        ))}
      </div>

      {/* Empty state */}
      {recommendations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No recommendations yet
          </h3>
          <p className="text-gray-500">
            Complete a few practice sessions to get personalized recommendations.
          </p>
        </div>
      )}
    </div>
  )
}

export default SmartRecommendations
