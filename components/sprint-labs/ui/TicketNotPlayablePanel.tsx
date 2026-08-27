/**
 * TicketNotPlayablePanel — the honest empty state for a `playable === false` ticket
 * (docs/sprint-labs/UX-SPEC.md predates this field; this panel is a small addition consistent with
 * the surface's existing locked/muted patterns rather than a spec'd screen).
 *
 * A compiled content stub (no `reference.diff`/`rubric.yaml` yet — see `TicketPublic.playable`'s own
 * doc comment in `lib/sprint-labs/types.ts`) has no editable seed, no visible tests, and no sealed
 * bundle. Mounting the workspace editor or the submit flow for one would render an empty file tree
 * or a confirm screen with nothing behind it — a broken-looking experience, not a clear one. This
 * panel replaces that mount instead: a centered icon badge, a title, and one short line, matching the
 * muted "locked" card `PartnerChat.tsx` already established in this same directory (no-agent state)
 * rather than inventing a second visual language for "not available yet."
 */

import { Construction } from "lucide-react"

export function TicketNotPlayablePanel() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-[420px] flex-col items-center gap-3 rounded-2xl border border-[var(--wb-border)] bg-[var(--wb-panel)] px-6 py-10 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--wb-border)] bg-[var(--wb-main)] text-[var(--wb-disabled)]">
          <Construction className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-[var(--wb-text)]">
          This ticket isn't playable yet
        </p>
        <p className="text-xs leading-relaxed text-[var(--wb-text-secondary)]">
          Content for this ticket hasn't shipped. Check back once it's ready.
        </p>
      </div>
    </div>
  )
}
