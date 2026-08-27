/**
 * Sprint Labs — shared domain types.
 *
 * Sprint Labs is the third practice surface beside Case Labs and Mock
 * Rounds: a learner joins one persistent codebase (a "workbook") and ships
 * tickets across ten sprints, graded on escaped-defect rate as much as on
 * passing tests. Spec: docs/sprint-labs/WORKBOOK-SPEC.md (product, scoring
 * §5, content model §6), docs/sprint-labs/AGENT-CONTEXT.md (the in-workspace
 * partner, directives §3 Layer C), docs/sprint-labs/PLAN.md (the build plan
 * — this file is Task 1, and every later task imports from here).
 *
 * Every shape that crosses a trust boundary (compiled content, a Firestore
 * document, a graded submission) gets a Zod schema plus its inferred type,
 * following this repo's convention (see lib/labs/case-lab-runs.ts).
 *
 * Two strictness tiers, deliberately:
 *  - Types that project grading OUTPUT back to a learner (`GateResultCase`,
 *    `GateResult`, `TicketAttemptScores`, `TicketAttempt`) and
 *    `TicketSecretMeta`, which sits at the same public/secret boundary, are
 *    `.strict()`: an unexpected extra field there is a parse error, not a
 *    silent leak of secret content. This is WORKBOOK-SPEC.md's
 *    spoiler-boundary invariant enforced at the schema layer, not just in
 *    code review.
 *  - Content types (`WorkbookSummary`, `SprintPublic`, `TicketPublic`) stay
 *    lenient on unknown keys. They describe authored content, not a
 *    security boundary, so an unrecognized key is future-compiler
 *    tolerance, not a threat, and is silently stripped rather than
 *    rejected. (`TicketPublic` additionally runs one narrow cross-field
 *    check via `.superRefine`, unrelated to key-strictness — see below.)
 * Array-length and most cross-field business rules (at least one objective,
 * a legal board transition, ...) are deliberately NOT enforced here — that
 * is `lab validate`'s job (PLAN.md Task 3), layered on top of this
 * structural contract. One exception: `TicketPublic.aiPolicyReason` is
 * required when `aiPolicy` is "unassisted", enforced via `.superRefine`,
 * because AUTHORING-RULES.md §6 treats it as a hard content rule (it drives
 * a non-dismissible workspace banner) rather than a catalog-completeness
 * lint.
 *
 * `TicketSecretMeta` is METADATA ONLY (id/humanName/tags/kind). Hidden-test
 * bodies and expected values are never typed here and never ship
 * client-side — they live in the sealed, server-only bundle Task 2 builds.
 */

import { z } from "zod"
import { SUPPORTED_WORKBOOK_LANGUAGES } from "./platform-capabilities"

// ============================================================
// Shared enums
// ============================================================

/**
 * How much AI help a ticket allows. Enforced as capability (which
 * tools/context exist per mode), never as prompt-side instruction —
 * AGENT-CONTEXT.md §6.
 */
export const aiPolicySchema = z.enum(["assisted", "unassisted", "review-only"])
export type AiPolicy = z.infer<typeof aiPolicySchema>

/** A ticket's column on the sprint board. */
export const ticketBoardStatusSchema = z.enum(["todo", "doing", "review", "done"])
export type TicketBoardStatus = z.infer<typeof ticketBoardStatusSchema>

/** A run's overall lifecycle state — mirrors the Case Lab run pattern (`CaseLabRunStatus`). */
export const sprintLabRunStatusSchema = z.enum(["in_progress", "completed", "abandoned"])
export type SprintLabRunStatus = z.infer<typeof sprintLabRunStatusSchema>

/** Which grading tier a `GateResult` reports on. */
export const gateKindSchema = z.enum(["visible", "hidden", "regression", "adversary"])
export type GateKind = z.infer<typeof gateKindSchema>

/**
 * Who produced a transcript message. `"agent"` has no v0 producer (the
 * partner ships chat-only, no edit/bash tools) but is declared now so a
 * later tool-enabled partner needs no schema change
 * (EXECUTION-STATE.md owner decision 4).
 */
export const provenanceSchema = z.enum(["human", "agent"])
export type Provenance = z.infer<typeof provenanceSchema>

/** A hidden test's authoring shape: a server-compared IO case, or a client-run probe. */
export const ticketSecretKindSchema = z.enum(["io-case", "probe"])
export type TicketSecretKind = z.infer<typeof ticketSecretKindSchema>

// ============================================================
// Learning objectives — first-class UX, reused at catalog, standup, ticket,
// and retro (AUTHORING-RULES.md §6)
// ============================================================

