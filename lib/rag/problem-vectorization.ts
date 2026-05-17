/**
 * Compatibility entry point for the RAG content vectorization pipeline.
 *
 * Implementation lives in ./vectorization so text builders, jobs, orchestration,
 * and status checks stay small and focused.
 */

export {
  getVectorizationStatus,
  vectorizeAllProblems,
  vectorizeSingleProblem,
} from "./vectorization/index"
export type {
  VectorizationProgressCallback,
  VectorizationResult,
  VectorizationStatus,
} from "./vectorization/index"
