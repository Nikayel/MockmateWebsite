export type {
  CodeFeatures,
  SessionMetrics,
  SessionVector,
  SimilarResult,
  TextEmbedding,
  UserPerformanceProfile,
} from "./types"

export {
  extractCodeFeatures,
  findSimilarSessions,
  getAggregateAnalytics,
  getRecommendedScenarios,
  getUserPerformanceProfile,
  storeSessionVector,
  updateUserPerformanceProfile,
  vectorizeCodeFeatures,
  vectorizeSessionMetrics,
} from "./vectorization"

export {
  GeminiEmbeddingProvider,
  getGeminiProvider,
  isGeminiAvailable,
  resetGeminiProvider,
} from "./embeddings/gemini-provider"

export {
  getOpenAIProvider,
  isOpenAIAvailable,
  OpenAIEmbeddingProvider,
} from "./embeddings/openai-provider"

export {
  createHybridProvider,
  generateHybridEmbedding,
  generateHybridEmbeddings,
  getHybridProvider,
  HybridEmbeddingProvider,
  type HybridMode,
} from "./embeddings/hybrid-provider"

export {
  advancedRetrieve,
  AdvancedRetriever,
  getAdvancedRetriever,
  type AdvancedRetrievalOptions,
  type EnhancedRetrievalResult,
  type RetrievalAnalytics,
} from "./retrieval/advanced-retrieval"

export {
  getKnowledgeBaseSeeder,
  isKnowledgeBaseSeeded,
  seedKnowledgeBase,
} from "./knowledge-base/seeder"

export {
  DSA_PATTERN_KNOWLEDGE,
  getAllPatternKnowledge,
  getPatternKnowledge,
  getPatternsByDifficulty,
  getRelatedPatterns,
  patternKnowledgeToDocument,
} from "./knowledge-base/dsa-knowledge"

export {
  COMPANY_INTERVIEW_KNOWLEDGE,
  companyKnowledgeToDocument,
  getAllCompanyKnowledge,
  getCompanyInterviewKnowledge,
  getMostCommonPatterns,
} from "./knowledge-base/company-knowledge"

export {
  buildFeedbackContext,
  buildHintContext,
  buildRoadmapContext,
  getContextBuilder,
  RAGContextBuilder,
  type BuiltContext,
  type ContextType,
  type ProblemContextOptions,
  type RoadmapContextOptions,
} from "./context-builder"

export {
  generateRAGEnhancedRoadmap,
  getRAGRoadmapGenerator,
  isRAGAvailable,
  RAGRoadmapGenerator,
  type AdaptiveAdjustment,
  type PatternInsight,
  type RAGEnhancedRoadmap,
  type RAGRoadmapOptions,
  type StudyStrategy,
} from "./roadmap-rag"

export {
  getUserPerformanceProfile as getEnhancedUserProfile,
  getUserPerformanceRAG,
  getUserRecommendations,
  UserPerformanceRAG,
  type PatternProficiency,
  type PersonalizedRecommendation,
  type UserPerformanceProfile as EnhancedUserPerformanceProfile,
} from "./user-performance-rag"

export {
  checkRAGHealth,
  getRAGMetrics,
  getRAGMonitor,
  RAGMonitor,
  recordRAGError,
  type ComponentHealth,
  type CostEstimate,
  type RAGError,
  type RAGMetrics,
  type RAGSystemHealth,
} from "./monitoring"

export {
  getVectorizationStatus,
  vectorizeAllProblems,
  vectorizeSingleProblem,
  type VectorizationProgressCallback,
  type VectorizationResult,
} from "./problem-vectorization"
