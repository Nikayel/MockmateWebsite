/**
 * The `cache-sim` widget family: a seeded skewed stream against a small LRU
 * (../cache-math.ts owns the numbers). The story arc: capacity and TTL move hit
 * ratio, then the stampede scenario (short TTL + slow rebuild piles rebuilds onto
 * the hot key) and the coalescing fix that caps them at one.
 */
import { z } from "zod"

export const cacheSimSpecSchema = z.object({
  type: z.literal("cache-sim"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  seed: z.string().min(1),
  /** Distinct keys in the stream (one is the hot key taking ~half of requests). */
  keys: z.number().int().min(4).max(40),
  ticks: z.number().int().min(60).max(400),
  capacity: z.number().int().min(1).max(32),
  /** Initial TTL in ticks (the learner's knob). */
  ttl: z.number().int().min(2).max(400),
  /** Database rebuild latency in ticks (what makes the stampede possible). */
  rebuildTicks: z.number().int().min(1).max(20),
  caption: z.string().optional(),
})

export type CacheSimSpec = z.infer<typeof cacheSimSpecSchema>

export function addCacheSimIssues(spec: CacheSimSpec, ctx: z.RefinementCtx): void {
  if (spec.capacity >= spec.keys)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["capacity"],
      message: "capacity must be below the key count or nothing ever evicts",
    })
}
