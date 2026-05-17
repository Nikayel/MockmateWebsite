import type { BugFixScenario } from "@/lib/scenarios/types"

/**
 * Convert bug fix scenarios to rich retrieval text.
 */
export function bugFixToEmbeddingText(scenario: BugFixScenario): string {
  const languages = Object.keys(scenario.buggyCode)
  const primaryLang = languages.includes("python") ? "python" : languages[0]
  const buggyCodeSnippet = scenario.buggyCode[primaryLang] || ""

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
    `## Debugging Hints`,
    ...scenario.hints.map((hint) => `- ${hint}`),
    ``,
    `## Test Cases (${scenario.testCases.length} total)`,
    ...testCaseLines,
  ]

  return parts.join("\n")
}
