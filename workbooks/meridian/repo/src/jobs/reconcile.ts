import type { DbClient } from "../db/client"
import { findClaimByExternalRef } from "../db/repositories/claims"

/**
 * Looks up a batch of claims by the insurer's own reference numbers, the same lookup an
 * insurer's reconciliation email points at. Ops runs this by hand today; nothing schedules
 * it.
 */
export async function runReconciliation(db: DbClient, externalRefs: string[]) {
  const results: Record<string, Awaited<ReturnType<typeof findClaimByExternalRef>>> = {}
  for (const externalRef of externalRefs) {
    results[externalRef] = await findClaimByExternalRef(db, externalRef)
  }
  return results
}
