"use client"

import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepPlayer } from "./useStepPlayer"

/**
 * The play/step control bar shared by every triggered diagram. Buttons are real
 * `<button>`s (keyboard + screen-reader native); the step count is announced via an
 * `aria-live` region so non-visual users hear progress. Under reduced motion the Play
 * button is hidden — the sequence is stepped manually, never auto-animated.
 */
export function StepControls({ player, className }: { player: StepPlayer; className?: string }) {
  const { index, stepCount, isPlaying, atStart, atEnd, reducedMotion } = player

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <IconButton label="Restart" onClick={player.reset} disabled={atStart && !isPlaying}>
        <RotateCcw className="size-3.5" />
      </IconButton>
      <IconButton label="Previous step" onClick={player.prev} disabled={atStart}>
        <ChevronLeft className="size-4" />
      </IconButton>

      {!reducedMotion && (
        <IconButton
          label={isPlaying ? "Pause" : "Play"}
          onClick={player.togglePlay}
          variant="primary"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconButton>
      )}

      <IconButton label="Next step" onClick={player.next} disabled={atEnd}>
        <ChevronRight className="size-4" />
      </IconButton>

      <span
        className="text-muted-foreground ml-1 font-mono text-[11px] tabular-nums"
        aria-live="polite"
      >
        Step {index + 1} / {stepCount}
      </span>
    </div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  variant = "ghost",
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "ghost" | "primary"
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40",
        variant === "primary"
          ? "bg-accent/15 text-accent hover:bg-accent/25"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}
