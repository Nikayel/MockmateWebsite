'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, TrendingUp, ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { PersonalizedRoadmap } from '@/lib/data/company-questions/types'
import { PATTERN_METADATA, DSAPattern } from '@/lib/types/dsa-patterns'
import { cn } from '@/lib/utils'

interface PatternCoverageProps {
  roadmap: PersonalizedRoadmap
  companyTopPatterns?: DSAPattern[]
}

// Group patterns by category for better organization
const PATTERN_CATEGORIES: Record<string, DSAPattern[]> = {
  'Arrays & Strings': ['arrays-hashing', 'two-pointers', 'sliding-window', 'string'],
  'Data Structures': ['stack', 'linked-list', 'heap', 'trie'],
  'Trees & Graphs': ['trees', 'binary-search-tree', 'bfs', 'dfs', 'graphs', 'union-find'],
  'Dynamic Programming': ['dp-1d', 'dp-2d', 'dp-knapsack', 'dp-lcs', 'dp-tree'],
  'Algorithms': ['binary-search', 'sorting', 'greedy', 'backtracking', 'topological-sort'],
  'Math & Other': ['math-geometry', 'bit-manipulation', 'intervals', 'matrix', 'monotonic-stack', 'monotonic-queue'],
}

export function PatternCoverage({ roadmap, companyTopPatterns = [] }: PatternCoverageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  // Sort patterns: company's top patterns first, then by completion
  const sortedCoverage = [...roadmap.patternCoverage].sort((a, b) => {
    const aIsTop = companyTopPatterns.indexOf(a.pattern)
    const bIsTop = companyTopPatterns.indexOf(b.pattern)

    if (aIsTop !== -1 && bIsTop !== -1) return aIsTop - bIsTop
    if (aIsTop !== -1) return -1
    if (bIsTop !== -1) return 1
    return b.percentage - a.percentage
  })

  const masteredCount = roadmap.patternCoverage.filter((p) => p.percentage === 100).length
  const totalPatterns = roadmap.patternCoverage.length
  const overallProgress = Math.round(
    roadmap.patternCoverage.reduce((sum, p) => sum + p.percentage, 0) / totalPatterns
  )

  // Group coverage data by category
  const coverageByCategory = Object.entries(PATTERN_CATEGORIES).map(([category, patterns]) => {
    const categoryPatterns = sortedCoverage.filter(c => patterns.includes(c.pattern))
    const completed = categoryPatterns.filter(p => p.percentage === 100).length
    const total = categoryPatterns.length
    const avgProgress = total > 0
      ? Math.round(categoryPatterns.reduce((sum, p) => sum + p.percentage, 0) / total)
      : 0
    return { category, patterns: categoryPatterns, completed, total, avgProgress }
  }).filter(c => c.total > 0)

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Compact Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold">Pattern Coverage</h2>
            <p className="text-xs text-muted-foreground">
              {masteredCount}/{totalPatterns} mastered • {overallProgress}% overall
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini progress indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {coverageByCategory.slice(0, 4).map((cat) => (
              <div
                key={cat.category}
                className={cn(
                  "w-1.5 h-4 rounded-full",
                  cat.avgProgress === 100 ? "bg-green-500" :
                  cat.avgProgress >= 50 ? "bg-primary" :
                  cat.avgProgress > 0 ? "bg-yellow-500" : "bg-muted"
                )}
                title={`${cat.category}: ${cat.avgProgress}%`}
              />
            ))}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Category-based collapsible sections */}
              {coverageByCategory.map((cat) => (
                <div key={cat.category} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{cat.category}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {cat.completed}/{cat.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Compact progress bar */}
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            cat.avgProgress === 100 ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${cat.avgProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-6 text-right">
                        {cat.avgProgress}%
                      </span>
                      {expandedCategories[cat.category] ? (
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedCategories[cat.category] && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="px-2.5 pb-2 grid grid-cols-2 gap-1.5">
                          {cat.patterns.map((pattern, index) => (
                            <PatternChip
                              key={pattern.pattern}
                              pattern={pattern}
                              isTopPattern={companyTopPatterns.includes(pattern.pattern)}
                              rank={companyTopPatterns.indexOf(pattern.pattern) + 1}
                              index={index}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed view - show top patterns in compact grid */}
      {!isExpanded && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-1.5">
            {sortedCoverage.slice(0, 6).map((pattern, index) => (
              <PatternChip
                key={pattern.pattern}
                pattern={pattern}
                isTopPattern={companyTopPatterns.includes(pattern.pattern)}
                rank={companyTopPatterns.indexOf(pattern.pattern) + 1}
                index={index}
                compact
              />
            ))}
          </div>
          {sortedCoverage.length > 6 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="mt-2 w-full text-[10px] text-primary hover:underline"
            >
              +{sortedCoverage.length - 6} more patterns
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function PatternChip({
  pattern,
  isTopPattern,
  rank,
  index,
  compact = false,
}: {
  pattern: {
    pattern: DSAPattern
    total: number
    completed: number
    percentage: number
  }
  isTopPattern: boolean
  rank: number
  index: number
  compact?: boolean
}) {
  const metadata = PATTERN_METADATA[pattern.pattern]
  const displayName = metadata?.name || formatPatternName(pattern.pattern)
  const isComplete = pattern.percentage === 100

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "relative flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors",
        isComplete
          ? "bg-green-500/10 border-green-500/30"
          : "bg-muted/30 border-border/50 hover:bg-muted/50",
        compact && "py-1"
      )}
    >
      {/* Status indicator */}
      <div className="shrink-0">
        {isComplete ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : (
          <div className="relative h-3 w-3">
            <Circle className="h-3 w-3 text-muted-foreground/50" />
            {pattern.percentage > 0 && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 12 12">
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${pattern.percentage * 0.314} 31.4`}
                  className="text-primary"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
        <span className={cn(
          "text-[10px] font-medium truncate",
          isComplete && "text-green-600"
        )}>
          {displayName}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isTopPattern && (
            <span className="px-1 py-0.5 text-[8px] font-semibold bg-primary/20 text-primary rounded">
              #{rank}
            </span>
          )}
          <span className="text-[9px] text-muted-foreground">
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
