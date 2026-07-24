/**
 * The `calc` widget family — the config-driven formula-slider engine behind the L0
 * estimation module and the absorbed presets (availability nines, tail latency,
 * utilization curve, burn rate, erasure overhead, feed fan-out).
 *
 * A spec declares INPUTS (sliders with linear/log scale, plus selects), OUTPUTS
 * (expressions in the owned mini-grammar of ./../expr, evaluated live against the
 * inputs and PRIOR outputs), and the pedagogy ramp the plan mandates for every
 * hands-on sim: a one-tap predictPrompt shown before anything moves, a worked
 * example narrating the initial values, then inputs unlocking one at a time.
 *
 * Like every family, this member stays a pure z.object; cross-field rules live in
 * addCalcIssues, called from the union wrapper's superRefine. Expressions are parsed
 * HERE, at spec time, so an authored typo or unknown identifier is a readable schema
 * error, never a renderer throw.
 */
import { z } from "zod"
import { parseExpr } from "../expr"

const sliderInputSchema = z.object({
  kind: z.literal("slider"),
  id: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
  /** Linear sliders honor `step`; log sliders sweep min->max exponentially. */
  scale: z.enum(["linear", "log"]).default("linear"),
  step: z.number().positive().optional(),
  initial: z.number(),
  /** Display unit, e.g. "users", "QPS", "bytes". Rendered next to the value. */
  unit: z.string().optional(),
})

const selectInputSchema = z.object({
  kind: z.literal("select"),
  id: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  options: z
    .array(z.object({ label: z.string().min(1), value: z.number() }))
    .min(2)
    .max(5),
  /** Index into options. */
  initial: z.number().int().min(0).default(0),
})

const outputSchema = z.object({
  id: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  label: z.string().min(1),
  /** Whitelisted mini-grammar; may reference inputs and PRIOR outputs. */
  expr: z.string().min(1),
  format: z.enum(["number", "compact", "percent", "duration", "bytes"]).default("number"),
  unit: z.string().optional(),
  /** At most ONE output carries a sparkline: this output plotted over one slider. */
  sparkline: z.object({ over: z.string().min(1) }).optional(),
})

export const calcSpecSchema = z.object({
  type: z.literal("calc"),
  title: z.string().min(1),
  /** One-tap prediction commit shown before the math unlocks (no marked answer:
   *  the live numbers themselves are the feedback). */
  predictPrompt: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(4),
  }),
  /** Narrates the initial values before free manipulation unlocks. */
  workedExample: z.string().min(1),
  inputs: z
    .array(z.discriminatedUnion("kind", [sliderInputSchema, selectInputSchema]))
    .min(1)
    .max(6),
  outputs: z.array(outputSchema).min(1).max(6),
  caption: z.string().optional(),
})

export type CalcSpec = z.infer<typeof calcSpecSchema>
export type CalcInput = CalcSpec["inputs"][number]
export type CalcOutput = CalcSpec["outputs"][number]

export function addCalcIssues(spec: CalcSpec, ctx: z.RefinementCtx): void {
  const custom = z.ZodIssueCode.custom
  const inputIds = spec.inputs.map((i) => i.id)
  if (new Set(inputIds).size !== inputIds.length)
    ctx.addIssue({ code: custom, path: ["inputs"], message: "input ids must be unique" })

  spec.inputs.forEach((input, i) => {
    if (input.kind === "slider") {
      if (!(input.min < input.max))
        ctx.addIssue({ code: custom, path: ["inputs", i], message: "slider needs min < max" })
      if (input.scale === "log" && input.min <= 0)
        ctx.addIssue({ code: custom, path: ["inputs", i], message: "log sliders need min > 0" })
      if (input.initial < input.min || input.initial > input.max)
        ctx.addIssue({ code: custom, path: ["inputs", i], message: "initial outside [min, max]" })
    } else if (input.initial >= input.options.length) {
      ctx.addIssue({ code: custom, path: ["inputs", i], message: "initial index out of range" })
    }
  })

  const known = new Set(inputIds)
  let sparklines = 0
  spec.outputs.forEach((output, i) => {
    if (known.has(output.id))
      ctx.addIssue({
        code: custom,
        path: ["outputs", i, "id"],
        message: `duplicate id "${output.id}"`,
      })
    const parsed = parseExpr(output.expr)
    if (!parsed.ok) {
      ctx.addIssue({ code: custom, path: ["outputs", i, "expr"], message: parsed.error })
    } else {
      for (const ident of parsed.identifiers)
        if (!known.has(ident))
          ctx.addIssue({
            code: custom,
            path: ["outputs", i, "expr"],
            message: `unknown identifier "${ident}" (inputs and prior outputs only)`,
          })
    }
    known.add(output.id)
    if (output.sparkline) {
      sparklines++
      const over = spec.inputs.find((input) => input.id === output.sparkline!.over)
      if (!over || over.kind !== "slider")
        ctx.addIssue({
          code: custom,
          path: ["outputs", i, "sparkline", "over"],
          message: "sparkline.over must name a slider input",
        })
    }
  })
  if (sparklines > 1)
    ctx.addIssue({ code: custom, path: ["outputs"], message: "at most one sparkline per calc" })
}
