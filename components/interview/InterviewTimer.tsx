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
  const getTimeColor = () => {
    if (minutes < 15) return 'text-green-400';
    if (minutes < 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBadgeVariant = () => {
    if (minutes < 15) return 'bg-green-500/10 border-green-500/30 text-green-400';
    if (minutes < 30) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    return 'bg-red-500/10 border-red-500/30 text-red-400';
  };

  return (
    <Badge className={cn(getBadgeVariant(), 'font-mono', className)}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      <span className={getTimeColor()}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </Badge>
  );
}

export default InterviewTimer;
