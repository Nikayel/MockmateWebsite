/**
 * SprintLabProWall — the free-to-Pro upsell state for a sprint >= 2 (UX-SPEC.md §12.6).
 *
 * "The wall lands on the sprint 2 standup route... Uses `--wb-*` tokens on the workbook surface, not
 * the global-token upgrade panel from `/practice`... Links to `/pricing`." Shared by the standup and
 * board screens (§12.6 names both "the standup gate" and "the board gate" as call sites of
 * `sprintRequiresPro`), so the panel itself is built once here rather than twice.
 *
 * `sprintTitle`/`sprintGoal` are optional: §12.6's own mockup quotes Meridian-specific teaser copy
 * ("Sprint 2 is Money and Time. Reconciliation is out by $412.19...") that is authored content this
 * task has no source for (no compiled workbook past sprint 1 exists yet). Rather than fabricate that
 * sentence, this renders the locked sprint's own public `title`/`goal` when the caller can supply them
 * (both are already treated as pre-Pro-safe marketing copy — `SprintMap`, Task 10, already reveals a
 * locked sprint's `goal` in its expand-in-place row) and degrades to a plain sprint-number line when
 * the sprint's content has not compiled yet.
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"

export interface SprintLabProWallProps {
  sprintNumber: number
  sprintTitle?: string
  sprintGoal?: string
}

const CTA_BUTTON_CLASS =
  "h-11 bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)] hover:bg-[var(--wb-accent-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"

export function SprintLabProWall({ sprintNumber, sprintTitle, sprintGoal }: SprintLabProWallProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-6">
      <div className="flex flex-col gap-2">
        <p className="text-base font-semibold text-[var(--wb-text)]">
          Sprint {sprintNumber}
          {sprintTitle ? `: ${sprintTitle}` : ""} is part of Pro.
        </p>
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          {sprintGoal ?? "Sprint 1 is free for every signed in learner. Sprints 2 to 10 need Pro."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
          <Link href="/pricing">See Pro</Link>
        </Button>
        <span className="text-xs text-[var(--wb-text-secondary)]">
          Your earlier sprint work is saved.
        </span>
      </div>
    </div>
  )
}