export const sprintLabObjectiveSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** The full "I can ___" sentence authored in SPRINT-PLAN.md. */
  canDo: z.string().min(1),
})
export type SprintLabObjective = z.infer<typeof sprintLabObjectiveSchema>

// ============================================================
// Catalog content (public, client-safe — compiled by Task 2)
// ============================================================

/**
 * The architecture-map lists a sprint renders. The specs disagree on the
 * shape: WORKBOOK-SPEC.md §6 authors `archMapDelta.invariants[]`;
 * UX-SPEC.md's `ArchMapDelta` component (§1.7-1.8) renders `{added, changed,
 * broke}`. Ruling R10: hedge rather than pick a side. All four lists are
 * carried, each optional and defaulting to an empty array, so content
 * authored against either spec parses and no later task is blocked on
 * which draft is "right."
 */
export const archMapDeltaSchema = z.object({
  added: z.array(z.string()).default([]),
  changed: z.array(z.string()).default([]),
  broke: z.array(z.string()).default([]),
  invariants: z.array(z.string()).default([]),
})
export type ArchMapDelta = z.infer<typeof archMapDeltaSchema>

/**
 * Aggregate, purely descriptive counts about the day-one seed codebase
 * (PLAN.md Task 16: catalog/standup copy like "59 files, 1,449 non-test
 * lines, 19 starter tests"). Optional and never cross-checked against the
 * actual `repo/` tree by this schema or by `scripts/compile-workbooks.mjs`
 * -- `lib/sprint-labs/__tests__/meridian-seed.test.ts` is what keeps the
 * real seed honest; this is display copy, not a second source of truth.
 */
export const seedStatsSchema = z.object({
  files: z.number().int().positive(),
  nonTestLines: z.number().int().positive(),
  testCases: z.number().int().nonnegative(),
})
export type SeedStats = z.infer<typeof seedStatsSchema>

/** The catalog card for one workbook. */
export const workbookSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** One-line hook for the browse card (mirrors `CaseLab.hook`). */
  pitch: z.string().min(1),
  /** Free-form catalog grouping, e.g. "Systems / Backend" — content-as-data: a new track needs no code change (WORKBOOK-SPEC.md §6). */
  track: z.string().min(1),
  language: z.enum(SUPPORTED_WORKBOOK_LANGUAGES),
  /** Free-form seniority/difficulty label, e.g. "Senior / Staff" (LAB-01-sbx.md). */
  level: z.string().min(1),
  topics: z.array(z.string().min(1)),
  sprintCount: z.number().int().positive(),
  ticketCount: z.number().int().positive(),
  estimatedHours: z.number().positive(),
  /**
   * True when the workbook needs the not-yet-built server sandbox
   * regardless of `language` (real Postgres RLS, queues, Docker, ...).
   * Independent of the language check in `workbookIsRunnable`.
   */
  requiresServerExecution: z.boolean(),
  objectives: z.array(sprintLabObjectiveSchema),
  /** Optional catalog/standup copy about the seed repo's size (PLAN.md Task 16). */
  seedStats: seedStatsSchema.optional(),
  /**
   * Short, learner-safe phrasings of problems the seed already carries, e.g.
   * "money handled as floating point" or "tenant scoping written by hand in
   * each query" -- never a file path or a diagnosis of exactly where
   * (AUTHORING-RULES.md; that specificity is each sprint's own reveal).
   * Optional and purely descriptive, same as `seedStats`.
   */
  inheritedDefects: z.array(z.string()).optional(),
})
export type WorkbookSummary = z.infer<typeof workbookSummarySchema>

/** One sprint's public content, compiled from `sprint.yaml`. */
export const sprintPublicSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  goal: z.string().min(1),
  /** The in-fiction Slack-style message that opens the sprint. */
  standupQuote: z.string().min(1),
  archMapDelta: archMapDeltaSchema,
  objectives: z.array(sprintLabObjectiveSchema),
  /** Author's note on why a ticket was sized the way it was (AUTHORING-RULES.md). */
  sizingNotes: z.string().optional(),
  /**
   * Free-form catalog grouping for this sprint alone, e.g. "Databases,
   * transactions & RLS" (PLAN.md Task 16, SPRINT-PLAN.md's per-sprint
   * "Topic:" line) -- narrower than the workbook-level `topics[]`.
   */
  topic: z.string().min(1).optional(),
  /**
   * Derived, not authored: `scripts/compile-workbooks.mjs` computes both
   * from this sprint's own compiled tickets (count, and the sum of
   * `points`) at compile time, so a stub sprint.yaml never states them and
   * they can never drift from the tickets that actually exist under it.
   */
  ticketCount: z.number().int().positive().optional(),
  points: z.number().int().positive().optional(),
})
export type SprintPublic = z.infer<typeof sprintPublicSchema>

