"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  analyzeQuorum,
  availableUnderFailures,
  bftTolerated,
  kafkaAckedWriteSurvives,
} from "@/lib/tutorials/widgets/quorum-math"
import type { QuorumSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `quorum` family: N/R/W sliders plus kill-a-replica over pure overlap math.
 * Directly confronts the R+W>N misconception: the overlap verdict is a word plus an
 * icon, and killing replicas shows write/read availability changing live. Presets
 * relabel the same engine for Kafka (RF / min.insync, acked-write survival) and BFT
 * (3f+1). Sliders are native ranges with aria-valuetext; replica dots pair with the
 * text read-outs, never color alone.
 */
export function QuorumWidget({ spec }: { spec: QuorumSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: quorums"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <QuorumBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

function QuorumBody({ spec }: { spec: QuorumSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [n, setN] = useState(spec.n)
  const [r, setR] = useState(Math.min(spec.r ?? 1, spec.n))
  const [w, setW] = useState(Math.min(spec.w ?? spec.n, spec.n))
  const [killed, setKilled] = useState(0)
  const [unlocked, setUnlocked] = useState(1)

  const clampAll = (nextN: number) => {
    setN(nextN)
    setR((prev) => Math.min(prev, nextN))
    setW((prev) => Math.min(prev, nextN))
    setKilled((prev) => Math.min(prev, nextN - 1))
  }

  const analysis = analyzeQuorum(n, r, w)
  const writeOk = availableUnderFailures(n, w, killed)
  const readOk = availableUnderFailures(n, r, killed)
  const kafka =
    spec.preset === "kafka"
      ? kafkaAckedWriteSurvives({ replicationFactor: n, minInsync: w, killedBrokers: killed })
      : null
  const f = bftTolerated(n)

  const describe = () => {
    if (spec.preset === "bft")
      return `${n} nodes tolerate ${f} Byzantine ${f === 1 ? "node" : "nodes"} (3f plus 1).`
    if (spec.preset === "kafka")
      return `RF ${n}, min.insync ${w}, ${killed} down: ${kafka!.writable ? "still writable" : "writes rejected"}; acked writes ${kafka!.ackedSurvives ? "survive" : "can be lost"}.`
    return `N ${n}, R ${r}, W ${w}: overlap ${analysis.overlapGuaranteed ? "guaranteed" : "NOT guaranteed"}; with ${killed} down, writes ${writeOk ? "available" : "blocked"} and reads ${readOk ? "available" : "blocked"}.`
  }

  const slider = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    enabled: boolean,
    unlockTo: number
  ) => (
    <div className={cn("flex items-center gap-2", !enabled && "opacity-60")}>
      <span className="text-muted-foreground w-40 shrink-0 text-xs">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={!enabled}
        aria-label={label}
        aria-valuetext={String(value)}
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
      <span className="text-foreground w-6 text-right font-mono text-sm tabular-nums">{value}</span>
    </div>
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
                  announce("Guess locked in. Now test it against the math.")
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

          {/* Replica dots: filled = alive, crossed = killed. Text read-outs carry meaning. */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold",
                  i < n - killed
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border text-muted-foreground bg-transparent line-through"
                )}
              >
                {i + 1}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {slider(
              spec.preset === "kafka" ? "Replication factor (RF)" : "Replicas (N)",
              n,
              clampAll,
              3,
              7,
              phase === "explore",
              2
            )}
            {spec.preset !== "bft" &&
              slider(
                spec.preset === "kafka" ? "min.insync.replicas" : "Write quorum (W)",
                w,
                setW,
                1,
                n,
                phase === "explore" && unlocked >= 2,
                3
              )}
            {spec.preset === "dynamo" &&
              slider("Read quorum (R)", r, setR, 1, n, phase === "explore" && unlocked >= 3, 3)}
            <div className={cn("flex items-center gap-2", phase !== "explore" && "opacity-60")}>
              <span className="text-muted-foreground w-40 shrink-0 text-xs">
                {spec.preset === "kafka" ? "Kill a broker" : "Kill a replica"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={phase !== "explore" || killed >= n - 1}
                onClick={() => {
                  setKilled((k) => k + 1)
                  announce(describe())
                }}
              >
                Kill one
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={phase !== "explore" || killed === 0}
                onClick={() => {
                  setKilled(0)
                  announce("All replicas restored.")
                }}
              >
                Revive all
              </Button>
            </div>
          </div>

          <div className="border-border/70 bg-muted/20 flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
            {spec.preset === "dynamo" && (
              <>
                <Readout ok={analysis.overlapGuaranteed}>
                  {analysis.overlapGuaranteed
                    ? `R + W > N: every read overlaps the latest write.`
                    : `R + W <= N: a read can miss the latest write entirely (${analysis.unreadReplicas} unread replicas).`}
                </Readout>
                <Readout ok={writeOk}>
                  Writes with {killed} down:{" "}
                  {writeOk ? "available" : "blocked (quorum unreachable)"}
                </Readout>
                <Readout ok={readOk}>
                  Reads with {killed} down: {readOk ? "available" : "blocked (quorum unreachable)"}
                </Readout>
              </>
            )}
            {spec.preset === "kafka" && kafka && (
              <>
                <Readout ok={kafka.writable}>
                  Producers with {killed} down:{" "}
                  {kafka.writable ? "still writable" : "writes rejected (in-sync set too small)"}
                </Readout>
                <Readout ok={kafka.ackedSurvives}>
                  Acked writes:{" "}
                  {kafka.ackedSurvives
                    ? "survive this failure"
                    : "can be LOST (acked copies all down)"}
                </Readout>
              </>
            )}
            {spec.preset === "bft" && (
              <Readout ok={f > 0}>
                {n} nodes tolerate {f} Byzantine {f === 1 ? "node" : "nodes"}: quorums of{" "}
                {2 * f + 1} overlap in at least {f + 1} nodes, so one honest node bridges them.
              </Readout>
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

function Readout({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="text-foreground/90 flex items-start gap-1.5">
      {ok ? (
        <Check
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-300"
          aria-hidden="true"
        />
      ) : (
        <X
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </p>
  )
}
