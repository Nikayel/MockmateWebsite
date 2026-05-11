/**
 * RAG Orchestrator
 *
 * Main entry point for RAG operations
 * Provides a clean API that abstracts the underlying implementation
 * Supports both Firestore and Pinecone backends
 */

import { HybridEmbeddingProvider, getHybridProvider } from "./embeddings/hybrid-provider"
import { embeddingCache } from "./embeddings/cache"
import { vectorDB, isPineconeEnabled, getVectorDBProvider } from "./vectordb"
import type { TextEmbedding, SimilarResult, SimilaritySearchOptions, VectorDocument } from "./types"
import { adminDb } from "../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import { trackEmbeddingUsageAccurate, EMBEDDING_COSTS } from "../usage-tracking"
import { prepareTextForEmbedding } from "./utils/sanitize"

// Initialize hybrid embedding provider
// Uses Gemini text-embedding-004 as primary (768D, most cost-effective)
// Mode: 'gemini-with-fallback' - tries Gemini first, falls back to TF-IDF if unavailable
// Model: 'text-embedding-004' - 768 dimensions, high quality and free tier available
const embeddingProvider = getHybridProvider({
  mode: "gemini-with-fallback",
  geminiModel: "text-embedding-004",
  // Keep OpenAI as secondary fallback
  openaiModel: "text-embedding-3-small",
  openaiDimensions: 1536,
  cacheEnabled: true, // Enable caching for speed and cost savings
})

// Log which vector DB and embedding provider is being used on startup
const activeProvider = embeddingProvider.getActiveProvider()
console.log(
  `[RAG] Initialized with ${getVectorDBProvider()} backend and ${activeProvider} embeddings`
)

/**
 * Generate text embedding (with caching and sanitization)
 * Uses hybrid provider which handles caching internally
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  // Sanitize text first (prevents crashes, logs issues)
  const prepared = prepareTextForEmbedding(text, { context: "generateTextEmbedding" })

  if (!prepared.valid) {
    throw new Error(`Invalid text for embedding: ${prepared.error}`)
  }

  // Hybrid provider handles caching internally with mode-aware keys
  // This ensures cache hits work correctly regardless of which provider is used
  return await embeddingProvider.generateEmbedding(prepared.text)
}

/**
 * Generate text embedding with ACCURATE usage tracking
 * Use this when you have user context to track costs
 * Now uses js-tiktoken for accurate token counting
 */
export async function generateTrackedEmbedding(text: string, userId: string): Promise<number[]> {
  // Sanitize text first
  const prepared = prepareTextForEmbedding(text, { context: `generateTrackedEmbedding:${userId}` })

  if (!prepared.valid) {
    throw new Error(`Invalid text for embedding: ${prepared.error}`)
  }

  const startTime = Date.now()
  const embedding = await embeddingProvider.generateEmbedding(prepared.text)
  const latencyMs = Date.now() - startTime

  // Determine which model was used
  const activeProvider = embeddingProvider.getActiveProvider()
  const model =
    activeProvider === "gemini"
      ? "text-embedding-004"
      : activeProvider === "openai"
        ? "text-embedding-3-small"
        : "text-embedding-004"
  const provider =
    activeProvider === "openai" ? "openai" : activeProvider === "tfidf" ? "tfidf" : "gemini"

  // Track the embedding usage with ACCURATE token counting (fire-and-forget)
  trackEmbeddingUsageAccurate({
    userId,
    texts: [prepared.text], // Use sanitized text for accurate token counting
    model: model as keyof typeof EMBEDDING_COSTS,
    provider,
    latencyMs,
    dimensions: embedding.length,
  }).catch((err) => {
    console.warn("[RAG] Failed to track embedding usage:", err)
  })

  return embedding
}

/**
 * Generate multiple embeddings with ACCURATE usage tracking
 * Batched version for efficiency
 */
