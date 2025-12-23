/**
 * RAG Orchestrator
 * 
 * Main entry point for RAG operations
 * Provides a clean API that abstracts the underlying implementation
 */

import { TFIDFEmbeddingProvider } from './embeddings/provider'
import { embeddingCache } from './embeddings/cache'
import { vectorDB } from './vectordb'
import type { TextEmbedding, SimilarResult, SimilaritySearchOptions } from './types'
import { adminDb } from '../firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

// Initialize embedding provider
const embeddingProvider = new TFIDFEmbeddingProvider()

/**
 * Generate text embedding (with caching)
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = embeddingCache.get(text)
    if (cached) return cached

    // Generate embedding
    const embedding = await embeddingProvider.generateEmbedding(text)

    // Cache it
    embeddingCache.set(text, embedding)

    return embedding
}

/**
 * Store a text embedding in the vector database
 */
export async function storeTextEmbedding(embedding: TextEmbedding): Promise<string> {
    try {
        const timestamp = embedding.metadata.timestamp
            ? Timestamp.fromDate(new Date(embedding.metadata.timestamp))
            : Timestamp.now()

        const docRef = await adminDb.collection('text_embeddings').add({
            ...embedding,
            metadata: {
                ...embedding.metadata,
                timestamp: timestamp.toDate().toISOString(),
            },
            createdAt: Timestamp.now(),
        })
        return docRef.id
    } catch (error) {
        console.error('Error storing text embedding:', error)
        throw error
    }
}

/**
 * Find similar texts based on embedding similarity
 */
export async function findSimilarTexts(
    queryVector: number[],
    options: SimilaritySearchOptions = {}
): Promise<SimilarResult[]> {
    const results = await vectorDB.query(queryVector, {
        topK: options.limit || 5,
        filter: {
            type: options.type,
            userId: options.userId,
            problemType: options.problemType,
            excludeIds: options.excludeIds,
            minSimilarity: options.minSimilarity,
        },
        includeMetadata: true,
    })

    return results.map(r => ({
        id: r.id,
        text: '', // Will be populated from metadata if needed
        type: r.metadata?.type || '',
        similarity: r.score,
        metadata: r.metadata || {},
    }))
}

/**
 * Get similar problems based on a problem statement
 */
export async function getSimilarProblems(
    problemText: string,
    options: {
        limit?: number
        excludeProblemId?: string
        difficulty?: string
    } = {}
): Promise<SimilarResult[]> {
    const queryVector = await generateTextEmbedding(problemText)

    const results = await findSimilarTexts(queryVector, {
        type: 'problem',
        limit: options.limit || 5,
        excludeIds: options.excludeProblemId ? [options.excludeProblemId] : [],
        minSimilarity: 0.3,
    })

    // Fetch full text for results
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
            return {
                ...result,
                text: doc.data()?.text || result.text,
            }
        })
    )

    return enrichedResults
}

/**
 * Get relevant hints based on the current problem and user's code
 */
export async function getRelevantHints(
    problemText: string,
    userCode: string,
    options: {
        limit?: number
    } = {}
): Promise<SimilarResult[]> {
    const combinedText = `${problemText}\n\nUser's current approach:\n${userCode}`
    const queryVector = await generateTextEmbedding(combinedText)

    const results = await findSimilarTexts(queryVector, {
        type: 'hint',
        limit: options.limit || 3,
        minSimilarity: 0.35,
    })

    // Fetch full text for results
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
            return {
                ...result,
                text: doc.data()?.text || result.text,
            }
        })
    )

    return enrichedResults
}

/**
 * Get past solutions similar to current problem
 */
export async function getSimilarSolutions(
    problemText: string,
    userId: string,
    options: {
        limit?: number
        problemType?: string
    } = {}
): Promise<SimilarResult[]> {
    const queryVector = await generateTextEmbedding(problemText)

    const results = await findSimilarTexts(queryVector, {
        type: 'solution',
        limit: options.limit || 5,
        userId,
        minSimilarity: 0.4,
        problemType: options.problemType,
    })

    // Fetch full text for results
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
            return {
                ...result,
                text: doc.data()?.text || result.text,
            }
        })
    )

    return enrichedResults
}

/**
 * Store problem embedding for future retrieval
 */
