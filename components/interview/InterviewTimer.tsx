'use client';

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';

/**
 * InterviewTimer - Displays elapsed time during interview
 *
 * Shows time in MM:SS format with visual feedback for different phases:
 * - Green: Under 15 minutes (good pace)
 * - Yellow: 15-30 minutes (moderate)
 * - Red: Over 30 minutes (may need to speed up)
 *
 * In strict time mode (e.g., Meta):
 * - Shows remaining time instead of elapsed
 * - Orange warning at 5 minutes remaining
 * - Red danger at 2 minutes remaining
 *
 * In calm mode, colors are muted to reduce anxiety (see globals.css .timer-warning/.timer-danger)
 */

interface InterviewTimerProps {
  elapsedSeconds: number;
  className?: string;
  showIcon?: boolean;
  /** Strict time limit in seconds (e.g., 25*60 for Meta) */
  strictTimeLimit?: number | null;
  /** Tooltip explaining why time limit exists */
  strictTimeReason?: string;
}

export function InterviewTimer({
  elapsedSeconds,
  className,
  showIcon = true,
  strictTimeLimit,
  strictTimeReason,
}: InterviewTimerProps) {
  // If strict time mode, show remaining time; otherwise show elapsed
  const isStrictMode = strictTimeLimit != null && strictTimeLimit > 0;
  const remainingSeconds = isStrictMode ? Math.max(0, strictTimeLimit - elapsedSeconds) : 0;
  const displaySeconds = isStrictMode ? remainingSeconds : elapsedSeconds;

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const isOvertime = isStrictMode && elapsedSeconds > strictTimeLimit;

  // Determine color based on time
  // In strict mode: base on remaining time
  // Note: calm-success/calm-warning classes get overridden in calm mode via CSS
  const getTimeColor = () => {
    if (isStrictMode) {
      if (isOvertime) return 'text-red-500 timer-danger animate-pulse';
      if (remainingSeconds <= 2 * 60) return 'text-red-400 timer-danger'; // 2 min left
      if (remainingSeconds <= 5 * 60) return 'text-orange-400 timer-warning'; // 5 min left
      return 'text-green-400 calm-success';
    }
    // Normal mode
    if (minutes < 15) return 'text-green-400 calm-success';
    if (minutes < 30) return 'text-yellow-400 timer-warning';
    return 'text-red-400 timer-danger';
  };

  const getBadgeVariant = () => {
    if (isStrictMode) {
      if (isOvertime) return 'bg-red-500/20 border-red-500/50 text-red-500';
      if (remainingSeconds <= 2 * 60) return 'bg-red-500/10 border-red-500/30 text-red-400';
      if (remainingSeconds <= 5 * 60) return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      return 'bg-green-500/10 border-green-500/30 text-green-400';
    }
    // Normal mode
    if (minutes < 15) return 'bg-green-500/10 border-green-500/30 text-green-400';
    if (minutes < 30) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    return 'bg-red-500/10 border-red-500/30 text-red-400';
  };

  const timerContent = (
    <Badge className={cn(getBadgeVariant(), 'font-mono transition-colors duration-300', className)}>
      {showIcon && (isStrictMode && remainingSeconds <= 5 * 60 ? (
        <AlertTriangle className="h-3 w-3 mr-1" />
      ) : (
        <Clock className="h-3 w-3 mr-1" />
      ))}
      <span className={cn(getTimeColor(), 'transition-colors duration-300')}>
        {isOvertime && '-'}
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
      {isStrictMode && <span className="ml-1 text-[10px] opacity-70">left</span>}
    </Badge>
  );

  // Wrap in tooltip if strict mode has a reason
  if (isStrictMode && strictTimeReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {timerContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">{strictTimeReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return timerContent;
}

export default InterviewTimer;
