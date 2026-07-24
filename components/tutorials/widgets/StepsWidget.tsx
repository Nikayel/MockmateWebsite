"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { StepsSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `steps` family: authored snapshot frames walked with Prev/Next. Every frame
 * is static rows of cells plus a note, so ONE component serves the whole long tail
 * (log compaction, cursor pagination, deploy pools, column scans, order books).
 * A frame may carry a predict gate: advancing into it shows the question first,
 * and any answer reveals the frame — the frame itself is the feedback.
 */
export function StepsWidget({ spec }: { spec: StepsSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Step through it"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <StepsBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

const CELL_STYLE: Record<string, string> = {
  normal: "border-border/70 text-foreground/90",
  active: "border-accent/70 bg-accent/10 text-accent-strong font-semibold",
  new: "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  dropped: "border-border/50 text-muted-foreground line-through opacity-60",
  dim: "border-border/50 text-muted-foreground opacity-70",
}

function StepsBody({ spec }: { spec: StepsSpec }) {
  const { announce } = useWidgetA11y()
  const [index, setIndex] = useState(0)
  /** Predict gate pending for the frame the learner is trying to enter. */
  const [gate, setGate] = useState<number | null>(null)
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set())

  const frame = spec.frames[index]
  const last = spec.frames.length - 1

  const goTo = (next: number) => {
    setIndex(next)
    setGate(null)
    announce(`Frame ${next + 1} of ${spec.frames.length}. ${spec.frames[next].note}`)
  }

  const onNext = () => {
    if (index >= last) return
    const next = index + 1
    if (spec.frames[next].predict && !answered.has(next)) {
      setGate(next)
      return
    }
    goTo(next)
  }

  const gatedPredict = gate !== null ? spec.frames[gate].predict : undefined

  return (
    <div className="flex flex-col gap-3" data-frame={index}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-foreground text-sm font-medium">{spec.title}</p>
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {index + 1} / {spec.frames.length}
        </span>
      </div>

      {gate !== null && gatedPredict ? (
        <div className="border-accent/40 bg-accent/[0.06] flex flex-col gap-2 rounded-md border px-3 py-2.5">
          <p className="text-foreground/90 text-sm">{gatedPredict.question}</p>
          <div className="flex flex-wrap gap-2">
            {gatedPredict.options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setAnswered((a) => new Set(a).add(gate))
                  goTo(gate)
                }}
                className="border-border/70 text-foreground/90 hover:bg-muted/50 focus-visible:ring-accent/50 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            Commit to a guess; the next frame is the answer.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {frame.rows.map((row, r) => (
              <div key={r} className="flex items-center gap-1.5">
                {row.label !== undefined && (
                  <span className="text-muted-foreground w-24 shrink-0 truncate text-right text-[11px]">
                    {row.label}
                  </span>
                )}
                <div className="flex min-w-0 flex-wrap gap-1">
                  {row.cells.map((cell, c) => (
                    <span
                      key={c}
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-xs whitespace-nowrap tabular-nums",
                        CELL_STYLE[cell.state]
                      )}
                    >
                      {cell.text}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-foreground/90 border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
            {frame.note}
          </p>
        </>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={index === 0 || gate !== null}
          onClick={() => goTo(index - 1)}
        >
          Prev
        </Button>
        <Button type="button" size="sm" disabled={index >= last || gate !== null} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
