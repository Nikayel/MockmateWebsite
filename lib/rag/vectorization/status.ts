import { getHybridProvider } from "@/lib/rag/embeddings/hybrid-provider"
import { vectorDB } from "@/lib/rag/vectordb"

export interface VectorizationStatus {
  hasProblems: boolean
  hasCompanies: boolean
  hasPatternKnowledge: boolean
  hasSystemDesign: boolean
  hasBugFix: boolean
  hasAddFunctionality: boolean
  problemCount: number
  companyCount: number
  patternCount: number
  systemDesignCount: number
  bugFixCount: number
  addFunctionalityCount: number
}

const EMPTY_STATUS: VectorizationStatus = {
  hasProblems: false,
  hasCompanies: false,
  hasPatternKnowledge: false,
  hasSystemDesign: false,
  hasBugFix: false,
  hasAddFunctionality: false,
  problemCount: 0,
  companyCount: 0,
  patternCount: 0,
  systemDesignCount: 0,
  bugFixCount: 0,
  addFunctionalityCount: 0,
}

export async function getVectorizationStatus(): Promise<VectorizationStatus> {
  try {
    if (vectorDB.getStats) {
      const stats = await vectorDB.getStats()
      const namespaces = stats.namespaces

      const problemCount = namespaces["mockmate_problem"] || 0
      const companyCount =
        (namespaces["mockmate_company"] || 0) + (namespaces["mockmate_company-question"] || 0)
      const patternCount = namespaces["mockmate_pattern-knowledge"] || 0
      const systemDesignCount = namespaces["mockmate_system-design"] || 0
      const bugFixCount = namespaces["mockmate_bugfix"] || 0
      const addFunctionalityCount = namespaces["mockmate_add-functionality"] || 0

      return {
        hasProblems: problemCount > 0,
        hasCompanies: companyCount > 0,
        hasPatternKnowledge: patternCount > 0,
        hasSystemDesign: systemDesignCount > 0,
        hasBugFix: bugFixCount > 0,
        hasAddFunctionality: addFunctionalityCount > 0,
        problemCount,
        companyCount,
        patternCount,
        systemDesignCount,
        bugFixCount,
        addFunctionalityCount,
      }
    }

    const embeddingProvider = getHybridProvider()
    const testEmbedding = await embeddingProvider.generateEmbedding(
      "Two Sum array hash map system design URL shortener bug fix"
    )

    const results = await vectorDB.query(testEmbedding, {
      topK: 200,
      includeMetadata: true,
    })

    const problemCount = results.filter((r) => r.metadata?.type === "problem").length
    const companyCount = results.filter(
      (r) => r.metadata?.type === "company" || r.metadata?.type === "company-question"
    ).length
    const patternCount = results.filter((r) => r.metadata?.type === "pattern-knowledge").length
    const systemDesignCount = results.filter((r) => r.metadata?.type === "system-design").length
    const bugFixCount = results.filter((r) => r.metadata?.type === "bugfix").length
    const addFunctionalityCount = results.filter(
      (r) => r.metadata?.type === "add-functionality"
    ).length

    return {
      hasProblems: problemCount > 0,
      hasCompanies: companyCount > 0,
      hasPatternKnowledge: patternCount > 0,
      hasSystemDesign: systemDesignCount > 0,
      hasBugFix: bugFixCount > 0,
      hasAddFunctionality: addFunctionalityCount > 0,
      problemCount,
      companyCount,
      patternCount,
      systemDesignCount,
      bugFixCount,
      addFunctionalityCount,
    }
  } catch {
    return EMPTY_STATUS
  }
}
