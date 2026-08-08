/**
 * Executes the Firestore side of a GDPR erasure request.
 *
 * Two failures in the previous implementation are the reason this is its own
 * module:
 *
 * 1. It collected every delete into a SINGLE `adminDb.batch()`. A Firestore
 *    write batch is hard-capped at 500 operations. A user with a few hundred
 *    interview sessions plus their usage events would blow past that, and the
 *    cap is enforced at `commit()` — after every read had succeeded — so the
 *    whole erasure threw at the last step and the caller showed a generic
 *    toast. The user believed their data was gone; all of it was still there.
 *    Deletes are now chunked so the cap is unreachable by construction.
 *
 * 2. It swallowed per-collection errors and reported success unconditionally.
 *    A partial erasure reported as complete is worse than a visible failure,
 *    because nobody ever retries it. Failures are now collected and surfaced.
 */

import type { Firestore, DocumentReference } from "firebase-admin/firestore"
import { logger } from "@/lib/logger"
import { USER_KEYED_DOCUMENTS, USER_KEYED_QUERIES } from "./user-data-map"

/**
 * Deletes per chunked batch. Firestore's hard limit is 500; 400 leaves headroom
 * so the cap stays unreachable even if a future change adds a second write per
 * document (a tombstone, an audit row) inside the same batch.
 */
export const MAX_DELETES_PER_BATCH = 400

export interface UserDataDeletionResult {
  /**
   * Documents this routine deleted directly. Subcollection documents removed by
   * `recursiveDelete` are NOT counted, because the Admin SDK does not report
   * them, so treat this as a floor rather than a total.
   */
  deletedDocuments: number
  /**
   * Collections that could not be fully processed. A non-empty list means the
   * erasure is INCOMPLETE and the caller must not claim otherwise.
   */
  failedCollections: string[]
}

/**
 * Splits a list into fixed-size chunks. Exported for its own unit test: the
 * batch cap is the thing that broke in production, so the arithmetic that keeps
 * us under it is worth testing directly rather than only through Firestore.
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error(`chunk size must be at least 1, received ${size}`)

  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * Commits deletes in batches of at most `MAX_DELETES_PER_BATCH`.
 *
 * Batches are committed in sequence rather than in parallel so that a mid-way
 * failure leaves a known amount of work done, and so a large erasure cannot
 * open hundreds of concurrent commits against Firestore.
 */
export async function deleteInChunks(
  db: Firestore,
  refs: readonly DocumentReference[]
): Promise<number> {
  let deleted = 0

  for (const group of chunk(refs, MAX_DELETES_PER_BATCH)) {
    const batch = db.batch()
    for (const ref of group) {
      batch.delete(ref)
    }
    await batch.commit()
    deleted += group.length
  }

  return deleted
}

/**
 * Collects every document reference that a field-keyed collection holds for this
 * user. Queries run per field because Firestore has no OR across fields that
 * would work here, and the same document may match on two fields (a referral
 * where the user is both referrer and referred is impossible, but `session_vectors`
 * genuinely carries both `userId` and `user_id`), so results are de-duplicated
 * by path before anything is deleted.
 */
async function collectQueryKeyedRefs(
  db: Firestore,
  userId: string,
  collection: string,
  fields: readonly string[]
): Promise<DocumentReference[]> {
  const byPath = new Map<string, DocumentReference>()

  for (const field of fields) {
    const snapshot = await db.collection(collection).where(field, "==", userId).get()
    for (const doc of snapshot.docs) {
      byPath.set(doc.ref.path, doc.ref)
    }
  }

  return [...byPath.values()]
}

/**
 * Deletes everything this user owns across Firestore.
 *
 * Never throws for a single bad collection: one missing index or one renamed
 * field must not abort the other forty. What it will not do is hide the damage,
 * so anything that failed comes back in `failedCollections` for the caller to
 * report honestly.
 */
export async function deleteAllUserData(
  db: Firestore,
  userId: string
): Promise<UserDataDeletionResult> {
  const failedCollections: string[] = []
  let deletedDocuments = 0

  // 1. Documents keyed by uid. recursiveDelete takes the document AND every
  //    subcollection under it. A plain delete here would strip the parent and
  //    strand `users/{uid}/session_summaries/*` and `problem_mastery/{uid}/problems/*`
  //    permanently, since nothing would be left to find them by.
  for (const entry of USER_KEYED_DOCUMENTS) {
    try {
      const ref = db.collection(entry.collection).doc(userId)
      const snapshot = await ref.get()

      await db.recursiveDelete(ref)
      if (snapshot.exists) deletedDocuments += 1
    } catch (error) {
      failedCollections.push(entry.collection)
      logger.error("Account deletion: failed to delete user-keyed document", {
        collection: entry.collection,
        userId,
        error,
      })
    }
  }

  // 2. Documents that reference the user through a field.
  for (const entry of USER_KEYED_QUERIES) {
    try {
      const refs = await collectQueryKeyedRefs(db, userId, entry.collection, entry.fields)
      deletedDocuments += await deleteInChunks(db, refs)
    } catch (error) {
      failedCollections.push(entry.collection)
      logger.error("Account deletion: failed to delete user-keyed query results", {
        collection: entry.collection,
        fields: entry.fields,
        userId,
        error,
      })
    }
  }

  return { deletedDocuments, failedCollections }
}
