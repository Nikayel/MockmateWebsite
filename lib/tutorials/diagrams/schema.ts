/**
 * Lesson diagram specs — the authored contract behind a ```csdiagram fence.
 *
 * A lesson author drops a fenced block:
 *
 *     ```csdiagram
 *     { "type": "join", "kind": "left", ... }
 *     ```
 *
 * The Markdown pipeline (see `lib/markdown/components.tsx`) intercepts the
 * `language-csdiagram` code fence, parses the JSON body against these Zod
 * schemas, and renders the matching React diagram instead of a code box. Parsing
 * is validated at the trust boundary (authored content is data, not code) so a
 * malformed spec renders a readable inline error rather than throwing in render.
 *
 * Every diagram is a plain data description — NO executable code, NO layout math
 * in the spec. Renderers own presentation; specs own content. That split keeps
 * lessons diffable and keeps the visuals data-accurate to what the lesson teaches.
 */
import { z } from "zod"

/** A primitive table cell. Authors write strings/numbers/booleans/null only. */
const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
export type DiagramCell = z.infer<typeof cellSchema>

const captionField = z.string().min(1).optional()

// ---- SQL: logical execution-order pipeline (static) ----

const pipelineStageSchema = z.object({
  label: z.string().min(1),
  /** One short line under the stage, e.g. "keep matching rows". */
  note: z.string().optional(),
})

export const pipelineSpecSchema = z.object({
  type: z.literal("pipeline"),
  /** `"sql-select"` expands to the canonical FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY. */
  preset: z.literal("sql-select").optional(),
  stages: z.array(pipelineStageSchema).min(2).max(12).optional(),
  /** Labels to visually emphasize (e.g. highlight WHERE vs HAVING). */
  highlight: z.array(z.string()).optional(),
  caption: captionField,
})

// ---- SQL: JOIN row-matching (triggered) ----

const joinTableSchema = z.object({
  name: z.string().min(1),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(cellSchema)).max(12),
})

export const joinSpecSchema = z.object({
  type: z.literal("join"),
  kind: z.enum(["inner", "left", "right", "full", "anti"]),
  left: joinTableSchema,
  right: joinTableSchema,
  /** `[leftColumn, rightColumn]` — the equality the join matches on. */
  on: z.tuple([z.string().min(1), z.string().min(1)]),
  caption: captionField,
})

// ---- SQL: window frame scrub (triggered) ----

export const windowFrameSpecSchema = z.object({
  type: z.literal("window-frame"),
  /** Aggregate applied over the frame, display-only (e.g. "SUM", "AVG"). */
  fn: z.string().min(1).default("SUM"),
  /** running = unbounded preceding→current; moving-N = N preceding→current. */
  frame: z.union([z.literal("running"), z.string().regex(/^moving-\d+$/)]),
  rows: z
    .array(z.object({ label: z.string().min(1), value: z.number() }))
    .min(2)
    .max(16),
  caption: captionField,
})

// ---- SQL: GROUP BY bucketing (triggered) ----

export const groupBySpecSchema = z.object({
  type: z.literal("group-by"),
  agg: z.enum(["SUM", "COUNT", "AVG", "MIN", "MAX"]).default("SUM"),
  /** The grouping column label, display-only. */
  by: z.string().min(1),
  rows: z
    .array(z.object({ group: z.string().min(1), value: z.number() }))
    .min(2)
    .max(16),
  caption: captionField,
})

// ---- SQL: ER / schema diagram (static) ----

const erColumnSchema = z.object({
  name: z.string().min(1),
  key: z.enum(["pk", "fk"]).optional(),
  type: z.string().optional(),
})

export const erSpecSchema = z.object({
  type: z.literal("er"),
  tables: z
    .array(z.object({ name: z.string().min(1), columns: z.array(erColumnSchema).min(1) }))
    .min(1)
    .max(8),
  relations: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        /** Cardinality read from → to, e.g. n-1 = many orders to one user. */
        kind: z.enum(["1-1", "1-n", "n-1", "n-n"]),
        label: z.string().optional(),
      })
    )
    .optional(),
  caption: captionField,
})

