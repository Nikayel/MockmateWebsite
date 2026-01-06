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

      // Estimate space complexity based on data structures
      const hasHashMap =
        codeToAnalyze.includes("Map") ||
        codeToAnalyze.includes("Set") ||
        codeToAnalyze.includes("Object") ||
        codeToAnalyze.includes("{}")
      const hasArray = codeToAnalyze.includes("[") || codeToAnalyze.includes("Array")
      let estimatedSpaceComplexity = "O(1)"
      if (hasHashMap || hasArray) {
        estimatedSpaceComplexity = "O(n)"
      }

      // Get optimal complexity from scenario
      const optimalTimeComplexity = (selectedScenario as any)?.optimalComplexity?.time || "N/A"
      const optimalSpaceComplexity = (selectedScenario as any)?.optimalComplexity?.space || "N/A"

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

        // Show error in console
        setConsoleLogs([
          {
            type: "error",
            message: `❌ Execution Error: ${errorMessage}`,
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

        // Check for syntax/compilation errors
        const errorResults = data.results.filter((r: TestResult) => r.error)
        const allFailed = data.summary.passRate === 0

        // If all tests failed due to code errors, keep user in editing mode
        if (allFailed && errorResults.length > 0) {
          const firstError = errorResults[0].error

          // Check if it's a syntax or compilation error
          const isSyntaxError =
            firstError &&
            (firstError.includes("SyntaxError") ||
              firstError.includes("Compilation error") ||
              firstError.includes("Unexpected token") ||
              firstError.includes("unexpected token") ||
              firstError.includes("Parse error") ||
              firstError.includes("IndentationError") ||
              firstError.includes("invalid syntax"))

          playSound?.("fail")
          setIsRunning(false)
          return // Don't proceed to callback
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
