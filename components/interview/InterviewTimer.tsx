'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * InterviewTimer - Displays elapsed time during interview
 *
 * Shows time in MM:SS format with visual feedback for different phases:
 * - Green: Under 15 minutes (good pace)
 * - Yellow: 15-30 minutes (moderate)
 * - Red: Over 30 minutes (may need to speed up)
 *
 * In calm mode, colors are muted to reduce anxiety (see globals.css .timer-warning/.timer-danger)
 */

interface InterviewTimerProps {
  elapsedSeconds: number;
  className?: string;
  showIcon?: boolean;
}

export function InterviewTimer({
  elapsedSeconds,
  className,
  showIcon = true,
}: InterviewTimerProps) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;

  // Determine color based on time
  // Note: calm-success/calm-warning classes get overridden in calm mode via CSS
  const getTimeColor = () => {
    if (minutes < 15) return 'text-green-400 calm-success';
    if (minutes < 30) return 'text-yellow-400 timer-warning';
    return 'text-red-400 timer-danger';
  };

  const getBadgeVariant = () => {
    if (minutes < 15) return 'bg-green-500/10 border-green-500/30 text-green-400';
    if (minutes < 30) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    return 'bg-red-500/10 border-red-500/30 text-red-400';
  };

  return (
    <Badge className={cn(getBadgeVariant(), 'font-mono transition-colors duration-300', className)}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      <span className={cn(getTimeColor(), 'transition-colors duration-300')}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </Badge>
  );
}

export default InterviewTimer;
