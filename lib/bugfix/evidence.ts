import type { BugfixEvidenceEvent, BugfixEvidenceSummary } from "./types"

export function createBugfixEvidenceEvent(
  event: Omit<BugfixEvidenceEvent, "timestamp"> & { timestamp?: number }
): BugfixEvidenceEvent {
  return {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  }
}

export function summarizeBugfixEvidence(params: {
  events: BugfixEvidenceEvent[]
  netModifiedFiles?: string[]
  expectedTouchedFiles?: string[]
  finalSourceRevision?: string
}): BugfixEvidenceSummary {
  const expectedTouchedFiles = params.expectedTouchedFiles || []
  const sortedEvents = [...params.events].sort((a, b) => a.timestamp - b.timestamp)
  const firstEditIndex = sortedEvents.findIndex((event) => event.type === "file_edited")
  const reproductionIndex = sortedEvents.findIndex(
    (event) =>
      (event.type === "test_run" || event.type === "visible_failure_seen") &&
      Boolean(event.testSummary && event.testSummary.total > 0 && event.testSummary.failed > 0)
  )
  const inspectedFiles = new Set<string>()
  const inspectedTestOrDocs = new Set<string>()
  const editedFiles = new Set<string>()
  let finalPassRate = 0
  let hypothesisText = ""
  let rootCauseText = ""
  let preventionText = ""
  let finalTestRevision: string | number | boolean | undefined

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
    if (event.type === "test_run" && event.testSummary && event.testSummary.total > 0) {
      finalPassRate = event.testSummary.passRate
      finalTestRevision = event.metadata?.sourceRevision
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

  const edited = params.netModifiedFiles ?? Array.from(editedFiles)
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
  const firstHelpIndex = sortedEvents.findIndex((event) => event.type === "ai_help_requested")
  const firstSuccessIndex = sortedEvents.findIndex(
    (event) =>
      event.type === "test_run" &&
      event.testSummary &&
      event.testSummary.total > 0 &&
      event.testSummary.failed === 0
  )
  const startedAt = sortedEvents.find((event) => event.type === "session_started")?.timestamp
  const firstHelp = sortedEvents[firstHelpIndex]

  return {
    evidenceVersion: 2,
    ...(params.finalSourceRevision && typeof finalTestRevision === "string"
      ? {
          finalSourceVerified: finalTestRevision === params.finalSourceRevision,
        }
      : {}),
    rootCauseAssessment: { status: "unavailable" },
    ...(firstHelp
      ? {
          firstAIHelp: {
            requestedAt: firstHelp.timestamp,
            ...(startedAt !== undefined
              ? { elapsedMs: Math.max(0, firstHelp.timestamp - startedAt) }
              : {}),
            ...(firstEditIndex !== -1 ? { beforeFirstEdit: firstHelpIndex < firstEditIndex } : {}),
            ...(reproductionIndex !== -1
              ? { beforeFirstFailure: firstHelpIndex < reproductionIndex }
              : {}),
            ...(firstSuccessIndex !== -1
              ? { beforeFirstSuccess: firstHelpIndex < firstSuccessIndex }
              : {}),
          },
        }
      : {}),
    reproducedBeforeEditing:
      reproductionIndex !== -1 && (firstEditIndex === -1 || reproductionIndex < firstEditIndex),
    inspectedFiles: Array.from(inspectedFiles),
    inspectedTestOrDocs: Array.from(inspectedTestOrDocs),
    editedFiles: edited,
    expectedTouchedFiles,
    overEditedFiles,
    hypothesisCount: sortedEvents.filter((event) => event.type === "hypothesis_created").length,
    visibleTestsRun: sortedEvents.filter(
      (event) => event.type === "test_run" && event.testSummary && event.testSummary.total > 0
    ).length,
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
