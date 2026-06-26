"use client"

import React, { useState, useCallback, useEffect } from "react"
import {
  Lightbulb,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { GeneratedHint, HintLevel } from "@/lib/agents/hints"

/**
 * HintsPanel - Progressive hint reveal system with RAG integration
 *
 * Design philosophy:
 * - Hints are revealed progressively based on time spent
 * - Earlier hints are more subtle, later hints more direct
 * - Encourages candidates to think before revealing
 * - Tracks which hints are revealed for scoring
 * - Integrates with RAG for personalized AI hints
 */

interface RAGHintData {
  level: number
  hint: string
  source: string
}

interface HintsPanelProps {
  hints: string[]
  revealedCount: number
  onRevealHint?: (hintIndex: number) => void
  className?: string
  elapsedMinutes?: number
  // RAG integration props
  ragHints?: RAGHintData[]
  isLoadingRagHints?: boolean
  onRequestRagHints?: () => void
  showRagHints?: boolean
}

export function HintsPanel({
  hints,
  revealedCount,
  onRevealHint,
  className,
  elapsedMinutes = 0,
  ragHints = [],
  isLoadingRagHints = false,
  onRequestRagHints,
  showRagHints = true,
}: HintsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [visibleHints, setVisibleHints] = useState<Set<number>>(new Set())
  const [visibleRagHints, setVisibleRagHints] = useState<Set<number>>(new Set())

  const toggleHintVisibility = useCallback(
    (index: number) => {
      setVisibleHints((prev) => {
        const newVisible = new Set(prev)
        if (newVisible.has(index)) {
          newVisible.delete(index)
        } else {
          newVisible.add(index)
          onRevealHint?.(index)
        }
        return newVisible
      })
    },
    [onRevealHint]
  )

  const toggleRagHintVisibility = useCallback((index: number) => {
    setVisibleRagHints((prev) => {
      const newVisible = new Set(prev)
      if (newVisible.has(index)) {
        newVisible.delete(index)
      } else {
        newVisible.add(index)
      }
      return newVisible
    })
  }, [])

  const totalHints = hints.length + ragHints.length
  const totalRevealed = visibleHints.size + visibleRagHints.size

  if (hints.length === 0 && ragHints.length === 0 && !isLoadingRagHints) {
    return null
  }

  // Get color for RAG hint level
  const getRagLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "border-blue-500/20 bg-blue-500/5"
      case 2:
        return "border-yellow-500/20 bg-yellow-500/5"
      case 3:
        return "border-orange-500/20 bg-orange-500/5"
      default:
        return "border-purple-500/20 bg-purple-500/5"
    }
  }

  const getRagLevelBadge = (level: number) => {
    switch (level) {
      case 1:
        return { text: "Nudge", class: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
      case 2:
        return { text: "Guide", class: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" }
      case 3:
        return { text: "Explain", class: "bg-orange-500/20 text-orange-400 border-orange-500/30" }
      default:
        return { text: "AI", class: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card/50", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-muted-foreground">Hints</span>
          <Badge className="border-yellow-500/30 bg-yellow-500/10 text-xs text-yellow-400">
            {totalRevealed}/{totalHints}
          </Badge>
          {ragHints.length > 0 && (
            <Badge className="border-purple-500/30 bg-purple-500/10 text-xs text-purple-400">
              <Sparkles className="mr-1 h-3 w-3" />
              {ragHints.length} AI
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Hints list */}
      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {/* Static hints */}
          {hints.map((hint, index) => {
            const isRevealed = index < revealedCount
            const isVisible = visibleHints.has(index)

            return (
              <div
                key={`static-${index}`}
                className={cn(
                  "rounded-lg border transition-colors",
                  isRevealed
                    ? "border-yellow-500/20 bg-yellow-500/5"
                    : "border-border bg-muted/30 opacity-50"
                )}
              >
                <div className="flex items-start justify-between p-2">
                  <div className="flex flex-1 items-start gap-2">
                    <span className="mt-0.5 text-xs font-medium text-yellow-500">{index + 1}.</span>
                    <div className="flex-1">
                      {isRevealed ? (
                        <>
                          {isVisible ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
                          ) : (
                            <button
                              onClick={() => toggleHintVisibility(index)}
                              className="group w-full text-left"
                            >
                              <div className="relative">
                                <p className="text-xs text-muted-foreground blur-sm select-none">
                                  {hint.substring(0, 50)}...
                                </p>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-muted-foreground">
                                    <Eye className="h-3 w-3" />
                                    Click to reveal
                                  </span>
                                </div>
                              </div>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          <span>Unlocks after {(index + 1) * 3} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isRevealed && isVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHintVisibility(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {/* RAG hints section */}
          {showRagHints && ragHints.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">AI-Generated Hints</span>
              </div>
              {ragHints.map((ragHint, index) => {
                const isVisible = visibleRagHints.has(index)
                const levelBadge = getRagLevelBadge(ragHint.level)

                return (
                  <div
                    key={`rag-${index}`}
                    className={cn(
                      "rounded-lg border transition-colors",
                      getRagLevelColor(ragHint.level)
                    )}
                  >
                    <div className="flex items-start justify-between p-2">
                      <div className="flex flex-1 items-start gap-2">
                        <Badge className={cn("px-1 py-0 text-[10px]", levelBadge.class)}>
                          {levelBadge.text}
                        </Badge>
                        <div className="flex-1">
                          {isVisible ? (
                            <p className="text-xs leading-relaxed text-muted-foreground">{ragHint.hint}</p>
                          ) : (
                            <button
                              onClick={() => toggleRagHintVisibility(index)}
                              className="group w-full text-left"
                            >
                              <div className="relative">
                                <p className="text-xs text-muted-foreground blur-sm select-none">
                                  {ragHint.hint.substring(0, 50)}...
                                </p>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-muted-foreground">
                                    <Eye className="h-3 w-3" />
                                    Click to reveal
                                  </span>
                                </div>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                      {isVisible && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRagHintVisibility(index)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Loading state for RAG hints */}
          {isLoadingRagHints && (
            <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Generating personalized hints...</span>
            </div>
          )}

          {/* Request more hints button */}
          {onRequestRagHints && !isLoadingRagHints && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRequestRagHints}
              className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Get AI hints
            </Button>
          )}

          {/* Progress indicator */}
          {revealedCount < hints.length && (
            <div className="pt-1 text-center">
              <p className="text-[10px] text-muted-foreground">
                Next hint unlocks at {(revealedCount + 1) * 3} minutes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default HintsPanel
