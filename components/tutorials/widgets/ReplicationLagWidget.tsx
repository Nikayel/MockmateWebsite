"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  readYourWrites,
  simulateReplication,
  type Cure,
} from "@/lib/tutorials/widgets/replication-math"
import type { ReplicationLagSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `replication-lag` family: per-follower lag over time, the write-burst spike,
 * then the vanishing-comment scenario and its cures. Story-ordered: fire the burst,
 * run the read, then try sticky routing and the version token. The lag chart is
 * decorative; the outcome text carries the meaning.
 */
export function ReplicationLagWidget({ spec }: { spec: ReplicationLagSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: replication lag"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <ReplicationLagBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

const CURE_LABEL: Record<Cure, string> = {
  none: "no cure",
  sticky: "sticky routing",
  "version-token": "version token",
}

function ReplicationLagBody({ spec }: { spec: ReplicationLagSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [burstOn, setBurstOn] = useState(false)
  const [cure, setCure] = useState<Cure>("none")
  const [ranScenario, setRanScenario] = useState(false)
  const [unlocked, setUnlocked] = useState(1)

  const timeline = useMemo(
    () =>
      simulateReplication({
        ticks: spec.ticks,
        writeRate: spec.writeRate,
        burst: burstOn ? spec.burst : undefined,
        applyRate: spec.applyRate,
        followerCount: spec.followers,
      }),
    [spec, burstOn]
  )

  const outcome = useMemo(
    () =>
      readYourWrites(timeline, {
        writeTick: spec.scenario.writeTick,
        readTick: spec.scenario.readTick,
        follower: spec.scenario.follower,
        cure,
      }),
    [timeline, spec.scenario, cure]
  )

  const peakLag = Math.max(...timeline.lag.flat())

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
                  announce("Guess locked in. Fire the burst and find out.")
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
            <span className="text-muted-foreground w-28 shrink-0 text-xs">Write burst</span>
            <button
              type="button"
              aria-pressed={burstOn}
              disabled={phase !== "explore"}
              onClick={() => {
                setBurstOn((b) => {
                  const next = !b
                  announce(
                    next
                      ? `Burst fired: writes x${spec.burst.multiplier} from tick ${spec.burst.from}. Watch the lag spike.`
                      : "Burst removed."
                  )
                  return next
                })
                setUnlocked((u) => Math.max(u, 2))
              }}
              className={cn(
                "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                phase === "explore" && "hover:bg-muted/50 cursor-pointer",
                burstOn &&
                  "border-amber-500/60 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-300"
              )}
            >
              {burstOn ? "on" : "off"}
            </button>
            <span className="text-muted-foreground text-xs">
              Peak lag: <span className="font-mono tabular-nums">{peakLag}</span> entries
            </span>
          </div>

          <LagChart timeline={timeline.lag} />

          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              (phase !== "explore" || unlocked < 2) && "opacity-60"
            )}
          >
            <Button
              type="button"
              size="sm"
              disabled={phase !== "explore" || unlocked < 2}
              onClick={() => {
                setRanScenario(true)
                setUnlocked((u) => Math.max(u, 3))
                announce(outcome.narrative)
              }}
            >
              Post a comment at tick {spec.scenario.writeTick}, read it at tick{" "}
              {spec.scenario.readTick}
            </Button>
          </div>

          {ranScenario && (
            <>
              <div
                className={cn(
                  "rounded-md border px-3 py-2.5 text-sm",
                  outcome.visible
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-amber-500/40 bg-amber-500/10"
                )}
              >
                <p className="text-foreground/90">
                  {outcome.visible ? "Comment visible" : "Comment MISSING"} (served by{" "}
                  {outcome.servedBy}
                  {outcome.waitedTicks > 0 ? `, waited ${outcome.waitedTicks} ticks` : ""}).{" "}
                  {outcome.narrative}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground w-28 shrink-0 text-xs">Cure</span>
                {(["none", "sticky", "version-token"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cure === c}
                    disabled={phase !== "explore" || unlocked < 3}
                    onClick={() => {
                      setCure(c)
                      announce(`Cure set to ${CURE_LABEL[c]}.`)
                    }}
                    className={cn(
                      "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      phase === "explore" && unlocked >= 3 && "hover:bg-muted/50 cursor-pointer",
                      cure === c && "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                    )}
                  >
                    {CURE_LABEL[c]}
                  </button>
                ))}
              </div>
            </>
          )}

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

/** Decorative per-follower lag polylines. */
function LagChart({ timeline }: { timeline: number[][] }) {
  const W = 320
  const H = 64
  const max = Math.max(...timeline.flat(), 10)
  const colors = ["currentColor", "#d97706", "#7c3aed"]
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="text-accent h-16 w-full max-w-[320px]"
      aria-hidden="true"
      focusable="false"
    >
      <line x1="0" y1={H - 4} x2={W} y2={H - 4} stroke="currentColor" strokeOpacity="0.2" />
      {timeline.map((series, f) => (
        <polyline
          key={f}
          points={series
            .map(
              (v, i) =>
                `${((i / (series.length - 1)) * (W - 4) + 2).toFixed(1)},${(H - 4 - (v / max) * (H - 10)).toFixed(1)}`
            )
            .join(" ")}
          fill="none"
          stroke={colors[f % colors.length]}
          strokeOpacity={0.8}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}
