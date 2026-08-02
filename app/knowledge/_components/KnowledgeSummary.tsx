"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
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
    <section className="border-border bg-card/30 mb-6 rounded-xl border p-5">
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
            of this sentence and keeps it only as accessible text.
          */}
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
            A recall estimate is the model&apos;s guess at your chance of solving a problem cold
            today, from your review history. It is a guess. Tell it when it&apos;s wrong.
          </p>

          {freshness && (
            <p className="text-muted-foreground/80 mt-2 text-xs">
              Estimates refreshed {freshness}. They decay as time passes.
            </p>
          )}
        </div>

        {atRisk.length > 0 && (
          <Link
            href="/practice"
            className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 focus-visible:ring-accent/50 dark:text-accent inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                className="border-border bg-background/60 hover:border-accent/40 focus-visible:ring-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <RecallDial
                  value={card.retrievability}
                  reviewCount={card.review_count}
                  urgency={card.memory?.urgency ?? null}
                  size="sm"
                  showLabel={false}
                  ariaLabel={card.belief_text ?? undefined}
                />
                <span className="min-w-0">
                  <span className="text-foreground block truncate text-sm font-medium">
                    {card.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {card.memory?.label ?? "No estimate"}
                    {card.retrievability !== null
                      ? ` · ~${Math.round(card.retrievability / 5) * 5}%`
                      : ""}
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
