import { getHybridProvider } from "../embeddings/hybrid-provider"
import { EMBEDDING_COSTS, trackEmbeddingUsageAccurate } from "../../usage-tracking"
import { SYSTEM_USER_ID, type UsageServiceId } from "../../usage/services"
import { prepareTextForEmbedding } from "../utils/sanitize"

const embeddingProvider = getHybridProvider({
  mode: "gemini-with-fallback",
  geminiModel: "gemini-embedding-001",
  openaiModel: "text-embedding-3-small",
  openaiDimensions: 1536,
  cacheEnabled: true,
})

/**
 * Who a paid embedding is billed to.
 *
 * Required at every call site: an embedding is a real charge on the Gemini or
 * OpenAI bill, and the only way it reaches `usage_events` is if the caller says
 * which product surface asked for it. Making this a required argument means a
 * new call site that forgets does not compile.
 *
 * `userId` is optional because plenty of embeddings have no signed-in user
 * (bulk vectorization, knowledge-base seeding, anonymous retrieval). Those land
 * on SYSTEM_USER_ID: recorded and visible in admin, never budget-enforced.
 */
export interface EmbeddingAttribution {
  service: UsageServiceId
  userId?: string
}

export function getActiveEmbeddingProvider(): ReturnType<typeof getHybridProvider> {
  return embeddingProvider
}

export function getEmbeddingUsageMetadata(): {
  model: keyof typeof EMBEDDING_COSTS
  provider: "gemini" | "openai" | "tfidf"
} {
  const activeProvider = embeddingProvider.getActiveProvider()
  const model =
    activeProvider === "gemini"
      ? "gemini-embedding-001"
      : activeProvider === "openai"
        ? "text-embedding-3-small"
        : "gemini-embedding-001"
  const provider =
    activeProvider === "openai" ? "openai" : activeProvider === "tfidf" ? "tfidf" : "gemini"

  return { model: model as keyof typeof EMBEDDING_COSTS, provider }
}

/**
 * Fire-and-forget spend row for embeddings that actually hit a paid API.
 * Tracking never blocks or fails the retrieval it is measuring.
 */
function recordEmbeddingSpend(params: {
  texts: string[]
  attribution: EmbeddingAttribution
  latencyMs: number
  dimensions: number
}): void {
  const { texts, attribution, latencyMs, dimensions } = params
  const { model, provider } = getEmbeddingUsageMetadata()

  // The TF-IDF fallback is computed locally and costs nothing. A $0 row for it
  // would add fake volume to the per-service breakdown, so record nothing.
  if (provider === "tfidf") return

  trackEmbeddingUsageAccurate({
    userId: attribution.userId ?? SYSTEM_USER_ID,
    service: attribution.service,
    texts,
    model,
    provider,
    latencyMs,
    dimensions,
  }).catch((err) => {
    console.warn("[RAG] Failed to track embedding usage:", err)
  })
}

export async function generateTextEmbedding(
  text: string,
  attribution: EmbeddingAttribution
): Promise<number[]> {
  const prepared = prepareTextForEmbedding(text, {
    context: `generateTextEmbedding:${attribution.service}`,
  })

  if (!prepared.valid) {
    throw new Error(`Invalid text for embedding: ${prepared.error}`)
  }

  // A provider cache hit costs nothing; billing it again would double-book the
  // tokens the first call already paid for. The provider owns the cache key, so
  // this asks it rather than rebuilding one.
  const servedFromCache = embeddingProvider.isCached(prepared.text)

  const startTime = Date.now()
  const embedding = await embeddingProvider.generateEmbedding(prepared.text)

  if (!servedFromCache) {
    recordEmbeddingSpend({
      texts: [prepared.text],
      attribution,
      latencyMs: Date.now() - startTime,
      dimensions: embedding.length,
    })
  }

  return embedding
}

export async function generateTextEmbeddings(
  texts: string[],
  attribution: EmbeddingAttribution
): Promise<number[][]> {
  if (texts.length === 0) return []

  const preparedTexts = texts
    .map((text, idx) => {
      const prepared = prepareTextForEmbedding(text, {
        context: `generateTextEmbeddings:${attribution.service}:${idx}`,
      })
      if (!prepared.valid) {
        console.warn(`[RAG] Skipping invalid text at index ${idx}: ${prepared.error}`)
        return null
      }
      return prepared.text
    })
    .filter((text): text is string => text !== null)

  if (preparedTexts.length === 0) {
    throw new Error("No valid texts for embedding after sanitization")
  }

  // No cache check here: the batch provider path talks to the API directly and
  // never consults the local cache, so every batch call is a real charge.
  const startTime = Date.now()
  const embeddings = await embeddingProvider.generateEmbeddings(preparedTexts)

  recordEmbeddingSpend({
    texts: preparedTexts,
    attribution,
    latencyMs: Date.now() - startTime,
    dimensions: embeddings[0]?.length || 0,
  })

  return embeddings
}

/** Indexing embedding for a signed-in user (their solution, hint, onboarding answer). */
export async function generateTrackedEmbedding(text: string, userId: string): Promise<number[]> {
  return generateTextEmbedding(text, { service: "rag-indexing", userId })
}

/** Batch indexing embeddings for a signed-in user. */
export async function generateTrackedEmbeddings(
  texts: string[],
  userId: string
): Promise<number[][]> {
  return generateTextEmbeddings(texts, { service: "rag-indexing", userId })
}
