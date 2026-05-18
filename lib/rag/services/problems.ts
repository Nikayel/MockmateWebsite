import { adminDb } from "../../firebase-admin"
import type { SimilarResult, TextEmbedding } from "../types"
import { generateTextEmbedding } from "./embeddings"
import { enrichResultsWithText, findSimilarTexts } from "./similarity"
import { storeTextEmbedding } from "./storage"

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
