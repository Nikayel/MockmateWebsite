/**
 * The `check` widget family — inline predict-then-reveal retrieval practice.
 *
 * Two kinds share one fence type:
 *  - `predict`: an MCQ with 2-5 options, EXACTLY one marked correct, and a mandatory
 *    per-option feedback line that names why that option is right or tempting-but-wrong.
 *  - `classify`: 2-3 named buckets and 2-8 items the learner sorts into them; feedback
 *    per item is optional (wrong items fall back to naming the right bucket).
 *
 * Checks are zero-stakes and ungated: the learner commits an answer, gets immediate
 * explanatory feedback, and can retry freely. Placement rules (misconception checks
 * BEFORE the resolving paragraph, one cumulative check at teach end) live in
 * docs/system-design-curriculum/INTERACTIVITY-PLAN.md, not in the schema.
 *
 * Like the diagram schemas, this member MUST stay a pure z.object — cross-field rules
 * (kind/field pairing, exactly-one-correct, bucket references) live in the union
 * wrapper's superRefine in ../schema.ts, because z.discriminatedUnion rejects
 * ZodEffects members at module load.
 */
import { z } from "zod"

const predictOptionSchema = z.object({
  label: z.string().min(1),
  /** Exactly one option per predict check carries `correct: true` (wrapper-enforced). */
  correct: z.boolean().optional(),
  /** Mandatory: why this option is right, or why it is tempting but wrong. */
  feedback: z.string().min(1),
})

const classifyItemSchema = z.object({
  label: z.string().min(1),
  /** The bucket this item belongs in — must be one of the spec's `buckets` (wrapper-enforced). */
  bucket: z.string().min(1),
  /** Optional per-item explanation; wrong answers fall back to naming the right bucket. */
  feedback: z.string().optional(),
})

export const checkSpecSchema = z.object({
  type: z.literal("check"),
  kind: z.enum(["predict", "classify"]),
  /** The question. For misconception checks, phrase it so a plausible wrong answer exists. */
  prompt: z.string().min(1),
  /** predict only. */
  options: z.array(predictOptionSchema).min(2).max(5).optional(),
  /** classify only. Bucket names must be unique. */
  buckets: z.array(z.string().min(1)).min(2).max(3).optional(),
  /** classify only. */
  items: z.array(classifyItemSchema).min(2).max(8).optional(),
  /** Optional wrap-up shown once the check is answered correctly (cumulative checks use this). */
  reveal: z.string().optional(),
})

export type CheckSpec = z.infer<typeof checkSpecSchema>

/**
 * Cross-field integrity for a parsed check spec — called from the union wrapper's
 * superRefine so malformed authored content fails at parse time with a readable path,
 * never inside a renderer.
 */
export function addCheckIssues(spec: CheckSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.kind === "predict") {
    if (!spec.options) {
      ctx.addIssue({ code: custom, path: ["options"], message: "predict checks require options" })
    } else {
      const correct = spec.options.filter((o) => o.correct === true).length
      if (correct !== 1)
        ctx.addIssue({
          code: custom,
          path: ["options"],
          message: `predict checks need exactly one correct option, found ${correct}`,
        })
    }
    if (spec.buckets || spec.items)
      ctx.addIssue({
        code: custom,
        path: ["kind"],
        message: "predict checks must not define buckets or items",
      })
  }
  if (spec.kind === "classify") {
    if (!spec.buckets || !spec.items) {
      ctx.addIssue({
        code: custom,
        path: ["kind"],
        message: "classify checks require both buckets and items",
      })
    } else {
      if (new Set(spec.buckets).size !== spec.buckets.length)
        ctx.addIssue({ code: custom, path: ["buckets"], message: "bucket names must be unique" })
      spec.items.forEach((item, i) => {
        if (!spec.buckets!.includes(item.bucket))
          ctx.addIssue({
            code: custom,
            path: ["items", i, "bucket"],
            message: `item "${item.label}" targets bucket "${item.bucket}" which is not in buckets`,
          })
      })
    }
    if (spec.options)
      ctx.addIssue({
        code: custom,
        path: ["kind"],
        message: "classify checks must not define options",
      })
  }
}
