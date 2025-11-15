import { NextRequest, NextResponse } from "next/server"

interface TestCase {
  input: { nums: number[]; target: number }
  expected: number[]
  description: string
}

export async function POST(request: NextRequest) {
  try {
    const { code, scenarioId } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    // Test cases based on scenario
    // For now, default to Two Sum if no scenarioId provided
    const testCases: TestCase[] = scenarioId === "dsa-valid-parentheses" ? [
      {
        input: { s: "()" },
        expected: true,
        description: "Basic case: ()",
      },
      {
        input: { s: "()[]{}" },
        expected: true,
        description: "Multiple types: ()[]{}",
      },
      {
        input: { s: "(]" },
        expected: false,
        description: "Mismatched: (]",
      },
      {
        input: { s: "([)]" },
        expected: false,
        description: "Wrong order: ([)]",
      },
      {
        input: { s: "{[]}" },
        expected: true,
        description: "Nested: {[]}",
      },
    ] : [
      {
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1],
        description: "Basic case: [2,7,11,15], target 9",
      },
      {
        input: { nums: [3, 2, 4], target: 6 },
        expected: [1, 2],
        description: "Non-adjacent pair: [3,2,4], target 6",
      },
      {
        input: { nums: [3, 3], target: 6 },
        expected: [0, 1],
        description: "Duplicate numbers: [3,3], target 6",
      },
      {
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        expected: [2, 4],
        description: "Negative numbers: [-1,-2,-3,-4,-5], target -8",
      },
      {
        input: { nums: [0, 4, 3, 0], target: 0 },
        expected: [0, 3],
        description: "Zeros: [0,4,3,0], target 0",
      },
    ]

    const results = []
    let allPassed = true
    let executionError = null

    try {
      // Execute the code safely
      // eslint-disable-next-line no-new-func
      const func = new Function("return " + code)()

      for (const testCase of testCases) {
        try {
          let result: any
          let passed = false

          if (scenarioId === "dsa-valid-parentheses") {
            result = func(testCase.input.s)
            passed = result === testCase.expected
          } else {
            // Default: Two Sum
            result = func(testCase.input.nums, testCase.input.target)
            // Check if result is valid
            const isValid =
              Array.isArray(result) &&
              result.length === 2 &&
              testCase.input.nums[result[0]] + testCase.input.nums[result[1]] === testCase.input.target
            passed = isValid
          }

          if (!passed) {
            allPassed = false
          }

          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: result,
            passed,
            error: null,
          })
        } catch (error) {
          allPassed = false
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    } catch (error) {
      executionError = error instanceof Error ? error.message : "Failed to compile code"
      allPassed = false
    }

    // Calculate performance metrics
    const passedCount = results.filter((r) => r.passed).length
    const totalCount = testCases.length
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

    return NextResponse.json({
      success: !executionError && allPassed,
      results,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate,
      },
      error: executionError,
    })
  } catch (error) {
    console.error("Execute API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute code" },
      { status: 500 },
    )
  }
}
