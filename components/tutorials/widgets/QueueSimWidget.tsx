"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { simulateQueue } from "@/lib/tutorials/widgets/queue-math"
import { formatOutputValue } from "@/lib/tutorials/widgets/format"
import type { QueueSimSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `queue-sim` family: rate mismatch made visible as depth-over-time. Staged
 * unlock in story order: producer rate, consumer rate, bounded/unbounded with the
 * full/shed policy, then scale-on-backlog when the spec stages it. One chart (the
 * depth polyline, decorative); the read-outs carry the meaning as text.
 */
export function QueueSimWidget({ spec }: { spec: QueueSimSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: queues and backpressure"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <QueueSimBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

function QueueSimBody({ spec }: { spec: QueueSimSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [producerRate, setProducerRate] = useState(spec.producerRate)
  const [consumerRate, setConsumerRate] = useState(spec.consumerRate)
  const [bounded, setBounded] = useState(false)
  const [onFull, setOnFull] = useState<"drop" | "backpressure">("drop")
  const [scaling, setScaling] = useState(false)
  const [unlocked, setUnlocked] = useState(1)

  const result = useMemo(
    () =>
      simulateQueue({
        producerRate,
        consumerRate,
        ticks: spec.ticks,
        capacity: bounded ? spec.capacity : Number.POSITIVE_INFINITY,
        onFull,
        burst: spec.burst,
        scaleOnBacklog: scaling ? spec.scaleOnBacklog : undefined,
      }),
    [producerRate, consumerRate, bounded, onFull, scaling, spec]
  )

  const finalDepth = result.depth[result.depth.length - 1] ?? 0
  const describe = () =>
    `Final depth ${finalDepth}. ${result.dropped > 0 ? `${result.dropped} dropped. ` : ""}${
      result.runawayAt !== null ? `Runaway from tick ${result.runawayAt}. ` : ""
    }Backlog latency ${Number.isFinite(result.backlogLatency) ? formatOutputValue(result.backlogLatency, "number") + " ticks" : "unbounded"}. Consumers ${result.consumers}.`

  const sliderRow = (
    label: string,
    value: number,
    set: (v: number) => void,
    enabled: boolean,
    unlockTo: number
  ) => (
    <div className={cn("flex items-center gap-2", !enabled && "opacity-60")}>
      <span className="text-muted-foreground w-36 shrink-0 text-xs">{label}</span>
      <input
        type="range"
        min={0.5}
        max={6}
        step={0.5}
        value={value}
        disabled={!enabled}
        aria-label={label}
        aria-valuetext={`${value} per tick`}
        onChange={(e) => {
          set(Number(e.target.value))
          setUnlocked((u) => Math.max(u, unlockTo))
        }}
        onPointerUp={() => announce(describe())}
        onKeyUp={(e) => {
          if (e.key.startsWith("Arrow")) announce(describe())
        }}
        className="accent-accent h-1.5 flex-1 cursor-pointer disabled:cursor-not-allowed"
      />
      <span className="text-foreground w-10 text-right font-mono text-sm tabular-nums">
        {value}
      </span>
    </div>
  )

  const chip = (label: string, on: boolean, flip: () => void, enabled: boolean, warn = false) => (
    <button
      type="button"
      aria-pressed={on}
      disabled={!enabled}
      onClick={flip}
      className={cn(
        "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        enabled && "hover:bg-muted/50 cursor-pointer",
        on &&
          (warn
            ? "border-amber-500/60 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
            : "border-accent/60 bg-accent/10 text-accent-strong font-semibold")
      )}
    >
      {label}
    </button>
  )

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
                  announce("Guess locked in. Watch the depth curve.")
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

          <div className="flex flex-col gap-2">
            {sliderRow(
              "Producer rate /tick",
              producerRate,
              setProducerRate,
              phase === "explore",
              2
            )}
            {sliderRow(
              "Consumer rate /tick",
              consumerRate,
              setConsumerRate,
              phase === "explore" && unlocked >= 2,
              3
            )}
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                (phase !== "explore" || unlocked < 3) && "opacity-60"
              )}
            >
              <span className="text-muted-foreground w-36 shrink-0 text-xs">Queue bound</span>
              {chip(
                bounded ? `bounded at ${spec.capacity}` : "unbounded",
                bounded,
                () => {
                  setBounded((b) => {
                    const next = !b
                    announce(next ? `Queue bounded at ${spec.capacity}.` : "Queue unbounded.")
                    return next
                  })
                  setUnlocked((u) => Math.max(u, 4))
                },
                phase === "explore" && unlocked >= 3
              )}
              {bounded &&
                chip(
                  onFull === "drop" ? "when full: drop" : "when full: backpressure",
                  true,
                  () => {
                    setOnFull((p) => {
                      const next = p === "drop" ? "backpressure" : "drop"
                      announce(
                        next === "drop"
                          ? "Overflow now drops."
                          : "Overflow now backpressures the producer."
                      )
                      return next
                    })
                  },
                  phase === "explore" && unlocked >= 3
                )}
            </div>
            {spec.scaleOnBacklog && (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  (phase !== "explore" || unlocked < 4) && "opacity-60"
                )}
              >
                <span className="text-muted-foreground w-36 shrink-0 text-xs">Autoscaling</span>
                {chip(
                  scaling
                    ? `scale on backlog over ${spec.scaleOnBacklog.threshold}`
                    : "fixed consumers",
                  scaling,
                  () => {
                    setScaling((s) => {
                      const next = !s
                      announce(
                        next
                          ? "Scaling on backlog: consumers added as lag crosses the threshold."
                          : "Fixed consumer count."
                      )
                      return next
                    })
                  },
                  phase === "explore" && unlocked >= 4
                )}
              </div>
            )}
          </div>

          <DepthChart depth={result.depth} capacity={bounded ? spec.capacity : null} />

          <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
            <p
              className={cn(
                result.runawayAt !== null
                  ? "font-semibold text-amber-700 dark:text-amber-300"
                  : "text-foreground/90"
              )}
            >
              Final depth <span className="font-mono tabular-nums">{finalDepth}</span>
              {result.runawayAt !== null
                ? `. Runaway growth from tick ${result.runawayAt}: this queue is just deferred failure.`
                : "."}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {result.consumed} consumed, {result.dropped} dropped, {result.consumers}{" "}
              {result.consumers === 1 ? "consumer" : "consumers"}. Backlog latency:{" "}
              {Number.isFinite(result.backlogLatency)
                ? `${formatOutputValue(result.backlogLatency, "number")} ticks`
                : "grows without bound"}
              .
            </p>
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

/** Decorative depth-over-time polyline with the capacity line when bounded. */
function DepthChart({ depth, capacity }: { depth: number[]; capacity: number | null }) {
  const W = 320
  const H = 64
  const max = Math.max(...depth, capacity ?? 0, 10)
  const points = depth
    .map(
      (d, i) =>
        `${((i / (depth.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 4 - (d / max) * (H - 10)).toFixed(1)}`
    )
    .join(" ")
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="text-accent h-16 w-full max-w-[320px]"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="currentColor" strokeOpacity="0.2" />
      {capacity !== null && (
        <line
          x1="0"
          y1={H - 4 - (capacity / max) * (H - 10)}
          x2={W}
          y2={H - 4 - (capacity / max) * (H - 10)}
          stroke="#d97706"
          strokeOpacity="0.6"
          strokeDasharray="4 3"
        />
      )}
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
