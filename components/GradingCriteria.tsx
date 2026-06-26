'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * GradingCriteriaIndicator - Shows what candidates are evaluated on
 *
 * Design: Radial/arc meter style - NOT rectangular cards
 * Appears in post-interview feedback and as a small tooltip during interview
 */

interface Criterion {
  id: string;
  label: string;
  hint: string;
  weight: number;
  color: string;
}

const criteria: Criterion[] = [
  {
    id: 'understanding',
    label: 'Understanding',
    hint: 'Explain your approach',
    weight: 30,
    color: '#c4703f',
  },
  {
    id: 'problem-solving',
    label: 'Problem-Solving',
    hint: 'Break it down, debug it',
    weight: 25,
    color: '#3fb883',
  },
  {
    id: 'code-quality',
    label: 'Code Quality',
    hint: 'Working, efficient, readable',
    weight: 25,
    color: '#a78bfa',
  },
  {
    id: 'communication',
    label: 'Communication',
    hint: 'Think out loud',
    weight: 20,
    color: '#fbbf24',
  },
];

// Arc segment component for the radial display
function ArcSegment({
  criterion,
  startAngle,
  sweepAngle,
  radius = 80,
  strokeWidth = 12,
  isActive,
  onHover,
}: {
  criterion: Criterion;
  startAngle: number;
  sweepAngle: number;
  radius?: number;
  strokeWidth?: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
}) {
  const center = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = (startAngle / 360) * circumference;
  const length = (sweepAngle / 360) * circumference;

  return (
    <g
      onMouseEnter={() => onHover(criterion.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={isActive ? criterion.color : `${criterion.color}40`}
        strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
        strokeDasharray={`${length} ${circumference - length}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-300"
      />
    </g>
  );
}

// Full radial display for feedback page
export function GradingCriteriaRadial({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeCriterion = criteria.find((c) => c.id === activeId);

  // Calculate arc angles
  let currentAngle = 0;
  const segments = criteria.map((criterion) => {
    const sweepAngle = (criterion.weight / 100) * 360;
    const segment = { criterion, startAngle: currentAngle, sweepAngle };
    currentAngle += sweepAngle;
    return segment;
  });

  const radius = 80;
  const strokeWidth = 14;
  const size = (radius + strokeWidth) * 2;

  return (
    <div className={cn('flex items-center gap-6', className)}>
      {/* Radial chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((segment) => (
            <ArcSegment
              key={segment.criterion.id}
              criterion={segment.criterion}
              startAngle={segment.startAngle}
              sweepAngle={segment.sweepAngle - 4}
              radius={radius}
              strokeWidth={strokeWidth}
              isActive={activeId === segment.criterion.id || !activeId}
              onHover={setActiveId}
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {activeCriterion ? (
              <motion.div
                key={activeCriterion.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div
                  className="text-2xl font-bold"
                  style={{ color: activeCriterion.color }}
                >
                  {activeCriterion.weight}%
                </div>
                <div className="text-xs text-muted-foreground max-w-[80px]">
                  {activeCriterion.label}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="text-sm font-medium text-muted-foreground">How</div>
                <div className="text-sm font-medium text-muted-foreground">you're</div>
                <div className="text-sm font-medium text-foreground">graded</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend - vertical dots */}
      <div className="space-y-3">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className={cn(
              'flex items-center gap-2 cursor-pointer transition-opacity',
              activeId && activeId !== criterion.id ? 'opacity-40' : 'opacity-100'
            )}
            onMouseEnter={() => setActiveId(criterion.id)}
            onMouseLeave={() => setActiveId(null)}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: criterion.color }}
            />
            <span className="text-xs text-muted-foreground">
              {criterion.label}
              <span className="text-muted-foreground ml-1">· {criterion.hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact inline version for interview page
export function GradingCriteriaCompact({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {criteria.map((criterion, idx) => (
        <div
          key={criterion.id}
          className="group relative"
          title={`${criterion.label}: ${criterion.hint}`}
        >
          {/* Small bar segment */}
          <div
            className="h-1 rounded-full transition-all group-hover:h-1.5"
            style={{
              width: `${criterion.weight * 0.8}px`,
              backgroundColor: criterion.color,
              opacity: 0.7,
            }}
          />

          {/* Tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <div className="bg-card border border-border rounded px-2 py-1 whitespace-nowrap">
              <span className="text-[10px] font-medium" style={{ color: criterion.color }}>
                {criterion.label}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">{criterion.weight}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Minimal tooltip trigger for interview coding panel
export function GradingCriteriaTooltip({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-muted-foreground transition-colors"
      >
        <span className="flex gap-0.5">
          {criteria.map((c) => (
            <span
              key={c.id}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: c.color, opacity: 0.6 }}
            />
          ))}
        </span>
        <span>grading</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover */}
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 z-50"
            >
              <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  What matters
                </div>
                <div className="space-y-1.5">
                  {criteria.map((criterion) => (
                    <div key={criterion.id} className="flex items-center gap-2">
                      <div
                        className="w-1 h-3 rounded-full"
                        style={{ backgroundColor: criterion.color }}
                      />
                      <div className="flex-1 text-xs text-muted-foreground">
                        {criterion.label}
                      </div>
                      <div
                        className="text-[10px] font-medium"
                        style={{ color: criterion.color }}
                      >
                        {criterion.weight}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    AI usage is optional. Explain your thinking.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GradingCriteriaRadial;
