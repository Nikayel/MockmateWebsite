"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { simulateWatermark, watermarkStream } from "@/lib/tutorials/widgets/watermark-math"
import type { WatermarkSimSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `watermark-sim` family: out-of-order events against tumbling windows. The
 * lateness slider IS the latency-vs-completeness trade; the mode chips (when the
 * spec stages processing-time) show late data landing in the wrong bucket silently.
 * One component serves every lesson config, per the plan's exit criterion.
 */
export function WatermarkSimWidget({ spec }: { spec: WatermarkSimSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: event time"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <WatermarkSimBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

function WatermarkSimBody({ spec }: { spec: WatermarkSimSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [lateness, setLateness] = useState(spec.allowedLateness)
  const [mode, setMode] = useState<"event-time" | "processing-time">("event-time")
  const [unlocked, setUnlocked] = useState(1)

  const events = useMemo(
    () =>
      watermarkStream({
        seed: spec.seed,
        count: spec.count,
        horizon: spec.horizon,
        skew: spec.skew,
      }),
    [spec]
  )
  const result = useMemo(
    () =>
      simulateWatermark({
        events,
        windowSize: spec.windowSize,
        watermarkDelay: spec.watermarkDelay,
        allowedLateness: lateness,
        mode,
      }),
    [events, spec, lateness, mode]
  )

  const describe = () =>
    mode === "processing-time"
      ? `Processing time: ${result.totalMisbucketed} events landed in the wrong window, silently.`
      : `Allowed lateness ${lateness}: ${result.totalCorrections} corrections re-fired, ${result.totalSideOutputs} events lost to side output.`

  return (
    <div className="flex flex-col gap-3">
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
                  announce("Guess locked in. Watch where the late events land.")
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
              Your guess: {spec.predictPrompt.options[guess]}.
            </p>
          )}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-36 shrink-0 text-xs">Allowed lateness</span>
            <input
              type="range"
              min={0}
              max={spec.maxLateness}
              step={1}
              value={lateness}
              disabled={phase !== "explore" || mode === "processing-time"}
              aria-label="Allowed lateness"
              aria-valuetext={`${lateness} ticks`}
              onChange={(e) => {
                setLateness(Number(e.target.value))
                setUnlocked((u) => Math.max(u, 2))
              }}
              onPointerUp={() => announce(describe())}
              onKeyUp={(e) => {
                if (e.key.startsWith("Arrow")) announce(describe())
              }}
              className="accent-accent h-1.5 flex-1 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-foreground w-10 text-right font-mono text-sm tabular-nums">
              {lateness}
            </span>
          </div>

          {spec.modes.includes("processing-time") && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                (phase !== "explore" || unlocked < 2) && "opacity-60"
              )}
            >
              <span className="text-muted-foreground w-36 shrink-0 text-xs">Time semantics</span>
              {spec.modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  disabled={phase !== "explore" || unlocked < 2}
                  onClick={() => {
                    setMode(m)
                    announce(
                      m === "processing-time"
                        ? "Processing time: windows bucket by ARRIVAL. Late data lands in the wrong bucket with no error."
                        : "Event time: windows bucket by when things happened."
                    )
                  }}
                  className={cn(
                    "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    phase === "explore" && unlocked >= 2 && "hover:bg-muted/50 cursor-pointer",
                    mode === m && "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                  )}
                >
                  {m === "event-time" ? "event time" : "processing time"}
                </button>
              ))}
            </div>
          )}

          {/* Event strip: arrival order, disposition-coded. Decorative; totals are text. */}
          <svg
            viewBox={`0 0 320 22`}
            className="h-6 w-full max-w-[320px]"
            aria-hidden="true"
            focusable="false"
          >
            {result.perEvent.map((e, i) => {
              const x = (i / result.perEvent.length) * 316 + 2
              const late = e.disposition !== "on time"
              const lost =
                e.disposition.includes("side output") || e.disposition.includes("wrong bucket")
              return (
                <rect
                  key={i}
                  x={x}
                  y={4}
                  width={2.5}
                  height={14}
                  rx={1}
                  className={lost ? "" : "fill-current"}
                  fill={lost ? "none" : undefined}
                  stroke={late ? "#d97706" : undefined}
                  strokeWidth={late ? 0.9 : 0}
                  opacity={lost ? 1 : late ? 0.9 : 0.55}
                />
              )
            })}
          </svg>

          <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
            {mode === "event-time" ? (
              <>
                <p className="text-foreground/90">
                  <span className="font-mono font-semibold tabular-nums">
                    {result.totalCorrections}
                  </span>{" "}
                  corrections re-fired,{" "}
                  <span
                    className={cn(
                      "font-mono font-semibold tabular-nums",
                      result.totalSideOutputs > 0 && "text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {result.totalSideOutputs}
                  </span>{" "}
                  events lost to side output.
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Raise lateness for completeness (later final results); lower it for latency
                  (earlier finals, more losses). That is the whole trade.
                </p>
              </>
            ) : (
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {result.totalMisbucketed} events counted in the WRONG window, with no error raised.
                This is what processing-time analytics silently does to late data.
              </p>
            )}
          </div>

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
