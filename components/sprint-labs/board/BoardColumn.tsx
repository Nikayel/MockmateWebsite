/**
 * BoardColumn — one board column (UX-SPEC.md §1.8): "heading, count pill, scrollable card list, empty
 * line."
 *
 * "Columns are `<section>` with an `<h3>` heading plus a count; each column's cards are a `<ul>` of
 * `<li><Link>`. Because they are links in DOM order, tab order is already correct and no roving
 * tabindex, no `role='application'`, and no keyboard drag affordance is needed" (§5). This is a plain
 * `<ul>`/`<li>` list, nothing more.
 */

import { TicketCard } from "./TicketCard"
import type { TicketCardView } from "./types"

export interface BoardColumnProps {
  workbookId: string
  /** Column heading, e.g. "TODO". UX-SPEC.md §5: uppercase, "because that is what the fiction says." */
  title: string
  tickets: TicketCardView[]
  emptyLabel: string
  headingId: string
}

export function BoardColumn({
  workbookId,
  title,
  tickets,
  emptyLabel,
  headingId,
}: BoardColumnProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-[240px] flex-1 flex-col gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-3"
    >
      <div className="flex items-center gap-2">
        <h3
          id={headingId}
          className="text-xs font-semibold tracking-[0.06em] text-[var(--wb-text)]"
        >
          {title}
        </h3>
        <span className="rounded-full bg-[var(--wb-track)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--wb-text-secondary)]">
          {tickets.length}
        </span>
      </div>

      {tickets.length === 0 ? (
        <p className="text-xs text-[var(--wb-faint)]">{emptyLabel}</p>
      ) : (
        <ul className="flex list-none flex-col gap-2 overflow-y-auto">
          {tickets.map((ticket) => (
            <li key={ticket.key}>
              <TicketCard workbookId={workbookId} ticket={ticket} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
