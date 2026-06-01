import { NextRequest, NextResponse } from "next/server"
import { getScenarioById, type Scenario } from "@/lib/scenarios"
import { executeRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import {
  checkRateLimit,
  startRequestTracking,
  endRequestTracking,
  buildRateLimitResponse,
  type RateLimitTier,
} from "@/lib/rate-limiter"
import { trackCodeExecutionServer } from "@/lib/analytics-server"
import { executeWithPiston, parseExecutionOutput } from "@/lib/piston"
import { logger } from "@/lib/logger"
import { validateResultEnhanced, Normalizers } from "@/lib/validators"
import {
  executeWorkspaceScenario,
  isWorkspaceScenario,
  normalizeWorkspaceEdits,
} from "@/lib/workspace-execution"

// Mark route as dynamic to avoid build-time issues
export const dynamic = "force-dynamic"

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike }

interface ExecutionTestCase {
  description: string
  input: JsonLike | Record<string, unknown>
  expected: unknown
  orderMatters?: boolean
  compareAsSet?: boolean
  caseSensitive?: boolean
}

interface CodebaseFile {
  fileName: string
  content: string
}

type ScenarioWithCodebase = Scenario & {
  codebaseFiles?: Partial<Record<string, CodebaseFile[]>>
}

interface ExecuteRequestBody {
  code?: string
  scenarioId?: string
  language?: string
  sessionId?: string
  userId?: string
  workspaceFiles?: unknown
}

interface ExecutionResultItem {
  description?: string
  input: ExecutionTestCase["input"]
  expected: unknown
  actual: unknown
  passed: boolean
  error: string | null
  serviceError?: boolean
}

/**
 * Validate test results using property-based validation system
 *
 * Validation flow:
 * 1. Parse output to handle different formats (tuples, sets, etc.)
 * 2. Try property-based validation (auto-detects patterns like two-sum, anagrams)
 * 3. Fall back to legacy validation for patterns not yet covered
 *
 * Property-based validation handles:
 * - two-sum: validates indices point to values summing to target
 * - group-anagrams: validates groups contain only anagrams
 * - palindrome: validates boolean matches expected check
 * - cycle-detection: validates boolean for cycle presence
 *
 * Legacy fallback handles:
 * - 2D array comparisons
 * - Set-like array comparisons (orderMatters=false)
 * - Object deep equality
 * - String/number comparisons
 */
function validateResult(
  actual: unknown,
  expected: unknown,
  testCase: ExecutionTestCase,
  scenarioType: string,
  scenarioId: string = "",
  language: string = "javascript"
): boolean {
  // Parse the output to handle different formats (tuples, sets, etc.)
  const parsedActual = Normalizers.parseOutput(actual)

  // Handle null/undefined cases first
  if (expected === null || expected === undefined) {
    return parsedActual === null || parsedActual === undefined
  }
  if (parsedActual === null || parsedActual === undefined) {
    return false
  }

  // Use the new property-based validation system
  // This automatically detects problem patterns and validates appropriately
  const result = validateResultEnhanced(parsedActual, testCase, scenarioId, language)

  if (result.passed) {
    return true
  }

  // Fallback: Legacy validation for cases not yet covered by property validators
  // TODO: Gradually migrate all patterns to property-based validation
  return legacyValidateResult(parsedActual, expected, testCase, scenarioType)
}

