"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { activeSteps } from "@/lib/tutorials/widgets/families/sequence"
import type { SequenceSpec, SequenceStep } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `sequence` family: a learner-stepped sequence diagram with failure toggles.
 * Prev/Next reveals one step at a time (never autoplay); flipping a toggle rebuilds
 * the timeline from the spec's `when` gates and restarts it; a step carrying
 * `predict` makes the learner commit a guess before it reveals. The current step is
 * always rendered as TEXT under the controls (and narrated through the frame's live
 * region), so the SVG lanes stay decorative (aria-hidden) and status is never color
 * alone: lost/late/error are words in the step line and markers on the arrow.
 *
 * No animation runs; a revealed arrow appears instantly, so reduced motion renders
 * the same discrete stills as everyone gets.
 */
export function SequenceWidget({ spec }: { spec: SequenceSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Step through it"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <SequenceBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

function stepText(step: SequenceStep, index: number, total: number): string {
  const arrow = step.to ? ` to ${step.to}` : ""
  const status = step.status !== "ok" ? ` (${step.status})` : ""
  return `Step ${index + 1} of ${total}: ${step.from}${arrow}: ${step.label}${status}`
}

function SequenceBody({ spec }: { spec: SequenceSpec }) {
  const { announce } = useWidgetA11y()
  const [on, setOn] = useState<ReadonlySet<string>>(new Set())
  const [revealed, setRevealed] = useState(0)
  const [pendingPredict, setPendingPredict] = useState(false)
  const [answeredPredicts, setAnsweredPredicts] = useState<ReadonlySet<number>>(new Set())

  const steps = useMemo(() => activeSteps(spec, on), [spec, on])
  const current = revealed > 0 ? steps[revealed - 1] : null
  // The latest revealed step that carries a state map drives the shared-variable row.
  const stateRow = useMemo(() => {
    for (let i = revealed - 1; i >= 0; i--) if (steps[i].state) return steps[i].state!
    return null
  }, [steps, revealed])

  const flipToggle = (id: string) => {
    const next = new Set(on)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOn(next)
    setRevealed(0)
    setPendingPredict(false)
    setAnsweredPredicts(new Set())
    const count = activeSteps(spec, next).length
    announce(`Timeline changed: ${count} steps. Step through from the start.`)
  }

  const advance = () => {
    if (revealed >= steps.length) return
    const nextStep = steps[revealed]
    if (nextStep.predict && !answeredPredicts.has(revealed) && !pendingPredict) {
      setPendingPredict(true)
      announce(`Before this step: ${nextStep.predict.question}`)
      return
    }
    setPendingPredict(false)
    const next = revealed + 1
    setRevealed(next)
    announce(stepText(nextStep, revealed, steps.length))
  }

  const answerPredict = () => {
    setAnsweredPredicts(new Set([...answeredPredicts, revealed]))
    setPendingPredict(false)
    const nextStep = steps[revealed]
    const next = revealed + 1
    setRevealed(next)
    announce(`Guess locked in. ${stepText(nextStep, revealed, steps.length)}`)
  }

  const back = () => {
    if (revealed === 0) return
    setPendingPredict(false)
    const next = revealed - 1
    setRevealed(next)
    const step = next > 0 ? steps[next - 1] : null
    announce(step ? stepText(step, next - 1, steps.length) : "Back to the start.")
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm font-medium">{spec.title}</p>

      {(spec.toggles ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(spec.toggles ?? []).map((toggle) => (
            <span key={toggle.id} className="flex flex-col">
              <button
                type="button"
                aria-pressed={on.has(toggle.id)}
                onClick={() => flipToggle(toggle.id)}
                className={cn(
                  "border-border/70 text-muted-foreground hover:bg-muted/50 cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  on.has(toggle.id) &&
                    "border-amber-500/60 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
                )}
              >
                {toggle.label}: {on.has(toggle.id) ? "on" : "off"}
              </button>
              {toggle.description && (
                <span className="text-muted-foreground mt-0.5 text-[11px]">
                  {toggle.description}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <SequenceSvg spec={spec} steps={steps} revealed={revealed} />
      </div>

      {stateRow && (
        <div className="border-border/70 bg-muted/20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-1.5">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
            State
          </span>
          {Object.entries(stateRow).map(([key, value]) => (
            <span key={key} className="text-foreground/90 font-mono text-xs tabular-nums">
              {key} = {value}
            </span>
          ))}
        </div>
      )}

      {pendingPredict && steps[revealed]?.predict ? (
        <div className="border-accent/40 bg-accent/[0.06] flex flex-col gap-2 rounded-md border px-3 py-2.5">
          <p className="text-foreground/90 text-sm">{steps[revealed].predict!.question}</p>
          <div className="flex flex-wrap gap-2">
            {steps[revealed].predict!.options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={answerPredict}
                className="border-border/70 text-foreground/90 hover:bg-muted/50 focus-visible:ring-accent/50 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={revealed === 0}
            onClick={back}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1"
            disabled={revealed >= steps.length}
            onClick={advance}
          >
            Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <span className="text-foreground/90 min-w-0 flex-1 text-sm" data-current-step>
            {current
              ? stepText(current, revealed - 1, steps.length)
              : `Not started. ${steps.length} steps.`}
          </span>
        </div>
      )}
    </div>
  )
}

const LANE_W = 128
const LEFT_PAD = 24
const HEADER_H = 30
const ROW_H = 40

/** Decorative lanes-and-arrows rendering of the revealed prefix. */
function SequenceSvg({
  spec,
  steps,
  revealed,
}: {
  spec: SequenceSpec
  steps: SequenceStep[]
  revealed: number
}) {
  const laneX = (id: string) =>
    LEFT_PAD + LANE_W / 2 + spec.actors.findIndex((a) => a.id === id) * LANE_W
  const W = LEFT_PAD * 2 + spec.actors.length * LANE_W
  const H = HEADER_H + Math.max(steps.length, 2) * ROW_H + 8

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: W, height: H }}
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      {spec.actors.map((actor) => {
        const x = laneX(actor.id)
        return (
          <g key={actor.id}>
            <text
              x={x}
              y={14}
              textAnchor="middle"
              className="fill-current text-[12px] font-semibold"
            >
              {actor.label}
            </text>
            <line
              x1={x}
              y1={HEADER_H - 6}
              x2={x}
              y2={H - 4}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeDasharray="3 4"
            />
          </g>
        )
      })}
      {steps.slice(0, revealed).map((step, i) => {
        const y = HEADER_H + i * ROW_H + ROW_H / 2
        const x1 = laneX(step.from)
        const bad = step.status !== "ok"
        const stroke = bad ? "#d97706" : "currentColor"
        if (!step.to || step.to === step.from) {
          // Single-actor timer/note: a small tag on the lifeline.
          return (
            <g key={i}>
              <rect
                x={x1 - 52}
                y={y - 12}
                width={104}
                height={20}
                rx={4}
                fill="currentColor"
                fillOpacity="0.06"
                stroke={stroke}
                strokeOpacity="0.5"
              />
              <text x={x1} y={y + 2} textAnchor="middle" className="fill-current text-[10px]">
                {truncate(step.label, 18)}
              </text>
            </g>
          )
        }
        const x2 = laneX(step.to)
        const dir = x2 > x1 ? 1 : -1
        const xEnd = step.status === "lost" ? x1 + (x2 - x1) * 0.55 : x2 - dir * 6
        return (
          <g key={i} stroke={stroke} strokeOpacity={bad ? 0.9 : 0.75}>
            <line
              x1={x1}
              y1={y}
              x2={xEnd}
              y2={y}
              strokeWidth={1.5}
              strokeDasharray={step.status === "ok" ? undefined : "5 4"}
            />
            {step.status === "lost" ? (
              <g strokeWidth={1.5}>
                <line x1={xEnd - 4} y1={y - 4} x2={xEnd + 4} y2={y + 4} />
                <line x1={xEnd - 4} y1={y + 4} x2={xEnd + 4} y2={y - 4} />
              </g>
            ) : (
              <path
                d={`M ${xEnd} ${y} l ${-dir * 7} -4 l 0 8 z`}
                fill={stroke}
                stroke="none"
                fillOpacity={bad ? 0.9 : 0.75}
              />
            )}
            <text
              x={(x1 + x2) / 2}
              y={y - 6}
              textAnchor="middle"
              stroke="none"
              className="fill-current text-[10px]"
            >
              {truncate(step.label, 30)}
              {step.status !== "ok" ? ` (${step.status})` : ""}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text
}
