"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import { computeWindowFrame } from "@/lib/tutorials/diagrams/logic"
import type { WindowFrameSpec } from "@/lib/tutorials/diagrams/schema"

function frameLabel(frame: WindowFrameSpec["frame"]): string {
  if (frame === "running") return "ROWS UNBOUNDED PRECEDING → CURRENT ROW"
  const n = Number(frame.split("-")[1])
  return `ROWS ${n - 1} PRECEDING → CURRENT ROW`
}

function pretty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/**
 * Window-frame scrub (triggered). Steps a "current row" down the partition and shades
 * the frame (the rows the window sees), recomputing the aggregate as it moves. The
 * concept literally IS a moving range, so this congruent motion teaches what prose
 * cannot — and the value column reveals the running total / moving average step by step.
 */
export function WindowFrameDiagram({ spec }: { spec: WindowFrameSpec }) {
  const frames = useMemo(() => computeWindowFrame(spec), [spec])
  const player = useStepPlayer(spec.rows.length)
  const cur = player.index
  const frame = frames[cur]

  return (
    <DiagramFrame
      label={`${spec.fn}() OVER (${frameLabel(spec.frame)})`}
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel={`${spec.fn} window frame over ${spec.rows.length} rows, step-through`}
    >
      <table className="w-full border-collapse text-left font-mono text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="border-border border-b px-3 py-1.5 font-semibold">
              row
            </th>
            <th scope="col" className="border-border border-b px-3 py-1.5 text-right font-semibold">
              value
            </th>
            <th scope="col" className="border-border border-b px-3 py-1.5 text-right font-semibold">
              {spec.fn.toLowerCase()}
            </th>
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, r) => {
            const inFrame = r >= frame.frameStart && r <= frame.frameEnd
            const isCurrent = r === cur
            const revealed = r <= cur
            return (
              <tr
                key={r}
                className={cn(
                  !player.reducedMotion && "transition-colors duration-300",
                  // Left edge bar marks frame membership so it doesn't rely on tint alone (WCAG 1.4.1).
                  inFrame && !isCurrent && "border-l-accent/60 bg-accent/10 border-l-2",
                  isCurrent &&
                    "border-l-accent bg-accent/20 ring-accent/50 border-l-2 ring-1 ring-inset"
                )}
                aria-current={isCurrent ? "true" : undefined}
              >
                <td className="border-border/50 border-b px-3 py-1.5">
                  {inFrame && <span className="sr-only">in frame: </span>}
                  {row.label}
                </td>
                <td className="border-border/50 border-b px-3 py-1.5 text-right tabular-nums">
                  {pretty(row.value)}
                </td>
                <td
                  className={cn(
                    "border-border/50 text-muted-foreground border-b px-3 py-1.5 text-right tabular-nums",
                    isCurrent && "text-accent-strong font-semibold"
                  )}
                >
                  {revealed ? pretty(frames[r].value) : ""}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
        {`At ${spec.rows[cur].label}, the frame covers ${frame.frameEnd - frame.frameStart + 1} row${
          frame.frameEnd - frame.frameStart === 0 ? "" : "s"
        } → ${spec.fn} = ${pretty(frame.value)}.`}
      </p>
    </DiagramFrame>
  )
}
