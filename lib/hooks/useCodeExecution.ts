/**
 * useCodeExecution Hook
 *
 * Manages code execution and test running functionality.
 */

import { useState, useCallback, useRef } from "react"
import { User as FirebaseUser } from "firebase/auth"
import { Scenario } from "@/lib/scenarios"

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

export interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface UseCodeExecutionOptions {
  firebaseUser: FirebaseUser | null
  userId: string | null
  sessionId?: string | null
}

export interface UseCodeExecutionReturn {
  // State
  testResults: TestResult[]
  isRunningTests: boolean
  testSummary: TestSummary
  efficiencyMetrics: EfficiencyMetrics | null

  // Actions
  runTests: (code: string, scenario: Scenario, language: string) => Promise<TestResult[]>
  clearResults: () => void
}

export function useCodeExecution({
  firebaseUser,
  userId,
  sessionId,
}: UseCodeExecutionOptions): UseCodeExecutionReturn {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState<TestSummary>({
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
  })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const runTests = useCallback(async (
    code: string,
    scenario: Scenario,
    language: string
  ): Promise<TestResult[]> => {
    if (!firebaseUser || !scenario) return []

    // Cancel any pending execution
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setIsRunningTests(true)
    setTestResults([])

    try {
      const token = await firebaseUser.getIdToken()

      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language,
          testCases: 'testCases' in scenario ? scenario.testCases : [],
          scenarioId: scenario.id,
          scenarioType: scenario.type,
          sessionId,
          userId,
        }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Execution failed")
      }

      const data = await response.json()
      const results: TestResult[] = data.results || []

      setTestResults(results)

      // Calculate summary
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const failed = total - passed
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

      setTestSummary({ total, passed, failed, passRate })

      // Set efficiency metrics if available
      if (data.efficiencyMetrics) {
        setEfficiencyMetrics(data.efficiencyMetrics)
      }

      return results
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return [] // Request was cancelled
      }

      const errorResult: TestResult = {
        description: "Execution Error",
        passed: false,
        input: null,
        expected: null,
        actual: null,
        error: err instanceof Error ? err.message : "Unknown error occurred",
      }

      setTestResults([errorResult])
      setTestSummary({ total: 1, passed: 0, failed: 1, passRate: 0 })

      return [errorResult]
    } finally {
      setIsRunningTests(false)
    }
  }, [firebaseUser, sessionId, userId])

  const clearResults = useCallback(() => {
    // Cancel any pending execution
    if (abortRef.current) {
      abortRef.current.abort()
    }

    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setEfficiencyMetrics(null)
  }, [])

  return {
    testResults,
    isRunningTests,
    testSummary,
    efficiencyMetrics,
    runTests,
    clearResults,
  }
}
