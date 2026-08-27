"use client"

/**
 * AgentKnowledgePanel — "What the agent knows about you"
 * (docs/sprint-labs/AGENT-CONTEXT.md §7, UX-SPEC.md §7, PLAN.md Task 14).
 *
 * "One click from the workspace header ... showing the LITERAL injected
 * text, not a friendly summary. Any entry can be muted; muting is not
 * recorded, not penalized, and not shown to the agent." This component
 * renders exactly `directive.instruction` per entry (never a paraphrase or
 * summary) and is purely presentational/controlled: it takes the
 * (already `filterDirectives`-screened — lib/sprint-labs/grading/
 * filterDirectives.ts) directive list, the current mute ids, and an
 * `onToggleMute` callback as props, and renders inside a Dialog. Fetching
 * the data and wiring the PATCH mute action
 * (lib/sprint-labs/partner/chat-client.ts's `setDirectiveMuted`) is left to
 * whichever screen mounts this panel (the run's top bar owns the button
 * that opens it — UX-SPEC.md §1.3/§1.8 — a different, later task), since a
 * dumb/controlled component is the more testable and more reusable shape.
 *
 * `workbook-surface` on `DialogContent` per UX-SPEC.md §1.1: a portal's
 * content is NOT in `--wb-*`'s scope by default, so it is added directly on
 * the portaled element to keep the dialog in the workbook's palette.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { DirectiveEntry } from "@/lib/sprint-labs/types"

export interface AgentKnowledgePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Already `filterDirectives`-screened for the CURRENT ticket — this component never re-filters. */
  directives: readonly DirectiveEntry[]
  mutedDirectiveIds: readonly string[]
  onToggleMute: (directiveId: string, muted: boolean) => void
}

export function AgentKnowledgePanel({
  open,
  onOpenChange,
  directives,
  mutedDirectiveIds,
  onToggleMute,
}: AgentKnowledgePanelProps) {
  const mutedSet = new Set(mutedDirectiveIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="workbook-surface bg-[var(--wb-card)] text-[var(--wb-text)]">
        <DialogHeader>
          <DialogTitle>What the agent knows about you</DialogTitle>
          <DialogDescription className="text-[var(--wb-text-secondary)]">
            The literal text Sable is given about how you tend to work. Nothing here is a score.
          </DialogDescription>
        </DialogHeader>

        {directives.length === 0 ? (
          <p className="py-4 text-[13px] text-[var(--wb-faint)]">
            Sable has nothing on file about you yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5 py-2">
            {directives.map((directive) => {
              const muted = mutedSet.has(directive.id)
              return (
                <li
                  key={directive.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-main)] px-3 py-2.5",
                    muted && "opacity-60"
                  )}
                >
                  <p className="text-[13px] leading-relaxed text-[var(--wb-text)]">
                    {directive.instruction}
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={muted}
                    aria-label={muted ? "Unmute this entry" : "Mute this entry"}
                    onClick={() => onToggleMute(directive.id, !muted)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
                      muted
                        ? "border-[var(--wb-border)] text-[var(--wb-faint)]"
                        : "border-[var(--wb-accent)] text-[var(--wb-accent-strong)]"
                    )}
                  >
                    {muted ? "Muted" : "Mute"}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="text-[11px] leading-snug text-[var(--wb-faint)]">
          Muting is not recorded, not penalized, and not shown to the agent.
        </p>
      </DialogContent>
    </Dialog>
  )
}
