import type { Metadata } from "next"
import type { ReactNode } from "react"
import { SprintLabAuthGuard } from "@/components/sprint-labs/ui/SprintLabAuthGuard"

/**
 * The run surface's foundation layout — `/sprint-labs/[workbookId]/run/**`.
 *
 * UX-SPEC.md §1.2 Pattern B: force-dynamic and noindex for the whole branch (screens 3-10 serialize
 * ticket bodies, visible tests and gate results; none of it may ever be static or indexed), auth-gated
 * two layers deep. This file IS layer two's mount point (`SprintLabAuthGuard`, mirroring
 * `LearnAuthGuard`); layer one is an Edge proxy predicate this task does not own (see the report).
 *
 * The flag gate itself (`SPRINT_LABS_ENABLED`) is NOT re-checked here: `run/` is nested under
 * `app/sprint-labs/[workbookId]/layout.tsx` (Task 10, not touched by this task), whose own
 * `notFound()` on flag-off already blocks this entire subtree before it ever renders — Next.js always
 * renders every ancestor layout first. Re-checking it here would duplicate that gate rather than add
 * a real second line of defense, since there is no path to this file that skips the parent layout.
 *
 * Deliberately minimal and stable: this is the FOUNDATION every ticket-scoped leaf segment (workspace,
 * submit, review, retro — Tasks 12-13) sits inside as a sibling under `run/ticket/[ticketKey]/`,
 * importing nothing of this task's except this layout's protection.
 */

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SprintLabRunLayout({ children }: { children: ReactNode }) {
  return <SprintLabAuthGuard>{children}</SprintLabAuthGuard>
}