export async function generateTrackedEmbeddings(
  texts: string[],
  userId: string
): Promise<number[][]> {
  if (texts.length === 0) return []

  // Sanitize all texts first
  const preparedTexts = texts
    .map((text, idx) => {
      const prepared = prepareTextForEmbedding(text, {
        context: `generateTrackedEmbeddings:${userId}:${idx}`,
      })
      if (!prepared.valid) {
        console.warn(`[RAG] Skipping invalid text at index ${idx}: ${prepared.error}`)
        return null
      }
      return prepared.text
    })
    .filter((t): t is string => t !== null)

  if (preparedTexts.length === 0) {
    throw new Error("No valid texts for embedding after sanitization")
  }

  const startTime = Date.now()
  const embeddings = await embeddingProvider.generateEmbeddings(preparedTexts)
  const latencyMs = Date.now() - startTime

  // Determine which model was used
  const activeProvider = embeddingProvider.getActiveProvider()
  const model =
    activeProvider === "gemini"
      ? "text-embedding-004"
      : activeProvider === "openai"
        ? "text-embedding-3-small"
        : "text-embedding-004"
  const provider =
    activeProvider === "openai" ? "openai" : activeProvider === "tfidf" ? "tfidf" : "gemini"

  // Track the embedding usage with ACCURATE token counting (fire-and-forget)
  trackEmbeddingUsageAccurate({
    userId,
    texts: preparedTexts, // Use sanitized texts for accurate token counting
    model: model as keyof typeof EMBEDDING_COSTS,
    provider,
    latencyMs,
    dimensions: embeddings[0]?.length || 0,
  }).catch((err) => {
    console.warn("[RAG] Failed to track embedding usage:", err)
  })

  return embeddings
}

/**
 * Store a text embedding in the vector database
 * Uses Pinecone when available, with Firestore as backup for metadata
 */
/**
 * Remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T
}

export async function storeTextEmbedding(embedding: TextEmbedding): Promise<string> {
  try {
    const timestamp = embedding.metadata.timestamp
      ? Timestamp.fromDate(new Date(embedding.metadata.timestamp))
      : Timestamp.now()

    const timestampStr = timestamp.toDate().toISOString()

    // Generate a unique ID
    const docId =
      embedding.id ||
      `${embedding.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Clean metadata to remove undefined values (Firestore doesn't accept undefined)
    const cleanedMetadata = removeUndefinedValues({
      ...embedding.metadata,
      type: embedding.type,
      timestamp: timestampStr,
    })

    // Store in the vector database (Pinecone or Firestore depending on config)
    const vectorDoc: VectorDocument = {
      id: docId,
      vector: embedding.vector,
      text: embedding.text,
      metadata: cleanedMetadata,
    }

    await vectorDB.upsert([vectorDoc])

    // If using Pinecone, also store metadata in Firestore for backup/debugging
    if (isPineconeEnabled()) {
      try {
        await adminDb
          .collection("text_embeddings")
          .doc(docId)
          .set({
            text: embedding.text,
            type: embedding.type,
            // Don't store vector in Firestore when using Pinecone (save space)
            vectorStoredIn: "pinecone",
            metadata: removeUndefinedValues({
              ...embedding.metadata,
              timestamp: timestampStr,
            }),
            createdAt: Timestamp.now(),
          })
      } catch (firestoreError) {
        // Log but don't fail - Pinecone is the primary store
        console.warn("[RAG] Failed to backup metadata to Firestore:", firestoreError)
      }
    }

    console.log(
      `[RAG] Stored embedding ${docId} (type: ${embedding.type}) in ${getVectorDBProvider()}`
    )
    return docId
  } catch (error) {
    console.error("Error storing text embedding:", error)
    throw error
  }
}

/**
 * Enrich a result with text content from metadata or Firestore
 * This helper eliminates code duplication across multiple functions
 */
