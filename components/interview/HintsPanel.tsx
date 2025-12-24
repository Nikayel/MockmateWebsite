'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Lightbulb, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GeneratedHint, HintLevel } from '@/lib/agents/hint-agent';

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
  level: number;
  hint: string;
  source: string;
}

interface HintsPanelProps {
  hints: string[];
  revealedCount: number;
  onRevealHint?: (hintIndex: number) => void;
  className?: string;
  elapsedMinutes?: number;
  // RAG integration props
  ragHints?: RAGHintData[];
  isLoadingRagHints?: boolean;
  onRequestRagHints?: () => void;
  showRagHints?: boolean;
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleHints, setVisibleHints] = useState<Set<number>>(new Set());
  const [visibleRagHints, setVisibleRagHints] = useState<Set<number>>(new Set());

  const toggleHintVisibility = useCallback((index: number) => {
    setVisibleHints(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(index)) {
        newVisible.delete(index);
      } else {
        newVisible.add(index);
        onRevealHint?.(index);
      }
      return newVisible;
    });
  }, [onRevealHint]);

  const toggleRagHintVisibility = useCallback((index: number) => {
    setVisibleRagHints(prev => {
      const newVisible = new Set(prev);
      if (newVisible.has(index)) {
        newVisible.delete(index);
      } else {
        newVisible.add(index);
      }
      return newVisible;
    });
  }, []);

  const totalHints = hints.length + ragHints.length;
  const totalRevealed = visibleHints.size + visibleRagHints.size;

  if (hints.length === 0 && ragHints.length === 0 && !isLoadingRagHints) {
    return null;
  }

  // Get color for RAG hint level
  const getRagLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'border-blue-500/20 bg-blue-500/5';
      case 2: return 'border-yellow-500/20 bg-yellow-500/5';
      case 3: return 'border-orange-500/20 bg-orange-500/5';
      default: return 'border-purple-500/20 bg-purple-500/5';
    }
  };

  const getRagLevelBadge = (level: number) => {
    switch (level) {
      case 1: return { text: 'Nudge', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 2: return { text: 'Guide', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      case 3: return { text: 'Explain', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
      default: return { text: 'AI', class: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    }
  };

  return (
    <div className={cn('bg-gray-900/50 border border-gray-700 rounded-lg', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/30"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-300">Hints</span>
          <Badge className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400 text-xs">
            {totalRevealed}/{totalHints}
          </Badge>
          {ragHints.length > 0 && (
            <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-400 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {ragHints.length} AI
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* Hints list */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Static hints */}
          {hints.map((hint, index) => {
            const isRevealed = index < revealedCount;
            const isVisible = visibleHints.has(index);

            return (
              <div
                key={`static-${index}`}
                className={cn(
                  'rounded-lg border transition-colors',
                  isRevealed
                    ? 'border-yellow-500/20 bg-yellow-500/5'
                    : 'border-gray-700 bg-gray-800/30 opacity-50'
                )}
              >
                <div className="flex items-start justify-between p-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-xs font-medium text-yellow-500 mt-0.5">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      {isRevealed ? (
                        <>
                          {isVisible ? (
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {hint}
                            </p>
                          ) : (
                            <button
                              onClick={() => toggleHintVisibility(index)}
                              className="w-full text-left group"
                            >
                              <div className="relative">
                                <p className="text-xs text-gray-400 blur-sm select-none">
                                  {hint.substring(0, 50)}...
                                </p>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs text-gray-500 group-hover:text-gray-300 flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Click to reveal
                                  </span>
                                </div>
                              </div>
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Lock className="h-3 w-3" />
                          <span>
                            Unlocks after {(index + 1) * 3} minutes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isRevealed && isVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHintVisibility(index)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* RAG hints section */}
          {showRagHints && ragHints.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">AI-Generated Hints</span>
              </div>
              {ragHints.map((ragHint, index) => {
                const isVisible = visibleRagHints.has(index);
                const levelBadge = getRagLevelBadge(ragHint.level);

                return (
                  <div
                    key={`rag-${index}`}
                    className={cn(
                      'rounded-lg border transition-colors',
                      getRagLevelColor(ragHint.level)
                    )}
                  >
                    <div className="flex items-start justify-between p-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Badge className={cn('text-[10px] px-1 py-0', levelBadge.class)}>
                          {levelBadge.text}
                        </Badge>
                        <div className="flex-1">
                          {isVisible ? (
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {ragHint.hint}
                            </p>
                          ) : (
                            <button
                              onClick={() => toggleRagHintVisibility(index)}
                              className="w-full text-left group"
                            >
                              <div className="relative">
                                <p className="text-xs text-gray-400 blur-sm select-none">
                                  {ragHint.hint.substring(0, 50)}...
                                </p>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs text-gray-500 group-hover:text-gray-300 flex items-center gap-1">
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
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        >
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Loading state for RAG hints */}
          {isLoadingRagHints && (
            <div className="flex items-center gap-2 p-2 text-xs text-gray-500">
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
              className="w-full text-xs text-gray-500 hover:text-white mt-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Get AI hints
            </Button>
          )}

          {/* Progress indicator */}
          {revealedCount < hints.length && (
            <div className="text-center pt-1">
              <p className="text-[10px] text-gray-500">
                Next hint unlocks at {(revealedCount + 1) * 3} minutes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HintsPanel;