// ---- Python: names → objects memory model (triggered) ----

const memoryObjectSchema = z.object({
  kind: z.enum(["list", "dict", "set", "tuple", "int", "str", "float", "bool", "none", "object"]),
  value: z.string().min(1),
})

export const pythonMemorySpecSchema = z.object({
  type: z.literal("python-memory"),
  steps: z
    .array(
      z.object({
        code: z.string().min(1),
        /** name → object id. Two names on one id = aliasing. */
        names: z.record(z.string(), z.string()),
        /** object id → object contents. */
        objects: z.record(z.string(), memoryObjectSchema),
        /** object id whose value changed THIS step (flashes through all aliases). */
        mutated: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .min(1)
    .max(12),
  caption: captionField,
})

// ---- Python: recursion call stack (triggered) ----

export const callStackSpecSchema = z.object({
  type: z.literal("call-stack"),
  title: z.string().optional(),
  steps: z
    .array(
      z.object({
        /** Frames bottom→top at this snapshot. */
        stack: z.array(z.string().min(1)),
        /** Set when this snapshot is a RETURN (top frame popping with a value). */
        returning: z.string().optional(),
        note: z.string().optional(),
      })
    )
    .min(1)
    .max(20),
  caption: captionField,
})

// ---- Python: comprehension desugaring (static side-by-side) ----

export const comprehensionSpecSchema = z.object({
  type: z.literal("comprehension"),
  /** The equivalent explicit loop, one string per line. */
  loop: z.array(z.string()).min(2),
  /** The one-line comprehension. */
  comp: z.string().min(1),
  /** Named fragments to color-map across both sides (output / iterate / filter). */
  parts: z
    .array(z.object({ label: z.enum(["output", "iterate", "filter"]), code: z.string().min(1) }))
    .optional(),
  caption: captionField,
})

// ---- Shared: a polished, highlightable static table ----

export const tableSpecSchema = z.object({
  type: z.literal("table"),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(cellSchema)),
  /** Column names to emphasize (e.g. the aggregated column). */
  highlightCols: z.array(z.string()).optional(),
  caption: captionField,
})

// ---- discriminated union ----

export const diagramSpecSchema = z.discriminatedUnion("type", [
  pipelineSpecSchema,
  joinSpecSchema,
  windowFrameSpecSchema,
  groupBySpecSchema,
  erSpecSchema,
  pythonMemorySpecSchema,
  callStackSpecSchema,
  comprehensionSpecSchema,
  tableSpecSchema,
])

export type DiagramSpec = z.infer<typeof diagramSpecSchema>
export type PipelineSpec = z.infer<typeof pipelineSpecSchema>
export type JoinSpec = z.infer<typeof joinSpecSchema>
export type WindowFrameSpec = z.infer<typeof windowFrameSpecSchema>
export type GroupBySpec = z.infer<typeof groupBySpecSchema>
export type ErSpec = z.infer<typeof erSpecSchema>
export type PythonMemorySpec = z.infer<typeof pythonMemorySpecSchema>
export type CallStackSpec = z.infer<typeof callStackSpecSchema>
export type ComprehensionSpec = z.infer<typeof comprehensionSpecSchema>
export type TableSpec = z.infer<typeof tableSpecSchema>

export type DiagramParseResult = { ok: true; spec: DiagramSpec } | { ok: false; error: string }

/**
 * Parse a ```csdiagram fence body into a validated spec. Never throws: a syntax
 * or schema error comes back as `{ ok: false, error }` so the renderer can show a
 * readable inline message instead of crashing the lesson.
 */
export function parseDiagramSpec(source: string): DiagramParseResult {
  let json: unknown
  try {
    json = JSON.parse(source)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid JSON"
    return { ok: false, error: `Diagram JSON did not parse: ${msg}` }
  }

  const parsed = diagramSpecSchema.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const path = first?.path.join(".") || "(root)"
    return { ok: false, error: `Invalid diagram spec at ${path}: ${first?.message ?? "unknown"}` }
  }
  return { ok: true, spec: parsed.data }
}
