import type { BugFixScenario } from "./types"
import { isWorkspaceScenario, validateWorkspaceScenario } from "@/lib/workspace-execution"

const REQUIRED_INCIDENT_FIELDS = [
  "userReport",
  "observedSymptoms",
  "reproductionSteps",
  "successCriteria",
  "debuggingSkills",
  "expectedTouchedFiles",
  "rootCauseRubric",
] as const

const USERREPORT_ANTI_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /The candidate should investigate/i,
    label: "meta-commentary — write as an incident ticket or Slack message instead",
  },
  {
    pattern: /without being handed the root cause/i,
    label: "meta-commentary — write as an incident ticket or Slack message instead",
  },
  { pattern: /!{2,}/, label: "theatrical exclamation marks" },
  { pattern: /\byou('ve| have) been paged\b/i, label: "theatrical paging language" },
  { pattern: /\b(your mission|your task is)\b/i, label: "theatrical task framing" },
]

const CANDIDATE_LEAK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(BUG|FIXME)\s*:/i, label: "explicit bug marker" },
  { pattern: /\bthe bug is\b/i, label: "direct bug diagnosis" },
  { pattern: /\broot cause is\b/i, label: "direct root-cause diagnosis" },
  { pattern: /\bchange the comparison operator\b/i, label: "patch instruction" },
  { pattern: /\bwrong key\b/i, label: "patch instruction" },
  { pattern: /\buse math\.isfinite\b/i, label: "patch instruction" },
  { pattern: /\buse the event id as (the )?idempotency key\b/i, label: "patch instruction" },
  {
    pattern: /\bdecision and reservation must happen as one step\b/i,
    label: "patch instruction",
  },
]

export interface BugfixQualityIssue {
  field: string
  message: string
}

export function withBugfixIncidentDefaults(scenario: BugFixScenario): BugFixScenario {
  const workspace = isWorkspaceScenario(scenario) ? scenario.workspace : null
  const visibleTestPaths = workspace?.visibleTestPaths || []
  const docs = (workspace?.files || [])
    .filter((file) => file.role === "docs")
    .map((file) => file.path)
  const expectedTouchedFiles = workspace?.editableFilePaths || []

  return {
    ...scenario,
    bugfixKind: scenario.bugfixKind || (workspace ? "real-codebase" : "micro-debugging"),
    userReport:
      scenario.userReport ||
      `${scenario.description}. The candidate should investigate the incident without being handed the root cause.`,
    observedSymptoms: scenario.observedSymptoms || [scenario.expectedBehavior],
    reproductionSteps: scenario.reproductionSteps || [
      docs.length > 0 ? `Read ${docs[0]} for product context.` : "Read the incident context.",
      visibleTestPaths.length > 0
        ? `Inspect ${visibleTestPaths[0]} for the visible failing behavior.`
        : "Inspect the visible test description.",
      "Run the workspace tests before editing.",
    ],
    visibleLogs:
      scenario.visibleLogs ||
      visibleTestPaths.map((path) => `Visible regression signal is documented in ${path}.`),
    successCriteria: scenario.successCriteria || [scenario.expectedBehavior],
    debuggingSkills: scenario.debuggingSkills || [
      "reproduction",
      "codebase navigation",
      "hypothesis",
      "minimal patch",
      "verification",
    ],
    expectedTouchedFiles: scenario.expectedTouchedFiles || expectedTouchedFiles,
    rootCauseRubric: scenario.rootCauseRubric || [
      "Identifies the failing production behavior.",
      "Explains the root cause without relying on hidden tests.",
      "Connects the patch to the observed symptom and regression prevention.",
    ],
  }
}

export function validateBugfixScenarioQuality(scenario: BugFixScenario): BugfixQualityIssue[] {
  const issues: BugfixQualityIssue[] = []

  if (scenario.bugfixKind !== "real-codebase") {
    issues.push({
      field: "bugfixKind",
      message: "Default bugfix discovery must only publish real-codebase incidents.",
    })
  }

  for (const field of REQUIRED_INCIDENT_FIELDS) {
    const value = scenario[field]
    if (typeof value === "string" && value.trim().length === 0) {
      issues.push({ field, message: "Incident field must not be empty." })
    }
    if (Array.isArray(value) && value.length === 0) {
      issues.push({ field, message: "Incident list must include at least one entry." })
    }
    if (value === undefined) {
      issues.push({ field, message: "Incident metadata field is required." })
    }
  }

  for (const antiPattern of USERREPORT_ANTI_PATTERNS) {
    if (antiPattern.pattern.test(scenario.userReport || "")) {
      issues.push({
        field: "userReport",
        message: `userReport includes ${antiPattern.label}.`,
      })
    }
  }

  if (!isWorkspaceScenario(scenario)) {
    issues.push({
      field: "executionMode",
      message: "Real-codebase bugfix scenarios must use workspace execution.",
    })
    return issues
  }

  for (const workspaceError of validateWorkspaceScenario(scenario)) {
    issues.push({ field: "workspace", message: workspaceError })
  }

  const { workspace } = scenario
  if (!workspace.files.some((file) => file.role === "docs")) {
    issues.push({ field: "workspace.files", message: "At least one docs file is required." })
  }
  if (!workspace.referenceFiles || workspace.referenceFiles.length === 0) {
    issues.push({
      field: "workspace.referenceFiles",
      message: "Reference files are required for scenario audits.",
    })
  }
  if (
    workspace.files.some((file) => file.hidden && workspace.visibleTestPaths.includes(file.path))
  ) {
    issues.push({
      field: "workspace.visibleTestPaths",
      message: "Visible tests must not reference hidden files.",
    })
  }

  for (const expectedPath of scenario.expectedTouchedFiles || []) {
    if (!workspace.editableFilePaths.includes(expectedPath)) {
      issues.push({
        field: "expectedTouchedFiles",
        message: `Expected touched file must be editable: ${expectedPath}`,
      })
    }
  }

  const rootCauseText = scenario.bugDescription.trim().toLowerCase()
  const candidateVisibleTexts = [
    { field: "problemStatement", text: scenario.problemStatement },
    ...workspace.files
      .filter((file) => !file.hidden)
      .map((file) => ({
        field: `workspace.files.${file.path}`,
        text: file.content,
      })),
  ]

  for (const { field, text } of candidateVisibleTexts) {
    const normalizedText = text.toLowerCase()
    if (rootCauseText && normalizedText.includes(rootCauseText)) {
      issues.push({
        field,
        message: "Candidate-visible content must not reveal the exact root cause.",
      })
    }

    for (const leakPattern of CANDIDATE_LEAK_PATTERNS) {
      if (leakPattern.pattern.test(text)) {
        issues.push({
          field,
          message: `Candidate-visible content includes ${leakPattern.label}.`,
        })
      }
    }
  }

  return issues
}
