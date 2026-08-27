/**
 * SprintBoard — the four fixed columns (UX-SPEC.md §1.8): "Four fixed columns rendered from
 * `TicketCardView[]`; no drag, no drop, no reordering."
 *
 * Groups the flat `tickets` array by `status` into TODO/DOING/REVIEW/DONE. Horizontal scroll lives on
 * this element (§5: "horizontal scroll inside the board region only, the page body never scrolls
 * sideways"); the sprint-progress header and the sprint-complete band are page-level concerns (they
 * need the sprint's `goal` text, which this component has no reason to depend on) and are rendered by
 * the board page above this component, not inside it.
 */

import { BoardColumn } from "./BoardColumn"
import type { TicketCardView } from "./types"
import type { TicketBoardStatus } from "@/lib/sprint-labs/types"

export interface SprintBoardProps {
  workbookId: string
  tickets: TicketCardView[]
}

const COLUMNS: Array<{ status: TicketBoardStatus; title: string; emptyLabel: string }> = [
  { status: "todo", title: "TODO", emptyLabel: "Nothing left to pick up." },
  { status: "doing", title: "DOING", emptyLabel: "Nothing in progress." },
  { status: "review", title: "REVIEW", emptyLabel: "Nothing in review." },
  { status: "done", title: "DONE", emptyLabel: "Nothing shipped yet." },
]

export function SprintBoard({ workbookId, tickets }: SprintBoardProps) {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
      {COLUMNS.map(({ status, title, emptyLabel }) => (
        <BoardColumn
          key={status}
          workbookId={workbookId}
          title={title}
          emptyLabel={emptyLabel}
          headingId={`board-column-${status}`}
          tickets={tickets.filter((ticket) => ticket.status === status)}
        />
      ))}
    </div>
  )
}
