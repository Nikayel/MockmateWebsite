import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  generateGeminiEmbeddings: vi.fn(),
  generateGeminiEmbedding: vi.fn(),
  getRequiredEmbeddingDimension: vi.fn(),
}))

vi.mock("../vectordb", () => ({
  getRequiredEmbeddingDimension: mocks.getRequiredEmbeddingDimension,
}))

vi.mock("../embeddings/gemini-provider", () => ({
  GeminiEmbeddingProvider: class {
    isConfigured() {
      return true
    }

    getDimensions() {
      return 768
    }

    generateEmbedding(text: string) {
      return mocks.generateGeminiEmbedding(text)
    }

    generateEmbeddings(texts: string[]) {
      return mocks.generateGeminiEmbeddings(texts)
    }
  },
  isGeminiAvailable: () => true,
}))

vi.mock("../embeddings/openai-provider", () => ({
  OpenAIEmbeddingProvider: class {},
  isOpenAIAvailable: () => false,
}))

describe("HybridEmbeddingProvider", () => {
  it("validates Pinecone dimensions for batch embeddings", async () => {
    mocks.getRequiredEmbeddingDimension.mockResolvedValue(768)
    mocks.generateGeminiEmbeddings.mockResolvedValue([Array(256).fill(0)])

    const { HybridEmbeddingProvider } = await import("../embeddings/hybrid-provider")
    const provider = new HybridEmbeddingProvider({ mode: "gemini-with-fallback" })

    await expect(provider.generateEmbeddings(["two sum"])).rejects.toThrow(
      "TF-IDF fallback (256D) cannot be used with your Pinecone index (768D)"
    )
  })
})