/**
 * One ticket's public content, compiled from `ticket.md`. Never lists which
 * files to touch. `aiPolicyReason` is required when `aiPolicy` is
 * "unassisted" (AUTHORING-RULES.md §6: it renders as a non-dismissible
 * workspace banner, so a ticket that can't show one is a content bug, not
 * just a lint) — enforced below via `.superRefine`.
 */
export const ticketPublicSchema = z
  .object({
    key: z.string().min(1),
    title: z.string().min(1),
    points: z.number().int().positive(),
    labels: z.array(z.string()),
    aiPolicy: aiPolicySchema,
    /** Required when `aiPolicy` is "unassisted"; enforced below. Written in-fiction. */
    aiPolicyReason: z.string().optional(),
    objectives: z.array(sprintLabObjectiveSchema),
    bodyMd: z.string().min(1),
    acceptanceCriteria: z.array(z.string()),
    /** Whether a hostile `adversary/` runner exists for this ticket. */
    adversaryPresent: z.boolean(),
    /** The later ticket key this ticket's work pays off, if any. */
    payoffFor: z.string().optional(),
  })
  .superRefine((ticket, ctx) => {
    if (ticket.aiPolicy === "unassisted" && !ticket.aiPolicyReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aiPolicyReason"],
        message: 'aiPolicyReason is required when aiPolicy is "unassisted".',
      })
    }
  })
export type TicketPublic = z.infer<typeof ticketPublicSchema>

/**
 * Hidden-test METADATA only: id, display name, tags, and which authoring
 * shape it is. Bodies and expected values are never here and never ship
 * client-side (WORKBOOK-SPEC.md §6, the spoiler-boundary invariant).
 * `.strict()`: an extra field here (a stray `expected` or `body`) is
 * exactly the mistake that invariant exists to catch, so it fails the parse
 * instead of shipping silently.
 */
export const ticketSecretMetaSchema = z
  .object({
    id: z.string().min(1),
    humanName: z.string().min(1),
    tags: z.array(z.string()),
    kind: ticketSecretKindSchema,
  })
  .strict()
export type TicketSecretMeta = z.infer<typeof ticketSecretMetaSchema>

// ============================================================
// Run & persistence shapes (Firestore contracts — collection `sprintLabRuns`)
// ============================================================

/**
 * One user's attempt at one workbook. Collection: `sprintLabRuns`.
 *
 * Field list matches the stored-document convention this repo already uses
 * (`lib/labs/case-lab-runs.ts`'s `storedCaseLabRunSchema`): the Firestore
 * document id is not part of the body, so it is not a field here — the
 * persistence service (PLAN.md Task 6) attaches it when it composes the
 * value returned to callers, the same way `parseStoredRun` does for
 * Case Labs.
 */
export const sprintLabRunSchema = z.object({
  userId: z.string().min(1),
  workbookId: z.string().min(1),
  /** Which compiled content version this run started against. */
  contentVersion: z.string().min(1),
  currentSprint: z.number().int().positive(),
  currentTicketKey: z.string().optional(),
  board: z.record(z.string(), ticketBoardStatusSchema),
  status: sprintLabRunStatusSchema,
  /** ISO timestamps, server-owned. */
  startedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  completedAt: z.string().optional(),
})
export type SprintLabRun = z.infer<typeof sprintLabRunSchema>

/** Per-file Firestore content cap. Matches `MAX_WORKSPACE_FILE_BYTES` in lib/workspace-execution/files.ts. */
export const MAX_WORKSPACE_FILE_CONTENT_CHARS = 100_000

/** One file in a run's workspace. Subcollection: `sprintLabRuns/{runId}/files`. */
export const workspaceFileDocSchema = z.object({
  path: z.string().min(1),
  content: z.string().max(MAX_WORKSPACE_FILE_CONTENT_CHARS),
  /** ISO timestamp, server-stamped. */
  updatedAt: z.string().min(1),
  revision: z.number().int().nonnegative(),
})
export type WorkspaceFileDoc = z.infer<typeof workspaceFileDocSchema>

// ============================================================
// Grading (server-side comparison; WORKBOOK-SPEC.md §5)
// ============================================================

/**
 * One hidden test's projected verdict. `.strict()` per the platform rule:
 * a grading-output projection carrying an unexpected extra field (raw
 * stdout, a stack trace) is a parse error, not a value that quietly reaches
 * the learner (AGENT-CONTEXT.md §4, the spoiler-boundary invariant).
 */
export const gateResultCaseSchema = z
  .object({
    testId: z.string().min(1),
    humanName: z.string().min(1),
    passed: z.boolean(),
  })
  .strict()
export type GateResultCase = z.infer<typeof gateResultCaseSchema>

