/**
 * The `partition-sim` widget family — the anchor of L5 theory (../partition-math.ts
 * owns every outcome). Exactly two replicas plus clients: the learner partitions the
 * network, fires the scripted writes themselves (generation effect), picks CP or AP,
 * heals, and reads the baked merge: LWW naming the write it silently dropped,
 * version vectors surfacing siblings, CRDTs losing nothing.
 */
import { z } from "zod"

const writeSchema = z.object({
  side: z.enum(["A", "B"]),
  /** register: value to set; counter: amount to add; set: element to add. */
  value: z.string().min(1),
  label: z.string().min(1),
})

export const partitionSimSpecSchema = z.object({
  type: z.literal("partition-sim"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  kind: z.enum(["register", "counter", "set"]),
  writes: z.array(writeSchema).min(2).max(6),
  /** Merge strategies the learner can compare on heal (kind-compatible, see issues). */
  strategies: z
    .array(z.enum(["lww", "version-vector", "crdt-counter", "crdt-set"]))
    .min(1)
    .max(2),
  caption: z.string().optional(),
})

export type PartitionSimSpec = z.infer<typeof partitionSimSpecSchema>

export function addPartitionSimIssues(spec: PartitionSimSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  const compatible: Record<PartitionSimSpec["kind"], string[]> = {
    register: ["lww", "version-vector"],
    counter: ["crdt-counter"],
    set: ["crdt-set"],
  }
  for (const strategy of spec.strategies)
    if (!compatible[spec.kind].includes(strategy))
      ctx.addIssue({
        code: custom,
        path: ["strategies"],
        message: `strategy "${strategy}" does not apply to kind "${spec.kind}"`,
      })
  const sides = new Set(spec.writes.map((w) => w.side))
  if (sides.size < 2)
    ctx.addIssue({
      code: custom,
      path: ["writes"],
      message: "writes must hit both sides or there is no divergence to teach",
    })
}
