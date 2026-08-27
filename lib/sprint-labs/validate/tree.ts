/**
 * The parsed AUTHORED tree for one Sprint Labs workbook (`workbooks/<id>/`),
 * per docs/sprint-labs/WORKBOOK-SPEC.md §6. This is the "tree-snapshot" every
 * validate rule (`lib/sprint-labs/validate/rules/*`) takes as its sole
 * input — rules never touch the filesystem themselves;
 * `lib/sprint-labs/validate/load-tree.ts` is the one I/O boundary that
 * builds this shape.
 *
 * Deliberately NOT the same as `lib/sprint-labs/types.ts`'s zod-validated
 * `TicketPublic`/`SprintPublic`: those describe already-compiled, trusted
 * public-bundle content (PLAN.md Task 2). This module describes the RAW
 * authored source before it is known to be valid at all — that is exactly
 * what `lab validate` checks — so fields are read defensively (optional,
 * `unknown`-narrowed) rather than assumed well-formed.
 *
 * Field casing follows ruling R17 (supersedes the earlier R14-only framing):
 * each key follows THE SPEC'S OWN SPELLING, not a blanket "everything is
 * snake_case." `ai_policy`, `ai_policy_reason`, `concession_triggers` are
 * snake_case (WORKBOOK-SPEC.md §6); every other authored key here
 * (`acceptanceCriteria`, `payoffFor`, `payoffSignoff`, `standupQuote`,
 * `filesTouched`, `newSourceFiles`, `rewrittenFiles`, `humanName`,
 * `pathEnumerationSignoff`, `dupHunkSignoff`, ...) is camelCase.
 * `rules/snake-case-authoring-keys.ts` is the defense-in-depth check, and
 * it is BIDIRECTIONAL: it rejects the camelCase guess for the snake_case
 * trio (`aiPolicy`, `aiPolicyReason`, `concessionTriggers`) just as it
 * rejects the snake_case guess for the camelCase file-set fields
 * (`files_touched`, `new_source_files`, `rewritten_files`) -- scripts/
 * compile-workbooks.mjs's own `rejectWrongCasing` independently confirms
 * the same per-key table (see its file header) for the fields it compiles.
 *
 * `filesTouched`/`newSourceFiles`/`rewrittenFiles` are modeled here as
 * `sprint.yaml` fields: AUTHORING-RULES.md and SPRINT-PLAN.md both talk
 * about them as "a sprint's" sets ("regenerate `newSourceFiles` mechanically
 * as the set difference between each sprint's `filesTouched` and ..."), and
 * scripts/compile-workbooks.mjs never reads them at all (they're pure
 * authoring-time bookkeeping the compiler doesn't need) — so there is no
 * sibling implementation to confirm the exact location against. This is a
 * documented assumption, not a spec quote; flagged in task-3-report.md for
 * whoever authors sprint.yaml content (PLAN.md Task 16) to confirm or correct.
 */

export interface RawRecord {
  [key: string]: unknown
}

/** One entry from workbook.yaml's controlled objectives vocabulary. */
export interface AuthoredObjective {
  id: string
  label?: string
  canDo?: string
}

/** One file under a ticket's `tests/hidden/`. */
export interface AuthoredHiddenTest {
  /** Filename stem, e.g. "rejects-boolean-amount" for rejects-boolean-amount.yaml. */
  fileName: string
  path: string
  raw: RawRecord
  humanName?: string
  kind?: string
  tags: string[]
}

export interface AuthoredTicket {
  /** Directory name under tickets/, e.g. "MER-401". */
  key: string
  dirPath: string
  sprintNumber: number
  /** Raw, pre-narrowing ticket.md frontmatter — needed to catch a wrong-case key. */
  frontmatterRaw: RawRecord
  bodyMd: string
  title?: string
  points?: number
  labels: string[]
  aiPolicy?: string
  aiPolicyReason?: string
  objectives: string[]
  acceptanceCriteria: string[]
  payoffFor?: string
  payoffSignoff?: boolean
  /**
   * Escape hatch for `no-file-path-enumeration`: a reviewer-signed-off flag
   * on a ticket whose body legitimately names several src/ paths. Not named
   * in any spec doc — introduced by this task to satisfy AUTHORING-RULES.md
   * /PLAN.md's "escape-hatch frontmatter flag ... requiring reviewer
   * signoff"; flagged in task-3-report.md.
   */
  pathEnumerationSignoff?: boolean
  /**
   * Escape hatch for `no-duplicated-hunk-from-unshipped-reference` (review
   * round 2, item 1(b)): a reviewer-signed-off flag on a ticket whose
   * setup.diff legitimately reuses a later sprint's hunk on purpose. Same
   * style as `pathEnumerationSignoff` -- not spec-named, introduced here,
   * documented in AUTHORING-RULES.md §1.
   */
  dupHunkSignoff?: boolean
  setupDiff: string | null
  referenceDiff: string | null
  authorBriefRaw: RawRecord | null
  hiddenTests: AuthoredHiddenTest[]
}

export interface AuthoredSprint {
  /** Directory name under sprints/, e.g. "01-foundations". */
  dirName: string
  dirPath: string
  /** Authoritative sprint number, from sprint.yaml's own `number` field. */
  number: number
  raw: RawRecord
  goal?: string
  standupQuote?: string
  objectives: string[]
  filesTouched: string[]
  newSourceFiles: string[]
  rewrittenFiles: string[]
  tickets: AuthoredTicket[]
}

export interface AuthoredWorkbook {
  id: string
  /** Absolute path to workbooks/<id>. */
  dir: string
  raw: RawRecord
  objectivesVocabulary: AuthoredObjective[]
  /** Every file path under repo/ (the seed codebase), relative, POSIX-separated. */
  seedFiles: Set<string>
  meridianMd: string | null
  /** Ascending by sprint number. */
  sprints: AuthoredSprint[]
}
