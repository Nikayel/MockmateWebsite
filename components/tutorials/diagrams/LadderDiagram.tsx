"use client"

import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import type { LadderSpec } from "@/lib/tutorials/diagrams/schema"

/**
 * Staged ordered-levels ladder (triggered). Bands reveal one at a time, smallest to
 * largest, each with its bar sized by value (log scale gives each decade equal
 * travel, which is what makes the RAM-to-SSD and DC-to-cross-region cliffs VISIBLE
 * instead of read). The current band's note is the one aria-live sentence.
 */
export function LadderDiagram({ spec }: { spec: LadderSpec }) {
  const player = useStepPlayer(spec.bands.length)
  const min = spec.bands[0].value
  const max = spec.bands[spec.bands.length - 1].value

  const widthFor = (value: number): number => {
    if (spec.scale === "log" && max > min)
      return 6 + (Math.log(value / min) / Math.log(max / min)) * 94
    return 6 + (value / max) * 94
  }

  const current = spec.bands[player.index]

  return (
    <DiagramFrame
      label={spec.title ?? "Ladder"}
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel={`${spec.title ?? "ladder"}, step-through`}
    >
      <div className="flex flex-col gap-1.5">
        {spec.bands.map((band, i) => {
          const revealed = i <= player.index
          const isCurrent = i === player.index
          return (
            <div key={i} className={cn("flex items-center gap-2", !revealed && "opacity-25")}>
              <span
                className={cn(
                  "w-40 shrink-0 truncate text-xs",
                  isCurrent ? "text-foreground font-semibold" : "text-foreground/80"
                )}
              >
                {band.label}
              </span>
              <span className="bg-muted/40 relative h-4 min-w-0 flex-1 overflow-hidden rounded-sm">
                {revealed && (
                  <span
                    className={cn(
                      "bg-accent/70 block h-full rounded-sm",
                      !player.reducedMotion && "transition-[width] duration-300"
                    )}
                    style={{ width: `${widthFor(band.value)}%` }}
                  />
                )}
              </span>
              <span className="text-muted-foreground w-20 shrink-0 text-right font-mono text-[11px] tabular-nums">
                {revealed ? (band.display ?? String(band.value)) : ""}
              </span>
            </div>
          )
        })}
        {/* The one live sentence per diagram: the current band's annotation. */}
        <p aria-live="polite" className="text-muted-foreground mt-2 min-h-8 text-xs">
          {current
            ? `${current.label}: ${current.display ?? current.value}${current.note ? `. ${current.note}` : ""}`
            : ""}
        </p>
      </div>
    </DiagramFrame>
  )
}
