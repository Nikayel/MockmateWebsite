"use client"

import React from "react"
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparra, type SparraState } from "@/components/brand/Sparra"
import { cn } from "@/lib/utils"

/**
 * A SQL result set ({ columns, rows }) rather than a scalar test value. The SQL runner
 * renders these as a readable grid above this panel, so dumping them again as JSON here is
 * redundant and unreadable — we suppress the value rows and keep only the failure reason.
 */
function looksLikeResultSet(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { columns?: unknown }).columns) &&
    Array.isArray((value as { rows?: unknown }).rows)
  )
}

/**
 * TestResultsPanel - Displays test case results
 *
 * Shows passed/failed tests with expandable details.
 * Helps candidates understand what's working and what needs fixing.
 */

export interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

interface TestResultsPanelProps {
  results: TestResult[]
  isRunning?: boolean
  className?: string
}

export function TestResultsPanel({ results, isRunning = false, className }: TestResultsPanelProps) {
  const [expandedTests, setExpandedTests] = React.useState<Set<number>>(new Set())

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedTests)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTests(newExpanded)
  }

  // Calculate summary
  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0

  // Sparra reacts once when a run completes (suite green → pass pop, any
  // failure → fail shake), then settles to the static mark — reactions are
  // one-shot and nothing loops while results are on screen (brand rule).
  const [reaction, setReaction] = React.useState<SparraState | undefined>(undefined)
  const wasRunning = React.useRef(false)
  React.useEffect(() => {
    if (isRunning) {
      wasRunning.current = true
      setReaction(undefined)
      return
    }
    if (wasRunning.current && results.length > 0) {
      wasRunning.current = false
      setReaction(failed === 0 ? "pass" : "fail")
    }
  }, [isRunning, results.length, failed])

  const handleSparraAnimationEnd = React.useCallback(
    (event: React.AnimationEvent<HTMLSpanElement>) => {
      if (event.animationName === "sparra-pop" || event.animationName === "sparra-shake") {
        setReaction(undefined)
      }
    },
    []
  )

  const sparraState: SparraState | undefined = isRunning ? "thinking" : reaction

  // Detect if there's a code error (syntax/runtime) - all tests fail with same error
  const errorResults = results.filter((r) => r.error)
  const hasCodeError = errorResults.length > 0 && passed === 0
  const firstError = errorResults[0]?.error || null
  const isSyntaxError =
    firstError &&
    (firstError.includes("SyntaxError") ||
      firstError.includes("Compilation error") ||
      firstError.includes("Unexpected token") ||
      firstError.includes("Parse error") ||
      firstError.includes("IndentationError") ||
      firstError.includes("invalid syntax"))

  // Auto-expand first failed test with error
  React.useEffect(() => {
    if (hasCodeError && errorResults.length > 0) {
      const firstFailedIndex = results.findIndex((r) => r.error)
      if (firstFailedIndex >= 0) {
        setExpandedTests(new Set([firstFailedIndex]))
      }
    }
  }, [results, hasCodeError, errorResults.length])

  if (results.length === 0 && !isRunning) {
    return (
      <div className={cn("text-muted-foreground py-4 text-center text-sm", className)}>
        <AlertCircle className="mx-auto mb-2 h-5 w-5 opacity-50" />
        <p>Run tests to see results</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Code Error Banner - shown prominently when code has syntax/runtime errors */}
      {hasCodeError && firstError && (
        <div
          className={cn(
            "rounded-lg border p-3",
            isSyntaxError
              ? "border-red-500/40 bg-red-500/20"
              : "border-orange-500/40 bg-orange-500/20"
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className={cn(
                "mt-0.5 h-4 w-4 flex-shrink-0",
                isSyntaxError ? "text-red-400" : "text-orange-400"
              )}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "mb-1 text-xs font-medium",
                  isSyntaxError ? "text-red-300" : "text-orange-300"
                )}
              >
                {isSyntaxError ? "Syntax Error - Fix to Continue" : "Code Error"}
              </div>
              <div
                className={cn(
                  "font-mono text-xs break-all",
                  isSyntaxError ? "text-red-200" : "text-orange-200"
                )}
              >
                {firstError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-muted/50 flex items-center justify-between rounded px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Sparra state={sparraState} size={22} onAnimationEnd={handleSparraAnimationEnd} />
          <span className="text-muted-foreground text-xs">Tests:</span>
          <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">
            {passed} passed
          </Badge>
          {failed > 0 && (
            <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-400">
              {failed} failed
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "text-xs font-medium",
            passRate === 100
              ? "text-green-400"
              : passRate >= 50
                ? "text-yellow-400"
                : "text-red-400"
          )}
        >
          {passRate}%
        </div>
      </div>

      {/* Individual test results */}
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={`test-${result.description.slice(0, 20)}-${index}`}
            className={cn(
              "rounded border transition-colors",
              result.passed
                ? "border-green-500/20 bg-green-500/5"
                : "border-red-500/20 bg-red-500/5"
            )}
          >
            {/* Test header */}
            <button
              onClick={() => toggleExpand(index)}
              className="hover:bg-muted/30 flex w-full items-center justify-between px-2 py-1.5 text-left"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {result.passed ? (
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                )}
                <span className="text-muted-foreground min-w-0 text-xs break-words">
                  {result.description}
                </span>
              </div>
              {expandedTests.has(index) ? (
                <ChevronUp className="text-muted-foreground h-3 w-3 flex-shrink-0" />
              ) : (
                <ChevronDown className="text-muted-foreground h-3 w-3 flex-shrink-0" />
              )}
            </button>

            {/* Expanded details */}
            {expandedTests.has(index) && (
              <div className="space-y-1 px-2 pb-2 text-xs">
                {/* SQL result sets are shown as a grid above this panel; only the failure
                    reason below is useful here, so skip the redundant JSON dump for them. */}
                {!looksLikeResultSet(result.expected) && !looksLikeResultSet(result.actual) && (
                  <>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Input:</span>
                      <code className="text-muted-foreground bg-muted/50 min-w-0 rounded px-1 break-all">
                        {JSON.stringify(result.input)}
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-16 flex-shrink-0">Expected:</span>
                      <code className="bg-muted/50 min-w-0 rounded px-1 break-all text-green-400">
                        {JSON.stringify(result.expected)}
                      </code>
                    </div>
                    {!result.passed && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-16 flex-shrink-0">Actual:</span>
                        <code className="bg-muted/50 min-w-0 rounded px-1 break-all text-red-400">
                          {JSON.stringify(result.actual)}
                        </code>
                      </div>
                    )}
                  </>
                )}
                {result.error && (
                  <div className="mt-1 rounded border border-red-500/20 bg-red-500/10 p-1.5 break-words whitespace-pre-wrap text-red-400">
                    {result.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isRunning && (
        <div className="text-muted-foreground flex items-center justify-center py-2 text-xs">
          Running tests…
        </div>
      )}
    </div>
  )
}

export default TestResultsPanel
