"use client"

import {
  CodeConsole,
  type ConsoleOutput as ConsoleOutputType,
  type TestResult,
  type TestSummary,
} from "@/components/interview/CodeConsole"
import type { PackRunView } from "@/lib/workspace-execution"

interface ConsoleOutputProps {
  editorConsoleOutputs: ConsoleOutputType[]
  testResults: TestResult[]
  testSummary: TestSummary
  isRunningTests: boolean
  onClearConsole: () => void
  onGoToLine?: (lineNum: number) => void
  notice?: string
  packRun?: PackRunView | null
}

export function ConsoleOutput({
  editorConsoleOutputs,
  testResults,
  testSummary,
  isRunningTests,
  onClearConsole,
  onGoToLine,
  notice,
  packRun,
}: ConsoleOutputProps) {
  return (
    <CodeConsole
      outputs={editorConsoleOutputs}
      testResults={testResults}
      testSummary={testSummary}
      isRunning={isRunningTests}
      className="max-h-[32vh] min-h-[140px]"
      onClear={onClearConsole}
      onGoToLine={onGoToLine}
      notice={notice}
      packRun={packRun}
    />
  )
}
