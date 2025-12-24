/**
 * Pinecone Vector DB Implementation
 *
 * Production-ready Pinecone integration for vector similarity search
 * Provides faster queries and better scalability than Firestore
 */

import { Pinecone } from '@pinecone-database/pinecone'
import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from '../types'

// Pinecone index configuration
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'mockmate-rag'
const NAMESPACE_PREFIX = 'mockmate_'

// Singleton Pinecone client
let pineconeClient: Pinecone | null = null

/**
 * Get or create the Pinecone client
 */
function getPineconeClient(): Pinecone {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY
        if (!apiKey) {
            throw new Error('PINECONE_API_KEY environment variable is required')
        }
        pineconeClient = new Pinecone({ apiKey })
    }
    return pineconeClient
}

/**
 * Map our filter types to Pinecone metadata filter format
 */
function buildMetadataFilter(filter: QueryOptions['filter']): Record<string, any> | undefined {
    if (!filter) return undefined

    const conditions: Record<string, any>[] = []

    if (filter.type) {
        conditions.push({ type: { $eq: filter.type } })
    }

    if (filter.userId) {
        // Support both userId and user_id for backwards compatibility
        conditions.push({
            $or: [
                { userId: { $eq: filter.userId } },
                { user_id: { $eq: filter.userId } }
            ]
        })
    }

    if (filter.problemType) {
        conditions.push({ problemType: { $eq: filter.problemType } })
    }

    if (filter.excludeIds && filter.excludeIds.length > 0) {
        // Pinecone doesn't have $nin, so we handle exclusion client-side
        // This is a limitation we'll work around
    }

    if (conditions.length === 0) return undefined
    if (conditions.length === 1) return conditions[0]
    return { $and: conditions }
}

export class PineconeVectorDB implements VectorDB {
    private indexName: string

    constructor(indexName: string = INDEX_NAME) {
        this.indexName = indexName
    }

    /**
     * Get the Pinecone index
     * Throws a helpful error if the index doesn't exist
     */
    private async getIndex() {
        const client = getPineconeClient()
        
        // Check if index exists first
        try {
            const indexList = await client.listIndexes()
            const exists = indexList.indexes?.some(idx => idx.name === this.indexName)
            
            if (!exists) {
                throw new Error(
                    `Pinecone index '${this.indexName}' does not exist. ` +
                    `Please create it by running: npx ts-node scripts/setup-pinecone.ts ` +
                    `or set PINECONE_INDEX_NAME to an existing index name.`
                )
            }
        } catch (error: any) {
            // If listIndexes fails, it might be a permissions issue
            if (error.message?.includes('does not exist')) {
                throw error
            }
            // Otherwise, try to proceed - the index might exist but we can't list it
            console.warn('[Pinecone] Could not verify index existence:', error.message)
        }
        
        return client.index(this.indexName)
    }

