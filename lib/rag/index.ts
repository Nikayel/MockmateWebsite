import { getActiveEmbeddingProvider } from "./services/embeddings"
import { getVectorDBProvider } from "./vectordb"

const activeProvider = getActiveEmbeddingProvider().getActiveProvider()
console.log(
  `[RAG] Initialized with ${getVectorDBProvider()} backend and ${activeProvider} embeddings`
)

export {
  generateTextEmbedding,
  generateTrackedEmbedding,
  generateTrackedEmbeddings,
} from "./services/embeddings"
export { storeTextEmbedding } from "./services/storage"
export { findSimilarTexts } from "./services/similarity"
export {
  embedAndStoreProblem,
  getRecommendedNextProblems,
  getSimilarProblems,
  hasUserSolvedProblem,
} from "./services/problems"
export { embedAndStoreSolution, getSimilarSolutions } from "./services/solutions"
export {
  embedAndStoreHint,
  getPatternHintsFromRAG,
  getRelevantHints,
  getSimilarHintsFromRAG,
} from "./services/hints"
export { embedAndStoreOnboarding } from "./services/onboarding"
export * from "./public-exports"
