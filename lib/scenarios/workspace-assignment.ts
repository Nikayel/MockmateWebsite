import type { AddFunctionalityScenario, BugFixScenario } from "./types"

type AssignmentScenario = BugFixScenario | AddFunctionalityScenario

export const TASK_DOCUMENT_PATH = "task.md"

function bulletSection(heading: string, entries: string[]): string {
  return entries.length ? `## ${heading}\n\n${entries.map((entry) => `- ${entry}`).join("\n")}` : ""
}

/** Derive a complete public assignment without maintaining another copy of its rules. */
export function withWorkspaceTaskDocument<T extends AssignmentScenario>(scenario: T): T {
  const workspace = scenario.workspace
  if (
    scenario.executionMode !== "workspace" ||
    !workspace ||
    workspace.files.some((file) => file.path === TASK_DOCUMENT_PATH)
  )
    return scenario

  const requirements = scenario.type === "add-functionality" ? scenario.featureRequirements : []
  const completion =
    scenario.type === "add-functionality"
      ? scenario.acceptanceCriteria
      : (scenario.successCriteria ?? [])
  const gettingStarted =
    scenario.type === "bugfix"
      ? (scenario.reproductionSteps ?? [])
      : [
          "Read README.md for codebase context and the source docstrings for API contracts.",
          ...workspace.visibleTestPaths.map(
            (path) => `Inspect \`${path}\` for executable examples.`
          ),
          "Run the workspace tests before editing to establish a baseline, then run again to verify your changes.",
        ]

  const content = [
    `# ${scenario.title}`,
    scenario.problemStatement.trim(),
    bulletSection("Requirements", requirements),
    bulletSection("Getting started", gettingStarted),
    bulletSection("Done when", completion),
  ]
    .filter(Boolean)
    .join("\n\n")

  return {
    ...scenario,
    workspace: {
      ...workspace,
      files: [
        {
          path: TASK_DOCUMENT_PATH,
          role: "docs",
          language: "markdown",
          description: "Full assignment, run instructions, and completion criteria.",
          content: `${content}\n`,
        },
        ...workspace.files,
      ],
    },
  }
}
