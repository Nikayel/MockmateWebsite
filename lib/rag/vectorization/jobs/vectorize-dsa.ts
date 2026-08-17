import { generateTextEmbedding } from "@/lib/rag/services/embeddings"
import type { VectorDocument } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import { getScenariosByType } from "@/lib/scenarios/index"
import type { DSAScenario } from "@/lib/scenarios/types"
import { scenarioToEmbeddingText } from "../text-builders/dsa-text"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

const BATCH_SIZE = 10
const RATE_LIMIT_DELAY_MS = 100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function dsaScenarioToVectorDocument(
  scenario: DSAScenario,
  vector: number[]
): VectorDocument {
  return {
    id: `problem-${scenario.id}`,
    vector,
    text: scenarioToEmbeddingText(scenario),
    metadata: {
      type: "problem",
      problemId: scenario.id,
      title: scenario.title,
      pattern: scenario.pattern,
      difficulty: scenario.difficulty,
      companies: scenario.companies,
      roles: scenario.roles,
      tags: scenario.tags,
      estimatedTime: scenario.estimatedTime,
      timeComplexity: scenario.optimalComplexity.time,
      spaceComplexity: scenario.optimalComplexity.space,
      timestamp: new Date().toISOString(),
    },
  }
}

export async function vectorizeDSAProblems(
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading DSA scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("dsa")) as DSAScenario[]
    onProgress?.("Loading DSA scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    const batches = Math.ceil(scenarios.length / BATCH_SIZE)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
      onProgress?.("Vectorizing DSA problems", i + 1, batches, batch.map((s) => s.title).join(", "))

      const documents: VectorDocument[] = []

      for (const scenario of batch) {
        try {
          const text = scenarioToEmbeddingText(scenario)
          const embedding = await generateTextEmbedding(text, { service: "rag-indexing" })
          documents.push(dsaScenarioToVectorDocument(scenario, embedding))
          vectorized++
        } catch (error) {
          errors.push(`Failed to vectorize ${scenario.id}: ${error}`)
        }
      }

      if (documents.length > 0) {
        await vectorDB.upsert(documents)
      }

      await wait(RATE_LIMIT_DELAY_MS)
    }
  } catch (error) {
    errors.push(`Failed to load DSA scenarios: ${error}`)
  }

  return { vectorized, errors }
}

export async function vectorizeSingleProblem(scenario: DSAScenario): Promise<void> {
  const text = scenarioToEmbeddingText(scenario)
  const embedding = await generateTextEmbedding(text, { service: "rag-indexing" })
  await vectorDB.upsert([dsaScenarioToVectorDocument(scenario, embedding)])
}
