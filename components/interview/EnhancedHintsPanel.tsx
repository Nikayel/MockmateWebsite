"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Clock,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { RAGHintCard } from "./RAGHintCard"
import type { GeneratedHint, HintLevel, HintCategory } from "@/lib/agents/hints"

/**
 * EnhancedHintsPanel - Progressive hints panel with RAG integration
 *
 * Design philosophy:
 * - Combines static hints with AI-generated RAG hints
 * - Progressive unlock based on time and struggle level
 * - Visual indicators for hint difficulty and personalization
 * - Encourages thinking before revealing hints
 */

interface EnhancedHintsPanelProps {
  // Static hints from scenario
  staticHints: string[]
  // RAG-generated hints
  ragHints: GeneratedHint[]
  // Time tracking
  elapsedMinutes: number
  // Struggle level for adaptive hints
  struggleLevel: "none" | "mild" | "moderate" | "high"
  // Recommended reveal level
  recommendedLevel: HintLevel
  // Whether personalization is applied
  isPersonalized: boolean
  // Callbacks
  onRevealHint?: (hintId: string, isRag: boolean) => void
  onRequestMoreHints?: () => void
  // Loading state
  isLoadingHints?: boolean
  // Error state
  hintsError?: string
  className?: string
}

type FilterCategory = "all" | HintCategory

/**
 * Convert static hint to GeneratedHint format
 */
function staticToGenerated(hint: string, index: number): GeneratedHint {
  return {
    id: `static_${index}`,
    level: Math.min(index + 1, 4) as HintLevel,
    category: index === 0 ? "conceptual" : index === 1 ? "approach" : "implementation",
    title: index === 0 ? "Getting Started" : index === 1 ? "Key Insight" : `Hint ${index + 1}`,
    content: hint,
    isBlurred: true,
    source: "pattern-knowledge",
    relevanceScore: 1 - index * 0.1,
  }
}

/**
 * Calculate unlock time for a hint level
 */
function getUnlockTime(level: HintLevel, struggleLevel: string): number {
  const baseTime = level * 3 // 3, 6, 9, 12 minutes

  // Reduce unlock time if struggling
  switch (struggleLevel) {
    case "high":
      return Math.max(1, baseTime - 4)
    case "moderate":
      return Math.max(2, baseTime - 2)
    case "mild":
      return Math.max(3, baseTime - 1)
    default:
      return baseTime
  }
}

