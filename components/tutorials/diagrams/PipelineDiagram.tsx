import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { DiagramFrame } from "./primitives/DiagramFrame"
import { expandPipeline } from "@/lib/tutorials/diagrams/logic"
import type { PipelineSpec } from "@/lib/tutorials/diagrams/schema"

/**
 * The logical execution-order pipeline (static). Fixes the #1 SQL misconception —
 * that clauses run in written order — by showing the order the engine actually
 * evaluates them: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. Plain
 * flex/DOM (no canvas), so it is keyboard- and screen-reader-legible as a list.
 */
export function PipelineDiagram({ spec }: { spec: PipelineSpec }) {
  const stages = expandPipeline(spec)
  const highlight = new Set(spec.highlight ?? [])

  return (
    <DiagramFrame label="Order of evaluation" caption={spec.caption}>
      <ol className="flex flex-wrap items-stretch gap-y-3" aria-label="SQL logical execution order">
        {stages.map((stage, i) => {
          const isHot = highlight.has(stage.label)
          return (
            <li key={`${stage.label}-${i}`} className="flex items-center">
              <div
                className={cn(
                  "flex min-w-[92px] flex-col rounded-md border px-3 py-2",
                  isHot
                    ? "border-accent/60 bg-accent/10 ring-accent/30 ring-1"
                    : "border-border bg-muted/30"
                )}
              >
                <span className="text-foreground font-mono text-xs font-semibold">
                  {stage.label}
                </span>
                {stage.note && (
                  <span className="text-muted-foreground mt-0.5 text-[11px] leading-tight">
                    {stage.note}
                  </span>
                )}
              </div>
              {i < stages.length - 1 && (
                <ArrowRight className="text-muted-foreground/50 mx-1 size-4 shrink-0" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
    </DiagramFrame>
  )
}
