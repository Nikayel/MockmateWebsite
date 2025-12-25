import { NextRequest, NextResponse } from "next/server"
import { getScenarioById } from "@/lib/scenarios"
import { executeRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import { trackCodeExecutionServer } from "@/lib/analytics-server"
import { executeWithPiston, parseExecutionOutput } from "@/lib/piston"
import { logger } from "@/lib/logger"

// Mark route as dynamic to avoid build-time issues
export const dynamic = 'force-dynamic'

// Validate test results with improved edge case handling
function validateResult(actual: any, expected: any, testCase: any, scenarioType: string): boolean {
  // Handle null/undefined cases first
  if (expected === null || expected === undefined) {
    return actual === null || actual === undefined
  }
  if (actual === null || actual === undefined) {
    return false
  }

  // For DSA array problems (like two-sum), check if arrays are equal
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false

    // For problems like two-sum, order might not matter
    // Check if it's a valid solution
    if (testCase.input.nums && testCase.input.target !== undefined) {
      // Two-sum style: verify the result points to values that sum to target
      if (actual.length === 2) {
        const nums = testCase.input.nums
        // Ensure indices are valid and different
        if (actual[0] >= 0 && actual[0] < nums.length &&
            actual[1] >= 0 && actual[1] < nums.length &&
            actual[0] !== actual[1]) { // Indices must be different
          return nums[actual[0]] + nums[actual[1]] === testCase.input.target
        }
      }
    }

    // For array of arrays (like 2D arrays), deep compare
    if (expected.length > 0 && Array.isArray(expected[0])) {
      return expected.every((expectedRow: any, rowIdx: number) => {
        if (!Array.isArray(actual[rowIdx])) return false
        return expectedRow.every((val: any, colIdx: number) => val === actual[rowIdx][colIdx])
      })
    }

    // For arrays where order doesn't matter (set-like), check as sets
    if (testCase.orderMatters === false) {
      const expectedSet = new Set(expected.map((x: any) => JSON.stringify(x)))
      const actualSet = new Set(actual.map((x: any) => JSON.stringify(x)))
      if (expectedSet.size !== actualSet.size) return false
      for (const item of expectedSet) {
        if (!actualSet.has(item)) return false
      }
      return true
    }

    // Default array comparison (order matters)
    return expected.every((val: any, idx: number) => {
      if (typeof val === 'number' && typeof actual[idx] === 'number') {
        return Math.abs(val - actual[idx]) < 0.0001
      }
      return val === actual[idx]
    })
  }

  // For boolean results
  if (typeof expected === 'boolean' && typeof actual === 'boolean') {
    return expected === actual
  }

  // For numeric results (with tolerance for floating point)
  if (typeof expected === 'number' && typeof actual === 'number') {
    // Use relative tolerance for large numbers, absolute for small
    const tolerance = Math.max(0.0001, Math.abs(expected) * 0.0001)
    return Math.abs(expected - actual) < tolerance
  }

  // For string results (case-sensitive by default, but allow case-insensitive if specified)
  if (typeof expected === 'string' && typeof actual === 'string') {
    if (testCase.caseSensitive === false) {
      return expected.toLowerCase() === actual.toLowerCase()
    }
    return expected === actual
  }

  // For object comparisons (deep equality)
  if (typeof expected === 'object' && typeof actual === 'object' && !Array.isArray(expected)) {
    try {
      // Handle nested objects
      const expectedKeys = Object.keys(expected).sort()
      const actualKeys = Object.keys(actual).sort()

      if (expectedKeys.length !== actualKeys.length) return false

      return expectedKeys.every(key => {
        return validateResult(actual[key], expected[key], { ...testCase, orderMatters: true }, scenarioType)
      })
    } catch {
      // Fallback to JSON comparison
      return JSON.stringify(expected) === JSON.stringify(actual)
    }
  }

  // Default strict comparison
  return expected === actual
}

/**
 * Build full code with supporting codebase files for bugfix/add-functionality scenarios
 */