/** One grading tier's result for a submission. `.strict()`, same reasoning as `GateResultCase`. */
export const gateResultSchema = z
  .object({
    gate: gateKindSchema,
    cases: z.array(gateResultCaseSchema),
  })
  .strict()
export type GateResult = z.infer<typeof gateResultSchema>

/**
 * The five rubric dimensions, 0-100 (names and scale per WORKBOOK-SPEC.md
 * §5). `communication` is nullable: present only when a ticket collects
 * prose, else null and the remaining four dimensions are renormalized —
 * that specific rule is docs/sprint-labs/PLAN.md's Task 8 scoring section,
 * not WORKBOOK-SPEC.md §5 itself. `.strict()` for the same leak reason as
 * `GateResult`.
 */
export const ticketAttemptScoresSchema = z
  .object({
    understanding: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    codeQuality: z.number().min(0).max(100),
    communication: z.number().min(0).max(100).nullable(),
    verification: z.number().min(0).max(100),
    overall: z.number().min(0).max(100),
  })
  .strict()
export type TicketAttemptScores = z.infer<typeof ticketAttemptScoresSchema>

/**
 * One submission attempt. Subcollection: `sprintLabRuns/{runId}/attempts`.
 * Finalizes at first submission (WORKBOOK-SPEC.md §5 rule 2); `escapedDefects`
 * and the reference diff release only after that. `.strict()`: this
 * projects grading output to the learner, so a stray field (a
 * `referenceDiff` attached before finalization, say) is a parse error, not
 * a silent leak — same reasoning as `GateResult`.
 */
export const ticketAttemptSchema = z
  .object({
    ticketKey: z.string().min(1),
    aiPolicy: aiPolicySchema,
    /** The hidden-suite variant issued for this attempt; rotates on re-attempt. */
    variantId: z.string().min(1),
    finalized: z.boolean(),
    gateResults: z.array(gateResultSchema),
    /** Curated humanNames of hidden/adversary cases this attempt failed. */
    escapedDefects: z.array(z.string()),
    scores: ticketAttemptScoresSchema,
    /** Recorded per WORKBOOK-SPEC.md §5 rule 4: a score is dated to a model. */
    modelId: z.string().optional(),
    /** ISO timestamp. */
    submittedAt: z.string().min(1),
  })
  .strict()
export type TicketAttempt = z.infer<typeof ticketAttemptSchema>

// ============================================================
// Transcript (Sable partner) — additive onto lib/feedback/transcript-storage.ts's
// bounded shape (INTEGRATION.md §4)
// ============================================================

/**
 * One transcript message: the existing bounded `TranscriptMessage` shape
 * (role/content) plus three optional fields the Sable partner needs.
 *
 * Locked as of this file: PLAN.md's Task 14 (the partner) has no
 * touch-with-care on lib/sprint-labs/types.ts and builds against this shape
 * as final.
 */
export const sprintLabTranscriptMessageSchema = z.object({
  role: z.string().min(1),
  content: z.string(),
  aiPolicy: aiPolicySchema.optional(),
  provenance: provenanceSchema.optional(),
  /** Which tools/context this turn had access to, e.g. `["chat"]` in v0. */
  capabilities: z.array(z.string()).optional(),
})
export type SprintLabTranscriptMessage = z.infer<typeof sprintLabTranscriptMessageSchema>

/** The bounded transcript doc shape — mirrors `StoredTranscript`'s truncation bookkeeping. */
export const sprintLabTranscriptSchema = z.object({
  messages: z.array(sprintLabTranscriptMessageSchema),
  truncated: z.boolean(),
  originalCount: z.number().int().nonnegative(),
})
export type SprintLabTranscript = z.infer<typeof sprintLabTranscriptSchema>

// ============================================================
// Directives (AGENT-CONTEXT.md §3 Layer C)
// ============================================================

/**
 * One learner-directive event: behaviour, not history (AGENT-CONTEXT.md
 * §3). Event-shaped and append-only by design — never a mutable trait
 * summary, because traits are unfalsifiable and permanent in a system whose
 * headline metric is supposed to go down.
 *
 * `filterDirectives(entries, currentHiddenTopicTags)` (PLAN.md Task 8)
 * drops, never paraphrases, any entry whose `tags` collide with the current
 * ticket's hidden-test tags.
 */
export const directiveEntrySchema = z.object({
  id: z.string().min(1),
  /** The behaviour instruction itself, e.g. "narrate the invariant before editing...". */
  instruction: z.string().min(1),
  tags: z.array(z.string()),
  createdSprint: z.number().int().positive(),
  expiresAfterSprint: z.number().int().positive(),
})
export type DirectiveEntry = z.infer<typeof directiveEntrySchema>
