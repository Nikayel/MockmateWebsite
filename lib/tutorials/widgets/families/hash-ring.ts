/**
 * The `hash-ring` widget family — consistent hashing made tactile, and the pitch
 * demo's named centerpiece. The learner adds/removes a node under mod-N and watches
 * most keys shatter, flips to the ring and sees ~1/N move instead, then toggles
 * virtual nodes to smooth the load skew. All positions are seeded (see
 * ../ring-math.ts); the spec only sizes the scene.
 *
 * Pure z.object member; cross-field rules in addHashRingIssues via the union
 * wrapper. The ramp fields (predictPrompt, workedExample) are mandatory like every
 * hands-on sim.
 */
import { z } from "zod"

export const hashRingSpecSchema = z.object({
  type: z.literal("hash-ring"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  /** Nodes on screen at open. */
  initialNodes: z.number().int().min(2).max(6),
  /** Ceiling for the add-node button (node names are letters A..). */
  maxNodes: z.number().int().min(3).max(9),
  /** Seeded key count (key-1..key-N). */
  keys: z.number().int().min(12).max(64),
  /** Which assignment mode the scene opens in (modulo tells the shatter story first). */
  initialMode: z.enum(["modulo", "ring"]).default("modulo"),
  /** Ring points per node when virtual nodes are toggled on. */
  vnodeFactor: z.number().int().min(4).max(64).default(16),
  caption: z.string().optional(),
})

export type HashRingSpec = z.infer<typeof hashRingSpecSchema>

export function addHashRingIssues(spec: HashRingSpec, ctx: z.RefinementCtx): void {
  if (spec.maxNodes <= spec.initialNodes)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxNodes"],
      message: "maxNodes must exceed initialNodes so the add-node story can play",
    })
}
