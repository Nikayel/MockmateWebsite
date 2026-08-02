"use client"

import Link from "next/link"
import { ArrowRight, ChevronDown, Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { MIN_REVIEWS_FOR_VERDICT_HUE, memoryColorClass } from "@/lib/ui/memory-colors"
import { displayRetention } from "@/lib/spaced-repetition/memory-bands"
import type { CardBelief } from "@/lib/learner-model/types"
import { BeliefBar } from "./viz/BeliefBar"
import { ForgettingCurve } from "./viz/ForgettingCurve"
import { ScoreTrack } from "./viz/ScoreTrack"

/**
 * One problem, and what the model believes about it.
 *
 * Anatomy: belief bar (position on the same 0-100 axis as the strip above), the
 * number beside it, title with a visible disclosure chevron, score history, and the
 * two actions. "This seems wrong" is the only bordered control on the row — the
 * binding requirement is that challenging the model stays the most obvious act here.
 *
 * The model's reasoning (stability, lapses, belief sentence) lives permanently in
 * the expanded panel; the hover tooltip is only a mouse shortcut to it, because
 * Radix tooltips never open from touch.
 *
 * No local focus-visible ring classes anywhere in this file on purpose: the base
 * layer in app/globals.css supplies the full-opacity ring, and the /50 local rings
 * this page used to carry measured under 2.4:1 in both themes.
 */

interface CardBeliefRowProps {
  card: CardBelief
  challengesEnabled: boolean
  onChallenge?: (card: CardBelief) => void
  onExpandEvidence?: (card: CardBelief) => void
  /** Rendered when the row is expanded (evidence list, injected by the page). */
  evidenceSlot?: React.ReactNode
  expanded?: boolean
}

export function CardBeliefRow({
  card,
  challengesEnabled,
  onChallenge,
  onExpandEvidence,
  evidenceSlot,
  expanded = false,
}: CardBeliefRowProps) {
  // "The model holds no belief about this card" — true in the black-box condition AND
  // for a never-reviewed card. The old test also required belief_text === null, which
  // an unreviewed OPEN-condition card fails (model-builder gives it the "No reviews
  // yet" sentence). That made two things wrong at once: the explanation below was
  // unreachable in both conditions, and "This seems wrong" appeared on cards with
  // nothing to dispute — offering to re-grade an attempt that never happened.
  const noBelief = card.retrievability === null
  const scores = card.scores_history ?? []
  const expandable = Boolean(onExpandEvidence)

  // Days since the last review, recomputed here rather than shipped, so an open tab
  // keeps moving the "now" marker as the estimate it sits next to goes stale.
  const elapsedDays = card.last_reviewed_at
    ? Math.max(0, (Date.now() - new Date(card.last_reviewed_at).getTime()) / 86_400_000)
    : 0

  const bar = (
    // The hue holds its verdict until the estimate has real evidence behind it —
    // "the model won't even commit to a color until it has three data points."
    <span
      className={memoryColorClass(card.memory?.urgency ?? null, "ink", {
        suppressed: (card.review_count ?? 0) < MIN_REVIEWS_FOR_VERDICT_HUE,
      })}
    >
      <BeliefBar
        value={card.retrievability}
        reviewCount={card.review_count}
        // The belief sentence is the accessible text for the mark — the one place
        // the full explanation still appears verbatim for screen readers.
        ariaLabel={card.belief_text ?? undefined}
      />
    </span>
  )

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-start gap-3">
        {/* The estimate leads: it is the only thing that decides whether to act. */}
        {card.memory && expandable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Tap/Enter opens the evidence panel — the tooltip is unreachable on
                  touch, so the trigger must DO something there, not just decorate.
                  It therefore has to declare the same disclosure state as the title
                  button, or a screen reader hears a control that changes nothing.
                  aria-controls only while expanded: the id does not exist until then. */}
              <button
                type="button"
                onClick={() => onExpandEvidence?.(card)}
                aria-expanded={expanded}
                aria-controls={expanded ? `evidence-${card.problem_id}` : undefined}
                className="mt-1 shrink-0 cursor-help rounded"
              >
                {bar}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="mb-1 font-medium">{card.memory.label} — why this number?</p>
              <p>
                Estimated chance you could solve this cold right now, from the FSRS forgetting
                curve: {card.stability_days !== null ? `stability ${card.stability_days}d, ` : ""}
                {card.lapses ?? 0} lapse
                {(card.lapses ?? 0) === 1 ? "" : "s"}, {card.review_count ?? 0} reviews.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="mt-1 shrink-0">{bar}</span>
        )}

        <span className="text-foreground w-11 shrink-0 text-right text-sm font-medium tabular-nums">
          {card.retrievability === null ? "–" : `~${displayRetention(card.retrievability)}%`}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {expandable ? (
              <button
                onClick={() => onExpandEvidence?.(card)}
                aria-expanded={expanded}
                aria-controls={expanded ? `evidence-${card.problem_id}` : undefined}
                className="group text-foreground -my-0.5 flex min-w-0 items-center gap-1.5 rounded py-0.5 text-left text-sm font-medium"
              >
                <span className="truncate">{card.title}</span>
                <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
              </button>
            ) : (
              // Black-box condition: no evidence to disclose, so no button — a
              // focusable no-op with aria-expanded=false was a lie to assistive tech.
              <span className="text-foreground truncate text-sm font-medium">{card.title}</span>
            )}
            <span className={`text-xs ${difficultyColorClass(card.difficulty, "text")}`}>
              {card.difficulty}
            </span>
          </div>

          {!noBelief && scores.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <ScoreTrack scores={scores} />
              <span className="text-muted-foreground text-xs">
                {scores.length} review{scores.length === 1 ? "" : "s"}
                {card.hints_used_total ? ` · ${card.hints_used_total} hints` : ""}
              </span>
            </div>
          )}

          {/* The model's own explanation for having no belief: "No reviews yet" in the
              open condition, nothing at all in black-box (belief_text is masked there). */}
          {noBelief && card.belief_text && (
            <p className="text-muted-foreground mt-1 text-xs italic">{card.belief_text}</p>
          )}
        </div>

        {/* Below sm the actions wrap to their own full-width line instead of
            crushing the title column to a sliver at 360px. */}
        <div className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
          {challengesEnabled && onChallenge && !noBelief && (
            <button
              type="button"
              onClick={() => onChallenge(card)}
              title="Dispute what the system believes about this problem"
              className="border-border hover:border-accent/40 hover:bg-accent/10 text-foreground inline-flex min-h-6 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
            >
              <Flag className="h-3.5 w-3.5" />
              This seems wrong
            </button>
          )}
          <Link
            href={`/interview?scenario=${card.scenario_id}&practice=true`}
            className="text-accent-strong hover:bg-accent/10 inline-flex min-h-6 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          >
            Practice
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {expanded && (
        <div
          id={`evidence-${card.problem_id}`}
          role="region"
          aria-label={`Evidence for ${card.title}`}
          className="mt-2 ml-0 sm:ml-6"
        >
          {/* The model's reasoning gets a permanent, visible home — it used to live
              only inside the hover tooltip, unreachable on touch and by keyboard. */}
          {card.memory && (
            <p className="text-muted-foreground mb-2 text-xs">
              {card.memory.label}:{" "}
              {card.stability_days !== null ? `stability ${card.stability_days}d, ` : ""}
              {card.lapses ?? 0} lapse{(card.lapses ?? 0) === 1 ? "" : "s"},{" "}
              {card.review_count ?? 0} reviews.
              {card.belief_text ? ` ${card.belief_text}` : ""}
            </p>
          )}
          {card.recall_curve && card.recall_curve.length > 1 && (
            <ForgettingCurve
              points={card.recall_curve}
              elapsedDays={elapsedDays}
              crossingDays={card.days_until_forgetting}
              urgency={card.memory?.urgency ?? null}
              variant="full"
            />
          )}
          {evidenceSlot}
        </div>
      )}
    </div>
  )
}
