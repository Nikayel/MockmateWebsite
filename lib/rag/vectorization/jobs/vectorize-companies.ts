import { ALL_COMPANIES } from "@/lib/data/company-questions"
import type { EmbeddingProvider } from "@/lib/rag/types"
import { vectorDB } from "@/lib/rag/vectordb"
import {
  companyToEmbeddingText,
  mustKnowQuestionToEmbeddingText,
} from "../text-builders/company-text"
import type { VectorizationJobResult, VectorizationProgressCallback } from "../types"

const RATE_LIMIT_DELAY_MS = 50

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function vectorizeCompanyQuestions(
  embeddingProvider: EmbeddingProvider,
  onProgress?: VectorizationProgressCallback
): Promise<VectorizationJobResult> {
  const errors: string[] = []
  let vectorized = 0

  for (let i = 0; i < ALL_COMPANIES.length; i++) {
    const company = ALL_COMPANIES[i]
    onProgress?.("Vectorizing company data", i + 1, ALL_COMPANIES.length, company.name)

    try {
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

    await wait(RATE_LIMIT_DELAY_MS)
  }

  return { vectorized, errors }
}
