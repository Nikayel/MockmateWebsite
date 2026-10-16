"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * GradingCriteriaIndicator - Shows what candidates are evaluated on
 *
 * Design: Radial/arc meter style - NOT rectangular cards
 * Appears in post-interview feedback and as a small tooltip during interview
 */

interface Criterion {
  id: string
  label: string
  hint: string
  weight: number
  color: string
}

const criteria: Criterion[] = [
  {
    id: "understanding",
    label: "Understanding",
    hint: "Explain your approach",
    weight: 30,
    color: "#c4703f",
  },
  {
    id: "problem-solving",
    label: "Problem-Solving",
    hint: "Break it down, debug it",
    weight: 25,
    color: "#3fb883",
  },
  {
    id: "code-quality",
    label: "Code Quality",
    hint: "Working, efficient, readable",
    weight: 25,
    color: "#a78bfa",
  },
  {
    id: "communication",
    label: "Communication",
    hint: "Think out loud",
    weight: 20,
    color: "#fbbf24",
  },
]

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
  criterion: Criterion
  startAngle: number
  sweepAngle: number
  radius?: number
  strokeWidth?: number
  isActive: boolean
  onHover: (id: string | null) => void
}) {
  const center = radius + strokeWidth
  const circumference = 2 * Math.PI * radius
  const offset = (startAngle / 360) * circumference
  const length = (sweepAngle / 360) * circumference

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
  )
}

// Full radial display for feedback page
export function GradingCriteriaRadial({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeCriterion = criteria.find((c) => c.id === activeId)

  // Calculate arc angles
  let currentAngle = 0
  const segments = criteria.map((criterion) => {
    const sweepAngle = (criterion.weight / 100) * 360
    const segment = { criterion, startAngle: currentAngle, sweepAngle }
    currentAngle += sweepAngle
    return segment
  })

  const radius = 80
  const strokeWidth = 14
  const size = (radius + strokeWidth) * 2

  return (
    <div className={cn("flex items-center gap-6", className)}>
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
                <div className="text-2xl font-bold" style={{ color: activeCriterion.color }}>
                  {activeCriterion.weight}%
                </div>
                <div className="text-muted-foreground max-w-[80px] text-xs">
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
                <div className="text-muted-foreground text-sm font-medium">How</div>
                <div className="text-muted-foreground text-sm font-medium">you're</div>
                <div className="text-foreground text-sm font-medium">graded</div>
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
              "flex cursor-pointer items-center gap-2 transition-opacity",
              activeId && activeId !== criterion.id ? "opacity-40" : "opacity-100"
            )}
            onMouseEnter={() => setActiveId(criterion.id)}
            onMouseLeave={() => setActiveId(null)}
          >
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: criterion.color }} />
            <span className="text-muted-foreground text-xs">
              {criterion.label}
              <span className="text-muted-foreground ml-1">· {criterion.hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
// The workspace and feedback share the same criterion definitions.
export function GradingCriteriaList() {
  return (
    <dl className="divide-border divide-y">
      {criteria.map((criterion) => (
        <div key={criterion.id} className="py-3 text-sm">
          <dt className="text-foreground font-medium">{criterion.label}</dt>
          <dd className="text-muted-foreground mt-1">{criterion.hint}</dd>
        </div>
      ))}
    </dl>
  )
}

export default GradingCriteriaRadial