async function enrichResultWithText(result: SimilarResult): Promise<SimilarResult> {
  // If text already exists in result or metadata, use it
  if (result.text && result.text.length > 0) {
    return result
  }
  if (isPineconeEnabled() && result.metadata?.text) {
    return {
      ...result,
      text: result.metadata.text,
    }
  }
  // Fallback to Firestore for text
  try {
    const doc = await adminDb.collection("text_embeddings").doc(result.id).get()
    return {
      ...result,
      text: doc.data()?.text || "",
    }
  } catch {
    return { ...result, text: "" }
  }
}

/**
 * Enrich multiple results with text content (batched for efficiency)
 */
async function enrichResultsWithText(results: SimilarResult[]): Promise<SimilarResult[]> {
  return Promise.all(results.map(enrichResultWithText))
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

  return results.map((r) => ({
    id: r.id,
    text: r.metadata?.text || "", // Get text from metadata if available
    type: r.metadata?.type || "",
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
    type: "problem",
    limit: options.limit || 5,
    excludeIds: options.excludeProblemId ? [options.excludeProblemId] : [],
    minSimilarity: 0.3,
  })

  return enrichResultsWithText(results)
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
    type: "hint",
    limit: options.limit || 3,
    minSimilarity: 0.35,
  })

  return enrichResultsWithText(results)
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
    type: "solution",
    limit: options.limit || 5,
    userId,
    minSimilarity: 0.4,
    problemType: options.problemType,
  })

  return enrichResultsWithText(results)
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
    type: "problem",
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
  const isSystemDesign = metadata.problemType === "system-design"
  const textToEmbed = isSystemDesign
    ? `System Design Solution for ${metadata.problemTitle}:\n${solutionCode}`
    : `Solution for ${metadata.problemTitle} in ${metadata.language}:\n${solutionCode}`

  // Use tracked embedding since we have user context
  const vector = await generateTrackedEmbedding(textToEmbed, userId)

  const tags = [metadata.language || "notes"]
  if (metadata.passed !== undefined) {
    tags.push(metadata.passed ? "passed" : "failed")
  }
  if (metadata.problemType) {
    tags.push(metadata.problemType)
  }
  if (isSystemDesign) {
    tags.push("system-design", "architecture")
  }

  const embedding: TextEmbedding = {
    text: solutionCode,
    type: "solution",
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
 * Enhanced with level, category, and pattern metadata for better retrieval
 */
export async function embedAndStoreHint(
  problemId: string,
  hintText: string,
  hintLevel: 1 | 2 | 3 | 4,
  metadata: {
    problemTitle: string
    problemType: string
    pattern?: string
    category?: "conceptual" | "approach" | "implementation" | "optimization" | "debugging"
    tags?: string[]
    userId?: string
  }
): Promise<string> {
  // Create a rich text representation for better embedding
  const enrichedText = `
Problem: ${metadata.problemTitle}
Pattern: ${metadata.pattern || "general"}
Hint Level ${hintLevel}: ${hintText}
Category: ${metadata.category || "approach"}
`.trim()

  // Use tracked embedding if we have user context, otherwise untracked
  const vector = metadata.userId
    ? await generateTrackedEmbedding(enrichedText, metadata.userId)
    : await generateTextEmbedding(enrichedText)

  const allTags = [
    ...(metadata.tags || []),
    `level-${hintLevel}`,
    metadata.pattern || "general",
    metadata.category || "approach",
    metadata.problemType || "dsa",
  ]

  const embedding: TextEmbedding = {
    id: `hint_${problemId}_${hintLevel}_${Date.now()}`,
    text: hintText,
    type: "hint",
    vector,
    metadata: {
      problemId,
      problemTitle: metadata.problemTitle,
      hintLevel,
      category: metadata.category || "approach",
      pattern: metadata.pattern || "general",
      problemType: metadata.problemType,
      userId: metadata.userId,
      tags: allTags,
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}

/**
 * Get similar hints from the vector DB based on problem context
 * Returns hints from similar problems that may be relevant
 */
export async function getSimilarHintsFromRAG(
  problemText: string,
  userCode: string,
  options: {
    problemId?: string
    pattern?: string
    hintLevel?: 1 | 2 | 3 | 4
    category?: string
    limit?: number
    minSimilarity?: number
  } = {}
): Promise<
  Array<{
    id: string
    content: string
    level: number
    category: string
    pattern: string
    problemTitle: string
    similarity: number
  }>
> {
  // Create a query that combines problem context and user's current code
  const queryText = `
Problem: ${problemText}
Current code approach:
${userCode.substring(0, 500)}
Pattern: ${options.pattern || "unknown"}
`.trim()

  const queryVector = await generateTextEmbedding(queryText)

  const results = await findSimilarTexts(queryVector, {
    type: "hint",
    limit: options.limit || 10,
    excludeIds: options.problemId ? [] : [],
    minSimilarity: options.minSimilarity || 0.35,
  })

  // Filter and enrich results
  const enrichedHints = results
    .filter((r) => {
      // Exclude hints from the exact same problem
      if (options.problemId && r.metadata?.problemId === options.problemId) {
        return false
      }
      // Filter by level if specified
      if (options.hintLevel && r.metadata?.hintLevel !== options.hintLevel) {
        return false
      }
      return true
    })
    .map((r) => ({
      id: r.id,
      content: r.metadata?.text || r.text || "",
      level: r.metadata?.hintLevel || 2,
      category: r.metadata?.category || "approach",
      pattern: r.metadata?.pattern || "general",
      problemTitle: r.metadata?.problemTitle || "Similar Problem",
      similarity: r.similarity,
    }))

  return enrichedHints.slice(0, options.limit || 5)
}

/**
 * Get hints that were previously generated for the same pattern
 * Useful for finding pattern-specific hints without regenerating
 */
export async function getPatternHintsFromRAG(
  pattern: string,
  options: {
    hintLevel?: 1 | 2 | 3 | 4
    limit?: number
  } = {}
): Promise<
  Array<{
    id: string
    content: string
    level: number
    category: string
    problemTitle: string
  }>
> {
  const queryText = `${pattern} pattern hints coding interview`
  const queryVector = await generateTextEmbedding(queryText)

  const results = await vectorDB.query(queryVector, {
    topK: options.limit || 5,
    filter: {
      type: "hint",
    },
    includeMetadata: true,
  })

  // Filter by pattern match in tags
  return results
    .filter((r) => {
      const tags = r.metadata?.tags
      if (typeof tags === "string") {
        return tags.includes(pattern)
      }
      if (Array.isArray(tags)) {
        return tags.some((t) => t.toLowerCase().includes(pattern.toLowerCase()))
      }
      return r.metadata?.pattern === pattern
    })
    .filter((r) => {
      if (options.hintLevel && r.metadata?.hintLevel !== options.hintLevel) {
        return false
      }
      return true
    })
    .map((r) => ({
      id: r.id,
      content: r.metadata?.text || "",
      level: r.metadata?.hintLevel || 2,
      category: r.metadata?.category || "approach",
      problemTitle: r.metadata?.problemTitle || "Pattern Problem",
    }))
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

  // Generate embedding from the text (tracked since we have user context)
  const vector = await generateTrackedEmbedding(onboardingText, userId)

  // Create the embedding object
  const embedding: TextEmbedding = {
    text: onboardingText,
    type: "onboarding",
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
export async function hasUserSolvedProblem(userId: string, problemId: string): Promise<boolean> {
  try {
    const snapshot = await adminDb
      .collection("text_embeddings")
      .where("type", "==", "solution")
      .where("metadata.problemId", "==", problemId)
      .where("metadata.userId", "==", userId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      const snapshotAlt = await adminDb
        .collection("text_embeddings")
        .where("type", "==", "solution")
        .where("metadata.problemId", "==", problemId)
        .where("metadata.user_id", "==", userId)
        .limit(1)
        .get()
      return !snapshotAlt.empty
    }

    return !snapshot.empty
  } catch (error) {
    console.error("Error checking if user solved problem:", error)
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
export * from "./public-exports"