    /**
     * Upsert vectors into Pinecone
     */
    async upsert(documents: VectorDocument[]): Promise<void> {
        if (documents.length === 0) return

        const index = await this.getIndex()

        // Determine namespace from the first document's type
        const docType = documents[0].metadata?.type || 'general'
        const namespace = `${NAMESPACE_PREFIX}${docType}`

        // Prepare vectors for Pinecone
        const vectors = documents.map(doc => ({
            id: doc.id,
            values: doc.vector,
            metadata: {
                ...doc.metadata,
                text: doc.text || '',
                // Flatten any nested objects (Pinecone doesn't support nested)
                ...(doc.metadata?.tags ? { tags: doc.metadata.tags.join(',') } : {}),
            },
        }))

        // Batch upsert (Pinecone recommends batches of 100)
        const batchSize = 100
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize)
            await index.namespace(namespace).upsert(batch)
        }

        console.log(`[Pinecone] Upserted ${documents.length} vectors to namespace: ${namespace}`)
    }

    /**
     * Query vectors from Pinecone
     */
    async query(vector: number[], options: QueryOptions = {}): Promise<QueryResult[]> {
        const {
            topK = 5,
            filter = {},
            includeMetadata = true,
            includeValues = false,
        } = options

        const index = this.getIndex()

        // Determine namespace from filter type
        const docType = filter.type || 'general'
        const namespace = `${NAMESPACE_PREFIX}${docType}`

        // Build metadata filter
        const metadataFilter = buildMetadataFilter(filter)

        try {
            const queryResponse = await index.namespace(namespace).query({
                vector,
                topK: filter.excludeIds ? topK + filter.excludeIds.length : topK,
                includeMetadata,
                includeValues,
                filter: metadataFilter,
            })

            let results = queryResponse.matches || []

            // Client-side exclusion of specific IDs
            if (filter.excludeIds && filter.excludeIds.length > 0) {
                results = results.filter(match => !filter.excludeIds!.includes(match.id))
            }

            // Client-side minimum similarity filter
            if (filter.minSimilarity) {
                results = results.filter(match => (match.score || 0) >= filter.minSimilarity!)
            }

            // Limit to requested topK after exclusions
            results = results.slice(0, topK)

            return results.map(match => ({
                id: match.id,
                score: match.score || 0,
                metadata: match.metadata ? {
                    ...match.metadata,
                    // Restore tags from comma-separated string
                    tags: typeof match.metadata.tags === 'string'
                        ? match.metadata.tags.split(',').filter(Boolean)
                        : match.metadata.tags,
                } : undefined,
                vector: includeValues ? match.values : undefined,
            }))
        } catch (error: any) {
            // Handle namespace not found gracefully
            if (error.message?.includes('Namespace not found')) {
                console.log(`[Pinecone] Namespace ${namespace} not found, returning empty results`)
                return []
            }
            throw error
        }
    }

    /**
     * Delete vectors from Pinecone
     */
    async delete(ids: string[]): Promise<void> {
        if (ids.length === 0) return

        const index = this.getIndex()

        // Delete from all namespaces since we don't know which one
        const namespaces = ['problem', 'solution', 'hint', 'feedback', 'onboarding', 'general']

        for (const ns of namespaces) {
            try {
                await index.namespace(`${NAMESPACE_PREFIX}${ns}`).deleteMany(ids)
            } catch (error) {
                // Ignore errors for namespaces that don't exist
            }
        }

        console.log(`[Pinecone] Deleted ${ids.length} vectors`)
    }

    /**
     * Health check for Pinecone connection
     */
    async healthCheck(): Promise<boolean> {
        try {
            const client = getPineconeClient()
            const indexList = await client.listIndexes()

            // Check if our index exists
            const hasIndex = indexList.indexes?.some(idx => idx.name === this.indexName)

            if (!hasIndex) {
                console.warn(`[Pinecone] Index '${this.indexName}' not found. Available indexes:`,
                    indexList.indexes?.map(i => i.name))
                return false
            }

            return true
        } catch (error) {
            console.error('[Pinecone] Health check failed:', error)
            return false
        }
    }

    /**
     * Get index statistics
     */
    async getStats(): Promise<{
        totalVectors: number
        namespaces: Record<string, number>
    }> {
        const index = this.getIndex()
        const stats = await index.describeIndexStats()

        return {
            totalVectors: stats.totalRecordCount || 0,
            namespaces: stats.namespaces
                ? Object.fromEntries(
                    Object.entries(stats.namespaces).map(([ns, data]) => [ns, data.recordCount || 0])
                )
                : {},
        }
    }
}

/**
 * Create and initialize a Pinecone index (run once during setup)
 * This should be called from a setup script, not during normal operation
 */
export async function createPineconeIndex(
    dimension: number = 256,
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
): Promise<void> {
    const client = getPineconeClient()

    // Check if index already exists
    const indexList = await client.listIndexes()
    const exists = indexList.indexes?.some(idx => idx.name === INDEX_NAME)

    if (exists) {
        console.log(`[Pinecone] Index '${INDEX_NAME}' already exists`)
        return
    }

    // Create serverless index (uses the free tier)
    await client.createIndex({
        name: INDEX_NAME,
        dimension,
        metric,
        spec: {
            serverless: {
                cloud: 'aws',
                region: 'us-east-1', // Free tier is limited to us-east-1
            },
        },
    })

    console.log(`[Pinecone] Created index '${INDEX_NAME}' with dimension ${dimension}`)

    // Wait for index to be ready
    let ready = false
    while (!ready) {
        const description = await client.describeIndex(INDEX_NAME)
        ready = description.status?.ready || false
        if (!ready) {
            console.log('[Pinecone] Waiting for index to be ready...')
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }

    console.log(`[Pinecone] Index '${INDEX_NAME}' is ready`)
}
