export { vectorizeAllProblems, vectorizeSingleProblem } from "./orchestrator"
export { getVectorizationStatus, type VectorizationStatus } from "./status"
export type {
  VectorizationJobResult,
  VectorizationProgressCallback,
  VectorizationResult,
} from "./types"

export { scenarioToEmbeddingText } from "./text-builders/dsa-text"
export { systemDesignToEmbeddingText } from "./text-builders/system-design-text"
export { bugFixToEmbeddingText } from "./text-builders/bugfix-text"
export { addFunctionalityToEmbeddingText } from "./text-builders/add-functionality-text"
export {
  companyToEmbeddingText,
  mustKnowQuestionToEmbeddingText,
} from "./text-builders/company-text"
