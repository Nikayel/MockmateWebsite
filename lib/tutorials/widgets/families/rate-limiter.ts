/**
 * The `rate-limiter` widget family: token bucket vs fixed window vs sliding window
 * over ONE seeded request stream (../limiter-math.ts owns the numbers). The staged
 * aha: predict what a burst at a window boundary does, then watch fixed-window admit
 * ~2x its limit while the sliding window holds.
 */
import { z } from "zod"

export const rateLimiterSpecSchema = z.object({
  type: z.literal("rate-limiter"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  /** Which algorithms the learner can switch between (order = display order). */
  algorithms: z
    .array(z.enum(["token-bucket", "fixed-window", "sliding-window"]))
    .min(2)
    .max(3)
    .default(["fixed-window", "sliding-window", "token-bucket"]),
  /** Requests allowed per window (and bucket capacity for token-bucket). */
  limit: z.number().int().min(2).max(50),
  windowSize: z.number().int().min(5).max(50),
  /** Bucket refill per tick; defaults to limit/windowSize parity. */
  refillPerTick: z.number().positive().optional(),
  seed: z.string().min(1),
  requests: z.number().int().min(10).max(120),
  horizon: z.number().int().min(20).max(400),
  /** The boundary burst (toggled by the learner). */
  burstAt: z.number().int().min(0).optional(),
  burstSize: z.number().int().min(4).max(40).default(16),
  caption: z.string().optional(),
})

export type RateLimiterSpec = z.infer<typeof rateLimiterSpecSchema>

export function addRateLimiterIssues(spec: RateLimiterSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.horizon <= spec.windowSize)
    ctx.addIssue({ code: custom, path: ["horizon"], message: "horizon must exceed windowSize" })
  if (spec.burstAt !== undefined && spec.burstAt >= spec.horizon)
    ctx.addIssue({ code: custom, path: ["burstAt"], message: "burstAt must be inside the horizon" })
}
