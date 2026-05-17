import { ALL_COMPANIES } from "@/lib/data/company-questions"
import { getHybridProvider } from "@/lib/rag/embeddings/hybrid-provider"
import { getScenariosByType } from "@/lib/scenarios/index"
import type { DSAScenario } from "@/lib/scenarios/types"
import { vectorizeBugFixScenarios } from "./jobs/vectorize-bugfix"
import { vectorizeCompanyQuestions } from "./jobs/vectorize-companies"
import {
  VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS,
  vectorizePatternKnowledge,
} from "./jobs/vectorize-pattern-knowledge"
import {
  vectorizeDSAProblems,
  vectorizeSingleProblem as vectorizeSingleDSAProblem,
} from "./jobs/vectorize-dsa"
import { vectorizeSystemDesignScenarios } from "./jobs/vectorize-system-design"
import type { VectorizationProgressCallback, VectorizationResult } from "./types"

/**
 * Vectorize all content types used by the RAG retrieval layer.
 */
export async function vectorizeAllProblems(
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationResult> {
  const startTime = Date.now()
  const allErrors: string[] = []
  const embeddingProvider = getHybridProvider()

  let totalProblems = 0
  const totalCompanies = ALL_COMPANIES.length
  const totalPatternKnowledge = VECTORIZE_PATTERN_KNOWLEDGE_PATTERNS.length
  let totalSystemDesign = 0
  let totalBugFix = 0

  try {
    const [dsaScenarios, systemDesignScenarios, bugFixScenarios] = await Promise.all([
      getScenariosByType("dsa"),
      getScenariosByType("system-design"),
      getScenariosByType("bugfix"),
    ])
    totalProblems = dsaScenarios.length
    totalSystemDesign = systemDesignScenarios.length
    totalBugFix = bugFixScenarios.length
  } catch (error) {
    allErrors.push(`Failed to count scenarios: ${error}`)
  }

  const totalSteps = 5

  onProgress?.("Starting", 0, totalSteps, "DSA Problems")
  const dsaResult = await vectorizeDSAProblems(embeddingProvider, onProgress)
  allErrors.push(...dsaResult.errors)

  onProgress?.("Starting", 1, totalSteps, "System Design Scenarios")
  const systemDesignResult = await vectorizeSystemDesignScenarios(embeddingProvider, onProgress)
  allErrors.push(...systemDesignResult.errors)

  onProgress?.("Starting", 2, totalSteps, "Bug Fix Scenarios")
  const bugFixResult = await vectorizeBugFixScenarios(embeddingProvider, onProgress)
  allErrors.push(...bugFixResult.errors)

  onProgress?.("Starting", 3, totalSteps, "Company Questions")
  const companyResult = await vectorizeCompanyQuestions(embeddingProvider, onProgress)
  allErrors.push(...companyResult.errors)

  onProgress?.("Starting", 4, totalSteps, "Pattern Knowledge")
  const patternResult = await vectorizePatternKnowledge(embeddingProvider, onProgress)
  allErrors.push(...patternResult.errors)

  onProgress?.("Complete", totalSteps, totalSteps, "Done!")

  return {
    totalProblems,
    totalCompanies,
    totalPatternKnowledge,
    totalSystemDesign,
    totalBugFix,
    vectorizedProblems: dsaResult.vectorized,
    vectorizedCompanies: companyResult.vectorized,
    vectorizedPatternKnowledge: patternResult.vectorized,
    vectorizedSystemDesign: systemDesignResult.vectorized,
    vectorizedBugFix: bugFixResult.vectorized,
    errors: allErrors,
    durationMs: Date.now() - startTime,
  }
}

export async function vectorizeSingleProblem(scenario: DSAScenario): Promise<void> {
  await vectorizeSingleDSAProblem(scenario, getHybridProvider())
}
