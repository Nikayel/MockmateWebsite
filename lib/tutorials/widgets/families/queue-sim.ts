/**
 * The `queue-sim` widget family: producer/consumer rate mismatch made visible
 * (../queue-math.ts owns the numbers). The story arc: unbounded depth runs away,
 * a bounded queue sheds or backpressures instead, and scale-on-backlog (the
 * KEDA-style leading signal) is the mode that actually catches up.
 */
import { z } from "zod"

export const queueSimSpecSchema = z.object({
  type: z.literal("queue-sim"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  producerRate: z.number().positive().max(10),
  consumerRate: z.number().positive().max(10),
  ticks: z.number().int().min(60).max(400),
  /** Bounded capacity used when the learner flips off unbounded mode. */
  capacity: z.number().int().min(10).max(200),
  /** Optional producer surge staged mid-run. */
  burst: z
    .object({
      from: z.number().int().min(0),
      to: z.number().int().min(1),
      multiplier: z.number().min(2).max(10),
    })
    .optional(),
  /** Scale-on-backlog mode parameters (the toggle appears when present). */
  scaleOnBacklog: z
    .object({
      threshold: z.number().int().min(5).max(150),
      maxConsumers: z.number().int().min(2).max(8),
    })
    .optional(),
  caption: z.string().optional(),
})

export type QueueSimSpec = z.infer<typeof queueSimSpecSchema>

export function addQueueSimIssues(spec: QueueSimSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.burst && spec.burst.to <= spec.burst.from)
    ctx.addIssue({ code: custom, path: ["burst"], message: "burst.to must exceed burst.from" })
  if (spec.burst && spec.burst.to > spec.ticks)
    ctx.addIssue({ code: custom, path: ["burst"], message: "burst must end within ticks" })
}
