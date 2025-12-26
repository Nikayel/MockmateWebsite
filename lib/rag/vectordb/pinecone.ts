/**
 * Pinecone Vector DB Implementation
 *
 * Production-ready Pinecone integration for vector similarity search
 * Provides faster queries and better scalability than Firestore
 */

import { Pinecone } from '@pinecone-database/pinecone'
import type { VectorDB, VectorDocument, QueryOptions, QueryResult } from '../types'

// Pinecone index configuration
// Default to skillon-raggemini for Gemini embeddings (768D)
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'skillon-raggemini'
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
     * Throws a helpful error if the index doesn't exist or has wrong dimensions
     */
    private async getIndex() {
        const client = getPineconeClient()

        // Check if index exists first
        try {
            const indexList = await client.listIndexes()
            const indexInfo = indexList.indexes?.find(idx => idx.name === this.indexName)

            if (!indexInfo) {
                throw new Error(
                    `Pinecone index '${this.indexName}' does not exist. ` +
                    `Please create it by running: npx ts-node scripts/setup-pinecone.ts ` +
                    `or set PINECONE_INDEX_NAME to an existing index name.`
                )
            }

            // Validate dimensions - support Gemini (768), TF-IDF (256), and OpenAI (1536)
            const SUPPORTED_DIMENSIONS = [256, 768, 1536]
            const dimension = indexInfo.dimension
            if (!dimension || !SUPPORTED_DIMENSIONS.includes(dimension)) {
                throw new Error(
                    `Pinecone index '${this.indexName}' has unsupported dimensions. ` +
                    `Supported dimensions: ${SUPPORTED_DIMENSIONS.join(', ')} (256 for TF-IDF, 768 for Gemini, 1536 for OpenAI). ` +
                    `Index has ${dimension ?? 'unknown'} dimensions. ` +
                    `Please delete the existing index and create a new one with one of the supported dimensions, ` +
                    `or update your embedding provider to match the index dimensions.`
                )
            }

            // Log which embedding type matches this index
            if (dimension === 768) {
                console.log(`[Pinecone] Index configured for Gemini embeddings (768 dimensions)`)
            } else if (dimension === 1536) {
                console.log(`[Pinecone] Index configured for OpenAI embeddings (1536 dimensions)`)
            } else if (dimension === 256) {
                console.log(`[Pinecone] Index configured for TF-IDF embeddings (256 dimensions)`)
            }
        } catch (error: any) {
            // If listIndexes fails, it might be a permissions issue
            if (error.message?.includes('does not exist') || error.message?.includes('dimension mismatch')) {
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
        const vectors = documents.map(doc => {
            // Flatten metadata - Pinecone doesn't support nested objects
            const flatMetadata: Record<string, any> = {
                ...doc.metadata,
                text: doc.text || '',
            }
            
            // Flatten tags array to comma-separated string
            if (doc.metadata?.tags && Array.isArray(doc.metadata.tags)) {
                flatMetadata.tags = doc.metadata.tags.join(',')
            }
            
            // Flatten topPatterns array to comma-separated string
            if (doc.metadata?.topPatterns && Array.isArray(doc.metadata.topPatterns)) {
                flatMetadata.topPatterns = doc.metadata.topPatterns.join(',')
            }
            
            // Flatten difficultyDistribution object to string
            if (doc.metadata?.difficultyDistribution && typeof doc.metadata.difficultyDistribution === 'object') {
                const dist = doc.metadata.difficultyDistribution as Record<string, any>
                flatMetadata.difficultyDistribution = `easy:${dist.easy || 0},medium:${dist.medium || 0},hard:${dist.hard || 0}`
            }
            
            // Remove any remaining nested objects/arrays
            Object.keys(flatMetadata).forEach(key => {
                const value = flatMetadata[key]
                if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    // Convert nested object to JSON string
                    flatMetadata[key] = JSON.stringify(value)
                } else if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'string') {
                    // Convert array of non-strings to comma-separated string
                    flatMetadata[key] = value.join(',')
                }
            })
            
            return {
                id: doc.id,
                values: doc.vector,
                metadata: flatMetadata,
            }
        })

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

        const index = await this.getIndex()

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

            return results.map(match => {
                if (!match.metadata) {
                    return {
                        id: match.id,
                        score: match.score || 0,
                        metadata: undefined,
                        vector: includeValues ? match.values : undefined,
                    }
                }

                const restored: Record<string, any> = { ...match.metadata }

                // Restore tags from comma-separated string
                if (typeof restored.tags === 'string') {
                    restored.tags = restored.tags.split(',').filter(Boolean)
                }

                // Restore topPatterns from comma-separated string
                if (typeof restored.topPatterns === 'string') {
                    restored.topPatterns = restored.topPatterns.split(',').filter(Boolean)
                }

                // Restore difficultyDistribution from string format
                if (typeof restored.difficultyDistribution === 'string') {
                    const distStr = restored.difficultyDistribution
                    const dist: Record<string, number> = {}
                    distStr.split(',').forEach(part => {
                        const [key, value] = part.split(':')
                        if (key && value) {
                            dist[key.trim()] = parseFloat(value.trim()) || 0
                        }
                    })
                    restored.difficultyDistribution = dist
                }

                return {
                    id: match.id,
                    score: match.score || 0,
                    metadata: restored,
                    vector: includeValues ? match.values : undefined,
                }
            })
        } catch (error: any) {
            // Handle namespace not found gracefully
            if (error.message?.includes('Namespace not found')) {
                console.log(`[Pinecone] Namespace ${namespace} not found, returning empty results`)
                return []
            }
            // Handle index not found (404)
            if (error.message?.includes('404') || error.message?.includes('not found') ||
                error.status === 404 || error.response?.status === 404) {
                throw new Error(
                    `Pinecone index '${this.indexName}' does not exist. ` +
                    `Please create it by running: npx ts-node scripts/setup-pinecone.ts`
                )
            }
            throw error
        }
    }

    /**
     * Delete vectors from Pinecone
     */
    async delete(ids: string[]): Promise<void> {
        if (ids.length === 0) return

        const index = await this.getIndex()

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
        const index = await this.getIndex()
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
 * Default dimension is 768 for Gemini text-embedding-004
 */
export async function createPineconeIndex(
    dimension: number = 768,
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
