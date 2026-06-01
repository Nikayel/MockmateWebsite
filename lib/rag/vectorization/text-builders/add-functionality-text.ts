import type { AddFunctionalityScenario } from "@/lib/scenarios/types"

export function addFunctionalityToEmbeddingText(scenario: AddFunctionalityScenario): string {
  const workspace = scenario.workspace
  const primaryLanguage = workspace?.language ?? Object.keys(scenario.existingCode)[0] ?? "unknown"
  const files = workspace?.files ?? []

  const parts = [
    `# ${scenario.title}`,
    ``,
    `## Overview`,
    `Type: Add Functionality / Existing Codebase`,
    `Difficulty: ${scenario.difficulty}`,
    `Companies: ${scenario.companies.join(", ")}`,
    `Estimated Time: ${scenario.estimatedTime} minutes`,
    `Tags: ${scenario.tags.join(", ")}`,
    `Language: ${primaryLanguage}`,
    ``,
    `## Problem Statement`,
    scenario.problemStatement,
    ``,
    `## Feature Requirements`,
    ...scenario.featureRequirements.map((requirement) => `- ${requirement}`),
    ``,
    `## Acceptance Criteria`,
    ...scenario.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    ``,
    `## Workspace Files`,
    ...(files.length > 0
      ? files
          .filter((file) => !file.hidden)
          .flatMap((file) => [
            `### ${file.path}`,
            `Role: ${file.role}`,
            file.description ?? "",
            "```" + file.language,
            file.content.substring(0, 900),
            "```",
          ])
      : ["No workspace files provided."]),
    ``,
    `## Visible Tests`,
    ...(workspace?.visibleTestPaths ?? []).map((path) => `- ${path}`),
    ``,
    `## Hidden Test Focus`,
    ...(workspace?.hiddenTestPaths ?? []).map((path) => `- ${path}`),
    ``,
    `## Hints`,
    ...scenario.hints.map((hint) => `- ${hint}`),
  ]

  return parts.join("\n")
}
