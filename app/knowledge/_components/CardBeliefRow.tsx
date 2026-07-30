"use client"

import Link from "next/link"
import { ArrowRight, Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { CardBelief } from "@/lib/learner-model/types"

/** Retrievability chip colors follow the PatternMastery thresholds. */
function chipClass(urgency: string | undefined): string {
  switch (urgency) {
    case "safe":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
    case "ok":
      return "bg-amber-400/10 text-amber-400 border-amber-400/20"
    case "warning":
      return "bg-orange-400/10 text-orange-400 border-orange-400/20"
    case "urgent":
      return "bg-rose-400/10 text-rose-400 border-rose-400/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

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

  return (
    <div className="group py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onExpandEvidence?.(card)}
              className="text-foreground hover:text-foreground/80 truncate text-left text-sm font-medium"
              aria-expanded={expanded}
            >
              {card.title}
            </button>
            <span className={`text-xs ${difficultyColorClass(card.difficulty, "text")}`}>
              {card.difficulty}
            </span>
            {card.memory && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-flex cursor-help items-center rounded-full border px-2 py-0.5 text-xs font-medium ${chipClass(card.memory.urgency)}`}
                  >
                    {card.retrievability}% · {card.memory.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="mb-1 font-medium">Why this number?</p>
                  <p>
                    Estimated chance you could solve this cold right now, from the FSRS forgetting
                    curve: stability {card.stability_days}d, {card.lapses ?? 0} lapse
                    {(card.lapses ?? 0) === 1 ? "" : "s"}, {card.review_count ?? 0} reviews.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {card.belief_text && (
            <p className="text-muted-foreground mt-1 text-xs italic">{card.belief_text}</p>
          )}
          {!masked && card.scores_history && card.scores_history.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              Evidence: scores {card.scores_history.join(" → ")}
              {card.hints_used_total ? ` · ${card.hints_used_total} hints` : ""}
              {card.review_count ? ` · ${card.review_count} reviews` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {challengesEnabled && onChallenge && !masked && (
            <button
              onClick={() => onChallenge(card)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              title="Dispute what the system believes about this problem"
            >
              <Flag className="h-3 w-3" />
              This seems wrong
            </button>
          )}
          <Link
            href={`/interview?scenario=${card.scenario_id}&practice=true`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            Practice
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {expanded && evidenceSlot}
    </div>
  )
}
