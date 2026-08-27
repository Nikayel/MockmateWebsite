/**
 * AiPolicyBanner — the non-dismissible ai_policy banner (UX-SPEC.md §1.8): "carrying
 * `ai_policy_reason` in fiction. No close control, ever."
 *
 * Non-dismissible is satisfied by omission: there is no close button, no `onDismiss` prop, and
 * nothing in this component's state can hide it once rendered. `assisted` renders nothing (§6 States:
 * "no banner"; the ticket rail's policy row is enough) — callers are expected not to mount this at
 * all for an assisted ticket, but returning `null` here is a second line of defense against a caller
 * that renders it unconditionally.
 *
 * `unassisted` and `review-only` copy is fixed platform framing (§6); `reason` is the ticket's
 * authored `ai_policy_reason`, required by the content schema whenever `policy === "unassisted"`
 * (`lib/sprint-labs/types.ts`'s `ticketPublicSchema` `.superRefine`), rendered verbatim, in fiction,
 * quoted.
 */

import type { AiPolicy } from "@/lib/sprint-labs/types"

export interface AiPolicyBannerProps {
  policy: AiPolicy
  /** The ticket's authored `ai_policy_reason`. Expected whenever `policy === "unassisted"`. */
  reason?: string
  className?: string
}

const HEADLINE: Partial<Record<AiPolicy, string>> = {
  unassisted: "No agent on this ticket.",
  "review-only": "An agent already wrote this diff. Your job is to decide what ships.",
}

export function AiPolicyBanner({ policy, reason, className }: AiPolicyBannerProps) {
  if (policy === "assisted") return null
  const headline = HEADLINE[policy]
  if (!headline) return null

  return (
    <div
      role="note"
      className={
        "flex flex-col gap-1.5 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-3" +
        (className ? ` ${className}` : "")
      }
    >
      <p className="text-sm font-medium text-[var(--wb-text)]">{headline}</p>
      {policy === "unassisted" && reason && (
        <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
          &ldquo;{reason}&rdquo;
        </p>
      )}
    </div>
  )
}
