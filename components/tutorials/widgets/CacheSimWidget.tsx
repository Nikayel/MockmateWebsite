"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cacheStream, simulateLruCache } from "@/lib/tutorials/widgets/cache-math"
import type { CacheSimSpec } from "@/lib/tutorials/widgets/schema"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `cache-sim` family: LRU hit/miss over a seeded skewed stream. Staged unlock in
 * story order: cache size, then TTL, then the stampede scenario toggle, then the
 * coalescing fix. Read-outs are text (hit ratio, database loads, worst per-key
 * rebuild pile-up); the hit/miss strip is decorative. No animation, so reduced
 * motion is inherently satisfied.
 */
export function CacheSimWidget({ spec }: { spec: CacheSimSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame
      label="Hands-on: caching"
      caption={spec.caption}
      onReset={() => setResetKey((k) => k + 1)}
    >
      <CacheSimBody key={resetKey} spec={spec} />
    </WidgetFrame>
  )
}

type Phase = "predict" | "worked" | "explore"

function CacheSimBody({ spec }: { spec: CacheSimSpec }) {
  const { announce } = useWidgetA11y()
  const [phase, setPhase] = useState<Phase>("predict")
  const [guess, setGuess] = useState<number | null>(null)
  const [capacity, setCapacity] = useState(spec.capacity)
  const [ttl, setTtl] = useState(spec.ttl)
  const [stampede, setStampede] = useState(false)
  const [coalesce, setCoalesce] = useState(false)
  const [unlocked, setUnlocked] = useState(1)

  const stream = useMemo(
    () => cacheStream({ seed: spec.seed, keys: spec.keys, ticks: spec.ticks }),
    [spec]
  )
  // The stampede scenario forces the short-TTL/slow-rebuild regime the lesson warns about.
  const effectiveTtl = stampede ? Math.min(ttl, Math.max(2, spec.rebuildTicks - 2)) : ttl
  const result = useMemo(
    () =>
      simulateLruCache(stream, {
        capacity,
        ttl: effectiveTtl,
        rebuildTicks: spec.rebuildTicks,
        coalesce,
      }),
    [stream, capacity, effectiveTtl, spec.rebuildTicks, coalesce]
  )

  const describe = () =>
    `Hit ratio ${Math.round(result.hitRatio * 100)} percent, ${result.dbLoads} database loads, worst pile-up ${result.maxConcurrentRebuilds} concurrent rebuilds of one key.`

  const sliderRow = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    enabled: boolean,
    unlockTo: number,
    unit?: string
  ) => (
    <div className={cn("flex items-center gap-2", !enabled && "opacity-60")}>
      <span className="text-muted-foreground w-36 shrink-0 text-xs">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={!enabled}
        aria-label={label}
        aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
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

  const toggleChip = (
    label: string,
    on: boolean,
    flip: () => void,
    enabled: boolean,
    warn = false
  ) => (
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
      {label}: {on ? "on" : "off"}
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
                  announce("Guess locked in. Compare it with the counters below.")
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
              "Cache size (entries)",
              capacity,
              setCapacity,
              1,
              spec.keys - 1,
              phase === "explore",
              2
            )}
            {sliderRow(
              "TTL (ticks)",
              ttl,
              setTtl,
              2,
              Math.min(spec.ticks, 120),
              phase === "explore" && unlocked >= 2,
              3,
              "ticks"
            )}
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                phase === "explore" && unlocked < 3 && "opacity-60"
              )}
            >
              <span className="text-muted-foreground w-36 shrink-0 text-xs">Stampede scenario</span>
              {toggleChip(
                "hot key expires under load",
                stampede,
                () => {
                  setStampede((s) => {
                    const next = !s
                    announce(
                      next
                        ? "Stampede staged: short TTL against a slow rebuild."
                        : "Stampede scenario off."
                    )
                    return next
                  })
                  setUnlocked((u) => Math.max(u, 4))
                },
                phase === "explore" && unlocked >= 3,
                true
              )}
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                (phase !== "explore" || unlocked < 4 || !stampede) && "opacity-60"
              )}
            >
              <span className="text-muted-foreground w-36 shrink-0 text-xs">The fix</span>
              {toggleChip(
                "coalesce rebuilds",
                coalesce,
                () => {
                  setCoalesce((c) => {
                    const next = !c
                    announce(
                      next ? "Coalescing on: one in-flight rebuild per key." : "Coalescing off."
                    )
                    return next
                  })
                },
                phase === "explore" && unlocked >= 4 && stampede
              )}
              {!stampede && phase === "explore" && unlocked >= 4 && (
                <span className="text-muted-foreground text-[11px]">Stage the stampede first.</span>
              )}
            </div>
          </div>

          {/* Hit/miss strip: solid tick = hit, hollow = miss. Decorative. */}
          <svg
            viewBox={`0 0 320 22`}
            className="h-6 w-full max-w-[320px]"
            aria-hidden="true"
            focusable="false"
          >
            {result.timeline.map((hit, i) => {
              const x = (i / result.timeline.length) * 316 + 2
              return hit ? (
                <rect
                  key={i}
                  x={x}
                  y={4}
                  width={2}
                  height={14}
                  className="fill-current"
                  opacity="0.65"
                />
              ) : (
                <rect
                  key={i}
                  x={x}
                  y={4}
                  width={2}
                  height={14}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="0.8"
                />
              )
            })}
          </svg>

          <div className="border-border/70 bg-muted/20 rounded-md border px-3 py-2 text-sm">
            <p className="text-foreground/90">
              Hit ratio{" "}
              <span className="font-mono font-semibold tabular-nums">
                {Math.round(result.hitRatio * 100)}%
              </span>{" "}
              ({result.hits} hits, {result.misses} misses)
            </p>
            <p className="text-muted-foreground mt-0.5">
              Database loads: <span className="font-mono tabular-nums">{result.dbLoads}</span>
            </p>
            <p
              className={cn(
                "mt-0.5",
                result.maxConcurrentRebuilds > 1
                  ? "font-semibold text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              Worst pile-up: {result.maxConcurrentRebuilds} concurrent{" "}
              {result.maxConcurrentRebuilds === 1 ? "rebuild" : "rebuilds"} of one key
              {result.maxConcurrentRebuilds > 1 ? ". That is the stampede." : "."}
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
