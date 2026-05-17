import type { CompanyQuestionData } from "@/lib/data/company-questions"

/**
 * Convert company data to rich text for embedding.
 */
export function companyToEmbeddingText(company: CompanyQuestionData): string {
  const parts = [
    `# ${company.name} Interview Preparation`,
    ``,
    `## Company Overview`,
    `Company: ${company.name}`,
    ``,
    `## Difficulty Distribution`,
    `Easy: ${company.difficultyDistribution.easy}%`,
    `Medium: ${company.difficultyDistribution.medium}%`,
    `Hard: ${company.difficultyDistribution.hard}%`,
    ``,
    `## Top Patterns Asked`,
    ...company.topPatterns.map(
      (p) =>
        `- ${p.pattern}: ${p.frequency}% frequency, priority ${p.priority}/10, typically ${p.typicalDifficulty}`
    ),
    ``,
    `## Must-Know Questions`,
    ...company.mustKnowQuestions.map(
      (q) =>
        `- ${q.title} (${q.frequency})${q.variants ? ` - Variants: ${q.variants.join(", ")}` : ""}`
    ),
    ``,
    `## Interview Process`,
    `Total Rounds: ${company.interviewProcess.totalRounds}`,
    `Timeline: ${company.interviewProcess.timeline}`,
    ...company.interviewProcess.rounds.map(
      (r, i) =>
        `Round ${i + 1}: ${r.type} (${r.duration} min) - ${r.description}\nFocus: ${r.focusAreas.join(", ")}`
    ),
    ``,
    `## Interview Style`,
    `Pace: ${company.interviewStyle.pace}`,
    `Communication Emphasis: ${company.interviewStyle.communicationEmphasis}/10`,
    `Code Quality Emphasis: ${company.interviewStyle.codeQualityEmphasis}/10`,
    `Optimal Solution Required: ${company.interviewStyle.optimalSolutionRequired ? "Yes" : "No"}`,
    `Allows Pseudocode: ${company.interviewStyle.allowsPseudocode ? "Yes" : "No"}`,
    `Provides Hints: ${company.interviewStyle.providesHints ? "Yes" : "No"}`,
    `Unique Traits: ${company.interviewStyle.uniqueTraits.join(", ")}`,
    ``,
    `## Tips`,
    ...company.interviewProcess.tips.map((t) => `- ${t}`),
  ]

  if (company.coreValues) {
    parts.push(
      ``,
      `## Core Values & Leadership Principles`,
      ...company.coreValues.principles.map((p) => `- ${p}`),
      ``,
      `## Behavioral Expectations`,
      ...company.coreValues.behavioralExpectations.map((b) => `- ${b}`),
      ``,
      `## Value Keywords`,
      `Keywords: ${company.coreValues.valueKeywords.join(", ")}`
    )
  }

  if (company.engineeringCulture) {
    parts.push(
      ``,
      `## Engineering Culture & Philosophy`,
      ...company.engineeringCulture.philosophy.map((p) => `- ${p}`),
      ``,
      `## Tech Stack`,
      `Technologies: ${company.engineeringCulture.techStack.join(", ")}`,
      ``,
      `## Engineering Practices`,
      `Code Review: ${company.engineeringCulture.codeReviewStyle}`,
      `Deployment: ${company.engineeringCulture.deploymentPhilosophy}`,
      `Documentation: ${company.engineeringCulture.documentationExpectations}`
    )
  }

  return parts.join("\n")
}

export function mustKnowQuestionToEmbeddingText(
  question: CompanyQuestionData["mustKnowQuestions"][0],
  company: CompanyQuestionData
): string {
  return `
# ${question.title}

## Context
Company: ${company.name}
Frequency: ${question.frequency}
${question.lastReported ? `Last Reported: ${question.lastReported}` : ""}

## Variants
${question.variants ? question.variants.join("\n") : "No known variants"}

## Preparation Tips
This is a ${question.frequency} question at ${company.name}. Focus on:
- Clean, optimal solution
- Clear communication
- Edge case handling
`.trim()
}
