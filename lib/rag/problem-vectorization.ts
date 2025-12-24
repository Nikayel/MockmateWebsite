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

import { getHybridProvider } from '@/lib/rag/embeddings/hybrid-provider'
import { vectorDB } from '@/lib/rag/vectordb'
import type { VectorDocument } from '@/lib/rag/types'
import type { DSAScenario, Scenario } from '@/lib/scenarios/types'
import { getScenariosByType, getScenariosByPattern } from '@/lib/scenarios/index'
import { ALL_COMPANIES, type CompanyQuestionData } from '@/lib/data/company-questions'
import { getPatternKnowledge, patternKnowledgeToDocument } from '@/lib/rag/knowledge-base/dsa-knowledge'
import type { DSAPattern } from '@/lib/types/dsa-patterns'

/**
 * Vectorization result
 */
export interface VectorizationResult {
  totalProblems: number
  totalCompanies: number
  totalPatternKnowledge: number
  vectorizedProblems: number
  vectorizedCompanies: number
  vectorizedPatternKnowledge: number
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
    `Companies: ${scenario.companies.join(', ')}`,
    `Tags: ${scenario.tags.join(', ')}`,
    ``,
    `## Problem Statement`,
    scenario.problemStatement,
    ``,
    `## Constraints`,
    scenario.constraints.join('\n'),
    ``,
    `## Examples`,
    ...scenario.examples.map((ex, i) =>
      `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ''}`
    ),
    ``,
    `## Hints`,
    scenario.hints.join('\n'),
    ``,
    `## Complexity`,
    `Time: ${scenario.optimalComplexity.time}`,
    `Space: ${scenario.optimalComplexity.space}`,
  ]

  return parts.join('\n')
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
    ...company.topPatterns.map((p) =>
      `- ${p.pattern}: ${p.frequency}% frequency, priority ${p.priority}/10, typically ${p.typicalDifficulty}`
    ),
    ``,
    `## Must-Know Questions`,
    ...company.mustKnowQuestions.map((q) =>
      `- ${q.title} (${q.frequency})${q.variants ? ` - Variants: ${q.variants.join(', ')}` : ''}`
    ),
    ``,
    `## Interview Process`,
    `Total Rounds: ${company.interviewProcess.totalRounds}`,
    `Timeline: ${company.interviewProcess.timeline}`,
    ...company.interviewProcess.rounds.map((r, i) =>
      `Round ${i + 1}: ${r.type} (${r.duration} min) - ${r.description}\nFocus: ${r.focusAreas.join(', ')}`
    ),
    ``,
    `## Interview Style`,
    `Pace: ${company.interviewStyle.pace}`,
    `Communication Emphasis: ${company.interviewStyle.communicationEmphasis}/10`,
    `Code Quality Emphasis: ${company.interviewStyle.codeQualityEmphasis}/10`,
    `Optimal Solution Required: ${company.interviewStyle.optimalSolutionRequired ? 'Yes' : 'No'}`,
    `Allows Pseudocode: ${company.interviewStyle.allowsPseudocode ? 'Yes' : 'No'}`,
    `Provides Hints: ${company.interviewStyle.providesHints ? 'Yes' : 'No'}`,
    `Unique Traits: ${company.interviewStyle.uniqueTraits.join(', ')}`,
    ``,
    `## Tips`,
    ...company.interviewProcess.tips.map((t) => `- ${t}`),
  ]

  return parts.join('\n')
}

/**
 * Convert a must-know question to embedding text
 */
