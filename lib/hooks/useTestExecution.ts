/**
 * useTestExecution Hook
 *
 * Manages test execution, code analysis, and efficiency metrics:
 * - Running code tests
 * - Analyzing code efficiency
 * - Code submission and feedback generation
 * - System design submission
 */

import { useState, useCallback } from "react"
import { Scenario } from "@/lib/scenarios"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { isExecutionServiceError } from "@/lib/piston"

export interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

export interface EfficiencyMetrics {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

export interface UseTestExecutionOptions {
  selectedScenario: Scenario | null
  code: string
  selectedLanguage: string
  onTestComplete?: (results: TestResult[], summary: any) => void
  onTestError?: (error: string) => void
  playSound?: (type: "hint" | "success" | "fail" | "milestone") => void
}

export interface UseTestExecutionReturn {
  isRunning: boolean
  testResults: TestResult[]
  testSummary: { total: number; passed: number; failed: number; passRate: number }
  consoleLogs: Array<{ type: string; message: string; timestamp: number }>
  efficiencyMetrics: EfficiencyMetrics | null
  runTests: () => Promise<void>
  analyzeEfficiency: (codeToAnalyze: string) => EfficiencyMetrics
}

export function useTestExecution({
  selectedScenario,
  code,
  selectedLanguage,
  onTestComplete,
  onTestError,
  playSound,
}: UseTestExecutionOptions): UseTestExecutionReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testSummary, setTestSummary] = useState({ total: 0, passed: 0, failed: 0, passRate: 0 })
  const [consoleLogs, setConsoleLogs] = useState<
    Array<{ type: string; message: string; timestamp: number }>
  >([])
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)

  const analyzeEfficiency = useCallback(
    (codeToAnalyze: string): EfficiencyMetrics => {
      // Calculate lines of code (excluding empty lines and comments)
      const lines = codeToAnalyze.split("\n")
      const linesOfCode = lines.filter((line) => {
        const trimmed = line.trim()
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("/*") &&
          !trimmed.startsWith("*")
        )
      }).length

      // Basic complexity estimation based on control structures
      const controlStructures = (
        codeToAnalyze.match(/\b(if|else|for|while|switch|case|catch)\b/g) || []
      ).length
      const complexityLevel =
        controlStructures <= 3 ? "Low" : controlStructures <= 7 ? "Medium" : "High"

      // Estimate time complexity based on nested loops
      const nestedLoopCount =
        (codeToAnalyze.match(/for.*{[^}]*for/g) || []).length +
        (codeToAnalyze.match(/while.*{[^}]*while/g) || []).length
      let estimatedTimeComplexity = "O(n)"
      if (nestedLoopCount >= 2) {
        estimatedTimeComplexity = "O(n³)"
      } else if (nestedLoopCount === 1) {
        estimatedTimeComplexity = "O(n²)"
      } else if (codeToAnalyze.includes("sort")) {
        estimatedTimeComplexity = "O(n log n)"
      }

      // Get optimal complexity from scenario (needed for bounded space check)
      const optimalSpaceComplexity = (selectedScenario as any)?.optimalComplexity?.space || "N/A"

      // Estimate space complexity based on data structures
      // Only count CREATION of new data structures, not access/indexing
      const hasHashMapCreation =
        /new\s+Map\s*\(/.test(codeToAnalyze) || // new Map()
        /new\s+Set\s*\(/.test(codeToAnalyze) || // new Set()
        /=\s*\{\s*\}/.test(codeToAnalyze) || // = {} (empty object literal)
        /dict\s*\(\s*\)/.test(codeToAnalyze) || // dict() in Python
        /set\s*\(\s*\)/.test(codeToAnalyze) || // set() in Python
        /defaultdict\s*\(/.test(codeToAnalyze) || // defaultdict in Python
        /Counter\s*\(/.test(codeToAnalyze) // Counter in Python

      // Detect array CREATION, not just indexing
      // Creation patterns: [], Array(), list(), .split(), .slice() returning new array
      const hasArrayCreation =
        /=\s*\[\s*\]/.test(codeToAnalyze) || // = [] (empty array literal)
        /=\s*\[[^\]]+\](?!\s*=)/.test(codeToAnalyze) || // = [items] (array literal with items, not destructuring)
        /new\s+Array\s*\(/.test(codeToAnalyze) || // new Array()
        /Array\s*\.\s*from\s*\(/.test(codeToAnalyze) || // Array.from()
        /list\s*\(\s*\)/.test(codeToAnalyze) || // list() in Python
        /\.split\s*\(/.test(codeToAnalyze) || // .split() creates new array
        /\.slice\s*\(/.test(codeToAnalyze) || // .slice() creates new array
        /\.map\s*\(/.test(codeToAnalyze) || // .map() creates new array
        /\.filter\s*\(/.test(codeToAnalyze) || // .filter() creates new array
        /\[\s*for\s+/.test(codeToAnalyze) // [x for x in ...] list comprehension

      // Check if this is a bounded space problem (e.g., 26-char alphabet, digits only)
      // If optimal space is O(1) but code uses hash map/array, it's likely bounded
      // Common bounded space problems: anagrams, character frequency, digit counting
      const isBoundedSpaceProblem = optimalSpaceComplexity === "O(1)"

      let estimatedSpaceComplexity = "O(1)"
      if (hasHashMapCreation || hasArrayCreation) {
        // If the problem's optimal is O(1), trust that - it means the data structure
        // has bounded size (e.g., 26 chars for alphabet, 10 digits, etc.)
        // Otherwise, assume the data structure grows with input size
        estimatedSpaceComplexity = isBoundedSpaceProblem ? "O(1)" : "O(n)"
      }

      // Get optimal time complexity from scenario
      const optimalTimeComplexity = (selectedScenario as any)?.optimalComplexity?.time || "N/A"

      // Calculate efficiency score (0-100)
      let efficiencyScore = 100

      // Deduct points for suboptimal time complexity
      if (optimalTimeComplexity !== "N/A" && estimatedTimeComplexity !== optimalTimeComplexity) {
        efficiencyScore -= 20
      }

      // Deduct points for suboptimal space complexity
      if (optimalSpaceComplexity !== "N/A" && estimatedSpaceComplexity !== optimalSpaceComplexity) {
        efficiencyScore -= 10
      }

      // Deduct points for excessive complexity
      if (complexityLevel === "High") {
        efficiencyScore -= 15
      } else if (complexityLevel === "Medium") {
        efficiencyScore -= 5
      }

      // Deduct points for excessive lines of code
      if (linesOfCode > 30) {
        efficiencyScore -= 10
      } else if (linesOfCode > 20) {
        efficiencyScore -= 5
      }

      return {
        linesOfCode,
        complexity: complexityLevel,
        estimatedTimeComplexity,
        estimatedSpaceComplexity,
        optimalTimeComplexity,
        optimalSpaceComplexity,
        efficiencyScore: Math.max(0, efficiencyScore),
      }
    },
    [selectedScenario]
  )

  const runTests = useCallback(async () => {
    if (!selectedScenario) return

    setIsRunning(true)
    setTestResults([])
    setConsoleLogs([])

    // Analyze code efficiency
    const metrics = analyzeEfficiency(code)
    setEfficiencyMetrics(metrics)

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          scenarioId: selectedScenario.id,
          language: selectedLanguage,
        }),
      })

      const data = await response.json()

      // Handle API errors (scenario not found, execution timeout, etc.)
      if (!response.ok || data.error) {
        const errorMessage = data.error || `Server error (${response.status})`
        const isServiceDown = isExecutionServiceError(errorMessage)

        setConsoleLogs([
          {
            type: "error",
            message: isServiceDown
              ? "❌ Code execution service is temporarily unavailable. Please try again in a few minutes."
              : `❌ Execution Error: ${errorMessage}`,
            timestamp: Date.now(),
          },
        ])
        setTestResults([
          {
            description: "Execution Error",
            passed: false,
            error: errorMessage,
            input: "",
            expected: "",
            actual: "",
          },
        ])

        if (isServiceDown) {
          toast.error("Code execution unavailable", {
            description:
              "Our code runner is temporarily unavailable. Please try again in a few minutes.",
            duration: 8000,
          })
        }
        playSound?.("fail")
        onTestError?.(errorMessage)
        setIsRunning(false)
        return
      }

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)

        // Store console logs from execution
        if (data.consoleLogs && data.consoleLogs.length > 0) {
          setConsoleLogs(data.consoleLogs)
        }

        // Check for syntax/compilation errors vs service unavailability
        const errorResults = data.results.filter((r: TestResult) => r.error)
        const allFailed = data.summary.passRate === 0

        if (allFailed && errorResults.length > 0) {
          const firstError = errorResults[0].error
          const isServiceDown = isExecutionServiceError(firstError)

          if (isServiceDown) {
            toast.error("Code execution unavailable", {
              description:
                "Our code runner is temporarily unavailable. Please try again in a few minutes.",
              duration: 8000,
            })
            playSound?.("fail")
            setIsRunning(false)
            return
          }

          playSound?.("fail")
          setIsRunning(false)
          return // Don't proceed to callback (code errors)
        }

        // Play sound based on results
        if (data.summary.passRate === 100) {
          playSound?.("success")
        } else if (data.summary.passRate >= 50) {
          playSound?.("milestone")
        } else {
          playSound?.("fail")
        }

        // Call completion callback
        onTestComplete?.(data.results, data.summary)
        setIsRunning(false)
      }
    } catch (error) {
      logger.error("Code execution error", { error, scenarioId: selectedScenario?.id })
      toast.error("Failed to run tests", {
        description: "There was a problem executing your code. Please try again.",
      })
      setIsRunning(false)
    }
  }, [
    selectedScenario,
    code,
    selectedLanguage,
    analyzeEfficiency,
    onTestComplete,
    onTestError,
    playSound,
  ])

  return {
    isRunning,
    testResults,
    testSummary,
    consoleLogs,
    efficiencyMetrics,
    runTests,
    analyzeEfficiency,
  }
}
