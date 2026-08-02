"use client"

import Link from "next/link"
import { ArrowRight, Flag } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { CardBelief } from "@/lib/learner-model/types"

/**
 * Retrievability chip colors follow the PatternMastery thresholds.
 *
 * Light mode uses the -700 text shades: the -400 shades used on dark render
 * at roughly 1.8:1 on a light background, far below the AA 4.5:1 bar for
 * text this small. Same light/dark pairing convention as app/roadmap.
 */
function chipClass(urgency: string | undefined): string {
  switch (urgency) {
    case "safe":
      return "border-emerald-600/20 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400"
    case "ok":
      return "border-amber-600/20 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400"
    case "warning":
      return "border-orange-600/20 bg-orange-100 text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-400"
    case "urgent":
      return "border-rose-600/20 bg-rose-100 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400"
    default:
      return "border-border bg-muted text-muted-foreground"
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

      {expanded && evidenceSlot}
    </div>
  )
}
