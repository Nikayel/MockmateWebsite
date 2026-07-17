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
    // The candidate states root cause / prevention to the interviewer in conversation now
    // (the note textareas are gone), so the fallback points at the transcript rather than
    // claiming nothing was captured. Legacy sessions still surface their captured text.
    rootCause:
      params.rootCauseText ||
      "Stated by the candidate in the session conversation and scored from the transcript.",
    minimalityAssessment:
      overEdited.length === 0
        ? "Patch stayed within the expected editable area."
        : `Patch also touched unrelated files: ${overEdited.join(", ")}.`,
    preventionIdea:
      params.preventionText ||
      "Stated by the candidate in the session conversation and scored from the transcript.",
    nextRecommendedIncident: params.nextRecommendedIncident || "Beginner Debugger",
    score: params.score,
  }
}
