"use client"

import React, { useEffect, useRef } from "react"
import { AlertCircle, CheckCircle, XCircle, Terminal, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PYTHON_WRAPPER_LINE_OFFSET, JAVASCRIPT_WRAPPER_LINE_OFFSET } from "@/lib/piston"

/**
 * CodeConsole - IDE-like console panel for code execution output
 *
 * Features:
 * - Real-time output display
 * - Syntax/runtime error detection with line numbers (adjusted for wrapper code offset)
 * - Console.log capture
 * - Test results display
 * - Auto-scroll to latest output
 */

export interface ConsoleOutput {
  type: "log" | "error" | "warn" | "info" | "result"
  message: string
  timestamp?: number
  lineNumber?: number
}

export interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
  isHidden?: boolean
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

interface CodeConsoleProps {
  outputs?: ConsoleOutput[]
  testResults?: TestResult[]
  testSummary?: TestSummary
  isRunning?: boolean
  className?: string
  onClear?: () => void
  language?: "python" | "javascript" | "typescript"
  userCodeLineCount?: number // Total lines in user's code for validation
  onGoToLine?: (lineNum: number) => void
}

/**
 * Parse error messages to extract line numbers and adjust for wrapper code offset.
 * The code is wrapped with imports, helper classes, etc. before execution,
 * so reported line numbers need to be adjusted to match user's actual code.
 */
function parseErrorLineNumber(
  error: string,
  language: "python" | "javascript" | "typescript" = "python",
  userCodeLineCount?: number
): number | null {
  // Common patterns:
  // JavaScript: "at line 5" or "line 5" or ":5:"
  // Python: "line 5" or ", line 5" or "File "<string>", line 5"
  // TypeScript: "(5,10)" or ":5:"

  const patterns = [
    /File\s+"<string>",\s+line\s+(\d+)/i, // Python: File "<string>", line 5
    /line\s+(\d+)/i, // "line 5", "Line 5"
    /:(\d+):/, // ":5:" (stack trace format)
    /:(\d+)\)/, // ":5)" (TypeScript format)
    /\((\d+),\s*\d+\)/, // "(5, 10)" (TypeScript format)
    /at\s+.*:(\d+):\d+/, // "at function (file:5:10)"
    /^\s+(\d+)\s+\|/m, // "  5 | code" (Python caret format)
  ]

  let rawLineNum: number | null = null
  for (const pattern of patterns) {
    const match = error.match(pattern)
    if (match && match[1]) {
      rawLineNum = parseInt(match[1], 10)
      break
    }
  }

  if (rawLineNum === null) {
    return null
  }

  // Adjust for wrapper code offset
  const offset = language === "python" ? PYTHON_WRAPPER_LINE_OFFSET : JAVASCRIPT_WRAPPER_LINE_OFFSET
  const adjustedLineNum = rawLineNum - offset

  // Validate: line number should be positive and within user's code
  if (adjustedLineNum < 1) {
    // Error is in the wrapper code itself (shouldn't happen normally)
    // Return null to avoid confusing users
    return null
  }

  // If we know the user's code line count, validate against it
  if (userCodeLineCount && adjustedLineNum > userCodeLineCount) {
    // Error is in the execution wrapper after user's code
    // This might be a runtime error - still show it but cap at last line
    return userCodeLineCount
  }

  return adjustedLineNum
}

// Detect error type from message
function getErrorType(
  error: string
): "syntax" | "runtime" | "type" | "logic" | "timeout" | "security" | "unknown" {
  const lowerError = error.toLowerCase()

  // Security / Execution Environment Errors
  if (
    lowerError.includes("content security policy") ||
    lowerError.includes("content-security-policy") ||
    lowerError.includes("unsafe-eval") ||
    lowerError.includes("failed to spawn web worker") ||
    lowerError.includes("web worker") ||
    lowerError.includes("worker error")
  ) {
    return "security"
  }

  // Syntax/Parse errors
  if (
    lowerError.includes("syntaxerror") ||
    lowerError.includes("unexpected token") ||
    lowerError.includes("parse error") ||
    lowerError.includes("indentationerror") ||
    lowerError.includes("invalid syntax") ||
    lowerError.includes("unterminated string") ||
    lowerError.includes("missing )") ||
    lowerError.includes("missing }") ||
    lowerError.includes("expected")
  ) {
    return "syntax"
  }

  // Type errors
  if (
    lowerError.includes("typeerror") ||
    lowerError.includes("compilation error") ||
    lowerError.includes("cannot read property") ||
    lowerError.includes("is not a function") ||
    lowerError.includes("is not defined") ||
    lowerError.includes("has no attribute") ||
    lowerError.includes("attributeerror")
  ) {
    return "type"
  }

  // Timeout/Recursion errors
  if (
    lowerError.includes("timeout") ||
    lowerError.includes("timed out") ||
    lowerError.includes("maximum call stack") ||
    lowerError.includes("too much recursion") ||
    lowerError.includes("recursionerror") ||
    lowerError.includes("maximum recursion depth") ||
    lowerError.includes("infinite loop")
  ) {
    return "timeout"
  }

  // Runtime/Value errors
  if (
    lowerError.includes("referenceerror") ||
    lowerError.includes("rangeerror") ||
    lowerError.includes("nameerror") ||
    lowerError.includes("valueerror") ||
    lowerError.includes("keyerror") ||
    lowerError.includes("indexerror") ||
    lowerError.includes("zerodivisionerror") ||
    lowerError.includes("division by zero") ||
    lowerError.includes("overflowerror") ||
    lowerError.includes("memoryerror") ||
    lowerError.includes("assertionerror") ||
    lowerError.includes("index out of") ||
    lowerError.includes("list index") ||
    lowerError.includes("undefined") ||
    lowerError.includes("null") ||
    lowerError.includes("'nonetype'")
  ) {
    return "runtime"
  }

  // Logic errors (wrong output, usually caught by test comparison)
  if (
    lowerError.includes("expected") ||
    lowerError.includes("assertion") ||
    lowerError.includes("mismatch")
  ) {
    return "logic"
  }

  return "unknown"
}

