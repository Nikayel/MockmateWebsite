/**
 * TicketView — screen 5, the ticket hand-off (UX-SPEC.md §6).
 *
 * "Hand over a real ticket. Everything needed to decide what to do, nothing that says where to do
 * it." Body renders through the repo's `MarkdownRenderer` (Jira-voice authored content), never a
 * platform summary; acceptance criteria are read-only; the ai_policy banner is non-dismissible; the
 * CTA never lists files. Two columns on desktop (body left, metadata rail right), single column below
 * `lg`.
 *
 * **CTA resolution, recorded (§6's States list mixes policy-driven and status-driven states in one
 * flat list; this is the reading this task builds against):**
 * 1. `status === "done"` -> `See retro` (screen 9, `.../retro`) — overrides everything else; a
 *    finalized ticket always looks backward.
 * 2. `aiPolicy === "review-only"` (and not done) -> `Open the PR` (screen 8, `.../review`) — a
 *    review-only ticket has no workspace step at all; its diff already exists.
 * 3. `status === "review"` -> `See CI` (screen 7, `.../submit`) — the submit screen is where gate
 *    results live, whether or not this ticket also authors a review round on top.
 * 4. `status === "doing"` -> `Back to workspace`.
 * 5. `status === "todo"` (default) -> `Open workspace`.
 *
 * All four route targets (`workspace`, `submit`, `review`, `retro`) sit under
 * `run/ticket/[ticketKey]/**`, none of which this task creates (Tasks 12-13 own those segments) — the
 * links are correct today even though their targets 404 until those tasks land.
 *
 * **`playable === false` overrides the CTA resolution above entirely.** A compiled content stub (no
 * `reference.diff`/`rubric.yaml` yet — see `TicketPublic.playable`'s doc comment) has no workspace
 * content and no sealed bundle to grade against, so none of `workspace`/`submit`/`review`/`retro` has
 * anything real to show. The CTA renders as a disabled, muted "Coming soon" control instead
 * of a link, whatever `resolveCta` would otherwise have picked. Everything else on the screen (body,
 * acceptance criteria, objectives, policy banner) stays exactly as authored — a learner can still
 * read a stub, just not play it. `undefined` (every ticket compiled before this field existed) reads
 * the same as `true`.
 */

import Link from "next/link"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { AiPolicyBanner } from "@/components/sprint-labs/ui/AiPolicyBanner"
import { AiPolicyBadge } from "@/components/sprint-labs/ui/AiPolicyBadge"
import { ObjectiveList } from "@/components/sprint-labs/ui/ObjectiveList"
import { toNotStartedObjectiveView } from "@/components/sprint-labs/ui/objective-view"
import { AcceptanceCriteria } from "./AcceptanceCriteria"
import { LinkedArtifacts } from "./LinkedArtifacts"
import type { TicketPublic, TicketBoardStatus } from "@/lib/sprint-labs/types"

export interface TicketViewProps {
  workbookId: string
  ticket: TicketPublic
  status: TicketBoardStatus
  /** No read API exists yet for a finalized ticket's escaped-defect count — see `board/types.ts`. */
  escapedCount?: number
}

const CTA_BUTTON_CLASS =
  "h-11 bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)] hover:bg-[var(--wb-accent-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"

/** `playable === false`: muted, non-interactive — no hover/accent color, so it never reads as a live control. */
const NOT_PLAYABLE_CTA_CLASS =
  "h-11 border border-[var(--wb-border)] bg-[var(--wb-panel)] text-[var(--wb-disabled)] hover:bg-[var(--wb-panel)] hover:text-[var(--wb-disabled)]"

