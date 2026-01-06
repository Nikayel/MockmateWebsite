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
import {
  TrendingUp,
  Zap,
  Clock,
  Target,
  BookOpen,
  Activity,
  Sparkles,
} from 'lucide-react'
import type { SkillInsightsData } from '@/lib/hooks/useSkillInsights'
import { CircularProgress } from './CircularProgress'
import { PatternMasteryBar } from './PatternMasteryBar'
import { StatCard, InsightCard } from './SkillInsightsCards'
import { SkillDecayWarning, MisconceptionAlert } from './SkillInsightsAlerts'
import { CognitiveProfile } from './CognitiveProfile'
import { LoadingSkeleton } from './LoadingSkeleton'

interface SkillInsightsProps {
  data: SkillInsightsData
  isLoading?: boolean
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
