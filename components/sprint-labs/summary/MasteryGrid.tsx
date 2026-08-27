"use client"

/**
 * MasteryGrid — objectives with their state (UX-SPEC.md §1.8, §11: "objects
 * grouped by the ten topics... each row a topic with counts, expanding to
 * its objective chips with states").
 *
 * Grouped as ONE aggregate row rather than per-topic: a topic lives on a
 * SPRINT (`SprintPublic.topic`), and there is no ticket-to-sprint mapping
 * anywhere in the compiled registry to attribute a touched objective back to
 * its topic (the same documented gap `lib/sprint-labs/runs.ts` and the
 * ticket/retro screens already carry — flagged again here in the Task 13
 * report). One real aggregate count plus the real `ObjectiveList` at
 * `density="chip"` (UX-SPEC.md §1.4's density table for this screen) is
 * still faithful to real per-learner signal; a topic split would not be.
 */

import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import type { ObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"

export interface MasteryGridProps {
  objectives: ObjectiveView[]
}

export function MasteryGrid({ objectives }: MasteryGridProps) {
  if (objectives.length === 0) {
    return <p className="text-sm text-[var(--wb-faint)]">Nothing measured yet.</p>
  }

  const demonstrated = objectives.filter((o) => o.state === "demonstrated").length
  const practicing = objectives.filter((o) => o.state === "practicing").length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--wb-text)]">
        {demonstrated} demonstrated{practicing > 0 ? `, ${practicing} practicing` : ""}
      </p>
      <ObjectiveList objectives={objectives} density="chip" headingLevel="none" />
    </div>
  )
}
