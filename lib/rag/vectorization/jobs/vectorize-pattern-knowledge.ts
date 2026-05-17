import type { EmbeddingProvider } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import {
  getPatternKnowledge,
  patternKnowledgeToDocument,
} from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

export const VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS: DSAPattern[] = [
  "arrays-hashing",
  "two-pointers",
  "sliding-window",
  "stack",
  "binary-search",
  "linked-list",
  "trees",
  "trie",
  "heap",
  "graphs",
  "union-find",
  "backtracking",
  "greedy",
  "intervals",
  "dp-1d",
  "dp-2d",
  "bit-manipulation",
  "math-geometry",
]

export async function vectorizePatternKnowledge(
  embeddingProvider: EmbeddingProvider,
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  for (let i = 0; i < VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS.length; i++) {
    const pattern = VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS[i]
    onProgress?.(
      "Vectorizing pattern knowledge",
      i + 1,
      VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS.length,
      pattern
    )

    const knowledge = getPatternKnowledge(pattern)
    if (!knowledge) continue

    try {
      const text = patternKnowledgeToDocument(knowledge)
      const embedding = await embeddingProvider.generateEmbedding(text)

      await vectorDB.upsert([
        {
          id: `pattern-knowledge-${pattern}`,
          vector: embedding,
          text,
          metadata: {
            type: "pattern-knowledge",
            pattern,
            displayName: knowledge.displayName,
            relatedPatterns: knowledge.relatedPatterns,
            prerequisites: knowledge.prerequisites,
            timeComplexity: knowledge.timeComplexity.typical,
            spaceComplexity: knowledge.spaceComplexity.typical,
            timestamp: new Date().toISOString(),
          },
        },
      ])
      vectorized++
    } catch (error) {
      errors.push(`Failed to vectorize pattern ${pattern}: ${error}`)
    }
  }

  return { vectorized, errors }
}
