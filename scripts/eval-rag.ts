#!/usr/bin/env npx tsx
/**
 * Quick RAG Evaluation Script
 *
 * Run with: npx tsx scripts/eval-rag.ts
 *
 * Startup-grade evaluation:
 * - Simple pass/fail for each test case
 * - Checks if expected content appears in top results
 * - Gives you a quick health check before deploying
 */

import { advancedRetrieve } from "../lib/rag"

// ============================================
// TEST CASES - Add your own based on what matters
// ============================================

interface TestCase {
  query: string
  shouldContain: string[] // Any of these in result ID or text = pass
  category: "dsa" | "company" | "hint" | "general"
  description?: string
}

const TEST_CASES: TestCase[] = [
  // DSA Pattern Recognition
  {
    query: "two sum array hash map",
    shouldContain: ["arrays", "hash", "two-sum"],
    category: "dsa",
    description: "Should find arrays/hashing pattern",
  },
  {
    query: "sliding window substring maximum",
    shouldContain: ["sliding", "window"],
    category: "dsa",
  },
  {
    query: "binary search sorted array",
    shouldContain: ["binary", "search"],
    category: "dsa",
  },
  {
    query: "depth first search tree traversal",
    shouldContain: ["dfs", "tree", "depth"],
    category: "dsa",
  },
  {
    query: "dynamic programming memoization",
    shouldContain: ["dynamic", "dp", "programming"],
    category: "dsa",
  },
  {
    query: "two pointers sorted array",
    shouldContain: ["two-pointer", "pointer"],
    category: "dsa",
  },
  {
    query: "graph breadth first search shortest path",
    shouldContain: ["bfs", "graph", "breadth"],
    category: "dsa",
  },
  {
    query: "stack parentheses valid brackets",
    shouldContain: ["stack"],
    category: "dsa",
  },

  // Company Knowledge
  {
    query: "google interview preparation tips",
    shouldContain: ["google"],
    category: "company",
  },
  {
    query: "meta facebook coding interview",
    shouldContain: ["meta", "facebook"],
    category: "company",
  },
  {
    query: "amazon leadership principles interview",
    shouldContain: ["amazon"],
    category: "company",
  },
  {
    query: "stripe engineering interview process",
    shouldContain: ["stripe"],
    category: "company",
  },

  // General Interview Tips
  {
    query: "how to communicate during coding interview",
    shouldContain: ["communication", "interview", "tip"],
    category: "general",
  },
  {
    query: "time management coding problem",
    shouldContain: ["time", "management"],
    category: "general",
  },

  // Hints / Problem Solving
  {
    query: "stuck on recursion problem need hint",
    shouldContain: ["recursion", "hint", "tree", "dfs"],
    category: "hint",
  },
]

// ============================================
// EVALUATION LOGIC
// ============================================

interface EvalResult {
  query: string
  category: string
  passed: boolean
  expected: string[]
  gotIds: string[]
  gotTopText: string
  description?: string
}

async function evaluateTestCase(testCase: TestCase, topK: number = 5): Promise<EvalResult> {
  try {
    const results = await advancedRetrieve({
      query: testCase.query,
      limit: topK,
      enableQueryExpansion: true,
      enableReranking: true,
    })

    const topResult = results[0]
    const allResultIds = results.map((r) => r.id.toLowerCase())
    const allResultTexts = results.map((r) => (r.text || "").toLowerCase()).join(" ")
    const combined = [...allResultIds, allResultTexts.split(" ")].flat().join(" ")

    // Check if any expected term appears in results
    const hasMatch = testCase.shouldContain.some((term) => combined.includes(term.toLowerCase()))

    return {
      query: testCase.query,
      category: testCase.category,
      passed: hasMatch,
      expected: testCase.shouldContain,
      gotIds: allResultIds.slice(0, 3),
      gotTopText: (topResult?.text || "").slice(0, 100),
      description: testCase.description,
    }
  } catch (error) {
    console.error(`Error evaluating "${testCase.query}":`, error)
    return {
      query: testCase.query,
      category: testCase.category,
      passed: false,
      expected: testCase.shouldContain,
      gotIds: [],
      gotTopText: `ERROR: ${error instanceof Error ? error.message : "Unknown"}`,
      description: testCase.description,
    }
  }
}

async function runEvaluation() {
  console.log("\n🔍 RAG Evaluation Starting...\n")
  console.log("=".repeat(60))

  const results: EvalResult[] = []
  let passed = 0
  let failed = 0

  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing: "${testCase.query.slice(0, 40)}..." `)

    const result = await evaluateTestCase(testCase)
    results.push(result)

    if (result.passed) {
      passed++
      console.log("✅")
    } else {
      failed++
      console.log("❌")
      console.log(`   Expected: ${result.expected.join(" OR ")}`)
      console.log(`   Got: ${result.gotIds.join(", ") || "no results"}`)
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("\n📊 RESULTS SUMMARY\n")

  const passRate = (passed / TEST_CASES.length) * 100

  console.log(`Total: ${TEST_CASES.length} tests`)
  console.log(`Passed: ${passed} ✅`)
  console.log(`Failed: ${failed} ❌`)
  console.log(`Pass Rate: ${passRate.toFixed(1)}%`)

  // By category
  console.log("\n📁 By Category:")
  const categories = ["dsa", "company", "hint", "general"] as const
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat)
    const catPassed = catResults.filter((r) => r.passed).length
    const catTotal = catResults.length
    if (catTotal > 0) {
      const emoji = catPassed === catTotal ? "✅" : catPassed > 0 ? "⚠️" : "❌"
      console.log(`  ${cat}: ${catPassed}/${catTotal} ${emoji}`)
    }
  }

  // Failed cases detail
  const failedCases = results.filter((r) => !r.passed)
  if (failedCases.length > 0) {
    console.log("\n❌ Failed Cases:")
    for (const fc of failedCases) {
      console.log(`  - "${fc.query}"`)
      console.log(`    Expected: ${fc.expected.join(" OR ")}`)
      console.log(`    Got IDs: ${fc.gotIds.join(", ") || "none"}`)
    }
  }

  // Health assessment
  console.log("\n" + "=".repeat(60))
  if (passRate >= 80) {
    console.log("🟢 RAG Health: GOOD - Ready to ship!")
  } else if (passRate >= 60) {
    console.log("🟡 RAG Health: OK - Consider investigating failures")
  } else {
    console.log("🔴 RAG Health: NEEDS ATTENTION - Fix before shipping!")
  }
  console.log("=".repeat(60) + "\n")

  // Exit with error code if below threshold
  if (passRate < 60) {
    process.exit(1)
  }
}

// Run it
runEvaluation().catch(console.error)
