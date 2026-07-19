import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rate-limit", () => ({
  feedbackRateLimit: vi.fn(),
}))

vi.mock("@/lib/quota-enforcement", () => ({
  enforceQuota: vi.fn(),
}))

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  startRequestTracking: vi.fn(),
  endRequestTracking: vi.fn(),
  buildRateLimitResponse: vi.fn((result: { retryAfter?: number }) => ({
    data: { error: "Rate limited", retryAfter: result.retryAfter },
    status: 429,
    headers: new Map(),
  })),
}))

vi.mock("@/lib/ai-providers", () => ({
  generateFeedbackResponse: vi.fn(),
}))

vi.mock("@/lib/analytics-server", () => ({
  trackFeedbackGenerationServer: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/rag", () => ({
  embedAndStoreSolution: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/learning-state", () => ({
  completeSessionWithMastery: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/rag/misconception-detection", () => ({
  analyzeAndTrackMisconceptions: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/spaced-repetition/mastery-score", () => ({
  calculateMasteryScore: vi.fn(() => ({ masteryScore: 82 })),
}))

vi.mock("@/lib/feedback/structured-extraction", () => ({
  extractConversationEvidence: vi.fn(() => Promise.resolve(undefined)),
  buildEvidenceSummary: vi.fn(() => "Evidence summary"),
}))

vi.mock("@/lib/feedback/transcript-analysis", () => ({
  analyzeTranscriptForMistakes: vi.fn(() =>
    Promise.resolve({
      silentNotes: [],
      analysisMetadata: {
        algorithmicDetections: 0,
        semanticDetections: 0,
      },
    })
  ),
}))

vi.mock("@/lib/interview/clarifying-questions-checker", () => ({
  checkClarifyingQuestions: vi.fn(),
  generateClarifyingQuestionsFeedback: vi.fn(() => ""),
}))

vi.mock("@/lib/feedback", () => ({
  preScreenConversation: vi.fn(() => ({
    hasContent: true,
    candidateMessageCount: 1,
    avgMessageLength: 20,
    hasKeywords: { complexity: false, approach: true, alternatives: false, edgeCases: false },
    suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
  })),
  validateConversationWithAI: vi.fn(() =>
    Promise.resolve({
      isCoherent: true,
      responsesRelevant: true,
      approachExplained: true,
      approachQuality: "good",
      complexityDiscussed: true,
      complexityAccurate: true,
      edgeCasesConsidered: true,
      alternativesDiscussed: false,
      communicationScore: 80,
      questionsAsked: 1,
      questionsAnswered: 1,
    })
  ),
  getDefaultValidation: vi.fn(() => ({
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: true,
    approachQuality: "basic",
    complexityDiscussed: false,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 70,
    questionsAsked: 0,
    questionsAnswered: 0,
  })),
  analyzeAICodeOverlap: vi.fn(() => ({
    hasHighOverlap: false,
    overlapPercentage: 0,
    copiedSnippets: [],
    modificationsMade: true,
  })),
  analyzeCodeCompleteness: vi.fn(() => ({
    isIncomplete: false,
    reason: "",
    hasBaseCase: true,
    hasActualLogic: true,
    stubPatterns: [],
  })),
  isBlankDesignTemplate: vi.fn(() => false),
  calculateValidatedScores: vi.fn(() => ({
    understanding: 80,
    problemSolving: 80,
    codeQuality: 80,
    communication: 80,
    overall: 80,
  })),
  applyScoreFloors: vi.fn((scores) => scores),
  critiqueScores: vi.fn(() =>
    Promise.resolve({
      madeChanges: false,
      adjustedScores: undefined,
      critiques: [],
      reasoning: "",
    })
  ),
  trackConstitutionalAIIntervention: vi.fn(() => Promise.resolve()),
  buildRAGFeedbackContext: vi.fn(() => Promise.resolve("")),
  parseFeedbackSections: vi.fn(() => ({
    summary: "Summary",
    whatWorked: ["Worked"],
    fixNext: ["Fix"],
    actionPlan: ["Plan"],
    aiWatchlist: [],
  })),
  completeStructuredFeedback: vi.fn(() => ({
    summary: "Summary",
    whatWorked: ["Worked"],
    fixNext: ["Fix"],
    actionPlan: ["Plan"],
    aiWatchlist: [],
  })),
  injectScoresIntoFeedback: vi.fn((feedback) => feedback),
  sanitizeFeedbackForScoreConsistency: vi.fn((feedback) => feedback),
  buildSilentNotesContext: vi.fn(() => ""),
  formatSilentNotesForFeedback: vi.fn(() => ""),
}))

