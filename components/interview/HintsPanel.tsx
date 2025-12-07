'use client';

import React, { useState } from 'react';
import { Lightbulb, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * HintsPanel - Progressive hint reveal system
 *
 * Design philosophy:
 * - Hints are revealed progressively based on time spent
 * - Earlier hints are more subtle, later hints more direct
 * - Encourages candidates to think before revealing
 * - Tracks which hints are revealed for scoring
 */

interface HintsPanelProps {
  hints: string[];
  revealedCount: number;
  onRevealHint?: (hintIndex: number) => void;
  className?: string;
  elapsedMinutes?: number;
}

export function HintsPanel({
  hints,
  revealedCount,
  onRevealHint,
  className,
  elapsedMinutes = 0,
}: HintsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleHints, setVisibleHints] = useState<Set<number>>(new Set());

  const toggleHintVisibility = (index: number) => {
    const newVisible = new Set(visibleHints);
    if (newVisible.has(index)) {
      newVisible.delete(index);
    } else {
      newVisible.add(index);
    }
    setVisibleHints(newVisible);
  };

  if (hints.length === 0) {
    return null;
  }

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
            {revealedCount}/{hints.length}
          </Badge>
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
          {hints.map((hint, index) => {
            const isRevealed = index < revealedCount;
            const isVisible = visibleHints.has(index);

            return (
              <div
                key={index}
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
                            <p className="text-xs text-gray-500 italic">
                              Hint available - click to reveal
                            </p>
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
                  {isRevealed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHintVisibility(index)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      {isVisible ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

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
