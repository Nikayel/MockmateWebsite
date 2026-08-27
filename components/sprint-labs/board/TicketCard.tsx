/**
 * TicketCard — one ticket on the board (UX-SPEC.md §1.8, §5 "TicketCard content").
 *
 * "One ticket as a link to its ticket route, carrying key, title, points, labels, `AiPolicyBadge`, up
 * to two objective chips, and `ai_policy_reason` when unassisted." No drag/drop (§5): this is a plain
 * link, status changes only through ticket actions elsewhere.
 *
 * Stretched-link structure copied verbatim from `WorkbookCard`'s fix-round shape (I1): the whole card
 * is the click target via an `absolute inset-0` anchor with an sr-only accessible name, and ONLY the
 * objective-chip row gets `relative` so it paints above the stretched link and stays independently
 * clickable — §5's own instruction ("render the chip row outside the `<Link>` in the DOM... so a
 * nested interactive element never sits inside an anchor") is satisfied the same way WorkbookCard
 * satisfies it, not by a new mechanism.
 *
 * `playable === false` (a compiled content stub — no `reference.diff`/`rubric.yaml` yet, see
 * `TicketPublic.playable`'s own doc comment): the card stays a normal link to the ticket screen — a
 * learner can still read a stub's body/criteria there — but carries a muted "Content coming" tag so
 * the board never implies there is a workspace to open. `undefined` (every ticket compiled before
 * this field existed) reads the same as `true`.
 */

import Link from "next/link"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { AiPolicyBadge } from "@/components/sprint-labs/ui/AiPolicyBadge"
import type { TicketCardView } from "./types"

const MAX_BOARD_CHIPS = 2

export interface TicketCardProps {
  workbookId: string
  ticket: TicketCardView
}

export function TicketCard({ workbookId, ticket }: TicketCardProps) {
  const href = `/sprint-labs/${workbookId}/run/ticket/${ticket.key}`
  const visibleObjectives = ticket.objectives.slice(0, MAX_BOARD_CHIPS)
  const moreCount = ticket.objectives.length - visibleObjectives.length

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] p-3 transition-colors hover:border-[var(--wb-accent)]">
      <Link
        href={href}
        className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
      >
        <span className="sr-only">
          Open {ticket.key}: {ticket.title}
        </span>
      </Link>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium text-[var(--wb-text-secondary)]">
          {ticket.key}
        </span>
        <span className="shrink-0 text-xs font-medium text-[var(--wb-text-secondary)]">
          {ticket.points} pt
        </span>
      </div>

      <p className="text-sm leading-snug font-medium text-[var(--wb-text)]">{ticket.title}</p>

      {ticket.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.labels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-[var(--wb-border)] px-1.5 py-0.5 text-[10px] text-[var(--wb-text-secondary)]"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <AiPolicyBadge policy={ticket.aiPolicy} />
          {ticket.playable === false && (
            <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-[var(--wb-border)] bg-[var(--wb-panel)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--wb-disabled)] uppercase">
              Content coming
            </span>
          )}
        </div>
        {/* No GET endpoint exists yet to read a finalized attempt's escaped-defect count (see
            board/types.ts) — the escaped line is omitted entirely rather than rendered-then-hidden,
            so no "undefined escaped" text ever reaches the DOM while the count is unknown. */}
        {ticket.status === "done" && ticket.escapedCount !== undefined && (
          <span
            className={
              ticket.escapedCount === 0
                ? "text-xs font-medium text-[var(--wb-success)]"
                : "text-destructive text-xs font-medium"
            }
          >
            {ticket.escapedCount === 0
              ? "0 escaped"
              : ticket.escapedCount === 1
                ? "1 escaped"
                : `${ticket.escapedCount} escaped`}
          </span>
        )}
      </div>

      {/* AUTHORING-RULES.md §6: the ai_policy_reason is required on the board card, not a tooltip,
          whenever the ticket is unassisted. In-fiction, quoted, secondary text. */}
      {ticket.aiPolicy === "unassisted" && ticket.aiPolicyReason && (
        <p className="text-xs leading-relaxed text-[var(--wb-text-secondary)] italic">
          &ldquo;{ticket.aiPolicyReason}&rdquo;
        </p>
      )}

      {ticket.objectives.length > 0 && (
        <div className="relative flex flex-col gap-1">
          <ObjectiveList density="chip" headingLevel="none" objectives={visibleObjectives} />
          {moreCount > 0 && (
            <span className="relative w-fit text-[10px] font-medium text-[var(--wb-text-secondary)]">
              +{moreCount} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