function mustKnowQuestionToEmbeddingText(
  question: CompanyQuestionData['mustKnowQuestions'][0],
  company: CompanyQuestionData
): string {
  return `
# ${question.title}

## Context
Company: ${company.name}
Frequency: ${question.frequency}
${question.lastReported ? `Last Reported: ${question.lastReported}` : ''}

## Variants
${question.variants ? question.variants.join('\n') : 'No known variants'}

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
    onProgress?.('Loading DSA scenarios', 0, 1, 'Loading...')
    const scenarios = (await getScenariosByType('dsa')) as DSAScenario[]
    onProgress?.('Loading DSA scenarios', 1, 1, `Loaded ${scenarios.length} scenarios`)

    // Process in batches of 10
    const batchSize = 10
    const batches = Math.ceil(scenarios.length / batchSize)

    for (let i = 0; i < batches; i++) {
      const batch = scenarios.slice(i * batchSize, (i + 1) * batchSize)
      onProgress?.('Vectorizing DSA problems', i + 1, batches, batch.map(s => s.title).join(', '))

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
              type: 'problem',
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
    onProgress?.('Vectorizing company data', i + 1, ALL_COMPANIES.length, company.name)

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
            type: 'company',
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
                type: 'company-question',
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
          errors.push(`Failed to vectorize question ${question.title} for ${company.name}: ${error}`)
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
 * Vectorize pattern knowledge
 */
async function vectorizePatternKnowledge(
  embeddingProvider: ReturnType<typeof getHybridProvider>,
  onProgress?: VectorizationProgressCallback
): Promise<{ vectorized: number; errors: string[] }> {
  const errors: string[] = []
  let vectorized = 0

  const patterns: DSAPattern[] = [
    'arrays-hashing',
    'two-pointers',
    'sliding-window',
    'stack',
    'binary-search',
    'linked-list',
    'trees',
    'tries',
    'heap',
    'graphs',
    'backtracking',
    'greedy',
    'intervals',
    '1d-dp',
    '2d-dp',
    'bit-manipulation',
    'math-geometry',
  ]

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    onProgress?.('Vectorizing pattern knowledge', i + 1, patterns.length, pattern)

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
            type: 'pattern-knowledge',
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
 */
export async function vectorizeAllProblems(
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationResult> {
  const startTime = Date.now()
  const allErrors: string[] = []

  const embeddingProvider = getHybridProvider()

  // Count totals
  let totalProblems = 0
  let totalCompanies = ALL_COMPANIES.length
  let totalPatternKnowledge = 17 // Number of patterns

  try {
    const scenarios = await getScenariosByType('dsa')
    totalProblems = scenarios.length
  } catch (e) {
    allErrors.push(`Failed to count problems: ${e}`)
  }

  // Vectorize DSA problems
  onProgress?.('Starting', 0, 3, 'DSA Problems')
  const dsaResult = await vectorizeDSAProblems(embeddingProvider, onProgress)
  allErrors.push(...dsaResult.errors)

  // Vectorize company data
  onProgress?.('Starting', 1, 3, 'Company Questions')
  const companyResult = await vectorizeCompanyQuestions(embeddingProvider, onProgress)
  allErrors.push(...companyResult.errors)

  // Vectorize pattern knowledge
  onProgress?.('Starting', 2, 3, 'Pattern Knowledge')
  const patternResult = await vectorizePatternKnowledge(embeddingProvider, onProgress)
  allErrors.push(...patternResult.errors)

  onProgress?.('Complete', 3, 3, 'Done!')

  return {
    totalProblems,
    totalCompanies,
    totalPatternKnowledge,
    vectorizedProblems: dsaResult.vectorized,
    vectorizedCompanies: companyResult.vectorized,
    vectorizedPatternKnowledge: patternResult.vectorized,
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
        type: 'problem',
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
  problemCount: number
  companyCount: number
  patternCount: number
}> {
  try {
    // Try to query for a known problem
    const embeddingProvider = getHybridProvider()
    const testEmbedding = await embeddingProvider.generateEmbedding('Two Sum array hash map')

    const results = await vectorDB.query(testEmbedding, {
      topK: 100,
      includeMetadata: true,
    })

    const problemCount = results.filter((r) => r.metadata?.type === 'problem').length
    const companyCount = results.filter((r) =>
      r.metadata?.type === 'company' || r.metadata?.type === 'company-question'
    ).length
    const patternCount = results.filter((r) => r.metadata?.type === 'pattern-knowledge').length

    return {
      hasProblems: problemCount > 0,
      hasCompanies: companyCount > 0,
      hasPatternKnowledge: patternCount > 0,
      problemCount,
      companyCount,
      patternCount,
    }
  } catch {
    return {
      hasProblems: false,
      hasCompanies: false,
      hasPatternKnowledge: false,
      problemCount: 0,
      companyCount: 0,
      patternCount: 0,
    }
  }
}
