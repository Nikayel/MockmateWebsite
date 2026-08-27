/**
 * Sprint Labs sealed-content shapes (Task 2 of docs/sprint-labs/PLAN.md).
 *
 * Generalizes the bugfix pack precedent (`lib/bugfix/packs/types.ts`'s
 * `SealedPackContent`) for a workbook/sprint/ticket content model. These
 * are TYPES ONLY: interfaces erase at compile time and never ship in a
 * bundle, so this file can live in a path reachable from client code (it
 * defines no runtime value) — only the concrete VALUES exported from
 * `<workbookId>/<ticketKey>.server.ts` and `registry.server.ts` are
 * server-only, guarded by the runtime `typeof window` throw in those
 * generated files and covered by
 * lib/sprint-labs/__tests__/sealing.test.ts's import-graph check.
 *
 * Field-by-field justification for what is sealed lives in
 * scripts/compile-workbooks.mjs's `SECRET_FIELD_CLASSIFICATION` table,
 * the single source of truth for the public/secret split. This file just
 * shapes what that table's "secret" side compiles into.
 */

import type { TicketSecretKind } from "@/lib/sprint-labs/types"
import type { PgSuiteAssertion } from "@/lib/workspace-execution/pg-sandbox/types"

/**
 * One hidden test's SEALED half. `humanName`/`tags`/`kind` are duplicated
 * here (they also appear in the public `TicketSecretMeta` projection)
 * because a hidden test is authored ONCE, as a single YAML file under
 * `tests/hidden/`, carrying both its public metadata and secret payload;
 * the compiler splits that one authored record into the two halves rather
 * than requiring content authors to write metadata twice.
 *
 * `input`/`expected` are populated for `kind: "io-case"`; `body` is
 * populated for `kind: "probe"`. Modeled as all-optional-plus-kind rather
 * than a discriminated union so the compiler can emit one shape without a
 * runtime narrowing dance in generated code; io-case/probe callers narrow
 * on `kind`.
 */
export interface SealedHiddenCase {
  id: string
  humanName: string
  tags: string[]
  kind: TicketSecretKind
  /**
   * io-case only. PUBLIC-issuable at submit time (the future submit route
   * sends this to the client so it can run the learner's code against it),
   * but never part of the STATIC public bundle Task 2 compiles — the
   * server issues it per WORKBOOK-SPEC.md §5's IO-case design (owner
   * decision D1). Untyped on purpose: an io-case's input/expected shape is
   * per-ticket authored data, not a platform-wide contract.
   */
  input?: unknown
  /** io-case only. SECRET, period: the server-held comparison value. */
  expected?: unknown
  /**
   * io-case only, OPTIONAL. Names the module + export `lab validate --dynamic`'s CI replay calls
   * with `input` to obtain the value compared against `expected` (PLAN.md Task 7 review round 1,
   * Critical 2). Sealed: it does not reveal the reference implementation, but it does say WHICH
   * export is under test, which is more than a learner is meant to know pre-submit. An io-case
   * with no `entryPoint` cannot be dynamically verified at all -- the dynamic gate reports this as
   * a WARN for `assisted` tickets, an ERROR for `unassisted`/`review-only` ones (a score-feeding
   * ticket cannot ship an unverifiable hidden tier).
   */
  entryPoint?: { module: string; export: string }
  /** probe only. SECRET until submit: client-executed assertion source. */
  body?: string
}

/** One bot review comment. `correct: false` marks the trap. */
export interface SealedReviewComment {
  id: string
  body: string
  correct: boolean
}

/** Author-agent persona material for a review-only ticket (AUTHORING-RULES.md §7). */
export interface SealedAuthorBrief {
  intent: string
  decisions: Array<{ decision: string; justification: string }>
  doNotVolunteer: string[]
  concessionTriggers: string[]
}

/** Per-ticket rubric weights + authoring notes on what each dimension keys off. */
export interface SealedRubric {
  weights: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
    verification: number
  }
  notes: Record<string, string>
}

/** One workspace file, used for the sealed adversary runner's source files. */
export interface SealedFile {
  path: string
  content: string
}

/**
 * One SQL-routed ticket's hidden assertion, SEALED. The sql-routed analog of `SealedHiddenCase`,
 * authored under `tests/hidden/*.yaml` with `kind: sql-assertion` -- the sealed SQL-hidden-test
 * subsystem this type exists to support (see schemas.ts's `sealedSqlHiddenAssertionSchema` for the
 * authoring-side validator, and scripts/compile-workbooks.mjs's SECRET_FIELDS for why `sql`/`expect`
 * must never reach a public emit).
 *
 * NOT folded into `SealedHiddenCase`/`hiddenCases`: that shape's `kind` is `TicketSecretKind`
 * (io-case | probe only, `lib/sprint-labs/types.ts`), and unlike io-case/probe -- whose {id,
 * humanName, tags, kind} DOES ship publicly via `ticketSecretMetaSchema` -- a SQL hidden assertion
 * never joins the public `hiddenTests` metadata array at all (the compiler skips that schema
 * entirely for this kind), so it needs no shared `kind` enum to extend and gets its own array here
 * instead.
 */
export interface SealedSqlHiddenAssertion {
  id: string
  humanName: string
  tags: string[]
  sql: string
  expect: PgSuiteAssertion["expect"]
}

/**
 * The full sealed bundle for one ticket. `review` and `authorBrief` are
 * null when the ticket authored no `review.yaml` / `author_brief.yaml`.
 */
export interface SealedTicketContent {
  workbookId: string
  ticketKey: string
  hiddenCases: SealedHiddenCase[]
  adversaryFiles: SealedFile[]
  review: SealedReviewComment[] | null
  authorBrief: SealedAuthorBrief | null
  referenceDiff: string
  rubric: SealedRubric
  /**
   * SQL-routed hidden assertions (the sealed SQL-hidden-test subsystem). Optional, matching
   * `TicketPublic.playable`'s own precedent: every hand-built `SealedTicketContent` literal
   * predating this field (e.g. lib/sprint-labs/grading's attempts-service test fixtures) must keep
   * parsing without an edit. `scripts/compile-workbooks.mjs`, the only real producer going forward,
   * always sets this explicitly (`[]` when the ticket authors no `tests/hidden/*.yaml` file with
   * `kind: sql-assertion`), so no genuinely compiled content ever leaves it unset.
   */
  sqlHiddenAssertions?: SealedSqlHiddenAssertion[]
}
