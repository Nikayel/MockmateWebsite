/**
 * RAG Orchestrator
 *
 * Main entry point for RAG operations
 * Provides a clean API that abstracts the underlying implementation
 * Supports both Firestore and Pinecone backends
 */

import { HybridEmbeddingProvider, getHybridProvider } from './embeddings/hybrid-provider'
import { embeddingCache } from './embeddings/cache'
import { vectorDB, isPineconeEnabled, getVectorDBProvider } from './vectordb'
import type { TextEmbedding, SimilarResult, SimilaritySearchOptions, VectorDocument } from './types'
import { adminDb } from '../firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

// Initialize hybrid embedding provider
// Uses OpenAI (small) as primary for better accuracy, with TF-IDF fallback for speed/cost
// Mode: 'openai-with-fallback' - tries OpenAI first, falls back to TF-IDF if unavailable
// Model: 'text-embedding-3-small' - 1536 dimensions, fastest and cheapest OpenAI option
const embeddingProvider = getHybridProvider({
    mode: 'openai-with-fallback',
    openaiModel: 'text-embedding-3-small',
    openaiDimensions: 1536, // Matches Pinecone index dimensions
    cacheEnabled: true, // Enable caching for speed and cost savings
})

// Log which vector DB and embedding provider is being used on startup
const activeProvider = embeddingProvider.getActiveProvider()
console.log(`[RAG] Initialized with ${getVectorDBProvider()} backend and ${activeProvider} embeddings`)

/**
 * Generate text embedding (with caching)
 * Uses hybrid provider which handles caching internally
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
    // Hybrid provider handles caching internally with mode-aware keys
    // This ensures cache hits work correctly regardless of which provider is used
    return await embeddingProvider.generateEmbedding(text)
}

/**
 * Store a text embedding in the vector database
 * Uses Pinecone when available, with Firestore as backup for metadata
 */
