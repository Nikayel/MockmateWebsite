'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * TestResultsPanel - Displays test case results
 *
 * Shows passed/failed tests with expandable details.
 * Helps candidates understand what's working and what needs fixing.
 */

export interface TestResult {
  description: string;
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  error: string | null;
}

interface TestResultsPanelProps {
  results: TestResult[];
  isRunning?: boolean;
  className?: string;
}

export function TestResultsPanel({
  results,
  isRunning = false,
  className,
}: TestResultsPanelProps) {
  const [expandedTests, setExpandedTests] = React.useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTests(newExpanded);
  };

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;

  // Detect if there's a code error (syntax/runtime) - all tests fail with same error
  const errorResults = results.filter(r => r.error);
  const hasCodeError = errorResults.length > 0 && passed === 0;
  const firstError = errorResults[0]?.error || null;
  const isSyntaxError = firstError && (
    firstError.includes('SyntaxError') ||
    firstError.includes('Compilation error') ||
    firstError.includes('Unexpected token') ||
    firstError.includes('Parse error') ||
    firstError.includes('IndentationError') ||
    firstError.includes('invalid syntax')
  );

  // Auto-expand first failed test with error
  React.useEffect(() => {
    if (hasCodeError && errorResults.length > 0) {
      const firstFailedIndex = results.findIndex(r => r.error);
      if (firstFailedIndex >= 0) {
        setExpandedTests(new Set([firstFailedIndex]));
      }
    }
  }, [results, hasCodeError, errorResults.length]);

  if (results.length === 0 && !isRunning) {
    return (
      <div className={cn('text-center py-4 text-gray-500 text-sm', className)}>
        <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
        <p>Run tests to see results</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Code Error Banner - shown prominently when code has syntax/runtime errors */}
      {hasCodeError && firstError && (
        <div className={cn(
          'p-3 rounded-lg border',
          isSyntaxError
            ? 'bg-red-500/20 border-red-500/40'
            : 'bg-orange-500/20 border-orange-500/40'
        )}>
          <div className="flex items-start gap-2">
            <AlertCircle className={cn(
              'h-4 w-4 mt-0.5 flex-shrink-0',
              isSyntaxError ? 'text-red-400' : 'text-orange-400'
            )} />
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-xs font-medium mb-1',
                isSyntaxError ? 'text-red-300' : 'text-orange-300'
              )}>
                {isSyntaxError ? 'Syntax Error - Fix to Continue' : 'Code Error'}
              </div>
              <div className={cn(
                'text-xs font-mono break-all',
                isSyntaxError ? 'text-red-200' : 'text-orange-200'
              )}>
                {firstError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-800/50 rounded">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Tests:</span>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            {passed} passed
          </Badge>
          {failed > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              {failed} failed
            </Badge>
          )}
        </div>
        <div className={cn(
          'text-xs font-medium',
          passRate === 100 ? 'text-green-400' : passRate >= 50 ? 'text-yellow-400' : 'text-red-400'
        )}>
          {passRate}%
        </div>
      </div>

      {/* Individual test results */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {results.map((result, index) => (
          <div
            key={`test-${result.description.slice(0, 20)}-${index}`}
            className={cn(
              'rounded border transition-colors',
              result.passed
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-red-500/20 bg-red-500/5'
            )}
          >
            {/* Test header */}
            <button
              onClick={() => toggleExpand(index)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-gray-800/30"
            >
              <div className="flex items-center gap-2">
                {result.passed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
                <span className="text-xs text-gray-300 truncate max-w-[200px]">
                  {result.description}
                </span>
              </div>
              {expandedTests.has(index) ? (
                <ChevronUp className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gray-500" />
              )}
            </button>

            {/* Expanded details */}
            {expandedTests.has(index) && (
              <div className="px-2 pb-2 space-y-1 text-xs">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16">Input:</span>
                  <code className="text-gray-300 bg-gray-800/50 px-1 rounded">
                    {JSON.stringify(result.input)}
                  </code>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-16">Expected:</span>
                  <code className="text-green-400 bg-gray-800/50 px-1 rounded">
                    {JSON.stringify(result.expected)}
                  </code>
                </div>
                {!result.passed && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-16">Actual:</span>
                    <code className="text-red-400 bg-gray-800/50 px-1 rounded">
                      {JSON.stringify(result.actual)}
                    </code>
                  </div>
                )}
                {result.error && (
                  <div className="mt-1 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                    {result.error}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {isRunning && (
        <div className="flex items-center justify-center py-2 text-gray-400 text-xs">
          <div className="h-3 w-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin mr-2" />
          Running tests...
        </div>
      )}
    </div>
  );
}

export default TestResultsPanel;