// Format error message for display with helpful hints
function formatErrorMessage(
  error: string,
  language: "python" | "javascript" | "typescript" = "python",
  userCodeLineCount?: number
): { title: string; details: string; hint?: string } {
  const errorType = getErrorType(error)
  const lineNum = parseErrorLineNumber(error, language, userCodeLineCount)

  const titles: Record<string, string> = {
    syntax: "🔴 Syntax Error",
    type: "🟠 Type Error",
    runtime: "🔴 Runtime Error",
    timeout: "⏱️ Timeout/Recursion Error",
    logic: "🟡 Logic Error",
    security: "🔒 Execution Environment Error",
    unknown: "❌ Error",
  }

  const hints: Record<string, string> = {
    syntax: "Check for missing brackets, quotes, or typos near the indicated line.",
    type: "Verify variable types and function signatures match what you expect.",
    runtime: "Check for null/undefined values, invalid indices, or missing variables.",
    timeout: "Your code may have an infinite loop or too deep recursion. Add base cases.",
    logic: "Your solution runs but produces incorrect output. Review your algorithm.",
    security:
      "An execution environment or security policy issue occurred. Please contact support or try reloading the page.",
    unknown: "Review your code for potential issues.",
  }

  let title = titles[errorType]
  if (lineNum) {
    title += ` on line ${lineNum}`
  }

  // Clean up the error message for display
  // Remove wrapper-specific file paths and adjust line numbers in the message
  let details = error

  // Replace wrapper line numbers with adjusted ones in the error message
  const wrapperOffset =
    language === "python" ? PYTHON_WRAPPER_LINE_OFFSET : JAVASCRIPT_WRAPPER_LINE_OFFSET
  details = details.replace(/line\s+(\d+)/gi, (match, num) => {
    const adjusted = parseInt(num, 10) - wrapperOffset
    return adjusted > 0 ? `line ${adjusted}` : match
  })

  // Remove the cryptic piston file paths
  details = details.replace(/File\s+"[^"]*\/piston\/[^"]*",\s*/gi, "At ")
  details = details.replace(/\/piston\/jobs\/[a-f0-9-]+\/file\d+\.code/gi, "your code")

  return { title, details, hint: hints[errorType] }
}

