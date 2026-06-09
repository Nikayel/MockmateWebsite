/**
 * Firestore Vector DB Implementation
 *
 * Implements VectorDB interface using Firestore
 */

import { adminDb } from "../../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from "../types"
import { findSimilarVectors } from "../retrieval/similarity"
import { matchesFilter, optionsToFilterCriteria } from "../retrieval/filters"
import { VECTOR_DB_CONFIG } from "../config"

const NON_METADATA_FIELDS = new Set([
  "vector",
  "text",
  "metadata",
  "type",
  "createdAt",
  "updatedAt",
  "vectorStoredIn",
])

function normalizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const nestedMetadata =
    data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : {}

  const legacyFlatMetadata = Object.fromEntries(
    Object.entries(data).filter(([key]) => !NON_METADATA_FIELDS.has(key))
  )

  return {
    ...legacyFlatMetadata,
    ...nestedMetadata,
    type: data.type || nestedMetadata.type || legacyFlatMetadata.type,
  }
}

function normalizeVectorDocument(
  id: string,
  data: Record<string, unknown>
): {
  id: string
  vector: number[]
  text: string
  type: string
  metadata: Record<string, unknown>
} | null {
  if (!Array.isArray(data.vector)) return null

  const metadata = normalizeMetadata(data)
  const type = String(data.type || metadata.type || "")

  return {
    id,
    vector: data.vector.filter((value): value is number => typeof value === "number"),
    text:
      (typeof data.text === "string" && data.text) ||
      (typeof metadata.text === "string" && metadata.text) ||
      (typeof metadata.content === "string" && metadata.content) ||
      "",
    type,
    metadata,
  }
}

export class FirestoreVectorDB implements VectorDB {
  private collectionName = VECTOR_DB_CONFIG.firestore.collectionName

  async upsert(documents: VectorDocument[]): Promise<void> {
    const batch = adminDb.batch()

    for (const doc of documents) {
      const docRef = adminDb.collection(this.collectionName).doc(doc.id)
      const type = doc.metadata?.type
      batch.set(
        docRef,
        {
          vector: doc.vector,
          text: doc.text || "",
          type,
          metadata: doc.metadata,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      )
    }

    await batch.commit()
  }

  async query(vector: number[], options: QueryOptions = {}): Promise<QueryResult[]> {
    const { topK = 5, filter = {}, includeMetadata = true, includeValues = false } = options

    try {
      // Build Firestore query. Firestore does not support vector search here, so this
      // fallback fetches a bounded candidate set and filters/ranks in memory.
      let q: FirebaseFirestore.Query = adminDb
        .collection(this.collectionName)
        .limit(VECTOR_DB_CONFIG.firestore.maxFetchSize)

      // Apply filters
      if (filter.type) {
        q = q.where("type", "==", filter.type)
      }

      const snapshot = await q.get()
      const candidates: Array<{
        id: string
        vector: number[]
        text: string
        type: string
        metadata: Record<string, unknown>
      }> = []

      snapshot.forEach((doc) => {
        const normalized = normalizeVectorDocument(doc.id, doc.data() as Record<string, unknown>)
        if (!normalized) return

        // Check if matches filter criteria
        const filterCriteria = optionsToFilterCriteria({
          type: filter.type,
          userId: filter.userId,
          problemType: filter.problemType,
          excludeIds: filter.excludeIds,
        })

        if (
          !matchesFilter(
            {
              id: normalized.id,
              type: normalized.type,
              metadata: normalized.metadata,
            },
            filterCriteria
          )
        ) {
          return
        }

        candidates.push(normalized)
      })

      // Perform similarity search
      const results = findSimilarVectors(vector, candidates, {
        limit: topK,
        minSimilarity: filter.minSimilarity || 0.3,
        excludeIds: filter.excludeIds,
        userId: filter.userId,
        problemType: filter.problemType,
        type: filter.type,
      })

      // Convert to QueryResult format
      return results.map((result) => ({
        id: result.id,
        score: result.similarity,
        metadata: includeMetadata ? result.metadata : undefined,
        vector: includeValues ? candidates.find((c) => c.id === result.id)?.vector : undefined,
      }))
    } catch (error) {
      console.error("Error querying Firestore vector DB:", error)
      return []
    }
  }

  async delete(ids: string[]): Promise<void> {
    const batch = adminDb.batch()

    for (const id of ids) {
      const docRef = adminDb.collection(this.collectionName).doc(id)
      batch.delete(docRef)
    }

    await batch.commit()
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to read from collection
      await adminDb.collection(this.collectionName).limit(1).get()
      return true
    } catch (error) {
      console.error("Vector DB health check failed:", error)
      return false
    }
  }
}
