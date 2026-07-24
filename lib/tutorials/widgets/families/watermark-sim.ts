/**
 * The `watermark-sim` widget family (../watermark-math.ts owns the numbers): one
 * event-time widget, per-lesson configs. The L9 batch-streaming instance enables the
 * processing-time mode flag on the SAME component (the plan's no-second-component
 * exit criterion); the lateness slider is the latency-vs-completeness trade.
 */
import { z } from "zod"

export const watermarkSimSpecSchema = z.object({
  type: z.literal("watermark-sim"),
  title: z.string().min(1),
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  workedExample: z.string().min(1),
  seed: z.string().min(1),
  count: z.number().int().min(20).max(120),
  horizon: z.number().int().min(40).max(300),
  /** Typical arrival skew in ticks (a seeded slice arrives much later). */
  skew: z.number().int().min(2).max(20),
  windowSize: z.number().int().min(5).max(60),
  watermarkDelay: z.number().int().min(0).max(30),
  /** Initial allowed lateness; the slider runs 0..maxLateness. */
  allowedLateness: z.number().int().min(0).max(60),
  maxLateness: z.number().int().min(5).max(60),
  /** Include "processing-time" ONLY for the lesson teaching that contrast (L9). */
  modes: z
    .array(z.enum(["event-time", "processing-time"]))
    .min(1)
    .max(2)
    .default(["event-time"]),
  caption: z.string().optional(),
})

export type WatermarkSimSpec = z.infer<typeof watermarkSimSpecSchema>

export function addWatermarkSimIssues(spec: WatermarkSimSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  if (spec.allowedLateness > spec.maxLateness)
    ctx.addIssue({
      code: custom,
      path: ["allowedLateness"],
      message: "allowedLateness cannot exceed maxLateness",
    })
  if (!spec.modes.includes("event-time"))
    ctx.addIssue({
      code: custom,
      path: ["modes"],
      message: "event-time mode is mandatory (processing-time is the optional contrast)",
    })
  if (spec.windowSize >= spec.horizon)
    ctx.addIssue({
      code: custom,
      path: ["windowSize"],
      message: "windowSize must be below horizon",
    })
}
