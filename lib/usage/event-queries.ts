/**
 * Grouped usage_events reads.
 *
 * The admin route attributed cost to sessions and to scenarios by issuing one
 * Firestore query per row inside a Promise.all — 50 queries to render a 50-row
 * session table, and one per distinct scenario for the problem table. Both
 * loops were the same shape: "given these ids, total the usage events that
 * carry them".
 *
 * Firestore's `in` operator answers that for a batch of ids at a time, turning
 * N queries into ceil(N / 30).
 */

import { adminDb } from "../firebase-admin"
import { logger } from "../logger"
import { emptyUsageTotals, accumulateUsageEvent, type UsageTotals } from "./event-totals"

/** Maximum values Firestore accepts in a single `in` filter. */
const IN_FILTER_BATCH_SIZE = 30

/**
 * Cap on documents read per batch. A single runaway session should not be able
 * to make this query unbounded; the totals it produces are for a dashboard, and
 * a lower bound on a pathological row beats an unbounded read.
 */
const EVENTS_PER_BATCH_LIMIT = 3000

/**
 * Total the usage events grouped by the value of `field`.
 *
 * Returns a map from field value to totals. Ids with no matching events are
 * absent; callers should treat that as zero rather than as missing data,
 * because an id with no recorded spend is the expected state for any path that
 * does not call AI.
 */
export async function sumUsageEventsByField(
  field: "sessionId" | "scenarioId",
  values: readonly string[]
): Promise<Map<string, UsageTotals>> {
  const totalsByValue = new Map<string, UsageTotals>()

  const uniqueValues = Array.from(new Set(values.filter((v) => typeof v === "string" && v)))
  if (uniqueValues.length === 0) return totalsByValue

  const batches: string[][] = []
  for (let start = 0; start < uniqueValues.length; start += IN_FILTER_BATCH_SIZE) {
    batches.push(uniqueValues.slice(start, start + IN_FILTER_BATCH_SIZE))
  }

  const snapshots = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await adminDb
          .collection("usage_events")
          .where(field, "in", batch)
          .limit(EVENTS_PER_BATCH_LIMIT)
          .get()
      } catch (error) {
        // One failed batch should cost its rows their cost column, not the
        // whole table.
        logger.error("[Usage] Failed to read usage events batch", { error, field })
        return null
      }
    })
  )

  for (const snapshot of snapshots) {
    if (!snapshot) continue
    for (const doc of snapshot.docs) {
      const event = doc.data()
      const key = event[field]
      if (typeof key !== "string" || !key) continue

      let totals = totalsByValue.get(key)
      if (!totals) {
        totals = emptyUsageTotals()
        totalsByValue.set(key, totals)
      }
      accumulateUsageEvent(totals, event)
    }
  }

  return totalsByValue
}

/** Totals for one id, or zeroes when it recorded no spend. */
export function totalsFor(
  totalsByValue: Map<string, UsageTotals>,
  id: string | undefined
): UsageTotals {
  return (id && totalsByValue.get(id)) || emptyUsageTotals()
}
