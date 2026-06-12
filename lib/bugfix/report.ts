import type { BugfixEvidenceSummary, BugfixScoreBreakdown } from "./types"

export interface BugfixPostSessionReport {
  finalDiffSummary: string
  filesInspected: string[]
  testsDocsLogsInspected: string[]
  testsRun: number
  rootCause: string
  minimalityAssessment: string
  preventionIdea: string
  nextRecommendedIncident: string
  score: BugfixScoreBreakdown
}

export function buildBugfixPostSessionReport(params: {
  evidence: BugfixEvidenceSummary
  score: BugfixScoreBreakdown
  rootCauseText?: string
  preventionText?: string
  nextRecommendedIncident?: string
}): BugfixPostSessionReport {
  const editedFiles = params.evidence.editedFiles
  const overEdited = params.evidence.overEditedFiles

  return {
    finalDiffSummary:
      editedFiles.length > 0
        ? `Edited ${editedFiles.join(", ")}.`
        : "No editable files were changed.",
    filesInspected: params.evidence.inspectedFiles,
    testsDocsLogsInspected: params.evidence.inspectedTestOrDocs,
    testsRun: params.evidence.visibleTestsRun,
    rootCause: params.rootCauseText || "Root cause explanation was not captured.",
    minimalityAssessment:
      overEdited.length === 0
        ? "Patch stayed within the expected editable area."
        : `Patch also touched unrelated files: ${overEdited.join(", ")}.`,
    preventionIdea: params.preventionText || "No regression-prevention idea was captured.",
    nextRecommendedIncident: params.nextRecommendedIncident || "Beginner Debugger",
    score: params.score,
  }
}
