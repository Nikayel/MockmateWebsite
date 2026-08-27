"use client"

/**
 * LinkedArtifacts — the ticket's attached artifacts (UX-SPEC.md §1.8): "Collapsible list of the
 * ticket's attachments (Slack thread, PDF page, dashboard screenshot, prior ticket)." §6
 * Interactions: "closed by default, except the first one, which is open."
 *
 * Uses the generic `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` primitives
 * (`components/ui/collapsible.tsx`): the spec's component map names a `CollapsiblePanel` for this
 * slot, but no such named component exists in the repo (confirmed: no file matches
 * `CollapsiblePanel*` anywhere) — the generic Radix wrapper is what `MilestoneRail` and other
 * workbook-surface components already build on, so this follows that precedent rather than inventing
 * a component the spec assumed already existed.
 *
 * Gap, recorded rather than guessed at: `TicketPublic` (lib/sprint-labs/types.ts, Task 1, frozen) has
 * no field for linked artifacts at all — no `workbooks/**` content schema carries one either. `artifacts`
 * is therefore always `[]` for real content today; this renders the §13 empty line honestly
 * ("Nothing attached to this ticket.") rather than fabricating attachments, and the component is built
 * to the full contract so a future content-schema addition needs no shape change here.
 */

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { SlackQuote } from "@/components/sprint-labs/ui/SlackQuote"

export interface LinkedArtifactView {
  id: string
  label: string
  body?: string
}

export interface LinkedArtifactsProps {
  artifacts: LinkedArtifactView[]
}

export function LinkedArtifacts({ artifacts }: LinkedArtifactsProps) {
  if (artifacts.length === 0) {
    return <p className="text-sm text-[var(--wb-faint)]">Nothing attached to this ticket.</p>
  }

  return (
    <ul className="flex list-none flex-col gap-2">
      {artifacts.map((artifact, index) => (
        <li key={artifact.id}>
          <Collapsible defaultOpen={index === 0}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-md border border-[var(--wb-border)] px-3 py-2 text-left text-sm font-medium text-[var(--wb-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]">
              <span className="truncate">{artifact.label}</span>
              <ChevronDown
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-[var(--wb-muted)] transition-transform group-data-[state=open]:rotate-180"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {artifact.body ? (
                <SlackQuote body={artifact.body} />
              ) : (
                <p className="text-xs text-[var(--wb-faint)]">Nothing more to show.</p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </li>
      ))}
    </ul>
  )
}
