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
