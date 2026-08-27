/**
 * SprintLabsSection — the `/labs` section wrapper for the Sprint Labs workbook grid.
 *
 * UX-SPEC.md §2: icon, heading, count pill, one-line definition, mirroring `CaseLabGallery`'s
 * per-round group-header shape so the two catalogs read as siblings on the page. Renders every
 * compiled, runnable-or-not workbook the registry returns (never hardcoding a workbook id) plus the
 * one hardcoded `sbx` placeholder card (`SBX_CATALOG_PLACEHOLDER`), which is not compiled content and
 * has no route of its own.
 */

import { Workflow } from "lucide-react"
import { workbookIsRunnable } from "@/lib/sprint-labs/platform-capabilities"
import type { WorkbookSummary } from "@/lib/sprint-labs/types"
import { WorkbookCard } from "./WorkbookCard"
import { SBX_CATALOG_PLACEHOLDER, SBX_METER_OVERRIDE } from "./sbx-placeholder"

export interface SprintLabsSectionProps {
  workbooks: WorkbookSummary[]
}

export function SprintLabsSection({ workbooks }: SprintLabsSectionProps) {
  // + 1 for the static sbx placeholder card, which is never in `workbooks` (it is not compiled
  // content and the registry has no entry for it).
  const totalCount = workbooks.length + 1

  return (
    <section
      id="sprint-labs"
      aria-labelledby="sprint-labs-heading"
      className="flex flex-col rounded-2xl border border-[var(--wb-border)] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--wb-accent-soft)] text-[var(--wb-accent-strong)]"
        >
          <Workflow className="h-[18px] w-[18px]" />
        </span>
        <h2
          id="sprint-labs-heading"
          className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--wb-text)] sm:text-lg"
        >
          Sprint labs
        </h2>
        <span className="rounded-full bg-[var(--wb-panel)] px-2 py-[3px] text-[11px] font-semibold tracking-[0.04em] text-[var(--wb-text-secondary)] uppercase">
          {totalCount} {totalCount === 1 ? "workbook" : "workbooks"}
        </span>
      </div>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
        Ten sprints on one codebase. The repo remembers what you did, and sprint 9 breaks the code
        you wrote in sprint 4.
      </p>
      <div className="mt-4 grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3.5">
        {workbooks.map((summary) => (
          <WorkbookCard
            key={summary.id}
            summary={summary}
            variant={workbookIsRunnable(summary) ? "playable" : "locked"}
          />
        ))}
        <WorkbookCard
          key={SBX_CATALOG_PLACEHOLDER.id}
          summary={SBX_CATALOG_PLACEHOLDER}
          variant="locked"
          meterOverride={SBX_METER_OVERRIDE}
        />
      </div>
    </section>
  )
}
