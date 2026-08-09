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
  // Split out the results that actually need a Firestore lookup and fetch
  // those in one getAll instead of a doc read per result (topK reads per RAG
  // query, on the hot chat/hints path).
  const needsFetch = results.filter(
    (r) => !(r.text && r.text.length > 0) && !(isPineconeEnabled() && r.metadata?.text)
  )
  if (needsFetch.length === 0) {
    return Promise.all(results.map(enrichResultWithText))
  }

  const textById = new Map<string, string>()
  try {
    const refs = needsFetch.map((r) => adminDb.collection("text_embeddings").doc(r.id))
    const docs = await adminDb.getAll(...refs)
    for (const doc of docs) {
      textById.set(doc.id, doc.data()?.text || "")
    }
  } catch {
    // Fall through: missing entries resolve to "" below, same as before
  }

  return results.map((r) => {
    if (r.text && r.text.length > 0) return r
    if (isPineconeEnabled() && r.metadata?.text) return { ...r, text: r.metadata.text }
    return { ...r, text: textById.get(r.id) ?? "" }
  })
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
