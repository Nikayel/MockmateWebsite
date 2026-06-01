import type { BugFixScenario } from "@/lib/scenarios/types"

/**
 * Convert bug fix scenarios to rich retrieval text.
 */
export function bugFixToEmbeddingText(scenario: BugFixScenario): string {
  const languages = Object.keys(scenario.buggyCode)
  const primaryLang = languages.includes("python") ? "python" : languages[0]
  const buggyCodeSnippet = scenario.buggyCode[primaryLang] || ""
  const codebaseFiles = scenario.codebaseFiles?.[primaryLang] || []
  const workspaceFiles = scenario.workspace?.files.filter((file) => !file.hidden) || []

  const testCaseLines = scenario.testCases.map((tc, i) => {
    const isEdgeCase = tc.description?.toLowerCase().includes("edge")
    const label = isEdgeCase ? " [EDGE CASE]" : ""
    return `${i + 1}. ${tc.description}${label}: Input: ${JSON.stringify(tc.input)} -> Expected: ${JSON.stringify(tc.expected)}`
  })

  const parts = [
    `# ${scenario.title}`,
    ``,
    `## Overview`,
    `Type: Bug Fix / Debugging`,
    `Difficulty: ${scenario.difficulty}`,
    `Companies: ${scenario.companies.join(", ")}`,
    `Estimated Time: ${scenario.estimatedTime} minutes`,
    `Tags: ${scenario.tags.join(", ")}`,
    ``,
    `## Problem Statement`,
    scenario.problemStatement,
    ``,
    `## Bug Description`,
    scenario.bugDescription,
    ``,
    `## Expected Behavior`,
    scenario.expectedBehavior,
    ``,
    `## Buggy Code (${primaryLang})`,
    "```" + primaryLang,
    buggyCodeSnippet.substring(0, 1500),
    "```",
    ``,
    `## Codebase Files`,
    ...(workspaceFiles.length > 0
      ? workspaceFiles.flatMap((file) => [
          `### ${file.path}`,
          `Role: ${file.role}`,
          file.description ?? "",
          "```" + file.language,
          file.content.substring(0, 900),
          "```",
        ])
      : codebaseFiles.length > 0
        ? codebaseFiles.flatMap((file) => [
            `### ${file.fileName}`,
            file.description,
            "```" + primaryLang,
            file.content.substring(0, 500),
            "```",
          ])
        : ["No supporting codebase files provided."]),
    ``,
    `## Workspace Test Focus`,
    ...(scenario.workspace
      ? [
          `Primary file: ${scenario.workspace.primaryFilePath}`,
          `Editable files: ${scenario.workspace.editableFilePaths.join(", ")}`,
          `Visible tests: ${scenario.workspace.visibleTestPaths.join(", ")}`,
          `Hidden tests: ${scenario.workspace.hiddenTestPaths.join(", ")}`,
        ]
      : ["Single-file execution scenario."]),
    ``,
    `## Debugging Hints`,
    ...scenario.hints.map((hint) => `- ${hint}`),
    ``,
    `## Test Cases (${scenario.testCases.length} total)`,
    ...testCaseLines,
  ]

  return parts.join("\n")
}
