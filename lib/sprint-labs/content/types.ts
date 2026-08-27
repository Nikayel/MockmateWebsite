/**
 * Public-bundle wrapper shapes for compiled Sprint Labs content (Task 2 of
 * docs/sprint-labs/PLAN.md).
 *
 * `TicketPublic` (lib/sprint-labs/types.ts, Task 1, final) covers exactly
 * the ticket fields a Zod boundary needs to validate. It deliberately does
 * NOT carry `setup.diff` text, visible test file contents, or hidden-test
 * metadata — those are compiled-content concerns, not the trust-boundary
 * shape Task 1 owns. `CompiledTicket` is the per-ticket bundle the public
 * registry actually indexes: the validated `TicketPublic` value plus the
 * sibling public artifacts WORKBOOK-SPEC.md §6 says ship with it. Keeping
 * these as siblings (not merged into `TicketPublic`) matters because
 * `ticketPublicSchema` is a lenient (non-`.strict()`) object schema —
 * merging extra keys into the object passed through `.parse()` would have
 * them silently stripped rather than preserved.
 */

import type {
  SprintPublic,
  TicketPublic,
  TicketSecretMeta,
  WorkbookSummary,
} from "@/lib/sprint-labs/types"

export interface CompiledVisibleTestFile {
  path: string
  content: string
}

export interface CompiledTicket {
  ticket: TicketPublic
  /** Raw `setup.diff` text, or null when the ticket authored none. */
  setupDiff: string | null
  visibleTestFiles: CompiledVisibleTestFile[]
  /** Hidden-test METADATA only — see TicketSecretMeta's file header. */
  hiddenTests: TicketSecretMeta[]
}

/** One compiled workbook: its summary, its sprints in order, and its tickets by key. */
export interface CompiledWorkbook {
  summary: WorkbookSummary
  sprints: SprintPublic[]
  ticketsByKey: Record<string, CompiledTicket>
}
