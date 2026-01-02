'use client'

/**
 * Skill Insights Dashboard Component
 *
 * Displays comprehensive skill analytics including:
 * - Pattern mastery radar chart
 * - Cognitive profile insights
 * - Knowledge gaps and misconceptions
 * - Growth trajectory
 * - Actionable insights
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  BookOpen,
  Activity,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

// Types matching our backend API response
interface SkillInsightsData {
  overview: {
    interviewReadiness: number
    totalConcepts: number
    masteredConcepts: number
    learningConcepts: number
    needsWorkConcepts: number
  }
  cognitive: {
    learningStyle: {
      primary: string
      secondary: string | null
      confidence: number
    }
    problemSolvingApproach: string
    patternRecognitionSpeed: string
    complexityTolerance: string
  }
  behavioral: {
    motivationType: string
    consistency: number
    averageSessionMinutes: number
    sessionsPerWeek: string
    fatigueLevel: string
    recommendedBreak: boolean
  }
  patternMastery: Array<{
    pattern: DSAPattern
    mastery: number
    practiceCount: number
  }>
  skillDecay: Array<{
    pattern: DSAPattern
    daysSincePractice: number
    decayPercent: number
    urgency: string
  }>
  misconceptions: Array<{
    id: string
    pattern: DSAPattern
    type: string
    description: string
    frequency: number
    suggestedFix: string
  }>
  gaps: Array<{
    pattern: DSAPattern
    missingPrereqs: string[]
    impact: string
  }>
  growth: {
    velocity: number
    accelerating: boolean
    projectedLevel: string
    projectedDaysToGoal: number | null
  }
  retention: {
    shortTermRetention: number
    mediumTermRetention: number
    longTermRetention: number
  }
  insights: Array<{
    id: string
    type: string
    icon: string
    title: string
    description: string
    action?: string
    priority: string
  }>
  interviewReadiness: {
    overall: number
    strongestAreas: DSAPattern[]
    criticalGaps: string[]
    estimatedPrepDays: number
  }
}

interface SkillInsightsProps {
  data: SkillInsightsData
  isLoading?: boolean
}

// Pattern name mapping
const patternNames: Record<string, string> = {
  'arrays-hashing': 'Arrays',
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
  'bit-manipulation': 'Bits',
  'trie': 'Trie',
  'union-find': 'Union Find',
}

// Circular progress component
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
}: {
  value: number
  size?: number
  strokeWidth?: number
  label: string
  sublabel?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  const getColor = () => {
    if (value >= 70) return 'text-green-500'
    if (value >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={getColor()}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</span>
        <span className="text-xs text-gray-500">{label}</span>
        {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
      </div>
    </div>
  )
}

// Pattern mastery bar
function PatternMasteryBar({
  pattern,
  mastery,
  practiceCount,
}: {
  pattern: DSAPattern
  mastery: number
  practiceCount: number
}) {
  const getColor = () => {
    if (mastery >= 70) return 'bg-green-500'
    if (mastery >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-600 dark:text-gray-300 truncate">
        {patternNames[pattern] || pattern}
      </span>
      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${mastery}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />
      </div>
      <span className="w-12 text-sm text-gray-500 text-right">{mastery}%</span>
    </div>
  )
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color = 'text-primary',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sublabel?: string
  color?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
    </div>
  )
}

// Insight card component
function InsightCard({
  insight,
}: {
  insight: SkillInsightsData['insights'][0]
}) {
  const priorityColors = {
    high: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
    low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-4 rounded-r-lg p-4 ${priorityColors[insight.priority as keyof typeof priorityColors] || priorityColors.low}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{insight.icon}</span>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{insight.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.description}</p>
          {insight.action && (
            <button className="text-sm text-primary font-medium mt-2 flex items-center gap-1 hover:underline">
              {insight.action}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Skill decay warning
function SkillDecayWarning({
  decayItems,
}: {
  decayItems: SkillInsightsData['skillDecay']
}) {
  if (decayItems.length === 0) return null

  return (
    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Skills Fading</h4>
      </div>
      <div className="space-y-2">
        {decayItems.slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {patternNames[item.pattern] || item.pattern}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{item.daysSincePractice}d ago</span>
              <span className={`px-2 py-0.5 rounded text-xs ${
                item.urgency === 'high' ? 'bg-red-100 text-red-700' :
                item.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                -{item.decayPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Misconception alert
function MisconceptionAlert({
  misconceptions,
}: {
  misconceptions: SkillInsightsData['misconceptions']
}) {
  if (misconceptions.length === 0) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Common Mistakes</h4>
      </div>
      <div className="space-y-3">
        {misconceptions.slice(0, 2).map((m, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {m.type.replace(/-/g, ' ')}
              </span>
              <span className="text-xs text-gray-500">({m.frequency}x)</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-xs">{m.suggestedFix}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// Cognitive profile section
function CognitiveProfile({ cognitive }: { cognitive: SkillInsightsData['cognitive'] }) {
  const traits = [
    { label: 'Learning Style', value: cognitive.learningStyle.primary, icon: '📚' },
    { label: 'Problem Solving', value: cognitive.problemSolvingApproach, icon: '🧠' },
    { label: 'Pattern Speed', value: cognitive.patternRecognitionSpeed, icon: '⚡' },
    { label: 'Complexity', value: cognitive.complexityTolerance, icon: '🎯' },
  ]

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-500" />
        <h4 className="font-medium text-gray-900 dark:text-white">Your Learning Profile</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {traits.map((trait, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-md p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>{trait.icon}</span>
              <span className="text-xs text-gray-500">{trait.label}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {trait.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}

// Main component
export function SkillInsights({ data, isLoading = false }: SkillInsightsProps) {
  const [showAllPatterns, setShowAllPatterns] = useState(false)

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSkeleton />
      </div>
    )
  }

  const displayPatterns = showAllPatterns
    ? data.patternMastery
    : data.patternMastery.slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Skill Insights
        </h2>
        <span className="text-sm text-gray-500">
          Updated based on your latest sessions
        </span>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Interview Readiness"
          value={`${data.overview.interviewReadiness}%`}
          color="text-green-500"
        />
        <StatCard
          icon={BookOpen}
          label="Patterns Mastered"
          value={data.overview.masteredConcepts}
          sublabel={`of ${data.overview.totalConcepts}`}
          color="text-blue-500"
        />
        <StatCard
          icon={Activity}
          label="Sessions/Week"
          value={data.behavioral.sessionsPerWeek}
          color="text-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Growth Velocity"
          value={data.growth.velocity > 0 ? `+${data.growth.velocity.toFixed(1)}` : data.growth.velocity.toFixed(1)}
          sublabel="pts/week"
          color={data.growth.velocity > 0 ? 'text-green-500' : 'text-gray-500'}
        />
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Interview readiness circle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Interview Readiness</h3>
            <div className="flex items-center justify-center">
              <CircularProgress
                value={data.interviewReadiness.overall}
                label="Ready"
                sublabel={data.growth.accelerating ? 'Improving!' : undefined}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Estimated Prep</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {data.interviewReadiness.estimatedPrepDays} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Projected Level</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {data.growth.projectedLevel}
                </p>
              </div>
            </div>
          </div>

          {/* Cognitive profile */}
          <CognitiveProfile cognitive={data.cognitive} />

          {/* Skill decay warning */}
          <SkillDecayWarning decayItems={data.skillDecay} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Pattern mastery */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Pattern Mastery</h3>
            <div className="space-y-3">
              {displayPatterns.map((p, i) => (
                <PatternMasteryBar
                  key={i}
                  pattern={p.pattern}
                  mastery={p.mastery}
                  practiceCount={p.practiceCount}
                />
              ))}
            </div>
            {data.patternMastery.length > 6 && (
              <button
                onClick={() => setShowAllPatterns(!showAllPatterns)}
                className="mt-4 text-sm text-primary hover:underline"
              >
                {showAllPatterns ? 'Show less' : `Show ${data.patternMastery.length - 6} more`}
              </button>
            )}
          </div>

          {/* Misconceptions */}
          <MisconceptionAlert misconceptions={data.misconceptions} />
        </div>
      </div>

      {/* Insights section */}
      {data.insights.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Actionable Insights
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {data.insights.slice(0, 4).map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Retention stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Your Retention Profile
        </h3>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: '24-Hour Retention', value: data.retention.shortTermRetention },
            { label: '7-Day Retention', value: data.retention.mediumTermRetention },
            { label: '30-Day Retention', value: data.retention.longTermRetention },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {Math.round(item.value)}%
              </div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SkillInsights
