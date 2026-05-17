/**
 * Shared contracts for the RAG content vectorization pipeline.
 */

export interface VectorizationResult {
  totalProblems: number
  totalCompanies: number
  totalPatternKnowledge: number
  totalSystemDesign: number
  totalBugFix: number
  vectorizedProblems: number
  vectorizedCompanies: number
  vectorizedPatternKnowledge: number
  vectorizedSystemDesign: number
  vectorizedBugFix: number
  errors: string[]
  durationMs: number
}

export type VectorizationProgressCallback = (
  stage: string,
  current: number,
  total: number,
  item?: string
) => void

export interface VectorizationJobResult {
  vectorized: number
  errors: string[]
}
