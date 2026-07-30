"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CardBelief, ConceptBelief } from "@/lib/learner-model/types"
import { CardBeliefRow } from "./CardBeliefRow"

/** Bar colors follow the PatternMastery thresholds. */
function barColor(value: number): string {
  if (value >= 80) return "bg-emerald-400"
  if (value >= 60) return "bg-amber-400"
  if (value >= 40) return "bg-orange-400"
  return "bg-rose-400"
}

interface ConceptCardProps {
  concept: ConceptBelief
  challengesEnabled: boolean
  onChallenge?: (card: CardBelief) => void
  onExpand?: (concept: ConceptBelief) => void
  onExpandEvidence?: (card: CardBelief) => void
  expandedCardId?: string | null
  evidenceSlot?: React.ReactNode
}

export function ConceptCard({
  concept,
  challengesEnabled,
  onChallenge,
  onExpand,
  onExpandEvidence,
  expandedCardId,
  evidenceSlot,
}: ConceptCardProps) {
  const [open, setOpen] = useState(false)
  const mean = concept.mean_retrievability

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) onExpand?.(concept)
  }

  return (
    <div className="border-border bg-card/30 rounded-xl border p-6">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
            <h3 className="text-foreground font-medium">{concept.label}</h3>
            <span className="text-muted-foreground text-xs">
              {concept.card_count} problem{concept.card_count === 1 ? "" : "s"}
              {concept.mastered > 0 ? ` · ${concept.mastered} mastered` : ""}
            </span>
          </div>
          {concept.belief_text && (
            <p className="text-muted-foreground mt-2 ml-6 text-sm">{concept.belief_text}</p>
          )}
          {concept.forgetting_soonest && (
            <p className="text-muted-foreground mt-1 ml-6 text-xs">
              Forgetting soonest: {concept.forgetting_soonest.title}
              {concept.forgetting_soonest.days <= 0
                ? " (already below solid recall)"
                : ` (~${concept.forgetting_soonest.days}d)`}
            </p>
          )}
        </div>
        {mean !== null && (
          <div className="w-24 shrink-0">
            <div className="text-foreground mb-1 text-right text-sm font-medium">{mean}%</div>
            <div className="bg-muted h-1 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full ${barColor(mean)} transition-all duration-500`}
                style={{ width: `${mean}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {open && (
        <div className="mt-4 ml-6 divide-y divide-white/5">
          {concept.cards.map((card) => (
            <CardBeliefRow
              key={card.problem_id}
              card={card}
              challengesEnabled={challengesEnabled}
              onChallenge={onChallenge}
              onExpandEvidence={onExpandEvidence}
              expanded={expandedCardId === card.problem_id}
              evidenceSlot={expandedCardId === card.problem_id ? evidenceSlot : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
