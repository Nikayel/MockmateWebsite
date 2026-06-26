import { getHybridProvider } from "../embeddings/hybrid-provider"
import { EMBEDDING_COSTS, trackEmbeddingUsageAccurate } from "../../usage-tracking"
import { prepareTextForEmbedding } from "../utils/sanitize"

const embeddingProvider = getHybridProvider({
  mode: "gemini-with-fallback",
  geminiModel: "gemini-embedding-001",
  openaiModel: "text-embedding-3-small",
  openaiDimensions: 1536,
  cacheEnabled: true,
})

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

export async function generateTextEmbedding(text: string): Promise<number[]> {
  const prepared = prepareTextForEmbedding(text, { context: "generateTextEmbedding" })

  if (!prepared.valid) {
    throw new Error(`Invalid text for embedding: ${prepared.error}`)
  }

  return embeddingProvider.generateEmbedding(prepared.text)
}

export async function generateTrackedEmbedding(text: string, userId: string): Promise<number[]> {
  const prepared = prepareTextForEmbedding(text, { context: `generateTrackedEmbedding:${userId}` })

  if (!prepared.valid) {
    throw new Error(`Invalid text for embedding: ${prepared.error}`)
  }

  const startTime = Date.now()
  const embedding = await embeddingProvider.generateEmbedding(prepared.text)
  const latencyMs = Date.now() - startTime
  const { model, provider } = getEmbeddingUsageMetadata()

  trackEmbeddingUsageAccurate({
    userId,
    texts: [prepared.text],
    model,
    provider,
    latencyMs,
    dimensions: embedding.length,
  }).catch((err) => {
    console.warn("[RAG] Failed to track embedding usage:", err)
  })

  return embedding
}

export async function generateTrackedEmbeddings(
  texts: string[],
  userId: string
): Promise<number[][]> {
  if (texts.length === 0) return []

  const preparedTexts = texts
    .map((text, idx) => {
      const prepared = prepareTextForEmbedding(text, {
        context: `generateTrackedEmbeddings:${userId}:${idx}`,
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

  const startTime = Date.now()
  const embeddings = await embeddingProvider.generateEmbeddings(preparedTexts)
  const latencyMs = Date.now() - startTime
  const { model, provider } = getEmbeddingUsageMetadata()

  trackEmbeddingUsageAccurate({
    userId,
    texts: preparedTexts,
    model,
    provider,
    latencyMs,
    dimensions: embeddings[0]?.length || 0,
  }).catch((err) => {
    console.warn("[RAG] Failed to track embedding usage:", err)
  })

  return embeddings
}
