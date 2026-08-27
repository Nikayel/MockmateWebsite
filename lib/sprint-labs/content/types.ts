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
 *
 * `CompiledWorkbook` vs `WorkbookContent` (review round 1, M-5): the public
 * registry eagerly imports every `WorkbookSummary` (small, needed for the
 * catalog grid) but loads a workbook's sprints + tickets lazily, on demand,
 * behind a dynamic import — the same shape the sealed registry already
 * uses for `loadSealedTicket`. A catalog page must not pull every ticket's
 * `bodyMd` and visible-test file contents into its bundle just to render
 * summary cards. `WorkbookContent` is what that lazy loader resolves to;
 * `CompiledWorkbook` (summary + content together) is the compiler's own
 * internal, in-memory shape for one fully-compiled workbook and is not
 * what the generated registry.ts stores at runtime.
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

/** A workbook's sprints (in order) and tickets by key, loaded lazily. */
export interface WorkbookContent {
  sprints: SprintPublic[]
  ticketsByKey: Record<string, CompiledTicket>
}

/** One compiled workbook: its summary plus its content, as one in-memory value. */
export interface CompiledWorkbook {
  summary: WorkbookSummary
  sprints: SprintPublic[]
  ticketsByKey: Record<string, CompiledTicket>
}
