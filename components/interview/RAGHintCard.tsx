'use client';

import React, { useState, useCallback } from 'react';
import {
  Lightbulb,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  Brain,
  History,
  Code,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GeneratedHint, HintLevel, HintCategory } from '@/lib/agents/hint-agent';

/**
 * RAGHintCard - Individual hint card with blur/reveal functionality
 *
 * Design philosophy:
 * - Hints are blurred by default to encourage thinking first
 * - User must actively choose to reveal each hint
 * - Visual indicators show hint level and source
 * - Progressive reveal builds understanding
 */

interface RAGHintCardProps {
  hint: GeneratedHint;
  isLocked: boolean;
  unlockTimeMinutes?: number;
  onReveal?: (hintId: string) => void;
  className?: string;
}

/**
 * Get icon for hint category
 */
function getCategoryIcon(category: HintCategory) {
  switch (category) {
    case 'conceptual':
      return Brain;
    case 'approach':
      return Target;
    case 'implementation':
      return Code;
    case 'optimization':
      return TrendingUp;
    case 'debugging':
      return AlertCircle;
    default:
      return Lightbulb;
  }
}

/**
 * Get icon for hint source
 */
function getSourceIcon(source: GeneratedHint['source']) {
  switch (source) {
    case 'ai':
      return Sparkles;
    case 'rag':
      return Zap;
    case 'pattern-knowledge':
      return Brain;
    case 'user-history':
      return History;
    default:
      return Lightbulb;
  }
}

/**
 * Get color scheme for hint level
 */
function getLevelColors(level: HintLevel): {
  border: string;
  bg: string;
  badge: string;
  text: string;
} {
  switch (level) {
    case 1:
      return {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/5',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        text: 'text-blue-400',
      };
    case 2:
      return {
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5',
        badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        text: 'text-yellow-400',
      };
    case 3:
      return {
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/5',
        badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        text: 'text-orange-400',
      };
    case 4:
      return {
        border: 'border-red-500/30',
        bg: 'bg-red-500/5',
        badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        text: 'text-red-400',
      };
    default:
      return {
        border: 'border-gray-500/30',
        bg: 'bg-gray-500/5',
        badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        text: 'text-gray-400',
      };
  }
}

/**
 * Get level label
 */
function getLevelLabel(level: HintLevel): string {
  switch (level) {
    case 1:
      return 'Nudge';
    case 2:
      return 'Guide';
    case 3:
      return 'Explain';
    case 4:
      return 'Reveal';
    default:
      return 'Hint';
  }
}

export function RAGHintCard({
  hint,
  isLocked,
  unlockTimeMinutes,
  onReveal,
  className,
}: RAGHintCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const colors = getLevelColors(hint.level);
  const CategoryIcon = getCategoryIcon(hint.category);
  const SourceIcon = getSourceIcon(hint.source);

  const handleReveal = useCallback(() => {
    if (!isLocked && !isRevealed) {
      setIsRevealed(true);
      onReveal?.(hint.id);
    }
  }, [isLocked, isRevealed, hint.id, onReveal]);

  const handleHide = useCallback(() => {
    setIsRevealed(false);
  }, []);

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        colors.border,
        colors.bg,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <CategoryIcon className={cn('h-4 w-4', colors.text)} />
          <span className="text-sm font-medium text-gray-200">
            {hint.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Source indicator */}
          <div
            className="flex items-center gap-1 text-xs text-gray-500"
            title={`Source: ${hint.source}`}
          >
            <SourceIcon className="h-3 w-3" />
          </div>
          {/* Level badge */}
          <Badge className={cn('text-xs', colors.badge)}>
            {getLevelLabel(hint.level)}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLocked ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Lock className="h-4 w-4" />
            <span>Unlocks after {unlockTimeMinutes} minutes</span>
          </div>
        ) : isRevealed ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-300 leading-relaxed">
              {hint.content}
            </p>

            {/* Code snippet if available */}
            {hint.metadata?.codeSnippet && (
              <pre className="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-400 overflow-x-auto">
                <code>{hint.metadata.codeSnippet}</code>
              </pre>
            )}

            {/* Related concepts */}
            {hint.metadata?.relatedConcepts && hint.metadata.relatedConcepts.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hint.metadata.relatedConcepts.slice(0, 3).map((concept, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] text-gray-500 border-gray-600"
                  >
                    {concept}
                  </Badge>
                ))}
              </div>
            )}

            {/* Hide button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHide}
              className="mt-2 h-7 text-xs text-gray-400 hover:text-white"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Hide
            </Button>
          </div>
        ) : (
          <button
            onClick={handleReveal}
            className="w-full group"
            disabled={isLocked}
          >
            {/* Blurred preview */}
            <div className="relative">
              <p
                className="text-sm text-gray-400 leading-relaxed blur-sm select-none"
                aria-hidden="true"
              >
                {hint.content.substring(0, 100)}...
              </p>

              {/* Reveal overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 rounded transition-opacity group-hover:bg-gray-900/50">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-full border border-gray-600 text-sm text-gray-300 group-hover:border-gray-500 group-hover:text-white transition-colors">
                  <Eye className="h-3.5 w-3.5" />
                  <span>Click to reveal</span>
                </div>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Relevance indicator */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', colors.bg.replace('/5', '/50'))}
              style={{ width: `${hint.relevanceScore * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-500">
            {Math.round(hint.relevanceScore * 100)}% relevant
          </span>
        </div>
      </div>
    </div>
  );
}

export default RAGHintCard;
