import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  verifyAdminAccess: vi.fn(),
  rateLimit: vi.fn(),
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
  getActiveProvider: vi.fn(),
  healthCheck: vi.fn(),
  getMetrics: vi.fn(),
  seedKnowledgeBase: vi.fn(),
  isKnowledgeBaseSeeded: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/admin/middleware", () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}))

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => mocks.rateLimit,
}))

vi.mock("@/lib/rag/embeddings/hybrid-provider", () => ({
  getHybridProvider: () => ({
    generateEmbedding: mocks.generateEmbedding,
    generateEmbeddings: mocks.generateEmbeddings,
    getActiveProvider: mocks.getActiveProvider,
    healthCheck: mocks.healthCheck,
    getMetrics: mocks.getMetrics,
  }),
}))

vi.mock("@/lib/rag/knowledge-base/seeder", () => ({
  seedKnowledgeBase: mocks.seedKnowledgeBase,
  isKnowledgeBaseSeeded: mocks.isKnowledgeBaseSeeded,
}))

vi.mock("@/lib/rag/retrieval/advanced-retrieval", () => ({
  getAdvancedRetriever: () => ({ retrieve: vi.fn() }),
}))

vi.mock("@/lib/rag/context-builder", () => ({
  getContextBuilder: () => ({}),
}))

vi.mock("@/lib/rag/user-performance-rag", () => ({
  getUserPerformanceRAG: () => ({}),
}))

vi.mock("@/lib/rag/enhanced-user-profile", () => ({
  getEnhancedProfileService: () => ({}),
}))

vi.mock("@/lib/rag/smart-recommendations", () => ({
  getSmartRecommendationService: () => ({}),
}))

vi.mock("@/lib/rag/misconception-detection", () => ({
  analyzeCode: vi.fn(),
  getMisconceptionTracker: () => ({}),
}))

vi.mock("@/lib/rag/knowledge-base/dsa-knowledge", () => ({
  getPatternKnowledge: vi.fn(),
  patternKnowledgeToDocument: vi.fn(),
}))

vi.mock("@/lib/rag/knowledge-base/company-knowledge", () => ({
  getCompanyInterviewKnowledge: vi.fn(),
  companyKnowledgeToDocument: vi.fn(),
}))

function createRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as NextRequest
}

describe("/api/rag/v2", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    mocks.verifyAdminAccess.mockResolvedValue({
      authorized: true,
      context: { userId: "admin-1" },
    })
    mocks.rateLimit.mockResolvedValue(null)
    mocks.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
    mocks.generateEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]])
    mocks.getActiveProvider.mockReturnValue("gemini")
    mocks.healthCheck.mockResolvedValue({
      healthy: true,
      mode: "gemini-with-fallback",
      openaiAvailable: false,
      tfidfAvailable: true,
    })
    mocks.getMetrics.mockReturnValue({
      total: 0,
      byProvider: {},
      avgLatencyMs: 0,
      cacheHitRate: 0,
    })
    mocks.isKnowledgeBaseSeeded.mockResolvedValue(true)
    mocks.seedKnowledgeBase.mockResolvedValue({ status: "completed", successfulDocuments: 1 })
  })

  it("requires authentication for every POST action", async () => {
    const { POST } = await import("./route")
    mocks.verifyAuth.mockResolvedValue({ authenticated: false, userId: null })

    const response = await POST(createRequest({ action: "health" }))

    expect(response.status).toBe(401)
    expect(response.data).toEqual({ error: "Unauthorized" })
  })

  it("returns validation errors before invoking RAG business logic", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ action: "retrieve", limit: 10 }))

    expect(response.status).toBe(400)
    expect(response.data).toMatchObject({ error: "Validation failed" })
    expect(mocks.generateEmbedding).not.toHaveBeenCalled()
  })

  it("requires admin access for knowledge base seeding", async () => {
    const { POST } = await import("./route")
    mocks.verifyAdminAccess.mockResolvedValue({ authorized: false })

    const response = await POST(createRequest({ action: "seed-knowledge-base", force: true }))

    expect(response.status).toBe(403)
    expect(response.data).toEqual({ error: "Forbidden" })
    expect(mocks.seedKnowledgeBase).not.toHaveBeenCalled()
  })

  it("generates embeddings only for authenticated validated requests", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ action: "generate-embedding", text: "two sum" }))

    expect(response.status).toBe(200)
    expect(mocks.generateEmbedding).toHaveBeenCalledWith("two sum")
    expect(response.data).toMatchObject({
      embedding: [0.1, 0.2, 0.3],
      dimensions: 3,
      provider: "gemini",
    })
  })
})
