/**
 * WorkbookCard — one Sprint Labs workbook in the `/labs` catalog grid.
 *
 * UX-SPEC.md §2 "WorkbookCard content" and "States". Mirrors `CaseLabCard`'s "whole card is the
 * click target" rule for the `playable` variant, with one addition CaseLabCard never needed: the
 * card's objectives must expand in place without navigating (§2 "Objectives surfacing"). A `<button>`
 * nested inside an `<a>` is invalid HTML and would also double-fire navigation on click, so the
 * anchor is a "stretched link" (`absolute inset-0`, ARIA label carries the accessible name) and the
 * objective chips are a normal-flow sibling given `relative` so they paint above it and remain
 * independently clickable. Everything else on the card is inert text, so this is the only place that
 * needs the trick.
 *
 * `locked` renders a `<div>`, never a link (no affordance to disable, per spec), with `--wb-panel`
 * fill instead of `--wb-card`, no hover lift, and the sandbox message in the footer plus a
 * `What runs today` dialog instead of a dead `Open` control.
 */

import Link from "next/link"
import { ArrowRight, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"
import { SERVER_EXECUTION_MESSAGE } from "@/lib/sprint-labs/platform-capabilities"
import type { WorkbookSummary } from "@/lib/sprint-labs/types"
import { formatWorkbookMeterLine } from "./format-meter-line"

const MAX_CATALOG_CHIPS = 6

export interface WorkbookCardProps {
  summary: WorkbookSummary
  variant: "playable" | "locked"
  /**
   * Overrides the computed meter-row text. Only the sbx static placeholder needs this: its "12 to
   * 16 h" is a real range, and `estimatedHours` is a single number.
   */
  meterOverride?: string
}

export function WorkbookCard({ summary, variant, meterOverride }: WorkbookCardProps) {
  const href = `/sprint-labs/${summary.id}`
  const locked = variant === "locked"
  const meterLine = meterOverride ?? formatWorkbookMeterLine(summary)
  const visibleObjectives = summary.objectives.slice(0, MAX_CATALOG_CHIPS)
  const moreCount = summary.objectives.length - visibleObjectives.length

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 sm:p-5",
        locked
          ? "border-[var(--wb-border)] bg-[var(--wb-panel)]"
          : cn(
              "border-[var(--wb-border)] bg-[var(--wb-card)]",
              "hover:-translate-y-[3px] hover:border-[var(--wb-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
            )
      )}
    >
      {!locked && (
        <Link
          href={href}
          className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
        >
          <span className="sr-only">Open {summary.title}</span>
        </Link>
      )}

      <div className="flex items-start gap-2">
        {locked && (
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wb-disabled)]" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="text-base leading-snug font-semibold text-[var(--wb-text)]">
            {summary.title}
          </h4>
          <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">{summary.pitch}</p>
        </div>
      </div>

      <p className="text-xs text-[var(--wb-text-secondary)]">{meterLine}</p>

      <p className="text-[11px] leading-relaxed text-[var(--wb-text-secondary)]">
        {summary.topics.join(" · ")}
      </p>

      {/* `relative` puts this above the stretched link in paint order (both are z-index:auto, later
          DOM wins), so the chip buttons stay independently clickable and never trigger navigation. */}
      <div className="relative flex flex-col gap-2">
        <ObjectiveList
          heading="What you'll learn"
          density="chip"
          objectives={visibleObjectives.map(toNotStartedObjectiveView)}
        />
        {moreCount > 0 && (
          <Link
            href={href}
            className="relative w-fit text-xs font-medium text-[var(--wb-accent-strong)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
          >
            +{moreCount} more
          </Link>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--wb-text-secondary)]">
        Graded on escaped defect rate: the share of hidden checks that get past you. It goes down
        over {summary.sprintCount} {summary.sprintCount === 1 ? "sprint" : "sprints"}, and that
        curve is the artifact.
      </p>

      <div className="relative mt-auto flex items-center gap-3 border-t border-[var(--wb-border)] pt-3 text-xs text-[var(--wb-text-secondary)]">
        {locked ? (
          <>
            <p className="min-w-0 flex-1">{SERVER_EXECUTION_MESSAGE}</p>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 font-medium text-[var(--wb-text-secondary)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
                >
                  What runs today
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>What runs today</DialogTitle>
                  <DialogDescription>{SERVER_EXECUTION_MESSAGE}</DialogDescription>
                </DialogHeader>
                <p className="text-muted-foreground text-sm">
                  Everything else in Sprint Labs already runs in your browser: TypeScript,
                  JavaScript, Python and SQL, with a real Postgres engine for SQL work.{" "}
                  {summary.title} needs the parts that are not built yet.
                </p>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <span
            aria-hidden
            className="ml-auto flex items-center gap-1 font-medium text-[var(--wb-accent-strong)]"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transform-none" />
          </span>
        )}
      </div>
    </div>
  )
}
