import type { SimilarResult, TextEmbedding } from "../types"
import { generateTextEmbedding, generateTrackedEmbedding } from "./embeddings"
import { enrichResultsWithText, findSimilarTexts } from "./similarity"
import { storeTextEmbedding } from "./storage"

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
      user_id: userId,
      tags,
      timestamp: new Date().toISOString(),
    },
  }

  return storeTextEmbedding(embedding)
}
