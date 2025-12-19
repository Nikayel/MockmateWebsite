'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react'
import { PersonalizedRoadmap } from '@/lib/data/company-questions/types'
import { PATTERN_METADATA, DSAPattern } from '@/lib/types/dsa-patterns'
import { cn } from '@/lib/utils'

interface PatternCoverageProps {
  roadmap: PersonalizedRoadmap
  companyTopPatterns?: DSAPattern[]
}

export function PatternCoverage({ roadmap, companyTopPatterns = [] }: PatternCoverageProps) {
  // Sort patterns: company's top patterns first, then by completion
  const sortedCoverage = [...roadmap.patternCoverage].sort((a, b) => {
    const aIsTop = companyTopPatterns.indexOf(a.pattern)
    const bIsTop = companyTopPatterns.indexOf(b.pattern)

    // If both are top patterns, sort by company priority
    if (aIsTop !== -1 && bIsTop !== -1) {
      return aIsTop - bIsTop
    }
    // Top patterns come first
    if (aIsTop !== -1) return -1
    if (bIsTop !== -1) return 1
    // Otherwise sort by completion percentage
    return b.percentage - a.percentage
  })

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Pattern Coverage
        </h2>
        <span className="text-sm text-muted-foreground">
          {roadmap.patternCoverage.filter((p) => p.percentage === 100).length}/
          {roadmap.patternCoverage.length} mastered
        </span>
      </div>

      <div className="space-y-3">
        {sortedCoverage.slice(0, 8).map((pattern, index) => (
          <PatternRow
            key={pattern.pattern}
            pattern={pattern}
            index={index}
            isTopPattern={companyTopPatterns.includes(pattern.pattern)}
            rank={companyTopPatterns.indexOf(pattern.pattern) + 1}
          />
        ))}
      </div>

      {sortedCoverage.length > 8 && (
        <p className="mt-4 text-sm text-muted-foreground text-center">
          +{sortedCoverage.length - 8} more patterns
        </p>
      )}
    </div>
  )
}

function PatternRow({
  pattern,
  index,
  isTopPattern,
  rank,
}: {
  pattern: {
    pattern: DSAPattern
    total: number
    completed: number
    percentage: number
  }
  index: number
  isTopPattern: boolean
  rank: number
}) {
  const metadata = PATTERN_METADATA[pattern.pattern]
  const displayName = metadata?.name || formatPatternName(pattern.pattern)
  const isComplete = pattern.percentage === 100

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3"
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Pattern name and progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium truncate',
              isComplete && 'text-green-600'
            )}
          >
            {displayName}
          </span>
          {isTopPattern && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              #{rank}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pattern.percentage}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={cn(
                'h-full rounded-full',
                isComplete ? 'bg-green-500' : 'bg-primary'
              )}
            />
          </div>
          <span className="text-xs text-muted-foreground w-12 text-right">
            {pattern.completed}/{pattern.total}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

function formatPatternName(pattern: string): string {
  return pattern
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
