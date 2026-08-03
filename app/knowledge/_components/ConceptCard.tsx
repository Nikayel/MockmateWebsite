"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { memoryBandFor } from "@/lib/spaced-repetition/memory-bands"
import { cn } from "@/lib/utils"
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
  /**
   * The page opens the first at-risk concept so its natural state is never a wall
   * of closed bars — the evidence IS the product, and a screenshot of the default
   * view has to show some.
   */
  defaultOpen?: boolean
}

export function ConceptCard({
  concept,
  challengesEnabled,
  onChallenge,
  onExpand,
  onExpandEvidence,
  expandedCardId,
  evidenceSlot,
  defaultOpen,
}: ConceptCardProps) {
  const [open, setOpen] = useState(defaultOpen ?? false)

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
    // No card chrome of its own: the page stacks concepts inside one divided group
    // container, so the risk strips read as small multiples on a single shared
    // 0-100 axis instead of severed boxes.
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <button
          onClick={toggle}
          aria-expanded={open}
          // Only while open: the id does not exist in the collapsed state, and a
          // dangling aria-controls fails aria-valid-attr-value. aria-expanded alone
          // conveys the state until then.
          aria-controls={open ? `concept-rows-${concept.pattern}` : undefined}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 rounded text-left"
        >
          {/* One chevron that rotates, not two icons that swap. */}
          <ChevronRight
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none",
              open && "rotate-90"
            )}
          />
          <h3 className="text-foreground min-w-0 truncate font-medium">{concept.label}</h3>
          {/*
            w-full below sm, matching the row actions: the counts were shrink-0 next
            to a truncate'd h3, so the h3 (min-width 0, via overflow-hidden) absorbed
            the whole deficit. At 360px "12 problems · 8 reviewed · 3 mastered" sets
            wider than the space left, so the concept NAME collapsed to zero — no
            ellipsis, just gone — and the counts still overran into the group
            container's overflow-hidden. The accordion's own label lost to its
            metadata on every mobile row. Dropping to a second line keeps both, and
            puts the counts on the same rail as the risk strip below.
          */}
          <span className="text-muted-foreground w-full shrink-0 text-xs sm:w-auto">
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
        // pl-6, not ml-6: the strip's root is w-full, and width:100% plus a left
        // MARGIN over-constrains a block box, so margin-right is dropped and the
        // whole thing overflowed 24px to the right (CSS 2.1 §10.3.3) — the axis ran
        // flush into the card border at sm+, and past it below sm, where the group
        // container's overflow-hidden clipped the 100% end. Padding insets instead,
        // because preflight sets box-sizing: border-box, so the strip finally sits
        // on the same 24px rail as the chevron, the rows and the evidence panel.
        className="mt-3 pl-6"
      />

      {open && (
        <div id={`concept-rows-${concept.pattern}`} className="divide-border mt-4 ml-6 divide-y">
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
