/**
 * Interactive widget specs — the authored contract behind a ```cswidget fence.
 *
 * A lesson author drops a fenced block:
 *
 *     ```cswidget
 *     { "type": "check", "kind": "predict", ... }
 *     ```
 *
 * The Markdown pipeline (see `lib/markdown/components.tsx`) intercepts the
 * `language-cswidget` code fence, parses the JSON body against these Zod schemas
 * EAGERLY (so a malformed spec renders a readable inline error), and hands the
 * validated spec to a lazily loaded widget body (`components/tutorials/widgets/`).
 *
 * cswidget vs csdiagram: two fences on one plumbing layer. ```csdiagram stays the
 * home of STATELESS staged statics; ```cswidget carries all STATEFUL interactives
 * (checks, sims, sequence steppers, calc engines) which own client state, an
 * a11y shell (WidgetFrame), and a lazy chunk so the 200+ lessons that never render
 * one pay nothing. Specs are DATA, not code — no executable expressions beyond the
 * whitelisted mini-grammars individual families define, no layout math.
 *
 * Families live one-per-file under ./families and are composed here. Members MUST
 * stay pure z.object schemas (z.discriminatedUnion rejects ZodEffects at module
 * load), so every cross-field rule lives on the union wrapper's superRefine below,
 * delegated to the family's add*Issues helper.
 */
import { z } from "zod"
import { checkSpecSchema, addCheckIssues } from "./families/check"
import { calcSpecSchema, addCalcIssues } from "./families/calc"
import { hashRingSpecSchema, addHashRingIssues } from "./families/hash-ring"
import { sequenceSpecSchema, addSequenceIssues } from "./families/sequence"
import { rateLimiterSpecSchema, addRateLimiterIssues } from "./families/rate-limiter"
import { quorumSpecSchema, addQuorumIssues } from "./families/quorum"

export type { CheckSpec } from "./families/check"
export type { CalcSpec, CalcInput, CalcOutput } from "./families/calc"
export type { HashRingSpec } from "./families/hash-ring"
export type { SequenceSpec, SequenceStep } from "./families/sequence"
export type { RateLimiterSpec } from "./families/rate-limiter"
export type { QuorumSpec } from "./families/quorum"

// Future families (sequence, sims, steps) append here — one schema file each,
// composed into this union. Adding a member without wiring its renderer is a compile
// error in components/tutorials/widgets/WidgetBody.tsx (exhaustive switch).
const widgetSpecUnion = z.discriminatedUnion("type", [
  checkSpecSchema,
  calcSpecSchema,
  hashRingSpecSchema,
  sequenceSpecSchema,
  rateLimiterSpecSchema,
  quorumSpecSchema,
])

/** The union PLUS per-family cross-field integrity checks Zod field rules can't express. */
export const widgetSpecSchema = widgetSpecUnion.superRefine((spec, ctx) => {
  if (spec.type === "check") addCheckIssues(spec, ctx)
  if (spec.type === "calc") addCalcIssues(spec, ctx)
  if (spec.type === "hash-ring") addHashRingIssues(spec, ctx)
  if (spec.type === "sequence") addSequenceIssues(spec, ctx)
  if (spec.type === "rate-limiter") addRateLimiterIssues(spec, ctx)
  if (spec.type === "quorum") addQuorumIssues(spec, ctx)
})

export type WidgetSpec = z.infer<typeof widgetSpecSchema>

export type WidgetParseResult = { ok: true; spec: WidgetSpec } | { ok: false; error: string }

/**
 * Parse a ```cswidget fence body into a validated spec. Never throws: a syntax or
 * schema error comes back as `{ ok: false, error }` so the renderer shows a readable
 * inline message instead of crashing the lesson.
 */
export function parseWidgetSpec(source: string): WidgetParseResult {
  let json: unknown
  try {
    json = JSON.parse(source)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid JSON"
    return { ok: false, error: `Widget JSON did not parse: ${msg}` }
  }

  const parsed = widgetSpecSchema.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const path = first?.path.join(".") || "(root)"
    return { ok: false, error: `Invalid widget spec at ${path}: ${first?.message ?? "unknown"}` }
  }
  return { ok: true, spec: parsed.data }
}
