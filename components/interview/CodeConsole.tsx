"use client"

import React, { useEffect, useRef } from "react"
import { AlertCircle, CheckCircle, XCircle, Terminal, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PYTHON_WRAPPER_LINE_OFFSET, JAVASCRIPT_WRAPPER_LINE_OFFSET } from "@/lib/piston"
import { TerminalOutput, TERMINAL_PRE } from "./TerminalOutput"
import type { PackRunView } from "@/lib/workspace-execution"

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
  /** Absent for workspace suites, whose only honest signal is `error`. */
  expected?: any
  /** Absent for workspace suites, whose only honest signal is `error`. */
  actual?: any
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
  /** Optional info banner (e.g. guided-lab "a new check just unlocked"). */
  notice?: string
  /**
   * Stdout-oracle pack run. When set, the console renders the program's real
   * terminal output instead of pass/fail rows — a pack has no assert suite.
   */
  packRun?: PackRunView | null
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

/**
 * A test row has a real comparison to show only when the runner produced actual
 * values. Workspace suites report an assert message instead, and the old code
 * substituted the literals "pass"/"fail" — rendering `Expected: "pass"`.
 */
function hasComparison(result: TestResult): boolean {
  return result.expected !== undefined || result.actual !== undefined
}

/** Exact by default; pretty-printed once a structure is too wide to scan inline. */
function formatValue(value: unknown): string {
  const compact = JSON.stringify(value)
  if (compact === undefined) return String(value)
  return compact.length > 60 ? JSON.stringify(value, null, 2) : compact
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
  notice,
  packRun,
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

  // A one-line "here's what's wrong" lead so the learner doesn't scan rows to
  // find the single failure. The message comes from the assert (expected X, got Y).
  const failingVisibleTests = testResults.filter((result) => !result.passed && !result.isHidden)
  const failureSummary =
    !hasCodeError && failingVisibleTests.length > 0
      ? `${failingVisibleTests.length} ${
          failingVisibleTests.length === 1 ? "test" : "tests"
        } failing — ${failingVisibleTests[0].description}${
          failingVisibleTests[0].error ? `: ${failingVisibleTests[0].error}` : ""
        }`
      : null

  const isEmpty = outputs.length === 0 && testResults.length === 0 && !packRun && !isRunning

  return (
    <div
      className={cn(
        "border-border flex flex-shrink-0 flex-col rounded border bg-[#1e1d1b]",
        className
      )}
    >
      {/* Console Header */}
      <div className="border-border flex flex-shrink-0 items-center justify-between border-b bg-[#232220] px-3 py-1.5">
        <div className="flex items-center space-x-2">
          <Terminal className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-xs font-medium">Console</span>
          {/* A crashed pack already reports "crashed"; two red badges is noise. */}
          {hasCodeError && !packRun && (
            <Badge className="h-4 border-red-500/30 bg-red-500/20 px-1.5 text-[10px] text-red-400">
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Packs have no test suite — report the oracle verdict, not a tally. */}
          {packRun && (
            <Badge
              className={cn(
                "h-5 text-xs",
                !packRun.ran
                  ? "border-red-500/30 bg-red-500/20 text-red-400"
                  : packRun.match
                    ? "border-green-500/30 bg-green-500/20 text-green-400"
                    : "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
              )}
            >
              {!packRun.ran ? "crashed" : packRun.match ? "oracle match" : "oracle mismatch"}
            </Badge>
          )}
          {!packRun && testResults.length > 0 && !hasCodeError && (
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
          {onClear && (outputs.length > 0 || testResults.length > 0 || packRun) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-muted-foreground h-5 w-5 p-0"
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
        {/* Optional info banner (e.g. guided-lab reveal signpost) */}
        {notice && (
          <div className="border-accent/30 bg-accent/10 text-foreground mb-1 flex items-start gap-2 rounded border p-2 text-[11px]">
            <span aria-hidden="true">💡</span>
            <span className="break-words">{notice}</span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="text-muted-foreground flex items-center gap-2 py-2">
            <span className="text-muted-foreground">{">"}</span>
            <span className="italic">Run your code to see output here...</span>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="flex items-center gap-2 text-blue-400">
            <span className="text-muted-foreground">{">"}</span>
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
              output.type === "log" && "text-muted-foreground",
              output.type === "result" && "text-green-400"
            )}
          >
            <span className="text-muted-foreground select-none">{">"}</span>
            {/* break-words, not break-all: break-all chops mid-token at arbitrary
                characters and shreds paths, ids, and aligned output. */}
            <span className="break-words whitespace-pre-wrap">{output.message}</span>
          </div>
        ))}

        {/* Pack runs are graded by byte-exact stdout, so the program's real
            terminal output IS the result. No pass/fail rows, no error banner —
            a pack traceback points at the candidate's own file and must not go
            through the wrapper-offset error formatter. */}
        {packRun && !isRunning && <TerminalOutput {...packRun} />}

        {/* Test Results */}
        {!packRun && testResults.length > 0 && !isRunning && (
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
                    {/* A traceback is column-aligned output like any other: scroll
                        it, never break-all it. */}
                    <pre
                      className={cn(TERMINAL_PRE, "bg-background/20 rounded p-2 text-red-300/80")}
                    >
                      {errorInfo.details}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Test result header + one-line failure lead */}
            {!hasCodeError && (
              <div className="border-border/50 mb-1 border-t pt-1">
                {failureSummary ? (
                  <div className="flex items-start gap-1.5 text-red-300">
                    <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    <span className="break-words">{failureSummary}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Test Results:</span>
                )}
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
                  <span
                    className={result.passed ? "text-muted-foreground" : "text-muted-foreground"}
                  >
                    {result.description}
                  </span>
                </div>

                {/* Show details for failed tests */}
                {!result.passed && (
                  <div className="mt-1 ml-5 space-y-0.5 text-[11px]">
                    {result.isHidden ? (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground italic">
                          This test case is hidden. The implementation failed to meet the required
                          behavior.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Show input only when it's structured data (DSA test
                            cases). Workspace results carry the suite name in
                            `input` as a tag, which is noise to display here. */}
                        {result.input != null && typeof result.input === "object" && (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground w-14 flex-shrink-0">Input:</span>
                            <pre className={cn(TERMINAL_PRE, "text-blue-300")}>
                              {formatValue(result.input)}
                            </pre>
                          </div>
                        )}
                        {/* Show the error when there is one; otherwise the real
                            expected/actual values. Workspace suites carry neither
                            (their assert message is the signal), and inventing
                            "Expected: pass / Got: fail" for them told the learner
                            nothing. */}
                        {result.error ? (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground w-14 flex-shrink-0">Error:</span>
                            <pre className={cn(TERMINAL_PRE, "text-red-300")}>{result.error}</pre>
                          </div>
                        ) : hasComparison(result) ? (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground w-14 flex-shrink-0">
                                Expected:
                              </span>
                              <pre className={cn(TERMINAL_PRE, "text-green-300")}>
                                {formatValue(result.expected)}
                              </pre>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground w-14 flex-shrink-0">Got:</span>
                              <pre className={cn(TERMINAL_PRE, "text-red-300")}>
                                {formatValue(result.actual)}
                              </pre>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">
                            This check did not pass.
                          </span>
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
