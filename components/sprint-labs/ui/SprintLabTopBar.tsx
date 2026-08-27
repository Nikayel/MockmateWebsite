"use client"

/**
 * SprintLabTopBar — the 48px compact top bar for every `run/**` screen (UX-SPEC.md §1.3).
 *
 * "Run pages (screens 3-10): no global header. SprintLabTopBar NEW — 48px compact top bar, the
 * convention from `app/labs/[labId]/page.tsx:93-147` and `InterviewTopBar.tsx`: back affordance,
 * workbook name, sprint pill (`Sprint 3 of 10`), ticket key when on a ticket route, the 'what the
 * agent knows about you' button on workspace only, `<ThemeToggle />` last. No nav links."
 * `Contract: { workbookTitle, sprintNumber, sprintCount, ticketKey?, backHref, rightSlot? }`.
 *
 * `backLabel` is an implementation-choice addition beyond the one-line contract (UX-SPEC.md §1.8's
 * own preamble: "Contracts are one line; props beyond these are an implementation choice"). The
 * spec's own screen mockups disagree on what the back affordance's label is: standup and board show
 * `< Meridian` (the workbook title), the ticket screen shows `< Board`. Rather than force one literal
 * reading over the other, `backLabel` defaults to `workbookTitle` (matching standup/board) and the
 * ticket screen passes `"Board"` explicitly.
 *
 * `rightSlot` is the one extensibility point named in the contract: today it carries the board's
 * "Standup" link; Task 12 is expected to pass the "What the agent knows about you" button through it
 * on the workspace screen, per the ordering above (agent-knows button, then ThemeToggle, always last).
 */

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export interface SprintLabTopBarProps {
  workbookTitle: string
  sprintNumber: number
  sprintCount: number
  ticketKey?: string
  backHref: string
  /** Defaults to `workbookTitle`. The ticket screen overrides this to `"Board"`. */
  backLabel?: string
  rightSlot?: React.ReactNode
}

export function SprintLabTopBar({
  workbookTitle,
  sprintNumber,
  sprintCount,
  ticketKey,
  backHref,
  backLabel,
  rightSlot,
}: SprintLabTopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--wb-border)] bg-[var(--wb-topbar)] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-[var(--wb-muted)] hover:text-[var(--wb-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span className="truncate">{backLabel ?? workbookTitle}</span>
        </Link>
        {ticketKey && (
          <span className="shrink-0 rounded-full bg-[var(--wb-panel)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--wb-text-secondary)]">
            {ticketKey}
          </span>
        )}
        <span className="shrink-0 text-[12px] whitespace-nowrap text-[var(--wb-muted)]">
          Sprint {sprintNumber} of {sprintCount}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {rightSlot}
        <ThemeToggle />
      </div>
    </header>
  )
}