function buildFullCode(code: string, scenario: any, language: string): string {
  if (scenario.type !== 'bugfix' && scenario.type !== 'add-functionality') {
    return code
  }

  const scenarioWithCodebase = scenario as any
  const codebaseFiles = scenarioWithCodebase.codebaseFiles?.[language] || []

  if (codebaseFiles.length === 0) {
    return code
  }

  const supportingCode = codebaseFiles
    .map((file: any) => {
      let fileContent = file.content

      // For JavaScript/TypeScript, remove ES6 export/import statements
      if (language === 'javascript' || language === 'typescript') {
        fileContent = fileContent.replace(/export\s+(function|const|let|var|class|default)\s+/g, '$1 ')
        fileContent = fileContent.replace(/export\s*\{[^}]*\}/g, '')
        fileContent = fileContent.replace(/import\s+.*?from\s+['"][^'"]*['"]\s*;?/g, '')
        fileContent = fileContent.replace(/import\s+['"][^'"]*['"]\s*;?/g, '')
      }

      // For Python, remove import statements from local modules
      if (language === 'python') {
        fileContent = fileContent.replace(/from\s+\.\w*\s+import\s+[^\n]+/g, '')
        fileContent = fileContent.replace(/from\s+(?!typing|collections|functools|itertools|math|re|json|datetime|os|sys)\w+\s+import\s+[^\n]+/g, '')
      }

      const header = language === 'python'
        ? `# File: ${file.fileName}\n`
        : `// File: ${file.fileName}\n`
      return header + fileContent
    })
    .join('\n\n')

  return supportingCode + '\n\n' + code
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await executeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget)
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const startTime = Date.now()

  try {
    const { code, scenarioId, language = 'javascript', sessionId, userId } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    if (!scenarioId) {
      return NextResponse.json({ error: "Scenario ID is required" }, { status: 400 })
    }

    // Validate language parameter
    const validLanguages = ['javascript', 'typescript', 'python']
    if (!validLanguages.includes(language)) {
      return NextResponse.json({
        error: `Unsupported language: ${language}. Supported languages are: ${validLanguages.join(', ')}`
      }, { status: 400 })
    }

    // Get scenario from scenarios.ts
    const scenario = getScenarioById(scenarioId)

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 })
    }

    // Get test cases from scenario
    const testCases = scenario.testCases || []

    if (testCases.length === 0) {
      return NextResponse.json({ error: "No test cases defined for this scenario" }, { status: 400 })
    }

    // Build full code with supporting files for bugfix/add-functionality
    const fullCode = buildFullCode(code, scenario, language)

    const results = []
    let allPassed = true

    // Execute each test case using Piston (secure sandbox)
    for (const testCase of testCases) {
      try {
        const executionResult = await executeWithPiston(fullCode, language, testCase.input)

        if (!executionResult.success || executionResult.error) {
          allPassed = false
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: executionResult.error || 'Execution failed',
          })
          continue
        }

        // Parse the output
        const actualResult = parseExecutionOutput(executionResult.output || '')

        // Validate result
        const passed = validateResult(actualResult, testCase.expected, testCase, scenario.type)

        if (!passed) {
          allPassed = false
        }

        results.push({
          description: testCase.description,
          input: testCase.input,
          expected: testCase.expected,
          actual: actualResult,
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
          error: error instanceof Error ? error.message : 'Unknown execution error',
        })
      }
    }

    // Calculate summary
    const passedCount = results.filter((r) => r.passed).length
    const totalCount = testCases.length
    const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0
    const executionTimeMs = Date.now() - startTime

    // Track code execution analytics
    trackCodeExecutionServer({
      sessionId,
      userId,
      language,
      scenarioId,
      scenarioType: scenario.type,
      passed: allPassed,
      totalTests: totalCount,
      passedTests: passedCount,
      executionTimeMs,
    }).catch(err => logger.error("Analytics tracking error", { error: err }))

    return NextResponse.json({
      success: allPassed,
      results,
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        passRate,
      },
      error: null,
    })
  } catch (error) {
    logger.error("Execute API error", { error, endpoint: '/api/execute' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute code" },
      { status: 500 },
    )
  }
}
