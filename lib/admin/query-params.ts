/**
 * Bounded numeric query-param parsing for admin APIs.
 *
 * Admin routes pass `hours`, `limit`, `cohorts` and `page` straight into
 * Firestore range and `.limit()` calls. An unbounded value there is not a bad
 * chart, it is a bill: `?hours=1000000` asks Firestore to scan every session the
 * platform has ever written, and `?limit=999999` reads a document per unit.
 *
 * Two rules, applied in one place so no route can forget one:
 * - a value that is not an integer is rejected, because `parseInt("abc")` is NaN
 *   and NaN silently becomes "no bound" once it reaches a query builder;
 * - a value that is an integer is clamped into the range the route can afford,
 *   because an admin typing a big number wants "as much as you have", not a
 *   403.
 */

export type BoundedIntResult = { ok: true; value: number } | { ok: false; error: string }

export interface BoundedIntOptions {
  /** Smallest value the caller may ask for. */
  min: number
  /** Largest value the route can afford to serve. Values above this clamp down. */
  max: number
  /** Used when the param is absent or empty. */
  fallback: number
}

/** Only a plain optionally-signed integer. `parseInt` would accept "12abc" and "0x10". */
const INTEGER_PATTERN = /^[+-]?\d+$/

/**
 * Parse one numeric query param into a bounded integer.
 *
 * Absent or empty yields the fallback. Anything that is not an integer is an
 * error the route should turn into a 400 rather than a silently unbounded query.
 */
export function parseBoundedInt(
  raw: string | null | undefined,
  { min, max, fallback }: BoundedIntOptions
): BoundedIntResult {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return { ok: true, value: fallback }
  }

  const trimmed = raw.trim()
  if (!INTEGER_PATTERN.test(trimmed)) {
    return { ok: false, error: "must be an integer" }
  }

  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false, error: "must be an integer" }
  }

  return { ok: true, value: Math.min(max, Math.max(min, parsed)) }
}

/**
 * Same rules, but the route does not care to distinguish "absent" from
 * "garbage" and would rather serve the default than a 400. Used where the param
 * only widens a chart window.
 */
export function clampInt(
  raw: string | null | undefined,
  options: BoundedIntOptions
): number {
  const result = parseBoundedInt(raw, options)
  return result.ok ? result.value : options.fallback
}
