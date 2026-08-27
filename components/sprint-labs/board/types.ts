/**
 * TicketCardView — the board's per-ticket view model, matching UX-SPEC.md §1.7 verbatim:
 *
 * ```ts
 * interface TicketCardView {
 *   key: string; title: string; points: number; labels: string[]
 *   aiPolicy: AiPolicy; aiPolicyReason?: string; status: TicketStatus
 *   objectives: ObjectiveView[]; escapedCount?: number
 * }
 * ```
 *
 * `escapedCount` has no data source today: there is no GET endpoint anywhere under
 * `app/api/sprint-labs/attempts/**` (Task 8 only shipped POST `attempts` and POST
 * `attempts/complete`), so a DONE ticket's escaped-defect count cannot be read yet. Callers omit it
 * (leave it `undefined`) until a future task exposes one; `TicketCard` renders the DONE state without
 * an escaped badge in that case rather than fabricating a number, the same graceful-degradation
 * convention Task 10 used for the overview's missing seed-stats panel.
 *
 * `playable` is a later, additive field (not in the UX-SPEC.md §1.7 block above): it threads
 * `TicketPublic.playable` (`lib/sprint-labs/types.ts`) through from the board page's mapper so
 * `TicketCard` can render a content-stub tag. Optional for the same reason the source field is
 * optional: `undefined` reads as playable, same as `true` — only `false` (a compiled stub) changes
 * the card.
 */

import type { AiPolicy, TicketBoardStatus } from "@/lib/sprint-labs/types"
import type { ObjectiveView } from "@/components/sprint-labs/ui/ObjectiveList"

export interface TicketCardView {
  key: string
  title: string
  points: number
  labels: string[]
  aiPolicy: AiPolicy
  aiPolicyReason?: string
  status: TicketBoardStatus
  objectives: ObjectiveView[]
  escapedCount?: number
  playable?: boolean
}
