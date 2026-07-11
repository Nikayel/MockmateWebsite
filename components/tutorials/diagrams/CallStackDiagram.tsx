"use client"

import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import type { CallStackSpec } from "@/lib/tutorials/diagrams/schema"

/**
 * Recursion call-stack (triggered). Pushes a frame per call down to the base case,
 * then pops each frame applying its pending step on the way back up — making "trust
 * the recursive call, then unwind" concrete. Frames stack bottom→top; a returning
 * frame is marked so the unwinding half reads as clearly as the descent.
 */
export function CallStackDiagram({ spec }: { spec: CallStackSpec }) {
  const player = useStepPlayer(spec.steps.length)
  const step = spec.steps[player.index]
  const maxDepth = Math.max(...spec.steps.map((s) => s.stack.length))

  return (
    <DiagramFrame
      label={spec.title ? `Call stack — ${spec.title}` : "Call stack"}
      controls={<StepControls player={player} />}
      caption={spec.caption}
    >
      <div
        className="flex flex-col-reverse justify-end gap-1"
        style={{ minHeight: `${maxDepth * 2.1 + 0.5}rem` }}
        aria-label={`Call stack, ${step.stack.length} frame${step.stack.length === 1 ? "" : "s"} deep`}
      >
        {step.stack.map((frame, depth) => {
          const isTop = depth === step.stack.length - 1
          const isReturning = isTop && !!step.returning
          return (
            <div
              key={depth}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-xs transition-colors duration-300",
                isReturning
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : isTop
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
              )}
              style={{ marginLeft: `${depth * 0.75}rem` }}
            >
              <span>{frame}</span>
              {isReturning && <span className="ml-2 opacity-80">→ returns {step.returning}</span>}
            </div>
          )
        })}
      </div>

      {step.note && (
        <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
          {step.note}
        </p>
      )}
    </DiagramFrame>
  )
}
