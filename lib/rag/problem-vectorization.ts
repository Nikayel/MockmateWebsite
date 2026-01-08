/**
 * Problem Vectorization Service
 *
 * Vectorizes all DSA problems and company questions for RAG retrieval.
 * Creates rich embeddings with problem metadata for semantic search.
 *
 * Features:
 * - Vectorizes all 71+ DSA scenarios
 * - Vectorizes company-specific questions and patterns
 * - Generates rich text representations for embeddings
 * - Stores in vector database with comprehensive metadata
 * - Supports incremental updates
 */

import { getHybridProvider } from "@/lib/rag/embeddings/hybrid-provider"
import { vectorDB } from "@/lib/rag/vectordb"
import type { VectorDocument } from "@/lib/rag/types"
import type {
  DSAScenario,
  SystemDesignScenario,
  BugFixScenario,
  Scenario,
} from "@/lib/scenarios/types"
import { getScenariosByType, getScenariosByPattern } from "@/lib/scenarios/index"
import { ALL_COMPANIES, type CompanyQuestionData } from "@/lib/data/company-questions"
import {
  getPatternKnowledge,
  patternKnowledgeToDocument,
} from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

/**
 * Vectorization result
 */
export interface VectorizationResult {
  totalProblems: number
  totalCompanies: number
  totalPatternKnowledge: number
  totalSystemDesign: number
  totalBugFix: number
  vectorizedProblems: number
  vectorizedCompanies: number
  vectorizedPatternKnowledge: number
  vectorizedSystemDesign: number
  vectorizedBugFix: number
  errors: string[]
  durationMs: number
}

/**
 * Progress callback type
 */
export type VectorizationProgressCallback = (
  stage: string,
  current: number,
  total: number,
  item?: string
) => void

/**
 * Convert DSA scenario to rich text for embedding
 */
function scenarioToEmbeddingText(scenario: DSAScenario): string {
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
    `## Hints`,
    scenario.hints.join("\n"),
    ``,
    `## Complexity`,
    `Time: ${scenario.optimalComplexity.time}`,
    `Space: ${scenario.optimalComplexity.space}`,
  ]

  return parts.join("\n")
}

/**
 * Convert System Design scenario to rich text for embedding
 * Rich content for RAG retrieval during system design interviews
 */
function systemDesignToEmbeddingText(scenario: SystemDesignScenario): string {
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

/**
 * Convert Bug Fix scenario to rich text for embedding
 * Includes bug description, expected behavior, and debugging context
 */
function bugFixToEmbeddingText(scenario: BugFixScenario): string {
  // Get a representative language for the buggy code snippet
  const languages = Object.keys(scenario.buggyCode)
  const primaryLang = languages.includes("python") ? "python" : languages[0]
  const buggyCodeSnippet = scenario.buggyCode[primaryLang] || ""

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
    buggyCodeSnippet.substring(0, 1000), // Limit code length for embedding
    "```",
    ``,
    `## Debugging Hints`,
    ...scenario.hints.map((hint) => `- ${hint}`),
    ``,
    `## Test Cases`,
    ...scenario.testCases
      .slice(0, 3)
      .map(
        (tc, i) =>
          `${i + 1}. ${tc.description}: Input: ${JSON.stringify(tc.input).substring(0, 100)} → Expected: ${JSON.stringify(tc.expected).substring(0, 100)}`
      ),
  ]

  return parts.join("\n")
}

/**
 * Convert company data to rich text for embedding
 */
function companyToEmbeddingText(company: CompanyQuestionData): string {
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

  return parts.join("\n")
}

/**
 * Convert a must-know question to embedding text
 */
