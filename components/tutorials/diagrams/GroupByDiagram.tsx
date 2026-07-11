"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { StepControls } from "./primitives/StepControls"
import { useStepPlayer } from "./primitives/useStepPlayer"
import { computeGroupBuckets } from "@/lib/tutorials/diagrams/logic"
import type { GroupBySpec } from "@/lib/tutorials/diagrams/schema"

/** A few distinguishable group tints (border + bg), color is never the ONLY signal — the group label carries it. */
const GROUP_TINTS = [
  "border-l-emerald-500 bg-emerald-500/5",
  "border-l-blue-500 bg-blue-500/5",
  "border-l-amber-500 bg-amber-500/5",
  "border-l-violet-500 bg-violet-500/5",
  "border-l-rose-500 bg-rose-500/5",
]

const PHASES = ["Rows", "Grouped", "Aggregated"] as const

/**
 * GROUP BY bucketing (triggered). Three phases: raw rows → rows clustered by key →
 * each cluster collapses to one aggregate row. Resolves the per-row vs per-group
 * confusion (why you can't SELECT a non-grouped column) by making the collapse visible.
 */
export function GroupByDiagram({ spec }: { spec: GroupBySpec }) {
  const buckets = useMemo(() => computeGroupBuckets(spec), [spec])
  const player = useStepPlayer(PHASES.length)
  const phase = player.index // 0 rows, 1 grouped, 2 aggregated

  const tintFor = (group: string) => {
    const gi = buckets.findIndex((b) => b.group === group)
    return GROUP_TINTS[gi % GROUP_TINTS.length]
  }

  return (
    <DiagramFrame
      label={`${spec.agg}(value) GROUP BY ${spec.by} — ${PHASES[phase]}`}
      controls={<StepControls player={player} />}
      caption={spec.caption}
      containerProps={player.containerProps}
      groupLabel={`GROUP BY ${spec.by} bucketing, step-through`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <figure>
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            Input rows
          </figcaption>
          <ul className="space-y-1">
            {(phase >= 1 ? buckets.flatMap((b) => b.members) : spec.rows.map((_, i) => i)).map(
              (rowIdx) => {
                const row = spec.rows[rowIdx]
                return (
                  <li
                    key={rowIdx}
                    className={cn(
                      "flex justify-between rounded-sm border-l-2 px-2 py-1 font-mono text-xs",
                      !player.reducedMotion && "transition-colors duration-300",
                      phase >= 1 ? tintFor(row.group) : "bg-muted/30 border-l-transparent"
                    )}
                  >
                    <span className="text-foreground">{row.group}</span>
                    <span className="text-muted-foreground tabular-nums">{row.value}</span>
                  </li>
                )
              }
            )}
          </ul>
        </figure>

        <figure>
          <figcaption className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
            {phase >= 2 ? "Result" : "Groups"}
          </figcaption>
          <ul className="space-y-1">
            {buckets.map((b) => (
              <li
                key={b.group}
                className={cn(
                  "flex justify-between rounded-sm border-l-2 px-2 py-1 font-mono text-xs",
                  tintFor(b.group)
                )}
              >
                <span className="text-foreground">{b.group}</span>
                <span className="text-foreground tabular-nums">
                  {phase >= 2 ? (
                    <span className="text-accent font-semibold">{b.value}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {b.members.map((i) => spec.rows[i].value).join(" + ")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </figure>
      </div>
      <p className="text-muted-foreground mt-3 text-xs" aria-live="polite">
        {phase === 0 && `${spec.rows.length} input rows.`}
        {phase === 1 &&
          `Rows cluster into ${buckets.length} group${buckets.length === 1 ? "" : "s"} by ${spec.by}.`}
        {phase === 2 &&
          `Each group collapses to ONE row: ${spec.agg} of its values. ${spec.rows.length} rows → ${buckets.length}.`}
      </p>
    </DiagramFrame>
  )
}
