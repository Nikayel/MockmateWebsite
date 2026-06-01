import type { EmbeddingProvider, VectorDocument } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import { getScenariosByType } from "@/lib/scenarios/index"
import type { AddFunctionalityScenario } from "@/lib/scenarios/types"
import { addFunctionalityToEmbeddingText } from "../text-builders/add-functionality-text"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

const BATCH_SIZE = 5
const RATE_LIMIT_DELAY_MS = 100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const REMOVED_LEGACY_ADD_FUNCTIONALITY_IDS = [
  "add-feature-autocomplete-trie",
  "add-feature-state-history",
  "add-feature-event-aggregator",
  "add-feature-cache-system",
  "add-feature-rate-limiter",
  "add-feature-text-search",
]

export async function vectorizeAddFunctionalityScenarios(
  embeddingProvider: EmbeddingProvider,
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading Add Functionality scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("add-functionality")) as AddFunctionalityScenario[]
    onProgress?.(
      "Loading Add Functionality scenarios",
      1,
      1,
      `Loaded ${scenarios.length} scenarios`
    )

    await vectorDB.delete(
      REMOVED_LEGACY_ADD_FUNCTIONALITY_IDS.map((id) => `add-functionality-${id}`)
    )

    const batches = Math.ceil(scenarios.length / BATCH_SIZE)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
      onProgress?.(
        "Vectorizing Add Functionality",
        i + 1,
        batches,
        batch.map((scenario) => scenario.title).join(", ")
      )

      const documents: VectorDocument[] = []

      for (const scenario of batch) {
        try {
          const text = addFunctionalityToEmbeddingText(scenario)
          const embedding = await embeddingProvider.generateEmbedding(text)

          documents.push({
            id: `add-functionality-${scenario.id}`,
            vector: embedding,
            text,
            metadata: {
              type: "add-functionality",
              problemId: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              timestamp: new Date().toISOString(),
            },
          })

          vectorized++
        } catch (error) {
          errors.push(`Failed to vectorize add-functionality ${scenario.id}: ${error}`)
        }
      }

      if (documents.length > 0) {
        await vectorDB.upsert(documents)
      }

      await wait(RATE_LIMIT_DELAY_MS)
    }
  } catch (error) {
    errors.push(`Failed to load add functionality scenarios: ${error}`)
  }

  return { vectorized, errors }
}
