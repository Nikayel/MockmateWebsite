import { NextRequest, NextResponse } from "next/server"
import { getScenarioById } from "@/lib/scenarios"
import { runInNewContext } from "vm"
import { executeRateLimit } from "@/lib/rate-limit"
import { spawn } from "child_process"

// Mark route as dynamic to avoid build-time issues
export const dynamic = 'force-dynamic'

// Language-specific code execution
async function executeJavaScript(code: string, testCase: any, scenarioType: string) {
  try {
    // Trim and validate code
    const trimmedCode = code.trim()
    if (!trimmedCode || trimmedCode.length === 0) {
      return { result: null, error: "Code is empty" }
    }

    // Check for obviously invalid code patterns
    if (trimmedCode.length < 10) {
      return { result: null, error: "Code is too short to be a valid solution" }
    }

    // Create a sandboxed context with limited access
    const sandbox = {
      console: {
        log: () => {}, // Disable console output
        error: () => {},
        warn: () => {},
        info: () => {},
      },
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
      Buffer: undefined,
      process: undefined,
      require: undefined,
      global: undefined,
      module: undefined,
      exports: undefined,
      __dirname: undefined,
      __filename: undefined,
    }

    let func: any

    // Try multiple strategies to extract and execute the function
    try {
      // Strategy 1: Code is a function expression/declaration that can be returned
      try {
        func = runInNewContext("(" + trimmedCode + ")", sandbox, { timeout: 5000 })
      } catch {
        // Strategy 2: Code might be a function declaration, try wrapping differently
        try {
          // Try as an IIFE that returns a function
          const wrapped = runInNewContext(`
            (function() {
              ${trimmedCode}
              // Try to find and return the function
              if (typeof solution === 'function') return solution;
              if (typeof twoSum === 'function') return twoSum;
              if (typeof main === 'function') return main;
              throw new Error('No function found in code');
            })()
          `, sandbox, { timeout: 5000 })
          func = wrapped
        } catch (wrapError) {
          // Strategy 3: Code is the function body itself, wrap it
          try {
            const paramNames = Object.keys(testCase.input).join(', ')
            func = runInNewContext(`(function(${paramNames}) { ${trimmedCode} })`, sandbox, { timeout: 5000 })
          } catch (paramError) {
            return { result: null, error: `Code must define a callable function. Found: ${typeof func}` }
          }
        }
      }
    } catch (parseError) {
      return { result: null, error: `Invalid JavaScript syntax: ${parseError instanceof Error ? parseError.message : "Parse error"}` }
    }

    // Final validation
    if (typeof func !== 'function') {
      return { result: null, error: "Code must define a function that can be called" }
    }

    // Execute the function with test case inputs in the sandbox
    try {
      const inputValues = Object.values(testCase.input)
      const result = func(...inputValues)
      return { result, error: null }
    } catch (execError) {
      return {
        result: null,
        error: `Runtime error: ${execError instanceof Error ? execError.message : "Unknown execution error"}`
      }
    }
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Execution error" }
  }
}

async function executePython(code: string, testCase: any, scenarioType: string) {
  try {
    // Trim and validate code
    const trimmedCode = code.trim()
    if (!trimmedCode || trimmedCode.length === 0) {
      return { result: null, error: "Code is empty" }
    }

    // Check for obviously invalid code patterns
    if (trimmedCode.length < 10) {
      return { result: null, error: "Code is too short to be a valid solution" }
    }

    // Extract function name from code (handle both twoSum and two_sum)
    let functionName = null
    const functionMatch = trimmedCode.match(/def\s+(\w+)\s*\(/i)
    if (functionMatch) {
      functionName = functionMatch[1]
    } else {
      return { result: null, error: "Code must define a function using 'def function_name(...)'" }
    }

    // Prepare test case inputs
    const inputValues = Object.values(testCase.input)

    // Create Python script that executes the function
    // Use stdin to pass input data to avoid shell escaping issues
    const pythonScript = `
import json
import sys

${trimmedCode}

# Get input from stdin
try:
    input_str = sys.stdin.read()
    input_data = json.loads(input_str)
    result = ${functionName}(*input_data)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`

    // Execute Python code with timeout
    const TIMEOUT_MS = 5000
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''
      let timeoutId: NodeJS.Timeout

      // Set timeout
      timeoutId = setTimeout(() => {
        pythonProcess.kill()
        resolve({ result: null, error: "Execution timeout: code took too long to execute" })
      }, TIMEOUT_MS)

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      // Handle process completion
      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId)

        if (stderr) {
          try {
            const errorData = JSON.parse(stderr)
            if (errorData.error) {
              resolve({ result: null, error: `Runtime error: ${errorData.error}` })
              return
            }
          } catch {
            // If stderr is not JSON, it might be a Python error
            if (stderr.trim()) {
              resolve({ result: null, error: `Python error: ${stderr.trim()}` })
              return
            }
          }
        }

        if (stdout) {
          try {
            const result = JSON.parse(stdout.trim())
            resolve({ result, error: null })
            return
          } catch (parseError) {
            resolve({ result: null, error: `Failed to parse result: ${stdout.trim()}` })
            return
          }
        }

        if (code !== 0) {
          resolve({ result: null, error: `Process exited with code ${code}` })
          return
        }

        resolve({ result: null, error: "No output from Python execution" })
      })

      // Handle spawn errors
      pythonProcess.on('error', (error: any) => {
        clearTimeout(timeoutId)
        if (error.code === 'ENOENT' || error.message.includes('python3')) {
          resolve({ result: null, error: "Python 3 is not installed or not available in PATH. Please ensure Python 3 is installed." })
        } else {
          resolve({ result: null, error: `Execution error: ${error.message || "Unknown error"}` })
        }
      })

      // Send input data to stdin
      const inputJson = JSON.stringify(inputValues)
      pythonProcess.stdin.write(inputJson)
      pythonProcess.stdin.end()
    })
  } catch (error) {
    return { result: null, error: error instanceof Error ? error.message : "Execution error" }
  }
}

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
        if (actual[0] >= 0 && actual[0] < nums.length && actual[1] >= 0 && actual[1] < nums.length) {
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

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await executeRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { code, scenarioId, language = 'javascript' } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    if (!scenarioId) {
      return NextResponse.json({ error: "Scenario ID is required" }, { status: 400 })
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

    const results = []
    let allPassed = true
    let executionError = null

    // Execute each test case with timeout protection
    for (const testCase of testCases) {
      let executionResult: any
      const startTime = Date.now()
      const TIMEOUT_MS = 10000 // 10 second timeout per test case

      try {
        // Execute based on language
        switch (language) {
          case 'python':
            executionResult = await executePython(code, testCase, scenario.type)
            break
          case 'javascript':
          case 'typescript':
          default:
            executionResult = await executeJavaScript(code, testCase, scenario.type)
            break
        }

        // Check for timeout
        if (Date.now() - startTime > TIMEOUT_MS) {
          allPassed = false
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: 'Execution timeout: code took too long to execute',
          })
          continue
        }

        if (executionResult.error) {
          allPassed = false
          results.push({
            description: testCase.description,
            input: testCase.input,
            expected: testCase.expected,
            actual: null,
            passed: false,
            error: executionResult.error,
          })
          continue
        }

        // Validate result
        const passed = validateResult(executionResult.result, testCase.expected, testCase, scenario.type)

        if (!passed) {
          allPassed = false
        }

        results.push({
          description: testCase.description,
          input: testCase.input,
          expected: testCase.expected,
          actual: executionResult.result,
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
