"use client"

import { useEffect, useRef, useState } from "react"
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
  testSources?: ReadonlyMap<TestResult, string>
  onOpenTestSource?: (path: string) => void
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
  testSources,
  onOpenTestSource,
  notice,
  packRun,
}: ConsoleOutputProps) {
  const [expanded, setExpanded] = useState(
    isRunningTests ||
      editorConsoleOutputs.length > 0 ||
      testResults.length > 0 ||
      Boolean(packRun || notice)
  )

  const previousActivity = useRef({
    isRunningTests,
    editorConsoleOutputs,
    testResults,
    packRun,
    notice,
  })

  // A new run or new output must never arrive behind a collapsed drawer.
  // Unrelated renders retain the candidate's manual collapse choice.
  useEffect(() => {
    const previous = previousActivity.current
    const changed =
      previous.isRunningTests !== isRunningTests ||
      previous.packRun !== packRun ||
      previous.notice !== notice ||
      changedEntries(previous.editorConsoleOutputs, editorConsoleOutputs) ||
      changedEntries(previous.testResults, testResults)
    const hasContent =
      isRunningTests ||
      editorConsoleOutputs.length > 0 ||
      testResults.length > 0 ||
      packRun ||
      notice
    if (changed && hasContent) setExpanded(true)
    previousActivity.current = {
      isRunningTests,
      editorConsoleOutputs,
      testResults,
      packRun,
      notice,
    }
  }, [isRunningTests, editorConsoleOutputs, testResults, packRun, notice])

  return (
    <CodeConsole
      outputs={editorConsoleOutputs}
      testResults={testResults}
      testSummary={testSummary}
      isRunning={isRunningTests}
      className="max-h-[32vh]"
      expanded={expanded}
      onExpandedChange={setExpanded}
      onClear={() => {
        onClearConsole()
        setExpanded(false)
      }}
      onGoToLine={onGoToLine}
      testSources={testSources}
      onOpenTestSource={onOpenTestSource}
      notice={notice}
      packRun={packRun}
    />
  )
}

function changedEntries<T>(previous: T[], current: T[]): boolean {
  return (
    previous.length !== current.length || current.some((entry, index) => entry !== previous[index])
  )
}
