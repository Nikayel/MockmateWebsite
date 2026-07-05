import type { SqlResultSet } from "./comparator"
import { runSqlInWorker } from "./worker-runner"

/** Default number of sample rows previewed per table. */
export const DEFAULT_PREVIEW_LIMIT = 8

/** One seeded table's preview: its first rows and the TRUE total row count (for "showing N of M"). */
export interface SqlTablePreview {
  name: string
  result: SqlResultSet
  totalRows: number
}

export interface SqlIntrospectResult {
  success: boolean
  tables: SqlTablePreview[]
  error?: string
}

export interface SqlWorkspacePreviewResult {
  success: boolean
  /** Every user table AFTER the learner's script ran, with sample rows + true row count. */
  tables: SqlTablePreview[]
  /** A SQL error INSIDE the learner's script (tables reflect the state up to that statement). */
  scriptError?: string
  /** A harness/engine failure (nothing ran), distinct from a SQL error in the learner's script. */
  error?: string
}

/**
 * Read-only preview of the tables a seed defines — powers the lesson "Data" panel so a learner can
 * always see the columns and sample rows a query runs against. Executes the seed alone in the
 * client-side sql.js worker (no learner code, no network, no quota, engine prewarmed on mount), then
 * narrows the untyped worker payload into `SqlTablePreview[]`. An empty/blank seed yields no tables.
 */
export async function introspectSqlSeed(
  seedSql: string | undefined,
  previewLimit: number = DEFAULT_PREVIEW_LIMIT
): Promise<SqlIntrospectResult> {
  if (!seedSql || !seedSql.trim()) {
    return { success: true, tables: [] }
  }

  const runResult = await runSqlInWorker({ mode: "introspect", seedSql, previewLimit })
  if (!runResult.success || runResult.error) {
    return {
      success: false,
      tables: [],
      error: runResult.error || "Couldn't read the sample data.",
    }
  }

  return { success: true, tables: extractTables(runResult.result) }
}

/**
 * Run a workspace lesson's seed + the learner's script in a throwaway client-side sql.js DB, then
 * read back the RESULTING tables — so an L3/L4 learner can SEE the database their script produced,
 * not just a green/red assertion result. This mirrors grading's execution (same seed, same script)
 * but is display-only: it runs no assertions and never affects the grade. A SQL error inside the
 * script is returned as `scriptError` alongside whatever tables were built before it, so partial
 * state stays visible. An empty/blank script yields no tables.
 */
export async function previewSqlWorkspace(
  seedSql: string | undefined,
  code: string,
  previewLimit: number = DEFAULT_PREVIEW_LIMIT
): Promise<SqlWorkspacePreviewResult> {
  if (!code || !code.trim()) {
    return { success: true, tables: [] }
  }

  const runResult = await runSqlInWorker({
    mode: "workspace-preview",
    seedSql: seedSql ?? "",
    code,
    previewLimit,
  })
  if (!runResult.success || runResult.error) {
    return {
      success: false,
      tables: [],
      error: runResult.error || "Couldn't read your resulting tables.",
    }
  }

  return {
    success: true,
    tables: extractTables(runResult.result),
    scriptError: extractScriptError(runResult.result),
  }
}

/** Pull the optional `scriptError` string off the worker payload, ignoring anything malformed. */
function extractScriptError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("scriptError" in payload)) return undefined
  const raw = (payload as { scriptError?: unknown }).scriptError
  return typeof raw === "string" && raw.length > 0 ? raw : undefined
}

/** Narrow the worker's `{ tables: [...] }` payload, dropping anything malformed rather than throwing. */
function extractTables(payload: unknown): SqlTablePreview[] {
  if (!payload || typeof payload !== "object" || !("tables" in payload)) return []
  const raw = (payload as { tables?: unknown }).tables
  if (!Array.isArray(raw)) return []

  const previews: SqlTablePreview[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const { name, result, totalRows } = entry as {
      name?: unknown
      result?: unknown
      totalRows?: unknown
    }
    if (typeof name !== "string" || !isResultSet(result)) continue
    previews.push({
      name,
      result,
      totalRows: typeof totalRows === "number" ? totalRows : result.rows.length,
    })
  }
  return previews
}

function isResultSet(value: unknown): value is SqlResultSet {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as SqlResultSet).columns) &&
    Array.isArray((value as SqlResultSet).rows)
  )
}
