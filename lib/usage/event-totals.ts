/**
 * Accumulation primitives for usage_events documents.
 *
 * "Read cost and tokens off an event and add them to a running total, bucketed
 * by some key" was written out by hand in six places: the service, granular,
 * daily-trend and per-session breakdowns in lib/usage-tracking.ts, plus the
 * per-session and per-scenario loops in the admin route. Each used
 * `event.cost || 0`, which turns a string or a NaN into 0 silently and would
 * turn a legitimate value of a wrong type into an under-count.
 *
 * These primitives own that accumulation so the shape and the numeric guards
 * are stated once.
 */

/** Running totals over a set of usage events. */
export interface UsageTotals {
  requests: number
  tokens: number
  cost: number
}

/** The numeric fields these primitives read off a usage_events document. */
export interface UsageEventNumbers {
  cost?: unknown
  totalTokens?: unknown
}

export function emptyUsageTotals(): UsageTotals {
  return { requests: 0, tokens: 0, cost: 0 }
}

/**
 * Coerce a Firestore numeric field, treating anything non-finite as absent.
 *
 * Firestore will happily store a NaN or a string if a writer ever passes one,
 * and `x || 0` would let a NaN poison every downstream sum into NaN.
 */
export function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/** Add one event to a running total. Mutates, for use in hot document loops. */
export function accumulateUsageEvent(totals: UsageTotals, event: UsageEventNumbers): void {
  totals.requests += 1
  totals.tokens += readNumber(event.totalTokens)
  totals.cost += readNumber(event.cost)
}

/** Total a collection of usage events. */
export function sumUsageEvents(events: Iterable<UsageEventNumbers>): UsageTotals {
  const totals = emptyUsageTotals()
  for (const event of events) {
    accumulateUsageEvent(totals, event)
  }
  return totals
}

/**
 * Bucket events by a caller-chosen key: provider, pattern, difficulty,
 * scenario, calendar day, event type. Returns a Map so insertion order is
 * preserved and callers can sort deliberately.
 *
 * Events whose key resolves to null are skipped rather than collected under an
 * "unknown" bucket, so callers decide whether unattributed spend deserves its
 * own row.
 */
export function bucketUsageEvents<T extends UsageEventNumbers>(
  events: Iterable<T>,
  keyOf: (event: T) => string | null
): Map<string, UsageTotals> {
  const buckets = new Map<string, UsageTotals>()
  for (const event of events) {
    const key = keyOf(event)
    if (key === null) continue
    let totals = buckets.get(key)
    if (!totals) {
      totals = emptyUsageTotals()
      buckets.set(key, totals)
    }
    accumulateUsageEvent(totals, event)
  }
  return buckets
}

/** Convert a bucket map into a plain object for JSON responses. */
export function bucketsToRecord(buckets: Map<string, UsageTotals>): Record<string, UsageTotals> {
  return Object.fromEntries(buckets)
}

/** Mean tokens per request, guarding the empty case. */
export function averageTokensPerRequest(totals: UsageTotals): number {
  return totals.requests > 0 ? Math.round(totals.tokens / totals.requests) : 0
}
