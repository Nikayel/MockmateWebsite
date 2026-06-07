import type { RetrievalEvalCase } from "./fixtures"

export interface RetrievedEvalItem {
  id: string
  score?: number
}

export interface RetrievalRankingMetrics {
  precisionAtK: Record<number, number>
  recallAtK: Record<number, number>
  hitAtK: Record<number, boolean>
  mrr: number
  firstRelevantRank: number | null
}

export interface RetrievalEvalResult extends RetrievalEvalCase {
  retrievedIds: string[]
  topId: string | null
  topScore?: number
  passed: boolean
  metrics: RetrievalRankingMetrics
  error?: string
}

export interface RetrievalEvalSummary {
  total: number
  passed: number
  failed: number
  passRate: number
  meanPrecisionAtK: Record<number, number>
  meanRecallAtK: Record<number, number>
  meanHitAtK: Record<number, number>
  meanMrr: number
  byCategory: Record<
    string,
    {
      total: number
      passed: number
      passRate: number
      meanMrr: number
    }
  >
  status: "good" | "ok" | "needs_attention"
}

const DEFAULT_K_VALUES = [1, 3, 5, 10]

function normalizeId(id: string): string {
  return id.toLowerCase().trim()
}

export function calculateRetrievalMetrics(
  retrievedIds: string[],
  relevantIds: string[],
  kValues: number[] = DEFAULT_K_VALUES
): RetrievalRankingMetrics {
  const relevant = new Set(relevantIds.map(normalizeId))
  const retrieved = retrievedIds.map(normalizeId)

  const precisionAtK: Record<number, number> = {}
  const recallAtK: Record<number, number> = {}
  const hitAtK: Record<number, boolean> = {}

  for (const k of kValues) {
    const topK = retrieved.slice(0, k)
    const relevantInTopK = topK.filter((id) => relevant.has(id)).length
    precisionAtK[k] = topK.length > 0 ? relevantInTopK / topK.length : 0
    recallAtK[k] = relevant.size > 0 ? relevantInTopK / relevant.size : 0
    hitAtK[k] = relevantInTopK > 0
  }

  const firstRelevantIndex = retrieved.findIndex((id) => relevant.has(id))
  const firstRelevantRank = firstRelevantIndex >= 0 ? firstRelevantIndex + 1 : null

  return {
    precisionAtK,
    recallAtK,
    hitAtK,
    mrr: firstRelevantRank ? 1 / firstRelevantRank : 0,
    firstRelevantRank,
  }
}

export function buildRetrievalEvalResult(
  testCase: RetrievalEvalCase,
  retrieved: RetrievedEvalItem[],
  kValues: number[] = DEFAULT_K_VALUES
): RetrievalEvalResult {
  const retrievedIds = retrieved.map((item) => item.id)
  const metrics = calculateRetrievalMetrics(retrievedIds, testCase.relevantIds, kValues)
  const passK = Math.min(5, Math.max(...kValues))

  return {
    ...testCase,
    retrievedIds,
    topId: retrievedIds[0] || null,
    topScore: retrieved[0]?.score,
    passed: metrics.hitAtK[passK] || false,
    metrics,
  }
}

export function buildFailedRetrievalEvalResult(
  testCase: RetrievalEvalCase,
  error: string,
  kValues: number[] = DEFAULT_K_VALUES
): RetrievalEvalResult {
  return {
    ...testCase,
    retrievedIds: [],
    topId: null,
    passed: false,
    metrics: calculateRetrievalMetrics([], testCase.relevantIds, kValues),
    error,
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function summarizeRetrievalEval(
  results: RetrievalEvalResult[],
  kValues: number[] = DEFAULT_K_VALUES
): RetrievalEvalSummary {
  const passed = results.filter((result) => result.passed).length
  const passRate = results.length > 0 ? (passed / results.length) * 100 : 0

  const meanPrecisionAtK = Object.fromEntries(
    kValues.map((k) => [k, mean(results.map((result) => result.metrics.precisionAtK[k] || 0))])
  )
  const meanRecallAtK = Object.fromEntries(
    kValues.map((k) => [k, mean(results.map((result) => result.metrics.recallAtK[k] || 0))])
  )
  const meanHitAtK = Object.fromEntries(
    kValues.map((k) => [k, mean(results.map((result) => (result.metrics.hitAtK[k] ? 1 : 0)))])
  )

  const byCategory: Record<string, { total: number; passed: number; mrrValues: number[] }> = {}
  for (const result of results) {
    const category = byCategory[result.category] || {
      total: 0,
      passed: 0,
      mrrValues: [] as number[],
    }
    category.total += 1
    if (result.passed) category.passed += 1
    category.mrrValues.push(result.metrics.mrr)
    byCategory[result.category] = category
  }

  const normalizedByCategory = Object.fromEntries(
    Object.entries(byCategory).map(([category, value]) => [
      category,
      {
        total: value.total,
        passed: value.passed,
        passRate: value.total > 0 ? (value.passed / value.total) * 100 : 0,
        meanMrr: mean(value.mrrValues),
      },
    ])
  )

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate,
    meanPrecisionAtK,
    meanRecallAtK,
    meanHitAtK,
    meanMrr: mean(results.map((result) => result.metrics.mrr)),
    byCategory: normalizedByCategory,
    status: passRate >= 80 ? "good" : passRate >= 60 ? "ok" : "needs_attention",
  }
}
