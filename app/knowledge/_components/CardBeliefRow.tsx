"use client"

import Link from "next/link"
import { ArrowRight, Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { CardBelief } from "@/lib/learner-model/types"
import { ForgettingCurve } from "./viz/ForgettingCurve"
import { RecallDial } from "./viz/RecallDial"
import { ScoreTrack } from "./viz/ScoreTrack"

/**
 * One problem, and what the model believes about it.
 *
 * The row used to state the same number three times — as a chip, as a sentence
 * ("The system estimates a ~69% chance…"), and again in the tooltip — then spend a
 * third line on `scores.join(" → ")`. Every fact now has exactly one visual home:
 * the dial carries the estimate and its uncertainty, the track carries the history,
 * and the sentence moves to the accessible description and the tooltip, where it is
 * read once by the people it actually helps.
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
  const masked = card.retrievability === null && card.belief_text === null
  const scores = card.scores_history ?? []

  // Days since the last review, recomputed here rather than shipped, so an open tab
  // keeps moving the "now" marker as the estimate it sits next to goes stale.
  const elapsedDays = card.last_reviewed_at
    ? Math.max(0, (Date.now() - new Date(card.last_reviewed_at).getTime()) / 86_400_000)
    : 0

  const dial = (
    <RecallDial
      value={card.retrievability}
      reviewCount={card.review_count}
      urgency={card.memory?.urgency ?? null}
      size="md"
      // The belief sentence is the accessible text for the dial. It is the one place
      // the full explanation still appears verbatim.
      ariaLabel={card.belief_text ?? undefined}
    />
  )

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        {/* The estimate leads: it is the only thing that decides whether to act. */}
        {card.memory ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/*
                A button, not a span: stability, lapses and review count live only in
                this tooltip, so a non-focusable trigger meant keyboard and screen
                reader users could never reach the model's reasoning on the page built
                to expose it.
              */}
              <button
                type="button"
                className="focus-visible:ring-accent/50 shrink-0 cursor-help rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                {dial}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="mb-1 font-medium">{card.memory.label} — why this number?</p>
              <p>
                Estimated chance you could solve this cold right now, from the FSRS forgetting
                curve: stability {card.stability_days}d, {card.lapses ?? 0} lapse
                {(card.lapses ?? 0) === 1 ? "" : "s"}, {card.review_count ?? 0} reviews.
              </p>
              {card.belief_text && <p className="mt-1 opacity-80">{card.belief_text}</p>}
            </TooltipContent>
          </Tooltip>
        ) : (
          dial
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              onClick={() => onExpandEvidence?.(card)}
              className="text-foreground hover:text-foreground/80 focus-visible:ring-accent/50 truncate rounded text-left text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
              aria-expanded={expanded}
            >
              {card.title}
            </button>
            <span className={`text-xs ${difficultyColorClass(card.difficulty, "text")}`}>
              {card.difficulty}
            </span>
          </div>

          {!masked && scores.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <ScoreTrack scores={scores} />
              <span className="text-muted-foreground text-xs">
                {scores.length} review{scores.length === 1 ? "" : "s"}
                {card.hints_used_total ? ` · ${card.hints_used_total} hints` : ""}
              </span>
            </div>
          )}

          {/* Masked rows keep whatever the black-box condition left behind. */}
          {masked && card.belief_text && (
            <p className="text-muted-foreground mt-1 text-xs italic">{card.belief_text}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {challengesEnabled && onChallenge && !masked && (
            <button
              onClick={() => onChallenge(card)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 flex items-center gap-1 rounded text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
              title="Dispute what the system believes about this problem"
            >
              <Flag className="h-3 w-3" />
              This seems wrong
            </button>
          )}
          <Link
            href={`/interview?scenario=${card.scenario_id}&practice=true`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 flex items-center gap-1 rounded text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Practice
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-[52px]">
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
