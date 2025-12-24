/**
 * Vector DB Interface
 *
 * Abstract interface for vector database operations
 * Supports both Firestore (default) and Pinecone (when PINECONE_API_KEY is set)
 */

import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from '../types'
import { FirestoreVectorDB } from './firestore'
import { PineconeVectorDB } from './pinecone'

// Export the interface
export type { VectorDB, VectorDocument, QueryOptions, QueryResult }

// Export implementations
export { FirestoreVectorDB }
export { PineconeVectorDB }

/**
 * Determine which vector DB to use based on environment
 */
function createVectorDB(): VectorDB {
    const usePinecone = process.env.PINECONE_API_KEY && process.env.USE_PINECONE !== 'false'

    if (usePinecone) {
        console.log('[VectorDB] Using Pinecone for vector storage')
        return new PineconeVectorDB()
    }

    console.log('[VectorDB] Using Firestore for vector storage')
    return new FirestoreVectorDB()
}

// Default instance (automatically selects based on environment)
export const vectorDB: VectorDB = createVectorDB()

/**
 * Check if Pinecone is currently being used
 */
export function isPineconeEnabled(): boolean {
    return vectorDB instanceof PineconeVectorDB
}

/**
 * Get the current vector DB provider name
 */
export function getVectorDBProvider(): 'pinecone' | 'firestore' {
    return vectorDB instanceof PineconeVectorDB ? 'pinecone' : 'firestore'
}
