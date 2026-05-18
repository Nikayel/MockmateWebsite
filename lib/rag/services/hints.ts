import type { SimilarResult, TextEmbedding } from "../types"
import { vectorDB } from "../vectordb"
import { generateTextEmbedding, generateTrackedEmbedding } from "./embeddings"
import { enrichResultsWithText, findSimilarTexts } from "./similarity"
import { storeTextEmbedding } from "./storage"

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
  const enrichedText = `
Problem: ${metadata.problemTitle}
Pattern: ${metadata.pattern || "general"}
Hint Level ${hintLevel}: ${hintText}
Category: ${metadata.category || "approach"}
`.trim()

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

  const enrichedHints = results
    .filter((result) => {
      if (options.problemId && result.metadata?.problemId === options.problemId) {
        return false
      }
      if (options.hintLevel && result.metadata?.hintLevel !== options.hintLevel) {
        return false
      }
      return true
    })
    .map((result) => ({
      id: result.id,
      content: result.metadata?.text || result.text || "",
      level: result.metadata?.hintLevel || 2,
      category: result.metadata?.category || "approach",
      pattern: result.metadata?.pattern || "general",
      problemTitle: result.metadata?.problemTitle || "Similar Problem",
      similarity: result.similarity,
    }))

  return enrichedHints.slice(0, options.limit || 5)
}

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

  return results
    .filter((result) => {
      const tags = result.metadata?.tags
      if (typeof tags === "string") {
        return tags.includes(pattern)
      }
      if (Array.isArray(tags)) {
        return tags.some((tag) => tag.toLowerCase().includes(pattern.toLowerCase()))
      }
      return result.metadata?.pattern === pattern
    })
    .filter((result) => {
      if (options.hintLevel && result.metadata?.hintLevel !== options.hintLevel) {
        return false
      }
      return true
    })
    .map((result) => ({
      id: result.id,
      content: result.metadata?.text || "",
      level: result.metadata?.hintLevel || 2,
      category: result.metadata?.category || "approach",
      problemTitle: result.metadata?.problemTitle || "Pattern Problem",
    }))
}
