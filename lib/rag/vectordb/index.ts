/**
 * Vector DB Interface
 * 
 * Abstract interface for vector database operations
 * Current implementation: Firestore
 * Future: Can add Pinecone, Weaviate, etc.
 */

import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from '../types'
import { FirestoreVectorDB } from './firestore'

// Export the interface
export type { VectorDB, VectorDocument, QueryOptions, QueryResult }

// Export implementations
export { FirestoreVectorDB }

// Default instance (can be swapped for Pinecone, etc.)
export const vectorDB: VectorDB = new FirestoreVectorDB()

