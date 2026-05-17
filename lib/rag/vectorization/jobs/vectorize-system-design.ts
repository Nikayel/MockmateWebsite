import type { EmbeddingProvider } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import { getScenariosByType } from "@/lib/scenarios/index"
import type { SystemDesignScenario } from "@/lib/scenarios/types"
import { systemDesignToEmbeddingText } from "../text-builders/system-design-text"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

const RATE_LIMIT_DELAY_MS = 100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function vectorizeSystemDesignScenarios(
  embeddingProvider: EmbeddingProvider,
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading System Design scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("system-design")) as SystemDesignScenario[]
    onProgress?.("Loading System Design scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i]
      onProgress?.("Vectorizing System Design", i + 1, scenarios.length, scenario.title)

      try {
        const text = systemDesignToEmbeddingText(scenario)
        const embedding = await embeddingProvider.generateEmbedding(text)

        await vectorDB.upsert([
          {
            id: `system-design-${scenario.id}`,
            vector: embedding,
            text,
            metadata: {
              type: "system-design",
              problemId: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              keyComponents: scenario.keyComponents,
              timestamp: new Date().toISOString(),
            },
          },
        ])

        vectorized++
      } catch (error) {
        errors.push(`Failed to vectorize system-design ${scenario.id}: ${error}`)
      }

      await wait(RATE_LIMIT_DELAY_MS)
    }
  } catch (error) {
    errors.push(`Failed to load system design scenarios: ${error}`)
  }

  return { vectorized, errors }
}