function createRequest(body: unknown) {
  const request = new NextRequest("http://localhost/api/generate-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  request.json = async () => body
  return request
}

async function setupMocks() {
  const { feedbackRateLimit } = await import("@/lib/rate-limit")
  const { enforceQuota } = await import("@/lib/quota-enforcement")
  const { checkRateLimit, startRequestTracking, endRequestTracking } =
    await import("@/lib/rate-limiter")
  const { generateFeedbackResponse } = await import("@/lib/ai-providers")
  const { trackFeedbackGenerationServer } = await import("@/lib/analytics-server")

  vi.mocked(feedbackRateLimit).mockResolvedValue(null)
  vi.mocked(enforceQuota).mockResolvedValue({
    allowed: true,
    tier: "free",
    userId: "user-1",
  })
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    resetTime: Date.now() + 60_000,
  })
  vi.mocked(startRequestTracking).mockResolvedValue(undefined)
  vi.mocked(endRequestTracking).mockResolvedValue(undefined)
  vi.mocked(generateFeedbackResponse).mockResolvedValue({
    text: "Feedback text",
    provider: "gemini-lite",
    latencyMs: 10,
    tokensUsed: 100,
    tokensIn: 900,
    tokensOut: 250,
  })
  vi.mocked(trackFeedbackGenerationServer).mockResolvedValue(undefined)

  return {
    generateFeedbackResponse,
    endRequestTracking,
    trackFeedbackGenerationServer,
  }
}

const validFeedbackPayload = {
  code: "function twoSum(nums, target) { return [0, 1] }",
  scenarioTitle: "Two Sum",
  scenarioType: "dsa",
  scenarioId: "dsa-two-sum",
  scenarioDifficulty: "easy",
  scenarioPattern: "arrays-hashing",
  testResults: [{ description: "case 1", passed: true }],
  language: "javascript",
  timeSpent: 120,
  aiCollaborationMetrics: { partnerMessagesSent: 0 },
  interactionMetrics: { interviewerQuestionsAnswered: 1, hintsUsed: 0 },
  efficiencyMetrics: {
    estimatedTimeComplexity: "O(n)",
    optimalTimeComplexity: "O(n)",
    estimatedSpaceComplexity: "O(n)",
    optimalSpaceComplexity: "O(n)",
    efficiencyScore: 90,
    problemPattern: "arrays-hashing",
    difficulty: "easy",
  },
  conversationTranscript: [{ role: "candidate", content: "I will use a hash map" }],
  partnerMessages: [],
  phaseTracking: {
    submittedFromPhase: "testing",
    testsRanBeforeSubmit: true,
    conversationTracker: { approachExplained: true, hintsGiven: 0 },
  },
  sessionId: "session-1",
  userId: "user-1",
}

describe("/api/generate-feedback route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ends request tracking for validation errors after tracking starts", async () => {
    const { generateFeedbackResponse, endRequestTracking } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(createRequest({ scenarioTitle: "Two Sum" }))

    expect(response.status).toBe(400)
    expect(response.data).toEqual({ error: "Code and scenario title are required" })
    expect(generateFeedbackResponse).not.toHaveBeenCalled()
    expect(endRequestTracking).toHaveBeenCalledWith("user-1")
  })

  it("ends request tracking for successful feedback generation", async () => {
    const { generateFeedbackResponse, endRequestTracking } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(createRequest(validFeedbackPayload))

    expect(response.status).toBe(200)
    expect(response.data).toEqual(
      expect.objectContaining({
        feedback: "Feedback text",
        performanceScore: 80,
        provider: "gemini-lite",
      })
    )
    expect(generateFeedbackResponse).toHaveBeenCalledTimes(1)
    expect(endRequestTracking).toHaveBeenCalledWith("user-1")
  })

  it("forwards provider-reported token usage to the feedback_generated event", async () => {
    const { trackFeedbackGenerationServer } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(createRequest(validFeedbackPayload))

    expect(response.status).toBe(200)
    expect(trackFeedbackGenerationServer).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        // Measured usage from the narrative feedback call, unchanged.
        tokensIn: 900,
        tokensOut: 250,
      })
    )
  })

  it("ends request tracking when feedback generation fails", async () => {
    const { generateFeedbackResponse, endRequestTracking } = await setupMocks()
    const { POST } = await import("./route")

    vi.mocked(generateFeedbackResponse).mockRejectedValueOnce(new Error("AI down"))

    const response = await POST(createRequest(validFeedbackPayload))

    expect(response.status).toBe(500)
    expect(response.data).toEqual({ error: "AI down" })
    expect(endRequestTracking).toHaveBeenCalledWith("user-1")
  })
})
