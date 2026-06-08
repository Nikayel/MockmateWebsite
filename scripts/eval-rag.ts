#!/usr/bin/env npx tsx
/**
 * RAG Evaluation Script
 *
 * Run with: npx tsx scripts/eval-rag.ts
 *
 * Reports labeled retrieval metrics:
 * - Precision@K: how clean the top K results are
 * - Recall@K: how much of the expected set appears in top K
 * - MRR: how quickly the first relevant result appears
 */

import { FULL_RAG_EVAL_CASES } from "../lib/rag/evaluation/fixtures"
import {
  buildFailedRetrievalEvalResult,
  buildRetrievalEvalResult,
  summarizeRetrievalEval,
  type RetrievalEvalResult,
} from "../lib/rag/evaluation/metrics"
import { advancedRetrieve } from "../lib/rag"

const K_VALUES = [1, 3, 5, 10]
const TOP_K = Math.max(...K_VALUES)

async function evaluateCase(testCase: (typeof FULL_RAG_EVAL_CASES)[number]) {
  try {
    const results = await advancedRetrieve({
      query: testCase.query,
      limit: TOP_K,
      types: testCase.types,
      strategy: "hybrid",
      enableQueryExpansion: true,
      enableReranking: true,
      feature: "other",
    })

    return buildRetrievalEvalResult(
      testCase,
      results.map((result) => ({
        id: result.id,
        score: result.finalScore,
      })),
      K_VALUES
    )
  } catch (error) {
    return buildFailedRetrievalEvalResult(
      testCase,
      error instanceof Error ? error.message : "Unknown error",
      K_VALUES
    )
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function printResult(result: RetrievalEvalResult): void {
  const status = result.passed ? "PASS" : "FAIL"
  console.log(`\n[${status}] ${result.query}`)
  console.log(`  Category: ${result.category}`)
  console.log(`  Relevant: ${result.relevantIds.join(", ")}`)
  console.log(`  Top: ${result.topId || "none"}`)
  console.log(
    `  P@5=${formatPercent(result.metrics.precisionAtK[5] || 0)} ` +
      `R@10=${formatPercent(result.metrics.recallAtK[10] || 0)} ` +
      `MRR=${result.metrics.mrr.toFixed(3)}`
  )
  if (!result.passed) {
    console.log(`  Retrieved: ${result.retrievedIds.slice(0, 5).join(", ") || "none"}`)
  }
  if (result.error) {
    console.log(`  Error: ${result.error}`)
  }
}

async function runEvaluation() {
  console.log("\nRAG Evaluation Starting")
  console.log("=".repeat(72))

  const results: RetrievalEvalResult[] = []
  for (const testCase of FULL_RAG_EVAL_CASES) {
    process.stdout.write(`Testing: "${testCase.query.slice(0, 54)}" ... `)
    const result = await evaluateCase(testCase)
    results.push(result)
    console.log(result.passed ? "PASS" : "FAIL")
  }

  const summary = summarizeRetrievalEval(results, K_VALUES)

  console.log("\n" + "=".repeat(72))
  console.log("Summary")
  console.log(`Total: ${summary.total}`)
  console.log(`Passed: ${summary.passed}`)
  console.log(`Failed: ${summary.failed}`)
  console.log(`Pass Rate: ${summary.passRate.toFixed(1)}%`)
  console.log(`Mean MRR: ${summary.meanMrr.toFixed(3)}`)
  console.log(`Mean P@5: ${formatPercent(summary.meanPrecisionAtK[5] || 0)}`)
  console.log(`Mean R@10: ${formatPercent(summary.meanRecallAtK[10] || 0)}`)

  console.log("\nBy Category")
  for (const [category, stats] of Object.entries(summary.byCategory)) {
    console.log(
      `  ${category}: ${stats.passed}/${stats.total} passed, ` +
        `pass=${stats.passRate.toFixed(1)}%, MRR=${stats.meanMrr.toFixed(3)}`
    )
  }

  const failed = results.filter((result) => !result.passed)
  if (failed.length > 0) {
    console.log("\nFailures")
    failed.forEach(printResult)
  }

  console.log("\n" + "=".repeat(72))
  console.log(`RAG Health: ${summary.status.toUpperCase()}`)
  console.log("=".repeat(72) + "\n")

  if (summary.passRate < 60) {
    process.exit(1)
  }
}

runEvaluation().catch((error) => {
  console.error("RAG evaluation failed:", error)
  process.exit(1)
})