export function EnhancedHintsPanel({
  staticHints,
  ragHints,
  elapsedMinutes,
  struggleLevel,
  recommendedLevel,
  isPersonalized,
  onRevealHint,
  onRequestMoreHints,
  isLoadingHints = false,
  hintsError,
  className,
}: EnhancedHintsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [revealedHintIds, setRevealedHintIds] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all")

  // Convert static hints to GeneratedHint format
  const convertedStaticHints = useMemo(
    () => staticHints.map((hint, idx) => staticToGenerated(hint, idx)),
    [staticHints]
  )

  // Combine all hints
  const allHints = useMemo(() => {
    const combined = [...convertedStaticHints, ...ragHints]

    // Sort by level, then by relevance
    return combined.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return b.relevanceScore - a.relevanceScore
    })
  }, [convertedStaticHints, ragHints])

  // Filter hints by category
  const filteredHints = useMemo(() => {
    if (filterCategory === "all") return allHints
    return allHints.filter((h) => h.category === filterCategory)
  }, [allHints, filterCategory])

  // Group hints by level
  const hintsByLevel = useMemo(() => {
    const grouped: Record<HintLevel, GeneratedHint[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }

    for (const hint of filteredHints) {
      grouped[hint.level].push(hint)
    }

    return grouped
  }, [filteredHints])

  // Calculate which levels are unlocked
  const unlockedLevels = useMemo(() => {
    const levels: HintLevel[] = []
    for (let level = 1; level <= 4; level++) {
      const unlockTime = getUnlockTime(level as HintLevel, struggleLevel)
      if (elapsedMinutes >= unlockTime) {
        levels.push(level as HintLevel)
      }
    }
    return levels
  }, [elapsedMinutes, struggleLevel])

  // Handle hint reveal
  const handleReveal = useCallback(
    (hintId: string) => {
      setRevealedHintIds((prev) => new Set([...prev, hintId]))
      const isRag = !hintId.startsWith("static_")
      onRevealHint?.(hintId, isRag)
    },
    [onRevealHint]
  )

  // Get struggle level indicator
  const getStruggleBadge = () => {
    switch (struggleLevel) {
      case "high":
        return (
          <Badge className="border-red-500/30 bg-red-500/20 text-red-400">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Need help?
          </Badge>
        )
      case "moderate":
        return (
          <Badge className="border-yellow-500/30 bg-yellow-500/20 text-yellow-400">
            <Clock className="mr-1 h-3 w-3" />
            Take your time
          </Badge>
        )
      case "mild":
        return (
          <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">
            <TrendingUp className="mr-1 h-3 w-3" />
            On track
          </Badge>
        )
      default:
        return null
    }
  }

  // Categories for filter
  const categories: { value: FilterCategory; label: string }[] = [
    { value: "all", label: "All" },
    { value: "conceptual", label: "Conceptual" },
    { value: "approach", label: "Approach" },
    { value: "implementation", label: "Implementation" },
    { value: "debugging", label: "Debugging" },
  ]

  const totalHints = allHints.length
  const revealedCount = revealedHintIds.size
  const ragHintCount = ragHints.length

  if (totalHints === 0 && !isLoadingHints) {
    return null
  }

  return (
    <div className={cn("rounded-lg border border-gray-700 bg-gray-900/50", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-800/30"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-300">Hints</span>
          <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-400">
            {revealedCount}/{totalHints}
          </Badge>
          {ragHintCount > 0 && (
            <Badge className="border-purple-500/30 bg-purple-500/10 text-xs text-purple-400">
              <Sparkles className="mr-1 h-3 w-3" />
              {ragHintCount} AI
            </Badge>
          )}
          {isPersonalized && (
            <Badge className="border-green-500/30 bg-green-500/10 text-xs text-green-400">
              Personalized
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStruggleBadge()}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-3 px-3 pb-3">
          {/* Category filter */}
          {totalHints > 3 && (
            <div className="flex items-center gap-2 pt-1">
              <Filter className="h-3 w-3 text-gray-500" />
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setFilterCategory(cat.value)}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs transition-colors",
                      filterCategory === cat.value
                        ? "bg-gray-700 text-white"
                        : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {hintsError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400">
              {hintsError}
            </div>
          )}

          {/* Loading state */}
          {isLoadingHints && (
            <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Generating personalized hints...</span>
            </div>
          )}

          {/* Hints by level */}
          {([1, 2, 3, 4] as HintLevel[]).map((level) => {
            const hints = hintsByLevel[level]
            if (hints.length === 0) return null

            const isUnlocked = unlockedLevels.includes(level)
            const unlockTime = getUnlockTime(level, struggleLevel)
            const isRecommended = level <= recommendedLevel

            return (
              <div key={level} className="space-y-2">
                {/* Level header */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isRecommended ? "text-yellow-400" : "text-gray-500"
                    )}
                  >
                    Level {level}
                    {isRecommended && <span className="ml-1 text-yellow-500">(Recommended)</span>}
                  </span>
                  {!isUnlocked && (
                    <span className="text-[10px] text-gray-600">Unlocks at {unlockTime} min</span>
                  )}
                </div>

                {/* Hints */}
                <div className="space-y-2">
                  {hints.map((hint) => (
                    <RAGHintCard
                      key={hint.id}
                      hint={hint}
                      isLocked={!isUnlocked}
                      unlockTimeMinutes={unlockTime}
                      onReveal={handleReveal}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Request more hints button */}
          {onRequestMoreHints && !isLoadingHints && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRequestMoreHints}
              className="w-full text-xs text-gray-500 hover:text-white"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Generate more hints
            </Button>
          )}

          {/* Progress indicator */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{elapsedMinutes} min elapsed</span>
              <span>
                Next level unlocks at{" "}
                {getUnlockTime(
                  Math.min(Math.max(...unlockedLevels, 0) + 1, 4) as HintLevel,
                  struggleLevel
                )}{" "}
                min
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 transition-all duration-300"
                style={{
                  width: `${Math.min((elapsedMinutes / 12) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedHintsPanel
