/**
 * Result-set comparison for single-query (L1/L2) SQL grading.
 *
 * A learner's `SELECT` returns `{ columns, rows }`; we compare it to the lesson's `expected`
 * result set. The rules (SPEC §3.3):
 *  - **Columns:** compare arity only. Names are advisory — SQL lets you alias freely — so a
 *    name mismatch is surfaced as a hint, never a hard fail. (Aliasing lessons assert names
 *    themselves inside the expected set + `orderMatters`.)
 *  - **Rows:** `orderMatters` → deep-equal row-by-row; otherwise multiset compare (sort a canonical
 *    serialization of both sides, then equal). This is the SQL analog of `PythonTestCase.orderMatters`.
 *  - **Cells:** numbers compare by value; strings case-sensitively unless `caseInsensitive`;
 *    `NULL === NULL`. SQLite returns JS `null` for NULL.
 *  - **Empty result:** `{ columns:[…], rows:[] }` is a first-class, gradeable answer — "0 expected,
 *    0 returned" is a PASS, never "no output".
 *
 * Pure and dependency-free so it can be unit-tested without a browser/worker.
 */
export interface SqlResultSet {
  columns: string[]
  rows: unknown[][]
}

export interface CompareOptions {
  /** true → row order must match (the learner used ORDER BY). Default false → multiset compare. */
  orderMatters?: boolean
  /** true → string cell comparison is case-insensitive. Default false. */
  caseInsensitive?: boolean
}

export interface CompareResult {
  passed: boolean
  /** Human-readable reason on failure; a soft hint (e.g. column-name drift) may accompany a pass. */
  reason?: string
}

/** Canonicalize one cell to a type-tagged string so comparison is exact and JSON-stable. */
function canonicalCell(value: unknown, caseInsensitive: boolean): string {
  if (value === null || value === undefined) return "∅NULL"
  if (typeof value === "number") return `n:${value}`
  if (typeof value === "bigint") return `n:${value}`
  if (typeof value === "boolean") return `n:${value ? 1 : 0}`
  // Uint8Array (BLOB) and anything else: fall back to a stable string form.
  if (value instanceof Uint8Array) return `b:${Array.from(value).join(",")}`
  const text = String(value)
  return `s:${caseInsensitive ? text.toLowerCase() : text}`
}

function canonicalRow(row: unknown[], caseInsensitive: boolean): string {
  return JSON.stringify(row.map((cell) => canonicalCell(cell, caseInsensitive)))
}

export function compareResultSets(
  expected: SqlResultSet,
  actual: SqlResultSet | null | undefined,
  options: CompareOptions = {}
): CompareResult {
  if (!actual) {
    return { passed: false, reason: "Your query didn't return a result set." }
  }

  const caseInsensitive = options.caseInsensitive === true

  if (actual.columns.length !== expected.columns.length) {
    return {
      passed: false,
      reason: `Expected ${expected.columns.length} column(s) but your query returned ${actual.columns.length}.`,
    }
  }

  if (actual.rows.length !== expected.rows.length) {
    return {
      passed: false,
      reason: `Expected ${expected.rows.length} row(s) but your query returned ${actual.rows.length}.`,
    }
  }

  // Any row with the wrong number of cells can't match a well-formed expected row.
  for (const row of actual.rows) {
    if (row.length !== expected.columns.length) {
      return {
        passed: false,
        reason: `A returned row has ${row.length} value(s); expected ${expected.columns.length}.`,
      }
    }
  }

  if (options.orderMatters) {
    for (let i = 0; i < expected.rows.length; i++) {
      if (
        canonicalRow(expected.rows[i], caseInsensitive) !==
        canonicalRow(actual.rows[i], caseInsensitive)
      ) {
        return { passed: false, reason: `Row ${i + 1} doesn't match the expected output.` }
      }
    }
  } else {
    const expectedCanon = expected.rows.map((r) => canonicalRow(r, caseInsensitive)).sort()
    const actualCanon = actual.rows.map((r) => canonicalRow(r, caseInsensitive)).sort()
    for (let i = 0; i < expectedCanon.length; i++) {
      if (expectedCanon[i] !== actualCanon[i]) {
        return {
          passed: false,
          reason: "Your rows don't match the expected set (compared without row order).",
        }
      }
    }
  }

  // Values match. Column names are advisory — surface drift as a soft hint on an otherwise-passing run.
  const nameHint = columnNameHint(expected.columns, actual.columns)
  return nameHint ? { passed: true, reason: nameHint } : { passed: true }
}

/** Advisory only: note aliasing drift without failing (names differ but the data is right). */
function columnNameHint(expected: string[], actual: string[]): string | undefined {
  const mismatched = expected.filter((name, i) => name !== actual[i])
  if (mismatched.length === 0) return undefined
  return `Result is correct. Heads up: expected column name(s) ${expected.join(", ")} but got ${actual.join(", ")}.`
}
