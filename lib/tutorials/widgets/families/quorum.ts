/**
 * The `quorum` widget family: N/R/W sliders plus a kill-a-replica button over the
 * pure overlap math in ../quorum-math.ts. Three presets share the engine:
 *  - dynamo: full N/R/W tuning; confronts the R+W>N misconception head-on.
 *  - kafka:  relabeled RF / min.insync.replicas (acks=all); kill brokers and see
 *            whether ACKED writes survive.
 *  - bft:    the 3f+1 overlap story; one N slider, f as the read-out.
 */
import { z } from "zod"

export const quorumSpecSchema = z.object({
  type: z.literal("quorum"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  preset: z.enum(["dynamo", "kafka", "bft"]).default("dynamo"),
  n: z.number().int().min(3).max(7),
  /** Read quorum (dynamo) — ignored by kafka/bft. */
  r: z.number().int().min(1).max(7).optional(),
  /** Write quorum (dynamo) / min.insync.replicas (kafka) — ignored by bft. */
  w: z.number().int().min(1).max(7).optional(),
  caption: z.string().optional(),
})

export type QuorumSpec = z.infer<typeof quorumSpecSchema>

export function addQuorumIssues(spec: QuorumSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.preset !== "bft") {
    if (spec.w === undefined)
      ctx.addIssue({ code: custom, path: ["w"], message: `${spec.preset} preset requires w` })
    else if (spec.w > spec.n)
      ctx.addIssue({ code: custom, path: ["w"], message: "w cannot exceed n" })
  }
  if (spec.preset === "dynamo") {
    if (spec.r === undefined)
      ctx.addIssue({ code: custom, path: ["r"], message: "dynamo preset requires r" })
    else if (spec.r > spec.n)
      ctx.addIssue({ code: custom, path: ["r"], message: "r cannot exceed n" })
  }
}