export function CodeConsole({
  outputs = [],
  testResults = [],
  testSummary = { total: 0, passed: 0, failed: 0, passRate: 0 },
  isRunning = false,
  className,
  onClear,
  language = "python",
  userCodeLineCount,
}: CodeConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const prevOutputLengthRef = useRef(0)

  // Track if user has scrolled up (to disable auto-scroll)
  const handleScroll = () => {
    if (!consoleRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current
    // User is "at bottom" if within 50px of the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    userScrolledUpRef.current = !isAtBottom
  }

  // Auto-scroll to bottom only if user hasn't scrolled up
  // Also reset scroll tracking when new test run starts
  useEffect(() => {
    // Reset scroll state when a new test run starts (going from no results to running)
    if (isRunning && prevOutputLengthRef.current === 0) {
      userScrolledUpRef.current = false
    }
    prevOutputLengthRef.current = outputs.length + testResults.length

    // Only auto-scroll if user hasn't scrolled up to read errors
    if (consoleRef.current && !userScrolledUpRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [outputs, testResults, isRunning])

  // Check for code errors
  const errorResults = testResults.filter((r) => r.error)
  const hasCodeError = errorResults.length > 0 && testSummary.passed === 0
  const firstError = errorResults[0]?.error || null
  const errorInfo = firstError ? formatErrorMessage(firstError, language, userCodeLineCount) : null

  const isEmpty = outputs.length === 0 && testResults.length === 0 && !isRunning

  return (
    <div
      className={cn(
        "flex flex-shrink-0 flex-col rounded border border-gray-700 bg-[#1e1e1e]",
        className
      )}
    >
      {/* Console Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700 bg-[#252526] px-3 py-1.5">
        <div className="flex items-center space-x-2">
          <Terminal className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">Console</span>
          {hasCodeError && (
            <Badge className="h-4 border-red-500/30 bg-red-500/20 px-1.5 text-[10px] text-red-400">
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {testResults.length > 0 && !hasCodeError && (
            <Badge
              className={cn(
                "h-5 text-xs",
                testSummary.passRate === 100
                  ? "border-green-500/30 bg-green-500/20 text-green-400"
                  : testSummary.passRate >= 60
                    ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                    : "border-red-500/30 bg-red-500/20 text-red-400"
              )}
            >
              {testSummary.passed}/{testSummary.total} tests
            </Badge>
          )}
          {isRunning && (
            <Badge className="h-5 animate-pulse border-blue-500/30 bg-blue-500/20 text-xs text-blue-400">
              Running...
            </Badge>
          )}
          {onClear && (outputs.length > 0 || testResults.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-gray-500 hover:text-gray-300"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Console Content */}
      <div
        ref={consoleRef}
        onScroll={handleScroll}
        className="max-h-[200px] min-h-[100px] flex-1 space-y-1 overflow-y-auto p-2 font-mono text-xs"
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="flex items-center gap-2 py-2 text-gray-500">
            <span className="text-gray-600">{">"}</span>
            <span className="italic">Run your code to see output here...</span>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="flex items-center gap-2 text-blue-400">
            <span className="text-gray-600">{">"}</span>
            <span>Executing code</span>
            <span className="animate-pulse">...</span>
          </div>
        )}

        {/* Console.log outputs */}
        {outputs.map((output, index) => (
          <div
            key={`output-${output.type}-${index}`}
            className={cn(
              "flex items-start gap-2",
              output.type === "error" && "text-red-400",
              output.type === "warn" && "text-yellow-400",
              output.type === "info" && "text-blue-400",
              output.type === "log" && "text-gray-300",
              output.type === "result" && "text-green-400"
            )}
          >
            <span className="text-gray-600 select-none">{">"}</span>
            <span className="break-all whitespace-pre-wrap">{output.message}</span>
          </div>
        ))}

        {/* Test Results */}
        {testResults.length > 0 && !isRunning && (
          <>
            {/* Error banner for syntax/runtime errors */}
            {hasCodeError && errorInfo && (
              <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 p-2">
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="mb-1 font-semibold">{errorInfo.title}</div>
                    {errorInfo.hint && (
                      <div className="mb-2 text-[11px] text-yellow-300/80 italic">
                        💡 {errorInfo.hint}
                      </div>
                    )}
                    <div className="rounded bg-black/20 p-2 font-mono text-[11px] break-all whitespace-pre-wrap text-red-300/80">
                      {errorInfo.details}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Test result header */}
            {!hasCodeError && (
              <div className="mb-1 border-t border-gray-700/50 pt-1 text-gray-500">
                Test Results:
              </div>
            )}

            {/* Individual test results */}
            {testResults.map((result, index) => (
              <div
                key={`test-${result.description?.slice(0, 20) ?? index}-${index}`}
                className="py-0.5"
              >
                <div
                  className={cn(
                    "flex items-center gap-2",
                    result.passed ? "text-green-400" : "text-red-400"
                  )}
                >
                  {result.passed ? (
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className={result.passed ? "text-gray-300" : "text-gray-400"}>
                    {result.description}
                  </span>
                </div>

                {/* Show details for failed tests */}
                {!result.passed && (
                  <div className="mt-1 ml-5 space-y-0.5 text-[11px]">
                    {result.isHidden ? (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 italic">
                          This test case is hidden. The implementation failed to meet the required
                          behavior.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Always show input for debugging */}
                        {result.input && (
                          <div className="flex items-start gap-2">
                            <span className="w-14 text-gray-500">Input:</span>
                            <span className="break-all text-blue-300">
                              {JSON.stringify(result.input)}
                            </span>
                          </div>
                        )}
                        {/* Show expected/got for wrong output, show error for code errors */}
                        {result.error ? (
                          <div className="flex items-start gap-2">
                            <span className="w-14 text-gray-500">Error:</span>
                            <span className="break-all text-red-300">{result.error}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="w-14 text-gray-500">Expected:</span>
                              <span className="break-all text-green-300">
                                {JSON.stringify(result.expected)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="w-14 text-gray-500">Got:</span>
                              <span className="break-all text-red-300">
                                {JSON.stringify(result.actual)}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default CodeConsole
