'use client';

import React, { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, XCircle, Terminal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * CodeConsole - IDE-like console panel for code execution output
 *
 * Features:
 * - Real-time output display
 * - Syntax/runtime error detection with line numbers
 * - Console.log capture
 * - Test results display
 * - Auto-scroll to latest output
 */

export interface ConsoleOutput {
  type: 'log' | 'error' | 'warn' | 'info' | 'result';
  message: string;
  timestamp?: number;
  lineNumber?: number;
}

export interface TestResult {
  description: string;
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  error: string | null;
}

export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface CodeConsoleProps {
  outputs?: ConsoleOutput[];
  testResults?: TestResult[];
  testSummary?: TestSummary;
  isRunning?: boolean;
  className?: string;
  onClear?: () => void;
}

// Parse error messages to extract line numbers
function parseErrorLineNumber(error: string): number | null {
  // Common patterns:
  // JavaScript: "at line 5" or "line 5" or ":5:"
  // Python: "line 5" or ", line 5"
  // TypeScript: "(5,10)" or ":5:"

  const patterns = [
    /line\s+(\d+)/i,           // "line 5", "Line 5"
    /:(\d+):/,                  // ":5:" (stack trace format)
    /:(\d+)\)/,                 // ":5)" (TypeScript format)
    /\((\d+),\s*\d+\)/,        // "(5, 10)" (TypeScript format)
    /at\s+.*:(\d+):\d+/,       // "at function (file:5:10)"
  ];

  for (const pattern of patterns) {
    const match = error.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

// Detect error type from message
function getErrorType(error: string): 'syntax' | 'runtime' | 'type' | 'unknown' {
  const lowerError = error.toLowerCase();

  if (
    lowerError.includes('syntaxerror') ||
    lowerError.includes('unexpected token') ||
    lowerError.includes('parse error') ||
    lowerError.includes('indentationerror') ||
    lowerError.includes('invalid syntax')
  ) {
    return 'syntax';
  }

  if (
    lowerError.includes('typeerror') ||
    lowerError.includes('compilation error')
  ) {
    return 'type';
  }

  if (
    lowerError.includes('referenceerror') ||
    lowerError.includes('rangeerror') ||
    lowerError.includes('nameerror') ||
    lowerError.includes('valueerror') ||
    lowerError.includes('keyerror') ||
    lowerError.includes('indexerror')
  ) {
    return 'runtime';
  }

  return 'unknown';
}

// Format error message for display
function formatErrorMessage(error: string): { title: string; details: string } {
  const errorType = getErrorType(error);
  const lineNum = parseErrorLineNumber(error);

  const titles: Record<string, string> = {
    syntax: 'Syntax Error',
    type: 'Type Error',
    runtime: 'Runtime Error',
    unknown: 'Error',
  };

  let title = titles[errorType];
  if (lineNum) {
    title += ` (line ${lineNum})`;
  }

  return { title, details: error };
}

export function CodeConsole({
  outputs = [],
  testResults = [],
  testSummary = { total: 0, passed: 0, failed: 0, passRate: 0 },
  isRunning = false,
  className,
  onClear,
}: CodeConsoleProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const prevOutputLengthRef = useRef(0);

  // Track if user has scrolled up (to disable auto-scroll)
  const handleScroll = () => {
    if (!consoleRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
    // User is "at bottom" if within 50px of the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    userScrolledUpRef.current = !isAtBottom;
  };

  // Auto-scroll to bottom only if user hasn't scrolled up
  // Also reset scroll tracking when new test run starts
  useEffect(() => {
    // Reset scroll state when a new test run starts (going from no results to running)
    if (isRunning && prevOutputLengthRef.current === 0) {
      userScrolledUpRef.current = false;
    }
    prevOutputLengthRef.current = outputs.length + testResults.length;

    // Only auto-scroll if user hasn't scrolled up to read errors
    if (consoleRef.current && !userScrolledUpRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [outputs, testResults, isRunning]);

  // Check for code errors
  const errorResults = testResults.filter(r => r.error);
  const hasCodeError = errorResults.length > 0 && testSummary.passed === 0;
  const firstError = errorResults[0]?.error || null;
  const errorInfo = firstError ? formatErrorMessage(firstError) : null;

  const isEmpty = outputs.length === 0 && testResults.length === 0 && !isRunning;

  return (
    <div className={cn('flex-shrink-0 bg-[#1e1e1e] border border-gray-700 rounded flex flex-col', className)}>
      {/* Console Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-gray-400 text-xs font-medium">Console</span>
          {hasCodeError && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] h-4 px-1.5">
              Error
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {testResults.length > 0 && !hasCodeError && (
            <Badge
              className={cn(
                'text-xs h-5',
                testSummary.passRate === 100
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : testSummary.passRate >= 60
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              )}
            >
              {testSummary.passed}/{testSummary.total} tests
            </Badge>
          )}
          {isRunning && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs h-5 animate-pulse">
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
        className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs min-h-[100px] max-h-[200px]"
      >
        {/* Empty state */}
        {isEmpty && (
          <div className="text-gray-500 flex items-center gap-2 py-2">
            <span className="text-gray-600">{'>'}</span>
            <span className="italic">Run your code to see output here...</span>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div className="text-blue-400 flex items-center gap-2">
            <span className="text-gray-600">{'>'}</span>
            <span>Executing code</span>
            <span className="animate-pulse">...</span>
          </div>
        )}

        {/* Console.log outputs */}
        {outputs.map((output, index) => (
          <div
            key={`output-${output.type}-${index}`}
            className={cn(
              'flex items-start gap-2',
              output.type === 'error' && 'text-red-400',
              output.type === 'warn' && 'text-yellow-400',
              output.type === 'info' && 'text-blue-400',
              output.type === 'log' && 'text-gray-300',
              output.type === 'result' && 'text-green-400'
            )}
          >
            <span className="text-gray-600 select-none">{'>'}</span>
            <span className="break-all whitespace-pre-wrap">{output.message}</span>
          </div>
        ))}

        {/* Test Results */}
        {testResults.length > 0 && !isRunning && (
          <>
            {/* Error banner for syntax/runtime errors */}
            {hasCodeError && errorInfo && (
              <div className="p-2 rounded border bg-red-500/10 border-red-500/30 mb-2">
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{errorInfo.title}</div>
                    <div className="text-red-300/80 break-all whitespace-pre-wrap text-[11px]">
                      {errorInfo.details}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Test result header */}
            {!hasCodeError && (
              <div className="text-gray-500 mb-1 pt-1 border-t border-gray-700/50">
                Test Results:
              </div>
            )}

            {/* Individual test results */}
            {testResults.map((result, index) => (
              <div key={`test-${result.description?.slice(0, 20) ?? index}-${index}`} className="py-0.5">
                <div className={cn(
                  'flex items-center gap-2',
                  result.passed ? 'text-green-400' : 'text-red-400'
                )}>
                  {result.passed ? (
                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className={result.passed ? 'text-gray-300' : 'text-gray-400'}>
                    {result.description}
                  </span>
                </div>

                {/* Show details for failed tests (unless it's a code error) */}
                {!result.passed && !result.error && (
                  <div className="ml-5 mt-1 space-y-0.5 text-[11px]">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-14">Input:</span>
                      <span className="text-blue-300">{JSON.stringify(result.input)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-14">Expected:</span>
                      <span className="text-green-300">{JSON.stringify(result.expected)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-14">Got:</span>
                      <span className="text-red-300">{JSON.stringify(result.actual)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default CodeConsole;