export async function embedAndStoreProblem(
    problemId: string,
    problemText: string,
    metadata: {
        title: string
        difficulty: string
        type: string
        tags: string[]
    }
): Promise<string> {
    const vector = await generateTextEmbedding(problemText)

    const embedding: TextEmbedding = {
        text: problemText,
        type: 'problem',
        vector,
        metadata: {
            problemId,
            difficulty: metadata.difficulty,
            tags: metadata.tags,
            timestamp: new Date().toISOString(),
        },
    }

    return storeTextEmbedding(embedding)
}

/**
 * Store solution embedding for user's history
 */
export async function embedAndStoreSolution(
    userId: string,
    problemId: string,
    solutionCode: string,
    metadata: {
        problemTitle: string
        language: string
        passed: boolean
        score: number
        problemType?: string
    }
): Promise<string> {
    const isSystemDesign = metadata.problemType === 'system-design'
    const textToEmbed = isSystemDesign
        ? `System Design Solution for ${metadata.problemTitle}:\n${solutionCode}`
        : `Solution for ${metadata.problemTitle} in ${metadata.language}:\n${solutionCode}`

    const vector = await generateTextEmbedding(textToEmbed)

    const tags = [metadata.language || 'notes']
    if (metadata.passed !== undefined) {
        tags.push(metadata.passed ? 'passed' : 'failed')
    }
    if (metadata.problemType) {
        tags.push(metadata.problemType)
    }
    if (isSystemDesign) {
        tags.push('system-design', 'architecture')
    }

    const embedding: TextEmbedding = {
        text: solutionCode,
        type: 'solution',
        vector,
        metadata: {
            problemId,
            userId,
            user_id: userId, // For Firestore rules compatibility
            tags,
            timestamp: new Date().toISOString(),
        },
    }

    return storeTextEmbedding(embedding)
}

/**
 * Store a hint for future retrieval
 */
export async function embedAndStoreHint(
    problemId: string,
    hintText: string,
    hintLevel: number,
    metadata: {
        problemTitle: string
        problemType: string
        tags: string[]
    }
): Promise<string> {
    const vector = await generateTextEmbedding(hintText)

    const embedding: TextEmbedding = {
        text: hintText,
        type: 'hint',
        vector,
        metadata: {
            problemId,
            tags: [...metadata.tags, `level-${hintLevel}`],
            timestamp: new Date().toISOString(),
        },
    }

    return storeTextEmbedding(embedding)
}

/**
 * Check if user has solved a problem by problemId
 */
export async function hasUserSolvedProblem(
    userId: string,
    problemId: string
): Promise<boolean> {
    try {
        const snapshot = await adminDb.collection('text_embeddings')
            .where('type', '==', 'solution')
            .where('metadata.problemId', '==', problemId)
            .where('metadata.userId', '==', userId)
            .limit(1)
            .get()

        if (snapshot.empty) {
            const snapshotAlt = await adminDb.collection('text_embeddings')
                .where('type', '==', 'solution')
                .where('metadata.problemId', '==', problemId)
                .where('metadata.user_id', '==', userId)
                .limit(1)
                .get()
            return !snapshotAlt.empty
        }

        return !snapshot.empty
    } catch (error) {
        console.error('Error checking if user solved problem:', error)
        return false
    }
}

/**
 * Get recommended next problems based on what user just solved
 */
export async function getRecommendedNextProblems(
    userId: string,
    currentProblemText: string,
    currentProblemId?: string
): Promise<SimilarResult[]> {
    const similarProblems = await getSimilarProblems(currentProblemText, {
        limit: 15,
        excludeProblemId: currentProblemId,
    })

    const unsolvedProblems: SimilarResult[] = []

    for (const problem of similarProblems) {
        const problemId = problem.metadata?.problemId
        if (!problemId) continue

        const hasSolved = await hasUserSolvedProblem(userId, problemId)

        if (!hasSolved) {
            unsolvedProblems.push(problem)
        }
    }

    return unsolvedProblems.slice(0, 3)
}

// Re-export types for convenience
export type {
    TextEmbedding,
    SimilarResult,
    SessionMetrics,
    SessionVector,
    CodeFeatures,
    UserPerformanceProfile,
} from './types'

// Re-export vectorization functions
export {
    vectorizeSessionMetrics,
    extractCodeFeatures,
    vectorizeCodeFeatures,
    storeSessionVector,
    findSimilarSessions,
    getUserPerformanceProfile,
    updateUserPerformanceProfile,
    getRecommendedScenarios,
    getAggregateAnalytics,
} from './vectorization'

