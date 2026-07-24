"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  applyWrite,
  heal,
  initialWorld,
  type MergeOutcome,
  type MergeStrategy,
  type PartitionMode,
  type ReplicaState,
  type WorldState,
} from "@/lib/tutorials/widgets/partition-math"
import type { PartitionSimSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `partition-sim` family: the learner GENERATES the divergence themselves.
 * Story-ordered controls: partition the network, pick CP or AP, fire the scripted
 * writes one by one (watching each side's state and the refusals), then heal under a
 * merge strategy and read the baked outcome: LWW names the write it silently
 * dropped; version vectors surface siblings; CRDTs lose nothing. All outcomes come
 * from partition-math; the widget renders and narrates.
 */
export function PartitionSimWidget({ spec }: { spec: PartitionSimSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: partitions"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <PartitionSimBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

const STRATEGY_LABEL: Record<MergeStrategy, string> = {
  lww: "last-writer-wins",
  "version-vector": "version vectors",
  "crdt-counter": "PN-counter CRDT",
  "crdt-set": "set-union CRDT",
}

function PartitionSimBody({ spec }: { spec: PartitionSimSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [partitioned, setPartitioned] = useState(false)
  const [mode, setMode] = useState<PartitionMode>("ap")
  const [strategy, setStrategy] = useState<MergeStrategy>(spec.strategies[0])
  const [world, setWorld] = useState<WorldState>(initialWorld)
  const [fired, setFired] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const [outcome, setOutcome] = useState<MergeOutcome | null>(null)

  const fireNext = () => {
    if (outcome || fired >= spec.writes.length) return
    const write = spec.writes[fired]
    const { world: next, result } = applyWrite(
      world,
      spec.kind,
      write,
      fired + 1,
      partitioned,
      mode
    )
    setWorld(next)
    setFired(fired + 1)
    const line = `${write.label}: ${result.accepted ? "accepted" : "REFUSED"}. ${result.reason}`
    setLog((l) => [...l, line])
    announce(line)
  }

  const doHeal = () => {
    if (outcome) return
    const merged = heal(world, spec.kind, strategy)
    setOutcome(merged)
    announce(`Partition healed. ${merged.narrative}`)
  }

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
                  announce("Guess locked in. Now cause the problem yourself.")
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
            <span className="text-muted-foreground w-28 shrink-0 text-xs">Network</span>
            {chip(
              partitioned ? "PARTITIONED" : "healthy",
              partitioned,
              () => {
                setPartitioned((p) => {
                  const next = !p
                  announce(next ? "The link between A and B is cut." : "Network healthy.")
                  return next
                })
              },
              phase === "explore" && !outcome && fired === 0,
              true
            )}
            <span className="text-muted-foreground w-28 shrink-0 text-xs">During it, be</span>
            {(["cp", "ap"] as const).map((m) =>
              chip(
                m.toUpperCase(),
                mode === m,
                () => {
                  setMode(m)
                  announce(
                    m === "cp"
                      ? "CP: the minority side will refuse writes it cannot coordinate."
                      : "AP: both sides will accept writes and diverge."
                  )
                },
                phase === "explore" && !outcome && fired === 0 && partitioned
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as const).map((side) => (
              <ReplicaPanel key={side} side={side} state={world[side]} kind={spec.kind} />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                phase !== "explore" ||
                !partitioned ||
                outcome !== null ||
                fired >= spec.writes.length
              }
              onClick={fireNext}
            >
              {fired < spec.writes.length
                ? `Fire: ${spec.writes[fired].label}`
                : "All writes fired"}
            </Button>
            {spec.strategies.length > 1 &&
              spec.strategies.map((s) =>
                chip(
                  STRATEGY_LABEL[s],
                  strategy === s,
                  () => {
                    setStrategy(s)
                    announce(`Merge strategy: ${STRATEGY_LABEL[s]}.`)
                  },
                  phase === "explore" && outcome === null && fired >= spec.writes.length
                )
              )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                phase !== "explore" ||
                outcome !== null ||
                fired < spec.writes.length ||
                !partitioned
              }
              onClick={doHeal}
            >
              Heal the partition
            </Button>
          </div>

          {log.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {log.map((line, i) => (
                <li key={i} className="text-foreground/80 text-xs">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {outcome && (
            <div
              className={cn(
                "rounded-md border px-3 py-2.5 text-sm",
                outcome.dropped.length > 0
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-emerald-500/40 bg-emerald-500/10"
              )}
            >
              <p className="text-foreground/90">{outcome.narrative}</p>
              {outcome.siblings.length > 0 && (
                <p className="text-foreground/80 mt-1 font-mono text-xs">
                  siblings: {outcome.siblings.join(" | ")}
                </p>
              )}
            </div>
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

function ReplicaPanel({
  side,
  state,
  kind,
}: {
  side: "A" | "B"
  state: ReplicaState
  kind: PartitionSimSpec["kind"]
}) {
  let value = "empty"
  if (kind === "register" && state.register) value = state.register.value
  if (kind === "counter") value = String(state.counter.A + state.counter.B)
  if (kind === "set" && state.elements.length) value = state.elements.join(", ")
  return (
    <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        Replica {side}
      </p>
      <p className="text-foreground mt-0.5 font-mono text-sm tabular-nums">{value}</p>
    </div>
  )
}
