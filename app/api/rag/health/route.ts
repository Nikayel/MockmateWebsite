import { NextResponse } from 'next/server'
import { vectorDB, getVectorDBProvider, isPineconeEnabled } from '@/lib/rag/vectordb'
import { PineconeVectorDB } from '@/lib/rag/vectordb/pinecone'

/**
 * Health check endpoint for RAG system
 * GET /api/rag/health
 *
 * Returns the status of the vector database and its statistics
 */
export async function GET() {
    try {
        const provider = getVectorDBProvider()
        const isHealthy = await vectorDB.healthCheck()

        const response: {
            status: 'healthy' | 'unhealthy'
            provider: string
            isPinecone: boolean
            stats?: {
                totalVectors: number
                namespaces: Record<string, number>
            }
            error?: string
        } = {
            status: isHealthy ? 'healthy' : 'unhealthy',
            provider,
            isPinecone: isPineconeEnabled(),
        }

        // Get stats if using Pinecone and healthy
        if (isPineconeEnabled() && isHealthy && vectorDB instanceof PineconeVectorDB) {
            try {
                const stats = await (vectorDB as PineconeVectorDB).getStats()
                response.stats = stats
            } catch (statsError) {
                console.warn('Failed to get Pinecone stats:', statsError)
            }
        }

        return NextResponse.json(response, {
            status: isHealthy ? 200 : 503,
        })
    } catch (error) {
        console.error('RAG health check failed:', error)
        return NextResponse.json(
            {
                status: 'unhealthy',
                provider: getVectorDBProvider(),
                isPinecone: isPineconeEnabled(),
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 503 }
        )
    }
}
