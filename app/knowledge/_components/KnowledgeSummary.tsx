"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
import { MIN_REVIEWS_FOR_VERDICT_HUE } from "@/lib/ui/memory-colors"
import type { CardBelief, LearnerModelPayload } from "@/lib/learner-model/types"
import { RecallDial } from "./viz/RecallDial"

/**
 * The verdict, above everything else.
 *
 * The page opened straight into a stack of collapsed concept accordions, so answering
 * "what should I review today" meant opening every one of them. The model already
 * knows the answer and already sorts by risk; this says it out loud.
 *
 * It is also the one place the recall estimate gets defined, which is what lets every
 * row below stop repeating "The system estimates a ~69% chance…" per card.
 */

const MAX_RISK_TILES = 3

/** At risk means the model has dropped it out of the "Good" band. */
function isAtRisk(card: CardBelief): boolean {
  if (card.retrievability === null) return false
  const { urgency } = memoryBandFor(card.retrievability)
  return urgency === "warning" || urgency === "urgent"
}

/**
 * How stale the numbers are. Retrievability decays against wall-clock time, so a tab
 * left open overnight is showing yesterday's beliefs with no hint that it is.
 */
function freshnessLabel(generatedAt: string, now: number): string | null {
  const ms = now - new Date(generatedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const minutes = Math.floor(ms / 60000)
  if (minutes < 2) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface KnowledgeSummaryProps {
  model: LearnerModelPayload
  /** Rendered at mount time by the page so the component stays pure. */
  now?: number
}

export function KnowledgeSummary({ model, now = Date.now() }: KnowledgeSummaryProps) {
  const allConcepts = [...model.concepts, ...model.systems]
  const cards = allConcepts.flatMap((c) => c.cards)
  const atRisk = cards
    .filter(isAtRisk)
    .sort((a, b) => (a.retrievability ?? 0) - (b.retrievability ?? 0))

  // Which concepts the weak cards cluster in — more actionable than naming problems.
  const weakConcepts = allConcepts
    .map((c) => ({ label: c.label, count: c.cards.filter(isAtRisk).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((c) => c.label)

  const freshness = freshnessLabel(model.generated_at, now)
  // In the black-box condition every retrievability is null, so there is no verdict to
  // state. Saying "nothing is slipping" there would be a claim the model did not make.
  const hasEstimates = cards.some((c) => c.retrievability !== null)

  return (
    <section className="border-border bg-card mb-6 rounded-xl border p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {hasEstimates ? (
            <p className="text-foreground text-lg font-semibold text-balance">
              {atRisk.length === 0
                ? "Nothing is slipping right now."
                : `${atRisk.length} problem${atRisk.length === 1 ? " is" : "s are"} slipping.`}
              {weakConcepts.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  {weakConcepts.join(" and ")} {weakConcepts.length === 1 ? "is" : "are"} the weak
                  spot{weakConcepts.length === 1 ? "" : "s"}.
                </span>
              )}
            </p>
          ) : (
            <p className="text-foreground text-lg font-semibold">Your learner model</p>
          )}

          {/*
            Said once, here, instead of once per card. Every row below drops its copy
            of this sentence and keeps it only as accessible text. Gated on
            hasEstimates: in the black-box condition no estimate is visible and
            challenges are disabled, so "tell it when it's wrong" would advertise a
            control that does not exist.
          */}
          {hasEstimates && (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
              A recall estimate is the model&apos;s guess at your chance of solving a problem cold
              today, from your review history. It is a guess. Tell it when it&apos;s wrong.
            </p>
          )}

          {/*
            Full token, no alpha: text-muted-foreground/80 measures 3.47:1 in light
            mode, under the AA 4.5:1 bar. Every alpha step of this token fails — see
            components/tutorials/__tests__/no-faded-text.test.ts for the arithmetic.
          */}
          {freshness && (
            <p className="text-muted-foreground mt-2 text-xs">
              Estimates refreshed {freshness}. They decay as time passes.
            </p>
          )}

          {/*
            Precision hierarchy — the rule that resolves professional-vs-honest:
            COUNTS are facts and get big tabular numerals; ESTIMATES stay small,
            tilded and rounded. Never promote an estimate into this row.
          */}
          {hasEstimates && (
            <dl className="border-border mt-5 grid max-w-sm grid-cols-3 gap-4 border-t pt-4">
              <div>
                <dt className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Tracked
                </dt>
                <dd className="text-foreground mt-0.5 text-xl font-semibold tabular-nums">
                  {cards.length}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Reviews
                </dt>
                <dd className="text-foreground mt-0.5 text-xl font-semibold tabular-nums">
                  {cards.reduce((n, c) => n + (c.review_count ?? 0), 0)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  Slipping
                </dt>
                <dd
                  className={`mt-0.5 text-xl font-semibold tabular-nums ${
                    atRisk.length > 0 ? "text-rose-700 dark:text-rose-400" : "text-foreground"
                  }`}
                >
                  {atRisk.length}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {atRisk.length > 0 && (
          <Link
            href="/practice"
            className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          >
            Review the {atRisk.length}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {atRisk.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {atRisk.slice(0, MAX_RISK_TILES).map((card) => (
            <li key={card.problem_id}>
              <Link
                href={`/interview?scenario=${card.scenario_id}&practice=true`}
                className="border-border bg-background hover:border-accent/40 flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                {/* md with the label: a 28px dial with a 3px feather said nothing at
                    projector distance, then the number was restated as 11px prose.
                    The dial carries the number; the line below keeps the band word. */}
                <RecallDial
                  value={card.retrievability}
                  reviewCount={card.review_count}
                  urgency={card.memory?.urgency ?? null}
                  suppressed={(card.review_count ?? 0) < MIN_REVIEWS_FOR_VERDICT_HUE}
                  size="md"
                  ariaLabel={card.belief_text ?? undefined}
                />
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-sm font-medium">
                    {card.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {card.memory?.label ?? "No estimate"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