function resolveCta(
  policy: TicketPublic["aiPolicy"],
  status: TicketBoardStatus
): { label: string; segment: "workspace" | "submit" | "review" | "retro" } {
  if (status === "done") return { label: "See retro", segment: "retro" }
  if (policy === "review-only") return { label: "Open the PR", segment: "review" }
  if (status === "review") return { label: "See CI", segment: "submit" }
  if (status === "doing") return { label: "Back to workspace", segment: "workspace" }
  return { label: "Open workspace", segment: "workspace" }
}

export function TicketView({ workbookId, ticket, status, escapedCount }: TicketViewProps) {
  const objectives = ticket.objectives.map(toNotStartedObjectiveView)
  const cta = resolveCta(ticket.aiPolicy, status)

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-8">
      <div className="flex flex-col gap-5 lg:col-start-1">
        {status === "done" && (
          <div className="rounded-lg border border-[var(--wb-success)] bg-[var(--wb-panel)] px-4 py-2.5">
            <p className="text-sm font-medium text-[var(--wb-success)]">
              Shipped.{" "}
              {escapedCount === undefined
                ? ""
                : escapedCount === 0
                  ? "Nothing escaped."
                  : escapedCount === 1
                    ? "1 escaped defect."
                    : `${escapedCount} escaped defects.`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-[var(--wb-text-secondary)]">
              {ticket.key}
            </span>
            <h1 className="text-lg leading-snug font-semibold text-[var(--wb-text)] sm:text-xl">
              {ticket.title}
            </h1>
          </div>
          {ticket.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ticket.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[var(--wb-border)] px-2 py-0.5 text-[11px] text-[var(--wb-text-secondary)]"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <AiPolicyBanner policy={ticket.aiPolicy} reason={ticket.aiPolicyReason} />

        <MarkdownRenderer
          content={ticket.bodyMd}
          className="prose prose-sm max-w-none rounded-lg border border-[var(--wb-border)] bg-[var(--wb-card)] p-4 text-[var(--wb-text)]"
        />

        <section aria-labelledby="ticket-acceptance-heading" className="flex flex-col gap-3">
          <h2
            id="ticket-acceptance-heading"
            className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
          >
            Acceptance criteria
          </h2>
          <AcceptanceCriteria criteria={ticket.acceptanceCriteria} />
        </section>

        <section aria-labelledby="ticket-linked-heading" className="flex flex-col gap-3">
          <h2
            id="ticket-linked-heading"
            className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase"
          >
            Linked
          </h2>
          {/* Gap: TicketPublic carries no linked-artifact field yet — see LinkedArtifacts' header. */}
          <LinkedArtifacts artifacts={[]} />
        </section>

        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--wb-border)] pt-4">
          {ticket.playable === false ? (
            <Button size="lg" disabled className={NOT_PLAYABLE_CTA_CLASS}>
              Coming soon
            </Button>
          ) : (
            <Button asChild size="lg" className={CTA_BUTTON_CLASS}>
              <Link href={`/sprint-labs/${workbookId}/run/${cta.segment}/${ticket.key}`}>
                {cta.label}
              </Link>
            </Button>
          )}
          <span className="text-xs text-[var(--wb-text-secondary)]">
            {ticket.points} {ticket.points === 1 ? "point" : "points"}. Visible tests run in your
            browser.
          </span>
        </div>
      </div>

      <aside className="flex flex-col gap-5 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            Points
          </span>
          <span className="text-lg font-semibold text-[var(--wb-text)]">{ticket.points}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            Policy
          </span>
          <AiPolicyBadge policy={ticket.aiPolicy} />
        </div>

        {objectives.length > 0 && (
          <div className="flex flex-col gap-2">
            <ObjectiveList
              heading="Objectives"
              headingLevel="none"
              density="chip"
              objectives={objectives}
            />
            <p className="text-[11px] text-[var(--wb-faint)]">
              These are what this ticket is measuring.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            Adversary
          </span>
          <span className="text-sm text-[var(--wb-text)]">
            {ticket.adversaryPresent ? "Yes" : "No"}
          </span>
        </div>
      </aside>
    </div>
  )
}
