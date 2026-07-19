import type { EmbeddingProvider, VectorDocument } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import { getScenariosByType } from "@/lib/scenarios/index"
import type { BugFixScenario } from "@/lib/scenarios/types"
import { hydrateSealedLegacyBugfix } from "@/lib/scenarios/sealed/legacy-registry.server"
import { bugFixToEmbeddingText } from "../text-builders/bugfix-text"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

const BATCH_SIZE = 5
const RATE_LIMIT_DELAY_MS = 100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const REMOVED_LEGACY_BUGFIX_SCENARIO_IDS = [
  "bugfix-state-mutation",
  "bugfix-react-state-race-condition",
  "bugfix-ecommerce-cart-memory-leak",
  "bugfix-react-hook-dependency",
  "bugfix-memory-leak",
  "bugfix-async-await",
  "bugfix-promise-error-handling",
  "bugfix-ai-api-retry-logic",
  "bugfix-api-service-error-handling",
  "bugfix-sql-injection",
  "bugfix-n-plus-one-query",
  "bugfix-batch-dimension-mismatch",
  "bugfix-model-inference-memory-leak",
  "bugfix-ml-prediction-pipeline",
  "bugfix-data-preprocessing-race",
  "bugfix-race-condition",
  "bugfix-python-two-sum",
  "bugfix-rate-limiter",
  "bugfix-type-coercion",
  "bugfix-off-by-one-array",
  "bugfix-floating-point",
  "bugfix-null-check",
  "bugfix-infinite-loop",
  "bugfix-closure-loop",
  "bugfix-deepcopy",
  "bugfix-feature-engineering-nan",
]

export async function vectorizeBugFixScenarios(
  embeddingProvider: EmbeddingProvider,
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading Bug Fix scenarios", 0, 1, "Loading...")
    const clientScenarios = (await getScenariosByType("bugfix")) as BugFixScenario[]
    // Re-merge sealed answer content (bug description, ground truth, rubric) server-side
    // so the retrieval text stays as rich as it was before that content was sealed out
    // of the client bundle. Non-legacy scenarios (packs) pass through unchanged.
    const scenarios = await Promise.all(clientScenarios.map(hydrateSealedLegacyBugfix))
    onProgress?.("Loading Bug Fix scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    await vectorDB.delete(REMOVED_LEGACY_BUGFIX_SCENARIO_IDS.map((id) => `bugfix-${id}`))

    const batches = Math.ceil(scenarios.length / BATCH_SIZE)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
      onProgress?.("Vectorizing Bug Fix", i + 1, batches, batch.map((s) => s.title).join(", "))

      const documents: VectorDocument[] = []

      for (const scenario of batch) {
        try {
          const text = bugFixToEmbeddingText(scenario)
          const embedding = await embeddingProvider.generateEmbedding(text)

          documents.push({
            id: `bugfix-${scenario.id}`,
            vector: embedding,
            text,
            metadata: {
              type: "bugfix",
              problemId: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              bugDescription: scenario.bugDescription.substring(0, 200),
              timestamp: new Date().toISOString(),
            },
          })

          vectorized++
        } catch (error) {
          errors.push(`Failed to vectorize bugfix ${scenario.id}: ${error}`)
        }
      }

      if (documents.length > 0) {
        await vectorDB.upsert(documents)
      }

      await wait(RATE_LIMIT_DELAY_MS)
    }
  } catch (error) {
    errors.push(`Failed to load bug fix scenarios: ${error}`)
  }

  return { vectorized, errors }
}
