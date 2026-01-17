'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InterviewTimer } from './InterviewTimer';
import {
  ArrowLeft,
  RotateCcw,
  Send,
  Settings,
  Code,
  Bug,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/lib/scenarios';

/**
 * InterviewHeader - Top bar for interview page
 *
 * Shows:
 * - Problem title and type
 * - Difficulty badge
 * - Timer
 * - Quick actions (reset, submit)
 */

interface InterviewHeaderProps {
  scenario: Scenario | null;
  elapsedSeconds: number;
  onReset?: () => void;
  onSubmit?: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  className?: string;
  /** Strict time limit in seconds (e.g., 25*60 for Meta) */
  strictTimeLimit?: number | null;
  /** Tooltip explaining why time limit exists */
  strictTimeReason?: string;
}

// Get icon based on scenario type
function getTypeIcon(type: string) {
  switch (type) {
    case 'dsa':
      return <Code className="h-4 w-4" />;
    case 'bugfix':
      return <Bug className="h-4 w-4" />;
    case 'system-design':
      return <Layers className="h-4 w-4" />;
    default:
      return <Code className="h-4 w-4" />;
  }
}

// Get difficulty color
function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hard':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function InterviewHeader({
  scenario,
  elapsedSeconds,
  onReset,
  onSubmit,
  onBack,
  isSubmitting = false,
  className,
  strictTimeLimit,
  strictTimeReason,
}: InterviewHeaderProps) {
  if (!scenario) return null;

  return (
    <header className={cn(
      'flex items-center justify-between px-4 py-2 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800',
      className
    )}>
      {/* Left: Back button and problem info */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 px-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#00d9ff]">
            {getTypeIcon(scenario.type)}
          </div>
          <h1 className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-[400px]">
            {scenario.title}
          </h1>
          <Badge className={cn('text-xs capitalize', getDifficultyColor(scenario.difficulty))}>
            {scenario.difficulty}
          </Badge>
        </div>
      </div>

      {/* Center: Timer */}
      <div className="hidden md:flex items-center">
        <InterviewTimer
          elapsedSeconds={elapsedSeconds}
          strictTimeLimit={strictTimeLimit}
          strictTimeReason={strictTimeReason}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile timer */}
        <div className="md:hidden">
          <InterviewTimer
            elapsedSeconds={elapsedSeconds}
            showIcon={false}
            strictTimeLimit={strictTimeLimit}
            strictTimeReason={strictTimeReason}
          />
        </div>

        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2 text-gray-400 hover:text-white"
            title="Reset code"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {onSubmit && (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-8 bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-black font-medium"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Submit
              </>
            )}
          </Button>
        )}
      </div>
    </header>
  );
}

export default InterviewHeader;
