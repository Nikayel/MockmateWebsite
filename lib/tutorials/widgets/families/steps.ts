/**
 * The `steps` widget family — the long-tail frame stager. Where `sequence` renders
 * actors exchanging messages over time, `steps` renders SNAPSHOTS: each frame is a
 * static arrangement of labeled rows of cells plus a one-or-two-sentence note, and
 * the learner walks Prev/Next through the frames (log compaction collapsing keys,
 * a cursor page walk, blue/green pools flipping, a column scan touching bytes).
 *
 * Frames are fully authored DATA — no math module, no seeded simulation — which is
 * what lets one component serve a dozen unrelated topics without per-slug code. An
 * optional predict gate on a frame makes the learner commit before that frame
 * reveals (the reveal IS the answer); cell states carry the visual story.
 *
 * Pure z.object member; cross-field rules in addStepsIssues via the union wrapper.
 */
import { z } from "zod"

const cellSchema = z.object({
  text: z.string().min(1).max(40),
  /**
   * Visual role in this frame's story: `active` = where the action is,
   * `new` = just appeared, `dropped` = removed/discarded (struck through),
   * `dim` = de-emphasized background context.
   */
  state: z.enum(["normal", "active", "new", "dropped", "dim"]).default("normal"),
})

const rowSchema = z.object({
  /** Optional left-hand row label, e.g. "segment 2", "bids", "L4 transport". */
  label: z.string().max(28).optional(),
  cells: z.array(cellSchema).min(1).max(12),
})

const predictSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
})

const frameSchema = z.object({
  /** The narration for this snapshot — one or two sentences, announced politely. */
  note: z.string().min(1).max(360),
  rows: z.array(rowSchema).min(1).max(8),
  /** Commit-before-reveal: shown when the learner advances INTO this frame. */
  predict: predictSchema.optional(),
})

export const stepsSpecSchema = z.object({
  type: z.literal("steps"),
  title: z.string().min(1),
  frames: z.array(frameSchema).min(2).max(10),
  caption: z.string().optional(),
})

export type StepsSpec = z.infer<typeof stepsSpecSchema>
export type StepsFrame = StepsSpec["frames"][number]

export function addStepsIssues(spec: StepsSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom

  const predictCount = spec.frames.filter((f) => f.predict).length
  if (predictCount > 2)
    ctx.addIssue({
      code: custom,
      path: ["frames"],
      message: `at most 2 predict gates per widget, got ${predictCount}`,
    })
  if (spec.frames[0]?.predict)
    ctx.addIssue({
      code: custom,
      path: ["frames", 0, "predict"],
      message: "the first frame renders immediately; a predict gate there never shows",
    })

  spec.frames.forEach((frame, i) => {
    const cells = frame.rows.reduce((n, row) => n + row.cells.length, 0)
    if (cells > 48)
      ctx.addIssue({
        code: custom,
        path: ["frames", i, "rows"],
        message: `frame has ${cells} cells; cap is 48 (cognitive load)`,
      })
  })
}
