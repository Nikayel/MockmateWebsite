import { adminDb } from "../../firebase-admin"
import type { SimilaritySearchOptions, SimilarResult } from "../types"
import { isPineconeEnabled, vectorDB } from "../vectordb"

export async function enrichResultWithText(result: SimilarResult): Promise<SimilarResult> {
  if (result.text && result.text.length > 0) {
    return result
  }
  if (isPineconeEnabled() && result.metadata?.text) {
    return {
      ...result,
      text: result.metadata.text,
    }
  }

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

export async function enrichResultsWithText(results: SimilarResult[]): Promise<SimilarResult[]> {
  return Promise.all(results.map(enrichResultWithText))
}

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

  return results.map((result) => ({
    id: result.id,
    text: result.metadata?.text || "",
    type: result.metadata?.type || "",
    similarity: result.score,
    metadata: result.metadata || {},
  }))
}
