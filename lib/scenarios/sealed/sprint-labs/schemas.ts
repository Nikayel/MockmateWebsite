/**
 * Zod schemas for the sealed-content shapes Task 1 doesn't cover (review
 * comments, author briefs, rubric weights, hidden-test payload halves).
 * `lib/sprint-labs/types.ts` validates the PUBLIC/metadata side of a
 * workbook; these validate the SECRET side, which Task 1 deliberately never
 * types (a hidden test's `expected`/`body` "are never typed here and never
 * ship client-side" — lib/sprint-labs/types.ts's file header).
 *
 * Review-round fix (controller review round 1, finding I-1): before this
 * file existed, `scripts/compile-workbooks.mjs` read rubric.yaml/
 * author_brief.yaml/review.yaml with no schema at all, and
 * `reviewRaw.comments ?? []` turned an authoring mistake (review.yaml
 * authored as a bare top-level list instead of `{comments: [...]}`) into a
 * SILENT empty review round — the trap comment just vanished, no error.
 * `authoredReviewSchema` requires the `{comments: [...]}` wrapper and at
 * least one comment, so that mistake is now a loud CompileError instead.
 *
 * Placed beside lib/scenarios/sealed/sprint-labs/types.ts (co-located,
 * TS-interfaces + their runtime Zod counterparts) rather than folded into
 * types.ts itself, so the two files can be skimmed separately: types.ts is
 * "what does a sealed value look like", this file is "how do we know an
 * authored one is well-formed".
 */

import { z } from "zod"

// ============================================================
// review.yaml — M-3: comments require an author-supplied, stable `id`
// (a positional `comment-${i}` id breaks the server-release keying a
// future release endpoint needs: re-ordering comments in review.yaml must
// not silently change which id a previously-released verdict points at).
// ============================================================

export const authoredReviewCommentSchema = z.object({
  id: z.string().min(1, "every review.yaml comment needs its own stable id"),
  body: z.string().min(1),
  correct: z.boolean(),
})
export type AuthoredReviewComment = z.infer<typeof authoredReviewCommentSchema>

/**
 * `.strict()` plus `comments` as the ONLY key: a review.yaml authored as a
 * bare top-level array (no `comments:` wrapper) fails this schema's object
 * check outright, and `comments: []` fails `.min(1)` — both loud, neither
 * silent. `.min(1)` also enforces "a review round with a trap in it": at
 * least one comment must exist for the round to mean anything.
 */
export const authoredReviewSchema = z
  .object({
    comments: z
      .array(authoredReviewCommentSchema)
      .min(1, "review.yaml must author at least one comment"),
  })
  .strict()
export type AuthoredReview = z.infer<typeof authoredReviewSchema>

// ============================================================
// author_brief.yaml
// ============================================================

export const sealedAuthorBriefDecisionSchema = z.object({
  decision: z.string().min(1),
  justification: z.string().min(1),
})

export const sealedAuthorBriefSchema = z.object({
  intent: z.string().min(1),
  decisions: z
    .array(sealedAuthorBriefDecisionSchema)
    .min(1, "author_brief.yaml needs at least one decision"),
  doNotVolunteer: z.array(z.string()),
  concessionTriggers: z.array(z.string()),
})
export type SealedAuthorBriefParsed = z.infer<typeof sealedAuthorBriefSchema>

// ============================================================
// rubric.yaml
// ============================================================

const rubricWeightSchema = z.number().min(0).max(1)

export const sealedRubricSchema = z.object({
  weights: z.object({
    understanding: rubricWeightSchema,
    problemSolving: rubricWeightSchema,
    codeQuality: rubricWeightSchema,
    communication: rubricWeightSchema,
    verification: rubricWeightSchema,
  }),
  notes: z.record(z.string(), z.string()),
})
export type SealedRubricParsed = z.infer<typeof sealedRubricSchema>

// ============================================================
// Hidden-test payload halves. Metadata ({id, humanName, tags, kind}) is
// validated by Task 1's `ticketSecretMetaSchema`; these validate the part
// that never ships publicly. Split by kind rather than one discriminated
// union so a caller that already knows `raw.kind` (the compiler does,
// mid-loop) can pick the right schema directly.
// ============================================================

const definedValue = z.unknown().refine((v) => v !== undefined, { message: "value is required" })

export const sealedIoCasePayloadSchema = z.object({
  input: definedValue,
  expected: definedValue,
})
export type SealedIoCasePayload = z.infer<typeof sealedIoCasePayloadSchema>

export const sealedProbePayloadSchema = z.object({
  body: z.string().min(1, "a probe's body must be non-empty runnable assertion source"),
})
export type SealedProbePayload = z.infer<typeof sealedProbePayloadSchema>
