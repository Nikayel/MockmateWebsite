import type { BugfixEvidenceEvent, BugfixEvidenceSummary } from "./types"

export function createBugfixEvidenceEvent(
  event: Omit<BugfixEvidenceEvent, "timestamp"> & { timestamp?: number }
): BugfixEvidenceEvent {
  return {
    ...event,
    timestamp: event.timestamp || Date.now(),
  }
}

export function summarizeBugfixEvidence(params: {
  events: BugfixEvidenceEvent[]
  expectedTouchedFiles?: string[]
}): BugfixEvidenceSummary {
  const expectedTouchedFiles = params.expectedTouchedFiles || []
  const sortedEvents = [...params.events].sort((a, b) => a.timestamp - b.timestamp)
  const firstEditIndex = sortedEvents.findIndex((event) => event.type === "file_edited")
  const reproductionIndex = sortedEvents.findIndex(
    (event) => event.type === "test_run" || event.type === "visible_failure_seen"
  )
  const inspectedFiles = new Set<string>()
  const inspectedTestOrDocs = new Set<string>()
  const editedFiles = new Set<string>()
  let finalPassRate = 0
  let hypothesisText = ""
  let rootCauseText = ""
  let preventionText = ""

  for (const event of sortedEvents) {
    if (event.type === "file_opened" && event.filePath) {
      inspectedFiles.add(event.filePath)
    }
    if (event.type === "test_or_doc_opened" && event.filePath) {
      inspectedFiles.add(event.filePath)
      inspectedTestOrDocs.add(event.filePath)
    }
    if (event.type === "file_edited" && event.filePath) {
      editedFiles.add(event.filePath)
    }
    if (event.type === "test_run" && event.testSummary) {
      finalPassRate = event.testSummary.passRate
    }
    if (event.type === "hypothesis_created" && !hypothesisText) {
      hypothesisText = event.text?.trim() ?? ""
    }
    if (event.type === "prevention_explained") {
      preventionText = event.text?.trim() ?? ""
    }
    if (event.type === "submission_created") {
      rootCauseText = event.text?.trim() ?? ""
    }
  }

  const edited = Array.from(editedFiles)
  const overEditedFiles =
    expectedTouchedFiles.length > 0
      ? edited.filter((path) => !expectedTouchedFiles.includes(path))
      : []

  const aiShortcutCount = sortedEvents.filter(
    (event) =>
      event.type === "ai_help_requested" &&
      (event.aiHelpKind === "exact-fix" || event.aiHelpKind === "solution-like")
  ).length
  const aiPartnerUseCount = sortedEvents.filter(
    (event) =>
      event.type === "ai_help_requested" &&
      (event.aiHelpKind === "next-file" ||
        event.aiHelpKind === "log-interpretation" ||
        event.aiHelpKind === "hypothesis-check")
  ).length

  return {
    reproducedBeforeEditing:
      reproductionIndex !== -1 && (firstEditIndex === -1 || reproductionIndex < firstEditIndex),
    inspectedFiles: Array.from(inspectedFiles),
    inspectedTestOrDocs: Array.from(inspectedTestOrDocs),
    editedFiles: edited,
    expectedTouchedFiles,
    overEditedFiles,
    hypothesisCount: sortedEvents.filter((event) => event.type === "hypothesis_created").length,
    visibleTestsRun: sortedEvents.filter((event) => event.type === "test_run").length,
    finalPassRate,
    preventionExplained: sortedEvents.some((event) => event.type === "prevention_explained"),
    rootCauseExplained: sortedEvents.some(
      (event) => event.type === "submission_created" && Boolean(event.text?.trim())
    ),
    aiShortcutCount,
    aiPartnerUseCount,
    hypothesisText,
    rootCauseText,
    preventionText,
  }
}