function mustKnowQuestionToEmbeddingText(
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

/**
 * Vectorize all DSA problems
 */
async function vectorizeDSAProblems(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  try {
    // Load all DSA scenarios
    onProgress?.("Loading DSA scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("dsa")) as DSAScenario[]
    onProgress?.("Loading DSA scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    // Process in batches of 10
    const batchSize = 10
    const batches = Math.ceil(scenarios.length / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * batchSize, (i + 1) * batchSize)
      onProgress?.("Vectorizing DSA problems", i + 1, batches, batch.map((s) => s.title).join(", "))

      const documents: VectorDocument[] = []

      for (const scenario of batch) {
        try {
          const text = scenarioToEmbeddingText(scenario)
          const embedding = await embeddingProvider.generateEmbedding(text)

          documents.push({
            id: `problem-${scenario.id}`,
            vector: embedding,
            text: text,
            metadata: {
              type: "problem",
              problemId: scenario.id,
              title: scenario.title,
              pattern: scenario.pattern,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              timeComplexity: scenario.optimalComplexity.time,
              spaceComplexity: scenario.optimalComplexity.space,
              timestamp: new Date().toISOString(),
            },
          })

          vectorized++
        } catch (error) {
          errors.push(`Failed to vectorize ${scenario.id}: ${error}`)
        }
      }

      // Upsert batch to vector DB
      if (documents.length > 0) {
        await vectorDB.upsert(documents)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    errors.push(`Failed to load DSA scenarios: ${error}`)
  }

  return { vectorized, errors }
}

/**
 * Vectorize company question data
 */
async function vectorizeCompanyQuestions(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  for (let i = 0; i < ALL_COMPANIES.length; i++) {
    const company = ALL_COMPANIES[i]
    onProgress?.("Vectorizing company data", i + 1, ALL_COMPANIES.length, company.name)

    try {
      // Vectorize company overview
      const companyText = companyToEmbeddingText(company)
      const companyEmbedding = await embeddingProvider.generateEmbedding(companyText)

      await vectorDB.upsert([
        {
          id: `company-${company.id}`,
          vector: companyEmbedding,
          text: companyText,
          metadata: {
            type: "company",
            companyId: company.id,
            companyName: company.name,
            topPatterns: company.topPatterns.map((p) => p.pattern),
            difficultyDistribution: company.difficultyDistribution,
            interviewPace: company.interviewStyle.pace,
            timestamp: new Date().toISOString(),
          },
        },
      ])
      vectorized++

      // Vectorize each must-know question
      for (const question of company.mustKnowQuestions) {
        try {
          const questionText = mustKnowQuestionToEmbeddingText(question, company)
          const questionEmbedding = await embeddingProvider.generateEmbedding(questionText)

          await vectorDB.upsert([
            {
              id: `company-question-${company.id}-${question.scenarioId}`,
              vector: questionEmbedding,
              text: questionText,
              metadata: {
                type: "company-question",
                companyId: company.id,
                companyName: company.name,
                scenarioId: question.scenarioId,
                title: question.title,
                frequency: question.frequency,
                variants: question.variants || [],
                timestamp: new Date().toISOString(),
              },
            },
          ])
          vectorized++
        } catch (error) {
          errors.push(
            `Failed to vectorize question ${question.title} for ${company.name}: ${error}`
          )
        }
      }
    } catch (error) {
      errors.push(`Failed to vectorize company ${company.name}: ${error}`)
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return { vectorized, errors }
}

/**
 * Vectorize System Design scenarios
 */
async function vectorizeSystemDesignScenarios(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading System Design scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("system-design")) as SystemDesignScenario[]
    onProgress?.("Loading System Design scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i]
      onProgress?.("Vectorizing System Design", i + 1, scenarios.length, scenario.title)

      try {
        const text = systemDesignToEmbeddingText(scenario)
        const embedding = await embeddingProvider.generateEmbedding(text)

        await vectorDB.upsert([
          {
            id: `system-design-${scenario.id}`,
            vector: embedding,
            text: text,
            metadata: {
              type: "system-design",
              problemId: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              keyComponents: scenario.keyComponents,
              timestamp: new Date().toISOString(),
            },
          },
        ])

        vectorized++
      } catch (error) {
        errors.push(`Failed to vectorize system-design ${scenario.id}: ${error}`)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    errors.push(`Failed to load system design scenarios: ${error}`)
  }

  return { vectorized, errors }
}

/**
 * Vectorize Bug Fix scenarios
 */
async function vectorizeBugFixScenarios(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  try {
    onProgress?.("Loading Bug Fix scenarios", 0, 1, "Loading...")
    const scenarios = (await getScenariosByType("bugfix")) as BugFixScenario[]
    onProgress?.("Loading Bug Fix scenarios", 1, 1, `Loaded ${scenarios.length} scenarios`)

    // Process in batches of 5
    const batchSize = 5
    const batches = Math.ceil(scenarios.length / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * batchSize, (i + 1) * batchSize)
      onProgress?.("Vectorizing Bug Fix", i + 1, batches, batch.map((s) => s.title).join(", "))

      const documents: VectorDocument[] = []

      for (const scenario of batch) {
        try {
          const text = bugFixToEmbeddingText(scenario)
          const embedding = await embeddingProvider.generateEmbedding(text)

          documents.push({
            id: `bugfix-${scenario.id}`,
            vector: embedding,
            text: text,
            metadata: {
              type: "bugfix",
              problemId: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              companies: scenario.companies,
              tags: scenario.tags,
              estimatedTime: scenario.estimatedTime,
              bugDescription: scenario.bugDescription.substring(0, 200),
              timestamp: new Date().toISOString(),
            },
          })

          vectorized++
        } catch (error) {
          errors.push(`Failed to vectorize bugfix ${scenario.id}: ${error}`)
        }
      }

      // Upsert batch to vector DB
      if (documents.length > 0) {
        await vectorDB.upsert(documents)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  } catch (error) {
    errors.push(`Failed to load bug fix scenarios: ${error}`)
  }

  return { vectorized, errors }
}

/**
 * Vectorize pattern knowledge
 */
async function vectorizePatternKnowledge(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  const patterns: DSAPattern[] = [
    "arrays-hashing",
    "two-pointers",
    "sliding-window",
    "stack",
    "binary-search",
    "linked-list",
    "trees",
    "trie",
    "heap",
    "graphs",
    "backtracking",
    "greedy",
    "intervals",
    "dp-1d",
    "dp-2d",
    "bit-manipulation",
    "math-geometry",
  ]

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    onProgress?.("Vectorizing pattern knowledge", i + 1, patterns.length, pattern)

    const knowledge = getPatternKnowledge(pattern)
    if (!knowledge) continue

    try {
      const text = patternKnowledgeToDocument(knowledge)
      const embedding = await embeddingProvider.generateEmbedding(text)

      await vectorDB.upsert([
        {
          id: `pattern-knowledge-${pattern}`,
          vector: embedding,
          text: text,
          metadata: {
            type: "pattern-knowledge",
            pattern: pattern,
            displayName: knowledge.displayName,
            relatedPatterns: knowledge.relatedPatterns,
            prerequisites: knowledge.prerequisites,
            timeComplexity: knowledge.timeComplexity.typical,
            spaceComplexity: knowledge.spaceComplexity.typical,
            timestamp: new Date().toISOString(),
          },
        },
      ])
      vectorized++
    } catch (error) {
      errors.push(`Failed to vectorize pattern ${pattern}: ${error}`)
    }
  }

  return { vectorized, errors }
}

/**
 * Main vectorization function
 * Vectorizes all content types: DSA, System Design, Bug Fix, Company data, Pattern knowledge
 */
export async function vectorizeAllProblems(
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationResult> {
  const startTime = Date.now()
  const allErrors: string[] = []

  const embeddingProvider = getHybridProvider()

  // Count totals
  let totalProblems = 0
  const totalCompanies = ALL_COMPANIES.length
  const totalPatternKnowledge = 17 // Number of patterns
  let totalSystemDesign = 0
  let totalBugFix = 0

  try {
    const [dsaScenarios, systemDesignScenarios, bugFixScenarios] = await Promise.all([
      getScenariosByType("dsa"),
      getScenariosByType("system-design"),
      getScenariosByType("bugfix"),
    ])
    totalProblems = dsaScenarios.length
    totalSystemDesign = systemDesignScenarios.length
    totalBugFix = bugFixScenarios.length
  } catch (e) {
    allErrors.push(`Failed to count scenarios: ${e}`)
  }

  const totalSteps = 5

  // 1. Vectorize DSA problems
  onProgress?.("Starting", 0, totalSteps, "DSA Problems")
  const dsaResult = await vectorizeDSAProblems(embeddingProvider, onProgress)
  allErrors.push(...dsaResult.errors)

  // 2. Vectorize System Design scenarios
  onProgress?.("Starting", 1, totalSteps, "System Design Scenarios")
  const systemDesignResult = await vectorizeSystemDesignScenarios(embeddingProvider, onProgress)
  allErrors.push(...systemDesignResult.errors)

  // 3. Vectorize Bug Fix scenarios
  onProgress?.("Starting", 2, totalSteps, "Bug Fix Scenarios")
  const bugFixResult = await vectorizeBugFixScenarios(embeddingProvider, onProgress)
  allErrors.push(...bugFixResult.errors)

  // 4. Vectorize company data
  onProgress?.("Starting", 3, totalSteps, "Company Questions")
  const companyResult = await vectorizeCompanyQuestions(embeddingProvider, onProgress)
  allErrors.push(...companyResult.errors)

  // 5. Vectorize pattern knowledge
  onProgress?.("Starting", 4, totalSteps, "Pattern Knowledge")
  const patternResult = await vectorizePatternKnowledge(embeddingProvider, onProgress)
  allErrors.push(...patternResult.errors)

  onProgress?.("Complete", totalSteps, totalSteps, "Done!")

  return {
    totalProblems,
    totalCompanies,
    totalPatternKnowledge,
    totalSystemDesign,
    totalBugFix,
    vectorizedProblems: dsaResult.vectorized,
    vectorizedCompanies: companyResult.vectorized,
    vectorizedPatternKnowledge: patternResult.vectorized,
    vectorizedSystemDesign: systemDesignResult.vectorized,
    vectorizedBugFix: bugFixResult.vectorized,
    errors: allErrors,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Vectorize a single problem (for incremental updates)
 */
export async function vectorizeSingleProblem(scenario: DSAScenario): Promise<void> {
  const embeddingProvider = getHybridProvider()
  const text = scenarioToEmbeddingText(scenario)
  const embedding = await embeddingProvider.generateEmbedding(text)

  await vectorDB.upsert([
    {
      id: `problem-${scenario.id}`,
      vector: embedding,
      text: text,
      metadata: {
        type: "problem",
        problemId: scenario.id,
        title: scenario.title,
        pattern: scenario.pattern,
        difficulty: scenario.difficulty,
        companies: scenario.companies,
        tags: scenario.tags,
        estimatedTime: scenario.estimatedTime,
        timeComplexity: scenario.optimalComplexity.time,
        spaceComplexity: scenario.optimalComplexity.space,
        timestamp: new Date().toISOString(),
      },
    },
  ])
}

/**
 * Check if problems are already vectorized
 */
export async function getVectorizationStatus(): Promise<{
  hasProblems: boolean
  hasCompanies: boolean
  hasPatternKnowledge: boolean
  hasSystemDesign: boolean
  hasBugFix: boolean
  problemCount: number
  companyCount: number
  patternCount: number
  systemDesignCount: number
  bugFixCount: number
}> {
  try {
    // Use getStats if available (Pinecone) for accurate counts
    if (vectorDB.getStats) {
      const stats = await vectorDB.getStats()
      const namespaces = stats.namespaces

      // Namespace naming: mockmate_{type}
      const problemCount = namespaces["mockmate_problem"] || 0
      const companyCount =
        (namespaces["mockmate_company"] || 0) + (namespaces["mockmate_company-question"] || 0)
      const patternCount = namespaces["mockmate_pattern-knowledge"] || 0
      const systemDesignCount = namespaces["mockmate_system-design"] || 0
      const bugFixCount = namespaces["mockmate_bugfix"] || 0

      return {
        hasProblems: problemCount > 0,
        hasCompanies: companyCount > 0,
        hasPatternKnowledge: patternCount > 0,
        hasSystemDesign: systemDesignCount > 0,
        hasBugFix: bugFixCount > 0,
        problemCount,
        companyCount,
        patternCount,
        systemDesignCount,
        bugFixCount,
      }
    }

    // Fallback: use semantic search (less accurate, for Firestore)
    const embeddingProvider = getHybridProvider()
    const testEmbedding = await embeddingProvider.generateEmbedding(
      "Two Sum array hash map system design URL shortener bug fix"
    )

    const results = await vectorDB.query(testEmbedding, {
      topK: 200,
      includeMetadata: true,
    })

    const problemCount = results.filter((r) => r.metadata?.type === "problem").length
    const companyCount = results.filter(
      (r) => r.metadata?.type === "company" || r.metadata?.type === "company-question"
    ).length
    const patternCount = results.filter((r) => r.metadata?.type === "pattern-knowledge").length
    const systemDesignCount = results.filter((r) => r.metadata?.type === "system-design").length
    const bugFixCount = results.filter((r) => r.metadata?.type === "bugfix").length

    return {
      hasProblems: problemCount > 0,
      hasCompanies: companyCount > 0,
      hasPatternKnowledge: patternCount > 0,
      hasSystemDesign: systemDesignCount > 0,
      hasBugFix: bugFixCount > 0,
      problemCount,
      companyCount,
      patternCount,
      systemDesignCount,
      bugFixCount,
    }
  } catch {
    return {
      hasProblems: false,
      hasCompanies: false,
      hasPatternKnowledge: false,
      hasSystemDesign: false,
      hasBugFix: false,
      problemCount: 0,
      companyCount: 0,
      patternCount: 0,
      systemDesignCount: 0,
      bugFixCount: 0,
    }
  }
}
