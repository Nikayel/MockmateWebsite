import type { SystemDesignScenario } from "@/lib/scenarios/types"

/**
 * Convert system design scenarios to rich retrieval text.
 */
export function systemDesignToEmbeddingText(scenario: SystemDesignScenario): string {
  const parts = [
    `# ${scenario.title}`,
    ``,
    `## Overview`,
    `Type: System Design Interview`,
    `Difficulty: ${scenario.difficulty}`,
    `Companies: ${scenario.companies.join(", ")}`,
    `Estimated Time: ${scenario.estimatedTime} minutes`,
    `Tags: ${scenario.tags.join(", ")}`,
    ``,
    `## Problem Statement`,
    scenario.problemStatement,
    ``,
    `## Functional Requirements`,
    ...scenario.functionalRequirements.map((req) => `- ${req}`),
    ``,
    `## Non-Functional Requirements`,
    ...scenario.nonFunctionalRequirements.map((req) => `- ${req}`),
    ``,
    `## Constraints`,
    ...scenario.constraints.map((c) => `- ${c}`),
    ``,
    `## Key Components`,
    ...scenario.keyComponents.map((comp) => `- ${comp}`),
    ``,
    `## Hints for Candidates`,
    ...scenario.hints.map((hint) => `- ${hint}`),
    ``,
    `## Evaluation Criteria`,
    ...scenario.evaluationCriteria.map(
      (ec) => `- ${ec.category} (${ec.weight}%): ${ec.description}`
    ),
    ``,
    `## Example Solution`,
    `### Overview`,
    scenario.exampleSolution.overview,
    ``,
    `### Architecture`,
    ...scenario.exampleSolution.architecture.map((a) => `- ${a}`),
    ``,
    `### Data Model`,
    ...scenario.exampleSolution.dataModel.map((dm) => `- ${dm}`),
    ``,
    `### API Design`,
    ...scenario.exampleSolution.apiDesign.map((api) => `- ${api}`),
    ``,
    `### Scalability Considerations`,
    ...scenario.exampleSolution.scalability.map((s) => `- ${s}`),
    ``,
    `### Trade-offs`,
    ...scenario.exampleSolution.tradeoffs.map((t) => `- ${t}`),
    ``,
    `## Discussion Points`,
    ...scenario.discussionPoints.map((dp) => `- ${dp}`),
  ]

  return parts.join("\n")
}
