/**
 * The `sequence` widget family — the temporal-mechanism workhorse (DNS walks,
 * handshakes, idempotency, dual-write races, sagas, coordinator crashes, OAuth).
 *
 * A spec declares ACTORS (2-6 lanes), STEPS (2-30 arrows/notes with status and an
 * optional shared-state map), and up to 3 failure TOGGLES. A step's `when` field
 * gates it on a toggle ("drop" = only while the toggle is ON, "!drop" = only while
 * OFF), which is how one spec carries both the happy path and the failure path.
 * The learner steps Prev/Next (never autoplay); flipping a toggle rebuilds the
 * timeline and restarts it; an optional predict-next-step prompt makes the learner
 * commit before a pivotal step reveals.
 *
 * Pure z.object member; cross-field rules in addSequenceIssues via the union
 * wrapper. activeSteps() is the one shared filter so the renderer and tests can
 * never disagree about which steps a toggle state shows.
 */
import { z } from "zod"

const ID = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

const actorSchema = z.object({
  id: z.string().regex(ID),
  label: z.string().min(1),
})

const toggleSchema = z.object({
  id: z.string().regex(ID),
  label: z.string().min(1),
  /** One line under the chip, e.g. "the response never arrives". */
  description: z.string().optional(),
})

const predictSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(4),
})

const stepSchema = z.object({
  from: z.string().min(1),
  /** Required for request/response/event; omitted for a single-actor timer/note. */
  to: z.string().optional(),
  label: z.string().min(1),
  kind: z.enum(["request", "response", "event", "timer", "note"]).default("event"),
  status: z.enum(["ok", "lost", "late", "error"]).default("ok"),
  /** Toggle gate: "dropResponse" (only while ON) or "!dropResponse" (only while OFF). */
  when: z.string().optional(),
  /** Shared-variable row AFTER this step (renders race interleavings). */
  state: z.record(z.string(), z.string()).optional(),
  /** Commit-before-reveal: shown when the learner tries to advance INTO this step. */
  predict: predictSchema.optional(),
})

export const sequenceSpecSchema = z.object({
  type: z.literal("sequence"),
  title: z.string().min(1),
  actors: z.array(actorSchema).min(2).max(6),
  toggles: z.array(toggleSchema).max(3).optional(),
  steps: z.array(stepSchema).min(2).max(30),
  caption: z.string().optional(),
})

export type SequenceSpec = z.infer<typeof sequenceSpecSchema>
export type SequenceStep = SequenceSpec["steps"][number]

/** The steps visible under a toggle assignment — the single source of truth. */
export function activeSteps(spec: SequenceSpec, on: ReadonlySet<string>): SequenceStep[] {
  return spec.steps.filter((step) => {
    if (!step.when) return true
    return step.when.startsWith("!") ? !on.has(step.when.slice(1)) : on.has(step.when)
  })
}

export function addSequenceIssues(spec: SequenceSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  const actorIds = new Set(spec.actors.map((a) => a.id))
  if (actorIds.size !== spec.actors.length)
    ctx.addIssue({ code: custom, path: ["actors"], message: "actor ids must be unique" })
  const toggleIds = new Set((spec.toggles ?? []).map((t) => t.id))
  if (toggleIds.size !== (spec.toggles ?? []).length)
    ctx.addIssue({ code: custom, path: ["toggles"], message: "toggle ids must be unique" })

  spec.steps.forEach((step, i) => {
    if (!actorIds.has(step.from))
      ctx.addIssue({
        code: custom,
        path: ["steps", i, "from"],
        message: `unknown actor "${step.from}"`,
      })
    if (step.to !== undefined && !actorIds.has(step.to))
      ctx.addIssue({
        code: custom,
        path: ["steps", i, "to"],
        message: `unknown actor "${step.to}"`,
      })
    if (step.to === undefined && !["timer", "note"].includes(step.kind))
      ctx.addIssue({
        code: custom,
        path: ["steps", i, "to"],
        message: `${step.kind} steps need a "to" actor (only timer/note may be single-actor)`,
      })
    if (step.when) {
      const ref = step.when.startsWith("!") ? step.when.slice(1) : step.when
      if (!toggleIds.has(ref))
        ctx.addIssue({
          code: custom,
          path: ["steps", i, "when"],
          message: `unknown toggle "${ref}"`,
        })
    }
  })

  // The default view (all toggles off) must have a playable timeline.
  const defaultVisible = activeSteps(spec, new Set())
  if (defaultVisible.length < 2)
    ctx.addIssue({
      code: custom,
      path: ["steps"],
      message: "with all toggles off, fewer than 2 steps are visible",
    })
}
