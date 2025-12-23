/**
 * Firestore Vector DB Implementation
 * 
 * Implements VectorDB interface using Firestore
 */

import { adminDb } from "../../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from '../types'
import { findSimilarVectors } from '../retrieval/similarity'
import { matchesFilter, optionsToFilterCriteria } from '../retrieval/filters'

export class FirestoreVectorDB implements VectorDB {
    private collectionName = 'text_embeddings'

    async upsert(documents: VectorDocument[]): Promise<void> {
        const batch = adminDb.batch()

        for (const doc of documents) {
            const docRef = adminDb.collection(this.collectionName).doc(doc.id)
            batch.set(docRef, {
                vector: doc.vector,
                text: doc.text || '',
                ...doc.metadata,
                updatedAt: Timestamp.now(),
            }, { merge: true })
        }

        await batch.commit()
    }

    async query(vector: number[], options: QueryOptions = {}): Promise<QueryResult[]> {
        const {
            topK = 5,
            filter = {},
            includeMetadata = true,
            includeValues = false,
        } = options

        try {
            // Build Firestore query
            let q: FirebaseFirestore.Query = adminDb.collection(this.collectionName)
                .orderBy('metadata.timestamp', 'desc')
                .limit(200) // Fetch more to filter client-side

            // Apply filters
            if (filter.type) {
                q = q.where('type', '==', filter.type)
            }
            if (filter.userId) {
                q = q.where('metadata.userId', '==', filter.userId)
            }

            const snapshot = await q.get()
            const candidates: Array<{
                id: string
                vector: number[]
                text: string
                type: string
                metadata: any
            }> = []

            snapshot.forEach(doc => {
                const data = doc.data()

                // Check if matches filter criteria
                const filterCriteria = optionsToFilterCriteria({
                    type: filter.type as any,
                    userId: filter.userId,
                    problemType: filter.problemType,
                    excludeIds: filter.excludeIds,
                })

                if (!matchesFilter({
                    id: doc.id,
                    type: data.type,
                    metadata: data.metadata,
                }, filterCriteria)) {
                    return
                }

                candidates.push({
                    id: doc.id,
                    vector: data.vector,
                    text: data.text || '',
                    type: data.type,
                    metadata: data.metadata || {},
                })
            })

            // Perform similarity search
            const results = findSimilarVectors(vector, candidates, {
                limit: topK,
                minSimilarity: filter.minSimilarity || 0.3,
                excludeIds: filter.excludeIds,
                userId: filter.userId,
                problemType: filter.problemType,
                type: filter.type as any,
            })

            // Convert to QueryResult format
            return results.map(result => ({
                id: result.id,
                score: result.similarity,
                metadata: includeMetadata ? result.metadata : undefined,
                vector: includeValues ? candidates.find(c => c.id === result.id)?.vector : undefined,
            }))
        } catch (error) {
            console.error('Error querying Firestore vector DB:', error)
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
            console.error('Vector DB health check failed:', error)
            return false
        }
    }
}

