/**
 * AiPolicyBadge — the ticket's ai_policy as one small pill (UX-SPEC.md §1.8): "assisted / no agent /
 * review only". Reused by the board's `TicketCard` and the ticket screen's metadata rail.
 *
 * Plain styled `<span>`, not `components/ui/badge.tsx`'s `Badge`: that primitive's default variants
 * hard-code global tokens (`bg-primary`, `text-primary-foreground`, ...), and UX-SPEC.md §1.1's hard
 * rule is "do not mix families on one screen" inside the workbook surface. `SprintMap`'s Free/Pro pill
 * (components/sprint-labs/catalog/SprintMap.tsx) already established this exact styled-span pattern
 * for a small pill on this surface; this component matches it rather than introducing a second style.
 */

import type { AiPolicy } from "@/lib/sprint-labs/types"

const LABEL: Record<AiPolicy, string> = {
  assisted: "Assisted",
  unassisted: "No agent",
  "review-only": "Review only",
}

export function AiPolicyBadge({ policy, className }: { policy: AiPolicy; className?: string }) {
  return (
    <span
      className={
        "inline-flex w-fit shrink-0 items-center rounded-full border border-[var(--wb-border)] bg-[var(--wb-panel)] px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[var(--wb-text-secondary)] uppercase" +
        (className ? ` ${className}` : "")
      }
    >
      {LABEL[policy]}
    </span>
  )
}
