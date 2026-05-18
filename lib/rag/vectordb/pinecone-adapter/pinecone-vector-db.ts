import { VECTOR_CONTENT_TYPES } from "../../types"
import type { QueryOptions, QueryResult, VectorDB, VectorDocument } from "../../types"
import { GEMINI_DIM, INDEX_NAME, NAMESPACE_PREFIX, TFIDF_DIM } from "./config"
import { getPineconeClient, getVerifiedPineconeIndex } from "./client"
import { buildMetadataFilter } from "./filters"
import { flattenMetadata, restoreMetadata } from "./metadata"

export class PineconeVectorDB implements VectorDB {
  private indexName: string
  private cachedDimension: number | null = null

  constructor(indexName: string = INDEX_NAME) {
    this.indexName = indexName
  }

  async getDimension(): Promise<number> {
    await this.getIndex()
    if (this.cachedDimension == null) {
      return GEMINI_DIM
    }
    return this.cachedDimension
  }

  private async validateVectorDimension(vector: number[]): Promise<void> {
    const expected = await this.getDimension()
    if (vector.length !== expected) {
      const hint =
        vector.length === TFIDF_DIM && expected === GEMINI_DIM
          ? " Embedding fell back to TF-IDF (256D). Ensure GEMINI_API_KEY is set and Gemini is available."
          : ""
      throw new Error(
        `Vector dimension ${vector.length} does not match the index dimension ${expected}.${hint}`
      )
    }
  }

  private async getIndex() {
    return getVerifiedPineconeIndex(this.indexName, (dimension) => {
      this.cachedDimension = dimension
    })
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (documents.length === 0) return

    for (const doc of documents) {
      await this.validateVectorDimension(doc.vector)
    }

    const index = await this.getIndex()
    const docType = documents[0].metadata?.type || "general"
    const namespace = `${NAMESPACE_PREFIX}${docType}`
    const vectors = documents.map((doc) => ({
      id: doc.id,
      values: doc.vector,
      metadata: flattenMetadata(doc),
    }))

    const batchSize = 100
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize)
      await index.namespace(namespace).upsert(batch)
    }

    console.log(`[Pinecone] Upserted ${documents.length} vectors to namespace: ${namespace}`)
  }

  async query(vector: number[], options: QueryOptions = {}): Promise<QueryResult[]> {
    await this.validateVectorDimension(vector)

    const { topK = 5, filter = {}, includeMetadata = true, includeValues = false } = options
    const index = await this.getIndex()
    const docType = filter.type || "general"
    const namespace = `${NAMESPACE_PREFIX}${docType}`
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

      if (filter.excludeIds && filter.excludeIds.length > 0) {
        results = results.filter((match) => !filter.excludeIds!.includes(match.id))
      }

      if (filter.minSimilarity) {
        results = results.filter((match) => (match.score || 0) >= filter.minSimilarity!)
      }

      results = results.slice(0, topK)

      return results.map((match) => {
        if (!match.metadata) {
          return {
            id: match.id,
            score: match.score || 0,
            metadata: undefined,
            vector: includeValues ? match.values : undefined,
          }
        }

        return {
          id: match.id,
          score: match.score || 0,
          metadata: restoreMetadata(match.metadata),
          vector: includeValues ? match.values : undefined,
        }
      })
    } catch (error: any) {
      if (error.message?.includes("Namespace not found")) {
        console.log(`[Pinecone] Namespace ${namespace} not found, returning empty results`)
        return []
      }
      if (
        error.message?.includes("404") ||
        error.message?.includes("not found") ||
        error.status === 404 ||
        error.response?.status === 404
      ) {
        throw new Error(
          `Pinecone index '${this.indexName}' does not exist. ` +
            `Please create it by running: npx ts-node scripts/setup-pinecone.ts`
        )
      }
      throw error
    }
  }

  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    const index = await this.getIndex()
    const namespaces = [...VECTOR_CONTENT_TYPES, "general"]

    for (const ns of namespaces) {
      try {
        await index.namespace(`${NAMESPACE_PREFIX}${ns}`).deleteMany(ids)
      } catch {
        // Ignore errors for namespaces that don't exist.
      }
    }

    console.log(`[Pinecone] Deleted ${ids.length} vectors`)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = getPineconeClient()
      const indexList = await client.listIndexes()
      const hasIndex = indexList.indexes?.some((idx) => idx.name === this.indexName)

      if (!hasIndex) {
        console.warn(
          `[Pinecone] Index '${this.indexName}' not found. Available indexes:`,
          indexList.indexes?.map((i) => i.name)
        )
        return false
      }

      return true
    } catch (error) {
      console.error("[Pinecone] Health check failed:", error)
      return false
    }
  }

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
