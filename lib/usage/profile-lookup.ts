/**
 * Batched profile lookups for usage reporting.
 *
 * Attributing spend to a person needs the profile behind a user id. The two
 * previous approaches were both wrong at scale:
 *
 * - the admin usage route read one profile per row inside a Promise.all over
 *   sessions, so a 50-row table issued up to 50 point reads;
 * - getAdminUsageStats read the entire profiles collection (capped at 10k) to
 *   label whichever handful of accounts had usage that period.
 *
 * Both are replaced by a single batched getAll over exactly the ids needed.
 *
 * Profiles live in `profiles`. `users/{id}` holds only the usage_summaries and
 * session_summaries subcollections and carries no fields of its own.
 */

import { adminDb } from "../firebase-admin"
import type { BudgetProfileFields } from "./budget"

/** The profile fields usage reporting reads. */
export interface UsageProfile extends BudgetProfileFields {
  email?: unknown
}

/**
 * Firestore getAll takes the ids as arguments, so keep each call to a size that
 * stays well clear of any argument-count and payload limits.
 */
const BATCH_SIZE = 300

/**
 * Fetch the given profiles in batches, keyed by user id.
 *
 * Ids with no profile document are simply absent from the map; callers decide
 * how to label them (a guest, for instance, legitimately has no profile).
 */
export async function fetchProfilesById(
  userIds: readonly string[]
): Promise<Map<string, UsageProfile>> {
  const profiles = new Map<string, UsageProfile>()

  const uniqueIds = Array.from(new Set(userIds.filter((id) => typeof id === "string" && id)))
  if (uniqueIds.length === 0) return profiles

  const collection = adminDb.collection("profiles")

  for (let start = 0; start < uniqueIds.length; start += BATCH_SIZE) {
    const batch = uniqueIds.slice(start, start + BATCH_SIZE)
    const snapshots = await adminDb.getAll(...batch.map((id) => collection.doc(id)))
    for (const snapshot of snapshots) {
      if (snapshot.exists) {
        profiles.set(snapshot.id, snapshot.data() as UsageProfile)
      }
    }
  }

  return profiles
}

/** Display label for a user id, falling back to the id itself. */
export function profileEmail(profile: UsageProfile | undefined, fallback: string): string {
  return typeof profile?.email === "string" && profile.email ? profile.email : fallback
}