export async function storeTextEmbedding(embedding: TextEmbedding): Promise<string> {
    try {
        const timestamp = embedding.metadata.timestamp
            ? Timestamp.fromDate(new Date(embedding.metadata.timestamp))
            : Timestamp.now()

        const timestampStr = timestamp.toDate().toISOString()

        // Generate a unique ID
        const docId = embedding.id || `${embedding.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // Store in the vector database (Pinecone or Firestore depending on config)
        const vectorDoc: VectorDocument = {
            id: docId,
            vector: embedding.vector,
            text: embedding.text,
            metadata: {
                ...embedding.metadata,
                type: embedding.type,
                timestamp: timestampStr,
            },
        }

        await vectorDB.upsert([vectorDoc])

        // If using Pinecone, also store metadata in Firestore for backup/debugging
        if (isPineconeEnabled()) {
            try {
                await adminDb.collection('text_embeddings').doc(docId).set({
                    text: embedding.text,
                    type: embedding.type,
                    // Don't store vector in Firestore when using Pinecone (save space)
                    vectorStoredIn: 'pinecone',
                    metadata: {
                        ...embedding.metadata,
                        timestamp: timestampStr,
                    },
                    createdAt: Timestamp.now(),
                })
            } catch (firestoreError) {
                // Log but don't fail - Pinecone is the primary store
                console.warn('[RAG] Failed to backup metadata to Firestore:', firestoreError)
            }
        }

        console.log(`[RAG] Stored embedding ${docId} (type: ${embedding.type}) in ${getVectorDBProvider()}`)
        return docId
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

    // Enrich results with text
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            // If using Pinecone, text is in metadata
            if (isPineconeEnabled() && result.metadata?.text) {
                return {
                    ...result,
                    text: result.metadata.text,
                }
            }
            // Fallback to Firestore for text
            try {
                const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
                return {
                    ...result,
                    text: doc.data()?.text || result.text || '',
                }
            } catch {
                return { ...result, text: result.text || '' }
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

    // Enrich results with text
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            // If using Pinecone, text is in metadata
            if (isPineconeEnabled() && result.metadata?.text) {
                return {
                    ...result,
                    text: result.metadata.text,
                }
            }
            // Fallback to Firestore for text
            try {
                const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
                return {
                    ...result,
                    text: doc.data()?.text || result.text || '',
                }
            } catch {
                return { ...result, text: result.text || '' }
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

    // Enrich results with text
    const enrichedResults = await Promise.all(
        results.map(async (result) => {
            // If using Pinecone, text is in metadata
            if (isPineconeEnabled() && result.metadata?.text) {
                return {
                    ...result,
                    text: result.metadata.text,
                }
            }
            // Fallback to Firestore for text
            try {
                const doc = await adminDb.collection('text_embeddings').doc(result.id).get()
                return {
                    ...result,
                    text: doc.data()?.text || result.text || '',
                }
            } catch {
                return { ...result, text: result.text || '' }
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
 * Store onboarding data as an embedding for RAG retrieval
 * This allows us to find users with similar backgrounds/goals
 */
export async function embedAndStoreOnboarding(
    userId: string,
    role: string,
    goal: string
): Promise<string> {
    // Convert onboarding data to text that can be embedded
    // This text will be used to find similar users
    const onboardingText = `User profile: ${role} engineer with goal of ${goal}`

    // Generate embedding from the text
    const vector = await generateTextEmbedding(onboardingText)

    // Create the embedding object
    const embedding: TextEmbedding = {
        text: onboardingText,
        type: 'onboarding',
        vector,
        metadata: {
            userId,
            user_id: userId, // For Firestore rules compatibility
            role,
            goal,
            tags: [role, goal],
            timestamp: new Date().toISOString(),
        },
    }

    // Store it in the database
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

// ============================================
// NEW RAG v2 EXPORTS - OpenAI + Comprehensive RAG
// ============================================

// Embedding providers
export {
    OpenAIEmbeddingProvider,
    getOpenAIProvider,
    isOpenAIAvailable,
} from './embeddings/openai-provider'

export {
    HybridEmbeddingProvider,
    getHybridProvider,
    createHybridProvider,
    generateHybridEmbedding,
    generateHybridEmbeddings,
    type HybridMode,
} from './embeddings/hybrid-provider'

// Advanced retrieval
export {
    AdvancedRetriever,
    getAdvancedRetriever,
    advancedRetrieve,
    type AdvancedRetrievalOptions,
    type EnhancedRetrievalResult,
    type RetrievalAnalytics,
} from './retrieval/advanced-retrieval'

// Knowledge base
export {
    seedKnowledgeBase,
    isKnowledgeBaseSeeded,
    getKnowledgeBaseSeeder,
} from './knowledge-base/seeder'

export {
    getPatternKnowledge,
    getAllPatternKnowledge,
    getPatternsByDifficulty,
    getRelatedPatterns,
    patternKnowledgeToDocument,
    DSA_PATTERN_KNOWLEDGE,
} from './knowledge-base/dsa-knowledge'

export {
    getCompanyInterviewKnowledge,
    getAllCompanyKnowledge,
    getMostCommonPatterns,
    companyKnowledgeToDocument,
    COMPANY_INTERVIEW_KNOWLEDGE,
} from './knowledge-base/company-knowledge'

// Context builder
export {
    RAGContextBuilder,
    getContextBuilder,
    buildRoadmapContext,
    buildHintContext,
    buildFeedbackContext,
    type BuiltContext,
    type ContextType,
    type RoadmapContextOptions,
    type ProblemContextOptions,
} from './context-builder'

// RAG-enhanced roadmap
export {
    RAGRoadmapGenerator,
    getRAGRoadmapGenerator,
    generateRAGEnhancedRoadmap,
    isRAGAvailable,
    type RAGEnhancedRoadmap,
    type RAGRoadmapOptions,
    type PatternInsight,
    type AdaptiveAdjustment,
    type StudyStrategy,
} from './roadmap-rag'

// User performance RAG
export {
    UserPerformanceRAG,
    getUserPerformanceRAG,
    getUserPerformanceProfile as getEnhancedUserProfile,
    getUserRecommendations,
    type UserPerformanceProfile as EnhancedUserPerformanceProfile,
    type PatternProficiency,
    type PersonalizedRecommendation,
} from './user-performance-rag'

// Monitoring
export {
    RAGMonitor,
    getRAGMonitor,
    checkRAGHealth,
    getRAGMetrics,
    recordRAGError,
    type RAGSystemHealth,
    type ComponentHealth,
    type RAGMetrics,
    type RAGError,
    type CostEstimate,
} from './monitoring'

// Problem vectorization
export {
    vectorizeAllProblems,
    vectorizeSingleProblem,
    getVectorizationStatus,
    type VectorizationResult,
    type VectorizationProgressCallback,
} from './problem-vectorization'

