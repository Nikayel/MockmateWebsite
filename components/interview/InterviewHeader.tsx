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
import { difficultyColorClass } from '@/lib/ui/difficulty-colors';
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
      'flex items-center justify-between px-4 py-2 bg-card/80 backdrop-blur-sm border-b border-border',
      className
    )}>
      {/* Left: Back button and problem info */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#c4703f]">
            {getTypeIcon(scenario.type)}
          </div>
          <h1 className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-[400px]">
            {scenario.title}
          </h1>
          <Badge className={cn('text-xs capitalize', difficultyColorClass(scenario.difficulty))}>
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
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
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
            className="h-8 bg-[#c4703f] hover:bg-[#c4703f]/80 text-white font-medium"
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
