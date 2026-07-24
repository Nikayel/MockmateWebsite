"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  fixedWindow,
  requestStream,
  slidingWindow,
  tokenBucket,
  worstWindowLoad,
  type Verdict,
} from "@/lib/tutorials/widgets/limiter-math"
import type { RateLimiterSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `rate-limiter` family: one seeded request stream, three algorithms, and the
 * boundary-burst toggle that stages the fixed-window aha. Controls unlock in story
 * order (algorithm switch, then the burst); the money read-out is the worst
 * trailing-window admission versus the nominal limit, always as text. The verdict
 * strip SVG is decorative (aria-hidden); reduced motion needs nothing special
 * (verdicts render as stills).
 */
export function RateLimiterWidget({ spec }: { spec: RateLimiterSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: rate limiting"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <RateLimiterBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

const ALGO_LABEL: Record<RateLimiterSpec["algorithms"][number], string> = {
  "token-bucket": "token bucket",
  "fixed-window": "fixed window",
  "sliding-window": "sliding window",
}

function RateLimiterBody({ spec }: { spec: RateLimiterSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [algorithm, setAlgorithm] = useState(spec.algorithms[0])
  const [burstOn, setBurstOn] = useState(false)
  const [unlocked, setUnlocked] = useState(1)

  const stream = useMemo(
    () =>
      requestStream({
        seed: spec.seed,
        count: spec.requests,
        horizon: spec.horizon,
        burstAt: burstOn ? spec.burstAt : undefined,
        burstSize: spec.burstSize,
      }),
    [spec, burstOn]
  )

  const verdicts: Verdict[] = useMemo(() => {
    if (algorithm === "token-bucket")
      return tokenBucket(stream, {
        capacity: spec.limit,
        refillPerTick: spec.refillPerTick ?? spec.limit / spec.windowSize,
      })
    if (algorithm === "fixed-window")
      return fixedWindow(stream, { limit: spec.limit, windowSize: spec.windowSize })
    return slidingWindow(stream, { limit: spec.limit, windowSize: spec.windowSize })
  }, [stream, algorithm, spec])

  const allowed = verdicts.filter((v) => v.allowed).length
  const worst = worstWindowLoad(verdicts, spec.windowSize)

  const describe = () =>
    `${ALGO_LABEL[algorithm]}: ${allowed} of ${verdicts.length} admitted. Worst ${spec.windowSize}-tick window admitted ${worst} against a limit of ${spec.limit}.`

  const pickAlgorithm = (algo: typeof algorithm) => {
    setAlgorithm(algo)
    setUnlocked((u) => Math.max(u, 2))
    announce(describe())
  }

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
                  announce("Guess locked in. Compare it with the verdicts below.")
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground w-24 text-xs">Algorithm</span>
            {spec.algorithms.map((algo) => (
              <button
                key={algo}
                type="button"
                aria-pressed={algorithm === algo}
                disabled={phase !== "explore"}
                onClick={() => pickAlgorithm(algo)}
                className={cn(
                  "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  phase === "explore" && "hover:bg-muted/50 cursor-pointer",
                  algorithm === algo &&
                    "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                )}
              >
                {ALGO_LABEL[algo]}
              </button>
            ))}
          </div>

          {spec.burstAt !== undefined && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                phase === "explore" && unlocked < 2 && "opacity-60"
              )}
            >
              <span className="text-muted-foreground w-24 text-xs">Boundary burst</span>
              <button
                type="button"
                aria-pressed={burstOn}
                disabled={phase !== "explore" || unlocked < 2}
                onClick={() => {
                  setBurstOn((b) => {
                    const next = !b
                    announce(next ? "Burst fired at the window boundary." : "Burst removed.")
                    return next
                  })
                }}
                className={cn(
                  "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  phase === "explore" && unlocked >= 2 && "hover:bg-muted/50 cursor-pointer",
                  burstOn &&
                    "border-amber-500/60 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
                )}
              >
                {burstOn ? "on" : "off"}
              </button>
              {phase === "explore" && unlocked < 2 && (
                <span className="text-muted-foreground text-[11px]">
                  Try another algorithm first.
                </span>
              )}
            </div>
          )}

          <VerdictStrip verdicts={verdicts} horizon={spec.horizon} />

          <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
            <p className="text-foreground/90">
              <span className="font-mono font-semibold tabular-nums">{allowed}</span> of{" "}
              <span className="font-mono tabular-nums">{verdicts.length}</span> requests admitted.
            </p>
            <p
              className={cn(
                "mt-0.5",
                worst > spec.limit
                  ? "font-semibold text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              Worst {spec.windowSize}-tick window: {worst} admitted (limit {spec.limit})
              {worst > spec.limit ? ". The limiter leaked." : "."}
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

/** Decorative timeline: one tick per request, solid = admitted, hollow = denied. */
function VerdictStrip({ verdicts, horizon }: { verdicts: Verdict[]; horizon: number }) {
  const W = 320
  const H = 26
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-7 w-full max-w-[320px]"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="currentColor" strokeOpacity="0.2" />
      {verdicts.map((v, i) => {
        const x = (v.at / horizon) * (W - 4) + 2
        return v.allowed ? (
          <rect
            key={i}
            x={x - 1.5}
            y={4}
            width={3}
            height={H - 10}
            rx={1}
            className="fill-current"
            opacity="0.7"
          />
        ) : (
          <rect
            key={i}
            x={x - 1.5}
            y={4}
            width={3}
            height={H - 10}
            rx={1}
            fill="none"
            stroke="#d97706"
            strokeWidth="1"
          />
        )
      })}
    </svg>
  )
}
