"use client"

import { useRef, useCallback, memo } from "react"
import { useShallow } from "zustand/react/shallow"
import { Code, PlayCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MonacoEditor } from "@/components/editor"
import { AIChatPartner } from "./InterviewerChat"
import { useInterviewStore, type Language } from "@/lib/stores"
import { validateCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"

interface InterviewEditorProps {
  onRunTests: () => Promise<void>
  onSendPartnerMessage: (message: string) => Promise<void>
  isRecordingPartner: boolean
  onTogglePartnerRecording: () => void
  partnerInput: string
  onPartnerInputChange: (value: string) => void
}

function InterviewEditorInner({
  onRunTests,
  onSendPartnerMessage,
  isRecordingPartner,
  onTogglePartnerRecording,
  partnerInput,
  onPartnerInputChange,
}: InterviewEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const {
    code,
    setCode,
    selectedLanguage,
    selectedScenario,
    isInterviewStarted,
    showFeedback,
    testResults,
    testSummary,
    efficiencyMetrics,
    isRunningTests,
    protectedElements,
    starterCode,
  } = useInterviewStore(
    useShallow((state) => ({
      code: state.code,
      setCode: state.setCode,
      selectedLanguage: state.selectedLanguage,
      selectedScenario: state.selectedScenario,
      isInterviewStarted: state.isInterviewStarted,
      showFeedback: state.showFeedback,
      testResults: state.testResults,
      testSummary: state.testSummary,
      efficiencyMetrics: state.efficiencyMetrics,
      isRunningTests: state.isRunningTests,
      protectedElements: state.protectedElements,
      starterCode: state.starterCode,
    }))
  )

  // Handle code change with protection validation
  const handleCodeChange = useCallback(
    (newCode: string) => {
      // Enforce code protection if enabled
      if (protectedElements && starterCode && isInterviewStarted && !showFeedback) {
        const validation = validateCodeProtection(newCode, protectedElements, selectedLanguage)

        if (!validation.valid) {
          toast.error(`Cannot remove required code: ${validation.errors[0]}`)
          return
        }
      }

      setCode(newCode)
    },
    [protectedElements, starterCode, isInterviewStarted, showFeedback, selectedLanguage, setCode]
  )

  // Get file extension based on language
  const getFileExtension = (lang: Language) => {
    const extensions: Record<Language, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      java: "java",
      cpp: "cpp",
      csharp: "cs",
      go: "go",
      rust: "rs",
    }
    return extensions[lang] || "txt"
  }

  return (
    <Card className="glass-effect flex h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50">
      <CardHeader className="flex-shrink-0 px-6 pb-2">
        <CardTitle className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center space-x-1">
            <Code className="h-3 w-3 text-[#c4703f]" />
            <span>
              {selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.
              {getFileExtension(selectedLanguage)}
            </span>
          </div>
          {isInterviewStarted && (
            <div className="flex items-center space-x-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-xs text-green-400">LIVE</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      {/* Code Editor */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
        <div
          ref={editorContainerRef}
          className="editor-wrapper min-h-0 flex-1 rounded border border-gray-700"
          style={{ minHeight: "250px" }}
        >
          <MonacoEditor
            height="100%"
            language={selectedLanguage}
            value={code}
            onChange={handleCodeChange}
            readOnly={!isInterviewStarted || showFeedback}
          />
        </div>

        {/* Terminal/Console Output */}
        {testResults.length > 0 && (
          <div className="flex max-h-48 min-h-[120px] flex-shrink-0 flex-col rounded border border-gray-700 bg-black">
            {/* Terminal Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700 bg-gray-800 px-3 py-1.5">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                </div>
                <span className="font-mono text-xs text-gray-400">Terminal</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  className={`${
                    testSummary.passRate === 100
                      ? "bg-green-600"
                      : testSummary.passRate >= 60
                        ? "bg-yellow-600"
                        : "bg-red-600"
                  } h-5 text-xs`}
                >
                  {testSummary.passed}/{testSummary.total} passed
                </Badge>
                {efficiencyMetrics && (
                  <Badge
                    className={`${
                      efficiencyMetrics.efficiencyScore >= 80
                        ? "border-green-600 bg-green-600/20 text-green-400"
                        : efficiencyMetrics.efficiencyScore >= 60
                          ? "border-yellow-600 bg-yellow-600/20 text-yellow-400"
                          : "border-red-600 bg-red-600/20 text-red-400"
                    } h-5 border text-xs`}
                  >
                    {efficiencyMetrics.efficiencyScore}% efficient
                  </Badge>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 space-y-1 overflow-y-auto p-2 font-mono text-xs">
              <div className="mb-2 text-gray-400">
                <span className="text-[#c4703f]">$</span> Running tests...
              </div>

              {/* Individual Test Results */}
              {testResults.map((result, index) => (
                <div key={index} className="mb-2">
                  <div
                    className={`flex items-center space-x-2 ${
                      result.passed ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {result.passed ? (
                      <CheckCircle className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="font-semibold">{result.description}</span>
                  </div>

                  {!result.passed && (
                    <div className="mt-1 ml-5 space-y-0.5 text-gray-300">
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500">Input:</span>
                        <span className="text-blue-300">{JSON.stringify(result.input)}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500">Expected:</span>
                        <span className="text-green-300">{JSON.stringify(result.expected)}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500">Got:</span>
                        <span className="text-red-300">{JSON.stringify(result.actual)}</span>
                      </div>
                      {result.error && (
                        <div className="mt-1 flex items-start space-x-2">
                          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
                          <span className="break-all text-red-300">{result.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Efficiency Metrics */}
              {efficiencyMetrics && (
                <div className="mt-2 space-y-1 border-t border-gray-800 pt-2">
                  <div className="text-gray-400">Complexity Analysis:</div>
                  <div className="ml-2 space-y-0.5 text-gray-300">
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span
                        className={`ml-2 ${
                          efficiencyMetrics.estimatedTimeComplexity ===
                          efficiencyMetrics.optimalTimeComplexity
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {efficiencyMetrics.estimatedTimeComplexity}
                      </span>
                      {efficiencyMetrics.optimalTimeComplexity !== "N/A" && (
                        <span className="ml-1 text-gray-500">
                          (optimal: {efficiencyMetrics.optimalTimeComplexity})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Space:</span>
                      <span
                        className={`ml-2 ${
                          efficiencyMetrics.estimatedSpaceComplexity ===
                          efficiencyMetrics.optimalSpaceComplexity
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {efficiencyMetrics.estimatedSpaceComplexity}
                      </span>
                      {efficiencyMetrics.optimalSpaceComplexity !== "N/A" && (
                        <span className="ml-1 text-gray-500">
                          (optimal: {efficiencyMetrics.optimalSpaceComplexity})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Code Quality:</span>
                      <span className="ml-2 text-gray-300">
                        {efficiencyMetrics.complexity} complexity, {efficiencyMetrics.linesOfCode}{" "}
                        LOC
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <Button
            onClick={onRunTests}
            disabled={showFeedback || isRunningTests}
            className="h-7 bg-green-600 text-xs text-white hover:bg-green-700"
            aria-label={isRunningTests ? "Running tests" : "Run tests"}
          >
            {!isRunningTests && <PlayCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
            {isRunningTests && (
              <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {isRunningTests ? "Running..." : "Run Tests"}
          </Button>
        </div>

        {/* AI Coding Partner */}
        <AIChatPartner
          onSendMessage={onSendPartnerMessage}
          isRecording={isRecordingPartner}
          onToggleRecording={onTogglePartnerRecording}
          inputValue={partnerInput}
          onInputChange={onPartnerInputChange}
        />
      </div>
    </Card>
  )
}

// Memoized export to prevent unnecessary re-renders
export const InterviewEditor = memo(InterviewEditorInner)
