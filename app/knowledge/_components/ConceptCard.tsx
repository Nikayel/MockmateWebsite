"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
import type { CardBelief, ConceptBelief } from "@/lib/learner-model/types"
import { CardBeliefRow } from "./CardBeliefRow"
import { ConceptRiskStrip } from "./viz/ConceptRiskStrip"

/**
 * One concept, and how its problems are spread across recall.
 *
 * The header used to state the same two facts three times — a counts line, a belief
 * sentence restating them, and a mean percentage — then add a fourth line naming the
 * weakest card. The strip carries all of it: the distribution, the mean, and the
 * weakest card by position.
 *
 * The strip's dots are buttons, so it cannot live inside the accordion's toggle
 * button the way the old mean bar did; the header is split accordingly.
 */

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

  const atRisk = concept.cards.filter((c) => {
    if (c.retrievability === null) return false
    const { urgency } = memoryBandFor(c.retrievability)
    return urgency === "warning" || urgency === "urgent"
  }).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) onExpand?.(concept)
  }

  /** Clicking a dot opens the concept and expands that card's evidence. */
  const selectCard = (problemId: string) => {
    const card = concept.cards.find((c) => c.problem_id === problemId)
    if (!card) return
    if (!open) {
      setOpen(true)
      onExpand?.(concept)
    }
    if (expandedCardId !== problemId) onExpandEvidence?.(card)
  }

  return (
    <div className="border-border bg-card/30 rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={toggle}
          aria-expanded={open}
          className="focus-visible:ring-accent/50 flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          {open ? (
            <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
          )}
          <h3 className="text-foreground truncate font-medium">{concept.label}</h3>
          <span className="text-muted-foreground shrink-0 text-xs">
            {concept.card_count} problem{concept.card_count === 1 ? "" : "s"}
            {/*
              Every statistic here is computed over reviewed cards only. Printing just
              card_count made the header contradict the summary beneath it.
            */}
            {concept.reviewed_count < concept.card_count
              ? ` · ${concept.reviewed_count} reviewed`
              : ""}
            {concept.mastered > 0 ? ` · ${concept.mastered} mastered` : ""}
          </span>
        </button>

        {atRisk > 0 && (
          <span className="shrink-0 rounded-full border border-rose-600/20 bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400">
            {atRisk} at risk
          </span>
        )}
      </div>

      <ConceptRiskStrip
        cards={concept.cards}
        mean={concept.mean_retrievability}
        onSelectCard={selectCard}
        className="mt-3 ml-6"
      />

      {open && (
        <div className="divide-border mt-4 ml-6 divide-y">
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
