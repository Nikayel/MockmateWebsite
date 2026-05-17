import type { DSAScenario } from "@/lib/scenarios/types"

/**
 * Convert DSA scenario to rich text for embedding.
 * Includes all test cases with edge case tagging for better RAG retrieval.
 */
export function scenarioToEmbeddingText(scenario: DSAScenario): string {
  const testCaseLines =
    scenario.testCases?.map((tc, i) => {
      const isEdgeCase = tc.description?.toLowerCase().includes("edge")
      const label = isEdgeCase ? "[EDGE CASE]" : ""
      return `${i + 1}. ${tc.description} ${label}\n   Input: ${JSON.stringify(tc.input)}\n   Expected: ${JSON.stringify(tc.expected)}`
    }) || []

  const edgeCases =
    scenario.testCases?.filter((tc) => tc.description?.toLowerCase().includes("edge")) || []

  const edgeCaseSection =
    edgeCases.length > 0
      ? [
          ``,
          `## Edge Cases (${edgeCases.length} total)`,
          ...edgeCases.map(
            (tc) =>
              `- ${tc.description}: Input ${JSON.stringify(tc.input)} -> Expected ${JSON.stringify(tc.expected)}`
          ),
        ]
      : []

  const parts = [
    `# ${scenario.title}`,
    ``,
    `## Problem Type`,
    `Pattern: ${scenario.pattern}`,
    `Difficulty: ${scenario.difficulty}`,
    `Companies: ${scenario.companies.join(", ")}`,
    `Tags: ${scenario.tags.join(", ")}`,
    ``,
    `## Problem Statement`,
    scenario.problemStatement,
    ``,
    `## Constraints`,
    scenario.constraints.join("\n"),
    ``,
    `## Examples`,
    ...scenario.examples.map(
      (ex, i) =>
        `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`
    ),
    ``,
    `## Test Cases (${scenario.testCases?.length || 0} total)`,
    ...testCaseLines,
    ...edgeCaseSection,
    ``,
    `## Hints`,
    scenario.hints.join("\n"),
    ``,
    `## Complexity`,
    `Time: ${scenario.optimalComplexity.time}`,
    `Space: ${scenario.optimalComplexity.space}`,
  ]

  return parts.join("\n")
}