// Legacy validation logic (kept for backwards compatibility)
function legacyValidateResult(
  actual: unknown,
  expected: unknown,
  testCase: ExecutionTestCase,
  scenarioType: string
): boolean {
  // For DSA array problems, check if arrays are equal
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false

    // For array of arrays (like 2D arrays), deep compare
    if (expected.length > 0 && Array.isArray(expected[0])) {
      return expected.every((expectedRow, rowIdx) => {
        if (!Array.isArray(actual[rowIdx])) return false
        return (expectedRow as unknown[]).every(
          (val: unknown, colIdx: number) => val === actual[rowIdx][colIdx]
        )
      })
    }

    // For arrays where order doesn't matter (set-like), check as sets
    if (testCase.orderMatters === false || testCase.compareAsSet) {
      const expectedSet = new Set(expected.map((x) => JSON.stringify(x)))
      const actualSet = new Set(actual.map((x) => JSON.stringify(x)))
      if (expectedSet.size !== actualSet.size) return false
      for (const item of expectedSet) {
        if (!actualSet.has(item)) return false
      }
      return true
    }

    // Default array comparison (order matters)
    return expected.every((val, idx) => {
      if (typeof val === "number" && typeof actual[idx] === "number") {
        return Math.abs(val - actual[idx]) < 0.0001
      }
      return val === actual[idx]
    })
  }

  // For boolean results
  if (typeof expected === "boolean" && typeof actual === "boolean") {
    return expected === actual
  }

  // For numeric results (with tolerance for floating point)
  if (typeof expected === "number" && typeof actual === "number") {
    // Use relative tolerance for large numbers, absolute for small
    const tolerance = Math.max(0.0001, Math.abs(expected) * 0.0001)
    return Math.abs(expected - actual) < tolerance
  }

  // For string results (case-sensitive by default, but allow case-insensitive if specified)
  if (typeof expected === "string" && typeof actual === "string") {
    if (testCase.caseSensitive === false) {
      return expected.toLowerCase() === actual.toLowerCase()
    }
    return expected === actual
  }

  // For object comparisons (deep equality)
  if (
    typeof expected === "object" &&
    expected !== null &&
    typeof actual === "object" &&
    actual !== null &&
    !Array.isArray(expected)
  ) {
    try {
      // Handle nested objects
      const expectedKeys = Object.keys(expected).sort()
      const actualKeys = Object.keys(actual).sort()
      const expectedRecord = expected as Record<string, unknown>
      const actualRecord = actual as Record<string, unknown>

      if (expectedKeys.length !== actualKeys.length) return false

      return expectedKeys.every((key) => {
        return legacyValidateResult(
          actualRecord[key],
          expectedRecord[key],
          { ...testCase, orderMatters: true },
          scenarioType
        )
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
function buildFullCode(code: string, scenario: ScenarioWithCodebase, language: string): string {
  if (scenario.type !== "bugfix" && scenario.type !== "add-functionality") {
    return code
  }

  const codebaseFiles = scenario.codebaseFiles?.[language] || []

  if (codebaseFiles.length === 0) {
    return code
  }

  const supportingCode = codebaseFiles
    .map((file) => {
      let fileContent = file.content

      // For JavaScript/TypeScript, remove ES6 export/import statements
      if (language === "javascript" || language === "typescript") {
        fileContent = fileContent.replace(
          /export\s+(function|const|let|var|class|default)\s+/g,
          "$1 "
        )
        fileContent = fileContent.replace(/export\s*\{[^}]*\}/g, "")
        fileContent = fileContent.replace(/import\s+.*?from\s+['"][^'"]*['"]\s*;?/g, "")
        fileContent = fileContent.replace(/import\s+['"][^'"]*['"]\s*;?/g, "")
      }

      // For Python, remove import statements from local modules
      if (language === "python") {
        fileContent = fileContent.replace(/from\s+\.\w*\s+import\s+[^\n]+/g, "")
        fileContent = fileContent.replace(
          /from\s+(?!typing|collections|functools|itertools|math|re|json|datetime|os|sys)\w+\s+import\s+[^\n]+/g,
          ""
        )
      }

      const header =
        language === "python" ? `# File: ${file.fileName}\n` : `// File: ${file.fileName}\n`
      return header + fileContent
    })
    .join("\n\n")

  return supportingCode + "\n\n" + code
}

export async function POST(request: NextRequest) {
  // Apply IP-based rate limiting (first layer)
  const rateLimitResponse = await executeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Enforce quota limits (session & budget) and get user tier
  const quotaResult = await enforceQuota(request)
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  // Apply tier-based rate limiting (second layer)
  const tier = (quotaResult.tier || "free") as RateLimitTier
  const rateLimitUserId = quotaResult.userId || "anonymous"

  if (rateLimitUserId !== "anonymous") {
    const tierRateCheck = await checkRateLimit(rateLimitUserId, tier, 100) // Code execution uses minimal tokens
    if (!tierRateCheck.allowed) {
      return buildRateLimitResponse(tierRateCheck)
    }
    await startRequestTracking(rateLimitUserId, 100)
  }

  const startTime = Date.now()

  try {
    const {
      code,
      scenarioId,
      language = "javascript",
      sessionId,
      userId,
      workspaceFiles,
    } = (await request.json()) as ExecuteRequestBody

    logger.info("Execute API called", { scenarioId, language, codeLength: code?.length })

    const MAX_CODE_LENGTH = 100000 // 100KB limit
    if (code && code.length > MAX_CODE_LENGTH) {
      logger.warn("Execute API: Code too large", { scenarioId, codeLength: code.length })
      return NextResponse.json(
        {
          error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
        },
        { status: 400 }
      )
    }

    if (!scenarioId) {
      logger.warn("Execute API: Missing scenarioId")
      return NextResponse.json({ error: "Scenario ID is required" }, { status: 400 })
    }

    // Validate language parameter
    const validLanguages = ["javascript", "typescript", "python"] as const
    if (!validLanguages.includes(language as (typeof validLanguages)[number])) {
      logger.warn("Execute API: Invalid language", { language, scenarioId })
      return NextResponse.json(
        {
          error: `Unsupported language: ${language}. Supported languages are: ${validLanguages.join(", ")}`,
        },
        { status: 400 }
      )
    }
    const executionLanguage = language as (typeof validLanguages)[number]

    // Get scenario from scenarios.ts
    const scenario = getScenarioById(scenarioId)

    if (!scenario) {
      logger.warn("Execute API: Scenario not found", { scenarioId })
      return NextResponse.json(
        {
          error: `Scenario '${scenarioId}' not found. The problem may have been removed or renamed.`,
        },
        { status: 404 }
      )
    }

    if (isWorkspaceScenario(scenario)) {
      const workspaceResult = await executeWorkspaceScenario({
        scenario,
        edits: normalizeWorkspaceEdits(workspaceFiles),
      })
      const executionTimeMs = Date.now() - startTime

      if (sessionId) {
        trackCodeExecutionServer({
          sessionId,
          userId,
          language: scenario.workspace.language,
          scenarioId,
          scenarioType: scenario.type,
          passed: workspaceResult.success,
          totalTests: workspaceResult.summary.total,
          passedTests: workspaceResult.summary.passed,
          executionTimeMs,
        }).catch((err) => logger.error("Analytics tracking error", { error: err }))
      }

      if (rateLimitUserId !== "anonymous") {
        await endRequestTracking(rateLimitUserId)
      }

      return NextResponse.json({
        ...workspaceResult,
        results: workspaceResult.results.map((result) => ({
          description: `${result.suite}: ${result.name}`,
          passed: result.passed,
          input: result.suite,
          expected: "pass",
          actual: result.passed ? "pass" : "fail",
          error: result.error,
        })),
      })
    }

    if (!code) {
      logger.warn("Execute API: Missing code", { scenarioId })
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    // Get test cases from scenario (only DSA and some other types have testCases)
    const testCases: ExecutionTestCase[] =
      "testCases" in scenario && Array.isArray(scenario.testCases)
        ? (scenario.testCases as ExecutionTestCase[])
        : []

    if (testCases.length === 0) {
      return NextResponse.json(
        { error: "No test cases defined for this scenario" },
        { status: 400 }
      )
    }

    // Build full code with supporting files for bugfix/add-functionality
    const fullCode = buildFullCode(code, scenario as ScenarioWithCodebase, executionLanguage)

    const results: ExecutionResultItem[] = []
    let allPassed = true
    let allConsoleLogs: unknown[] = []

    // Execute each test case using Piston (secure sandbox)
    // Add small delay between test cases to avoid rate limit bursts on Piston API
    for (let i = 0; i < testCases.length; i++) {
      const testCase: ExecutionTestCase = {
        ...testCases[i],
        description: testCases[i].description || `Test case ${i + 1}`,
      }

      // Add 100ms delay between test cases (not before first one)
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      try {
        const executionResult = await executeWithPiston(fullCode, executionLanguage, testCase.input)

        if (!executionResult.success || executionResult.error) {
          // Check if this is an infrastructure error (service busy, timeout, etc.)
          // vs a code execution error (syntax error, runtime error, etc.)
          const errorMessage = executionResult.error || "Execution failed"
          const isServiceError =
            errorMessage.includes("service is busy") ||
            errorMessage.includes("Unable to connect") ||
            errorMessage.includes("network") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("503") ||
            errorMessage.includes("502")

          // For service errors, mark as "service_error" not "failed"
          // These should not count against the user's score
          if (isServiceError) {
            results.push({
              description: testCase.description,
              input: testCase.input,
              expected: testCase.expected,
              actual: null,
              passed: false,
              error: errorMessage,
              serviceError: true, // Flag to indicate this was an infrastructure issue
            })
            // Don't set allPassed = false for service errors
            // The test couldn't run, it didn't fail
            continue
          }

          allPassed = false
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: errorMessage,
          })
          continue
        }

        // Parse the output (now returns { result, consoleLogs })
        const parsed = parseExecutionOutput(executionResult.output || "")
        const actualResult = parsed.result

        // Collect console logs from all test runs
        if (parsed.consoleLogs && parsed.consoleLogs.length > 0) {
          allConsoleLogs = [...allConsoleLogs, ...parsed.consoleLogs]
        }

        // Validate result using property-based validation
        const passed = validateResult(
          actualResult,
          testCase.expected,
          testCase,
          scenario.type,
          scenarioId,
          executionLanguage
        )

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
          error: error instanceof Error ? error.message : "Unknown execution error",
        })
      }
    }

    // Calculate summary
    // Exclude service errors from the count - they're infrastructure issues, not code failures
    const serviceErrorCount = results.filter((r) => r.serviceError).length
    const passedCount = results.filter((r) => r.passed).length
    const effectiveTotal = testCases.length - serviceErrorCount // Tests that actually ran
    const totalCount = testCases.length
    const passRate = effectiveTotal > 0 ? Math.round((passedCount / effectiveTotal) * 100) : 0
    const executionTimeMs = Date.now() - startTime

    // Log execution results for debugging
    logger.info("Execute API completed", {
      scenarioId,
      language,
      totalTests: totalCount,
      passedTests: passedCount,
      allPassed,
      executionTimeMs,
    })

    // Track code execution analytics
    if (sessionId) {
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
      }).catch((err) => logger.error("Analytics tracking error", { error: err }))
    }

    // End request tracking
    if (rateLimitUserId !== "anonymous") {
      await endRequestTracking(rateLimitUserId)
    }

    return NextResponse.json({
      success: allPassed && serviceErrorCount === 0, // Only fully successful if no service errors
      results,
      consoleLogs: allConsoleLogs, // Include captured console.log outputs
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: effectiveTotal - passedCount, // Only count actual failures, not service errors
        passRate,
        // Include service error info so frontend can display appropriate message
        serviceErrors: serviceErrorCount,
        effectiveTotal, // Tests that actually ran (excluding service errors)
      },
      error: null,
    })
  } catch (error) {
    // End request tracking on error
    if (rateLimitUserId !== "anonymous") {
      await endRequestTracking(rateLimitUserId).catch(() => {})
    }

    logger.error("Execute API error", { error, endpoint: "/api/execute" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute code" },
      { status: 500 }
    )
  }
}
