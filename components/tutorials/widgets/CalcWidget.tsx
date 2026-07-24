"use client"

import { useMemo, useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { evaluateExpr, parseExpr, type ExprAst } from "@/lib/tutorials/widgets/expr"
import { formatOutputValue } from "@/lib/tutorials/widgets/format"
import type { CalcSpec, CalcInput, CalcOutput } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `calc` family: a formula-slider engine that turns back-of-envelope math into
 * something the learner drives. The plan's sim ramp is structural here:
 *
 *   predict  -> one tap commits a guess before any number is shown
 *   worked   -> the initial values render with the authored worked-example narration
 *   explore  -> inputs unlock ONE at a time (touch the current one to unlock the next),
 *               outputs recompute live, at most one sparkline shows the causal shape
 *
 * A11y (WidgetFrame contract): native range/select inputs; sliders carry
 * aria-valuetext with the formatted value + unit; the frame's live region announces
 * the primary output when a slider is released; locked inputs are disabled with a
 * visible lock and text, never hidden. No animations run, so reduced motion needs no
 * special casing (the sparkline is a static polyline redrawn per value).
 */
export function CalcWidget({ spec }: { spec: CalcSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Explore the math"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <CalcBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

function initialValues(inputs: CalcInput[]): Record<string, number> {
  const env: Record<string, number> = {}
  for (const input of inputs)
    env[input.id] = input.kind === "slider" ? input.initial : input.options[input.initial].value
  return env
}

function CalcBody({ spec }: { spec: CalcSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [values, setValues] = useState<Record<string, number>>(() => initialValues(spec.inputs))
  // Inputs unlock one at a time: touching input i unlocks input i+1.
  const [unlocked, setUnlocked] = useState(1)

  // Parse once per spec: schema guaranteed these parse, so failures here are
  // impossible by construction; the guard keeps the renderer honest anyway.
  const compiled = useMemo(
    () =>
      spec.outputs.map((output) => {
        const parsed = parseExpr(output.expr)
        return parsed.ok ? parsed.ast : null
      }),
    [spec.outputs]
  )

  const results = useMemo(() => {
    const env = { ...values }
    return spec.outputs.map((output, i) => {
      const ast = compiled[i]
      const value = ast ? evaluateExpr(ast as ExprAst, env) : NaN
      env[output.id] = value
      return value
    })
  }, [values, spec.outputs, compiled])

  const setInput = (input: CalcInput, index: number, value: number) => {
    setValues((prev) => ({ ...prev, [input.id]: value }))
    setUnlocked((prev) => Math.max(prev, index + 2))
  }

  const announcePrimary = () => {
    const primary = spec.outputs[0]
    announce(
      `${primary.label}: ${formatOutputValue(results[0], primary.format)}${primary.unit ? ` ${primary.unit}` : ""}`
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-foreground text-sm font-medium">{spec.title}</p>

      {phase === "predict" ? (
        <div className="flex flex-col gap-2">
          <p className="text-foreground/90 text-sm">{spec.predictPrompt.question}</p>
          <div className="flex flex-wrap gap-2">
            {spec.predictPrompt.options.map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setGuess(i)
                  setPhase("worked")
                  announce("Guess locked in. Compare it with the live numbers.")
                }}
                className="border-border/70 text-foreground/90 hover:bg-muted/50 focus-visible:ring-accent/50 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {guess !== null && (
            <p className="text-muted-foreground text-xs">
              Your guess: {spec.predictPrompt.options[guess]}. Check it against the numbers below.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {spec.inputs.map((input, i) => {
              const enabled = phase === "explore" && i < unlocked
              return (
                <InputRow
                  key={input.id}
                  input={input}
                  value={values[input.id]}
                  enabled={enabled}
                  lockedHint={phase === "explore" && i >= unlocked}
                  onChange={(v) => setInput(input, i, v)}
                  onCommit={announcePrimary}
                />
              )
            })}
          </div>

          <OutputsPanel spec={spec} values={values} results={results} />

          {phase === "worked" && (
            <div className="border-accent/40 bg-accent/[0.06] flex flex-col gap-2 rounded-md border px-3 py-2.5">
              <p className="text-foreground/90 text-sm">{spec.workedExample}</p>
              <div>
                <Button size="sm" onClick={() => setPhase("explore")}>
                  Start exploring
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InputRow({
  input,
  value,
  enabled,
  lockedHint,
  onChange,
  onCommit,
}: {
  input: CalcInput
  value: number
  enabled: boolean
  lockedHint: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  const display =
    input.kind === "slider"
      ? `${formatOutputValue(value, "compact")}${input.unit ? ` ${input.unit}` : ""}`
      : undefined

  return (
    <div className={cn("flex flex-col gap-1", !enabled && "opacity-70")}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-foreground/90 flex items-center gap-1.5 text-xs font-medium">
          {lockedHint && <Lock className="text-muted-foreground h-3 w-3" aria-hidden="true" />}
          {input.label}
        </label>
        {display && (
          <span className="text-foreground font-mono text-xs tabular-nums">{display}</span>
        )}
      </div>
      {input.kind === "slider" ? (
        <SliderControl
          input={input}
          value={value}
          enabled={enabled}
          onChange={onChange}
          onCommit={onCommit}
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {input.options.map((option) => (
            <button
              key={option.label}
              type="button"
              disabled={!enabled}
              aria-pressed={values0(option.value, value)}
              onClick={() => {
                onChange(option.value)
                onCommit()
              }}
              className={cn(
                "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                enabled && "hover:bg-muted/50 cursor-pointer",
                values0(option.value, value) &&
                  "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {lockedHint && (
        <p className="text-muted-foreground text-[11px]">Adjust the control above first.</p>
      )}
    </div>
  )
}

/** Float-tolerant equality for select values. */
function values0(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9
}

/**
 * Native range input. Linear sliders map 1:1; log sliders use 0-100 integer
 * positions mapped exponentially so decades get equal travel (schema guarantees
 * min > 0 there).
 */
function SliderControl({
  input,
  value,
  enabled,
  onChange,
  onCommit,
}: {
  input: Extract<CalcInput, { kind: "slider" }>
  value: number
  enabled: boolean
  onChange: (value: number) => void
  onCommit: () => void
}) {
  const isLog = input.scale === "log"
  const position = isLog
    ? Math.round((Math.log(value / input.min) / Math.log(input.max / input.min)) * 100)
    : value
  const fromPosition = (p: number) =>
    isLog ? input.min * Math.pow(input.max / input.min, p / 100) : p

  return (
    <input
      type="range"
      min={isLog ? 0 : input.min}
      max={isLog ? 100 : input.max}
      step={isLog ? 1 : (input.step ?? (input.max - input.min) / 100)}
      value={position}
      disabled={!enabled}
      aria-label={input.label}
      aria-valuetext={`${formatOutputValue(value, "compact")}${input.unit ? ` ${input.unit}` : ""}`}
      onChange={(e) => onChange(fromPosition(Number(e.target.value)))}
      onPointerUp={onCommit}
      onKeyUp={(e) => {
        if (e.key.startsWith("Arrow") || e.key === "PageUp" || e.key === "PageDown") onCommit()
      }}
      className="accent-accent h-1.5 w-full cursor-pointer disabled:cursor-not-allowed"
    />
  )
}

function OutputsPanel({
  spec,
  values,
  results,
}: {
  spec: CalcSpec
  values: Record<string, number>
  results: number[]
}) {
  return (
    <div className="border-border/70 bg-muted/20 flex flex-col gap-1.5 rounded-md border px-3 py-2.5">
      {spec.outputs.map((output, i) => (
        <div key={output.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground text-xs">{output.label}</span>
            <span
              className={cn(
                "font-mono tabular-nums",
                i === 0 ? "text-foreground text-base font-semibold" : "text-foreground/90 text-sm"
              )}
            >
              {formatOutputValue(results[i], output.format)}
              {output.unit ? ` ${output.unit}` : ""}
            </span>
          </div>
          {output.sparkline && (
            <Sparkline spec={spec} output={output} values={values} currentValue={results[i]} />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Static SVG polyline of one output over one slider's range (40 samples, other
 * inputs held at their current values). Decorative: aria-hidden, with the read-out
 * row above carrying the value for assistive tech.
 */
function Sparkline({
  spec,
  output,
  values,
  currentValue,
}: {
  spec: CalcSpec
  output: CalcOutput
  values: Record<string, number>
  currentValue: number
}) {
  const points = useMemo(() => {
    const over = spec.inputs.find(
      (input): input is Extract<CalcInput, { kind: "slider" }> =>
        input.id === output.sparkline!.over && input.kind === "slider"
    )
    if (!over) return null
    const asts = new Map<string, ExprAst>()
    for (const o of spec.outputs) {
      const parsed = parseExpr(o.expr)
      if (parsed.ok) asts.set(o.id, parsed.ast)
    }
    const samples: Array<{ x: number; y: number }> = []
    const isLog = over.scale === "log"
    for (let s = 0; s <= 40; s++) {
      const x = isLog
        ? over.min * Math.pow(over.max / over.min, s / 40)
        : over.min + ((over.max - over.min) * s) / 40
      const env: Record<string, number> = { ...values, [over.id]: x }
      let y = NaN
      for (const o of spec.outputs) {
        const ast = asts.get(o.id)
        const v = ast ? evaluateExpr(ast, env) : NaN
        env[o.id] = v
        if (o.id === output.id) y = v
      }
      samples.push({ x: s / 40, y })
    }
    return samples
  }, [spec, output, values])

  if (!points) return null
  const finite = points.filter((p) => Number.isFinite(p.y))
  if (finite.length < 2) return null
  const yMin = Math.min(...finite.map((p) => p.y))
  const yMax = Math.max(...finite.map((p) => p.y))
  const span = yMax - yMin || 1
  const W = 260
  const H = 48
  const path = finite
    .map((p) => `${(p.x * W).toFixed(1)},${(H - ((p.y - yMin) / span) * (H - 6) - 3).toFixed(1)}`)
    .join(" ")
  const currentY = Number.isFinite(currentValue)
    ? H - ((currentValue - yMin) / span) * (H - 6) - 3
    : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="text-accent h-12 w-full max-w-[260px]"
      aria-hidden="true"
      focusable="false"
    >
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {currentY !== null && (
        <circle
          cx={W * findCurrentX(points, spec, output, values)}
          cy={currentY}
          r="3"
          fill="currentColor"
        />
      )}
    </svg>
  )
}

/** X position (0..1) of the slider's current value on the sparkline axis. */
function findCurrentX(
  points: Array<{ x: number; y: number }>,
  spec: CalcSpec,
  output: CalcOutput,
  values: Record<string, number>
): number {
  const over = spec.inputs.find(
    (input): input is Extract<CalcInput, { kind: "slider" }> =>
      input.id === output.sparkline!.over && input.kind === "slider"
  )
  if (!over) return 0
  const v = values[over.id]
  if (over.scale === "log") return Math.log(v / over.min) / Math.log(over.max / over.min)
  return (v - over.min) / (over.max - over.min)
}
