"use client"

import { useEffect, useState } from "react"

/**
 * A compact circular progress ring for the level summary rail: a muted track, a clay (accent) fill
 * arc, and the percentage in the center. The arc animates from empty to `percent` once on mount
 * (one of the screen's two intentional motions) and honors `prefers-reduced-motion` via Tailwind's
 * `motion-reduce:*` variant, which snaps the arc to its final position with no transition.
 */
export function LevelProgressRing({
  percent,
  size = 92,
  strokeWidth = 9,
}: {
  percent: number
  size?: number
  strokeWidth?: number
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  // Start empty, then fill to target on the next frame so the CSS transition has a "from" to animate.
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped])

  const offset = circumference - (shown / 100) * circumference

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="text-foreground absolute text-lg font-semibold tabular-nums">{clamped}%</span>
    </div>
  )
}
