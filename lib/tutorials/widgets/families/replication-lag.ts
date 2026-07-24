/**
 * The `replication-lag` widget family (../replication-math.ts owns the numbers):
 * leader/follower lag made visible, the write-burst spike, and the vanishing-comment
 * read-your-writes scenario with its two cures.
 */
import { z } from "zod"

export const replicationLagSpecSchema = z.object({
  type: z.literal("replication-lag"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  followers: z.number().int().min(2).max(3),
  writeRate: z.number().positive().max(6),
  /** Follower apply cap; follower i applies max(1, applyRate - i) per tick. */
  applyRate: z.number().positive().max(8),
  ticks: z.number().int().min(60).max(300),
  burst: z.object({
    from: z.number().int().min(0),
    to: z.number().int().min(1),
    multiplier: z.number().min(2).max(8),
  }),
  /** The vanishing-comment scenario: write then read from a lagging follower. */
  scenario: z.object({
    writeTick: z.number().int().min(1),
    readTick: z.number().int().min(2),
    follower: z.number().int().min(0).max(2),
  }),
  caption: z.string().optional(),
})

export type ReplicationLagSpec = z.infer<typeof replicationLagSpecSchema>

export function addReplicationLagIssues(spec: ReplicationLagSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.burst.to <= spec.burst.from)
    ctx.addIssue({ code: custom, path: ["burst"], message: "burst.to must exceed burst.from" })
  if (spec.burst.to > spec.ticks)
    ctx.addIssue({ code: custom, path: ["burst"], message: "burst must end within ticks" })
  if (spec.scenario.readTick <= spec.scenario.writeTick)
    ctx.addIssue({
      code: custom,
      path: ["scenario"],
      message: "the read must happen after the write",
    })
  if (spec.scenario.readTick >= spec.ticks)
    ctx.addIssue({ code: custom, path: ["scenario"], message: "readTick must be within ticks" })
  if (spec.scenario.follower >= spec.followers)
    ctx.addIssue({
      code: custom,
      path: ["scenario", "follower"],
      message: "scenario follower index out of range",
    })
}
