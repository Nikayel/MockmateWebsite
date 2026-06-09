import { adminDb } from "@/lib/firebase-admin"
import { VECTOR_DB_CONFIG } from "@/lib/rag/config"
import { vectorDB } from "@/lib/rag/vectordb"
import type { VectorContentType } from "@/lib/rag/types"

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

async function countFirestoreVectorsByType(type: VectorContentType): Promise<number> {
  const snapshot = await adminDb
    .collection(VECTOR_DB_CONFIG.firestore.collectionName)
    .where("type", "==", type)
    .count()
    .get()

  return snapshot.data().count
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

    const [
      problemCount,
      companyVectorCount,
      companyQuestionCount,
      patternCount,
      systemDesignCount,
      bugFixCount,
      addFunctionalityCount,
    ] = await Promise.all([
      countFirestoreVectorsByType("problem"),
      countFirestoreVectorsByType("company"),
      countFirestoreVectorsByType("company-question"),
      countFirestoreVectorsByType("pattern-knowledge"),
      countFirestoreVectorsByType("system-design"),
      countFirestoreVectorsByType("bugfix"),
      countFirestoreVectorsByType("add-functionality"),
    ])

    const companyCount = companyVectorCount + companyQuestionCount

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
