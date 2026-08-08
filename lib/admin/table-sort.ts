/**
 * Row sorting for admin data tables.
 *
 * Admin tables mix types in a single column set: counts, currency, ISO strings,
 * Firestore timestamps, emails, and nulls for users who never did the thing.
 * A bare `a > b` sorts numbers lexicographically ("100" before "9") and scatters
 * missing values, so the comparator inspects the values it is given.
 */

export type SortDirection = "asc" | "desc"

/**
 * Values that never carry ordering information. These always sort to the end
 * regardless of direction, so flipping a column never buries the populated rows
 * under a wall of blanks.
 */
function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}

/**
 * Coerce the value shapes admin rows actually hold into something orderable.
 * Firestore Timestamps arrive over JSON as `{ seconds, nanoseconds }` or as an
 * ISO string depending on the route, and both must order as time.
 */
function toComparable(value: unknown): number | string | null {
  if (isBlank(value)) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value ? 1 : 0
  if (value instanceof Date) return value.getTime()

  if (typeof value === "object") {
    const seconds = (value as { seconds?: unknown; _seconds?: unknown }).seconds
    const underscored = (value as { _seconds?: unknown })._seconds
    if (typeof seconds === "number") return seconds
    if (typeof underscored === "number") return underscored
    return null
  }

  if (typeof value === "string") {
    // A numeric string in a numeric column must order numerically, not
    // lexicographically, or 100 lands before 9.
    const trimmed = value.trim()
    if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed)

    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) return parsed

    return trimmed.toLowerCase()
  }

  return null
}

export function compareRowValues(a: unknown, b: unknown, direction: SortDirection): number {
  const left = toComparable(a)
  const right = toComparable(b)

  // Blanks sink to the bottom in both directions.
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const factor = direction === "asc" ? 1 : -1

  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * factor
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true }) * factor
}

/**
 * Sort rows by a column key. Returns a new array; the input is never mutated,
 * because callers pass React props straight in.
 */
export function sortRows<T>(rows: T[], columnKey: string | null, direction: SortDirection): T[] {
  if (!columnKey) return rows

  return [...rows].sort((rowA, rowB) =>
    compareRowValues(
      (rowA as Record<string, unknown>)[columnKey],
      (rowB as Record<string, unknown>)[columnKey],
      direction
    )
  )
}
