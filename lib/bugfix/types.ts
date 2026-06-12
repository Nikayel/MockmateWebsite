export type BugfixEvidenceEventType =
  | "session_started"
  | "incident_read"
  | "file_opened"
  | "test_or_doc_opened"
  | "hypothesis_created"
  | "file_edited"
  | "test_run"
  | "visible_failure_seen"
  | "hidden_result_received"
  | "ai_help_requested"
  | "prevention_explained"
  | "submission_created"

export type BugfixSkillCategory =
  | "async-race"
  | "null-safety"
  | "idempotency"
  | "mutation-reference"
  | "numerical-precision"
  | "auth-permissions"
  | "caching"
  | "retries"
  | "state-sync"
  | "data-validation"
  | "date-time"
  | "database-consistency"
  | "observability"
  | "frontend-state"
  | "ai-collaboration"

export type BugfixPracticeTrack =
  | "beginner-debugger"
  | "frontend-regression-debugging"
  | "backend-api-debugging"
  | "data-date-time-bugs"
  | "distributed-systems-debugging"
  | "ai-assisted-debugging"

export type BugfixSessionMode = "practice" | "interview"

export interface BugfixEvidenceEvent {
  type: BugfixEvidenceEventType
  timestamp: number
  filePath?: string
  fileRole?: "editable" | "readonly" | "test" | "docs"
  durationMs?: number
  testSummary?: {
    total: number
    passed: number
    failed: number
    passRate: number
  }
  aiHelpKind?:
    | "next-file"
    | "log-interpretation"
    | "hypothesis-check"
    | "exact-fix"
    | "solution-like"
  text?: string
  metadata?: Record<string, string | number | boolean>
}

export interface BugfixEvidenceSummary {
  reproducedBeforeEditing: boolean
  inspectedFiles: string[]
  inspectedTestOrDocs: string[]
  editedFiles: string[]
  expectedTouchedFiles: string[]
  overEditedFiles: string[]
  hypothesisCount: number
  visibleTestsRun: number
  finalPassRate: number
  preventionExplained: boolean
  rootCauseExplained: boolean
  aiShortcutCount: number
  aiPartnerUseCount: number
}

export interface BugfixScoreBreakdown {
  reproductionDiscipline: number
  codebaseNavigation: number
  evidenceGathering: number
  hypothesisQuality: number
  minimalFixQuality: number
  verificationDiscipline: number
  overEditControl: number
  rootCauseUnderstanding: number
  regressionPrevention: number
  aiCollaborationQuality: number
  communication: number
  overall: number
}

export interface BugfixReadinessProfile {
  readinessScore: number
  strengths: BugfixSkillCategory[]
  weaknesses: BugfixSkillCategory[]
  track: BugfixPracticeTrack
  modeRecommendation: BugfixSessionMode
}
