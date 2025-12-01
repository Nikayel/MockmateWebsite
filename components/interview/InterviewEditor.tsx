"use client"

import { useRef, useEffect, useState } from "react"
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

export function InterviewEditor({
  onRunTests,
  onSendPartnerMessage,
  isRecordingPartner,
  onTogglePartnerRecording,
  partnerInput,
  onPartnerInputChange,
}: InterviewEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [editorHeight, setEditorHeight] = useState(400)

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
  } = useInterviewStore()

  // Measure editor container height
  useEffect(() => {
    if (!editorContainerRef.current) return

    const updateHeight = () => {
      if (editorContainerRef.current) {
        const height = editorContainerRef.current.clientHeight
        if (height > 0) {
          setEditorHeight(height)
        }
      }
    }

    let resizeObserver: ResizeObserver | null = null

    const rafId = requestAnimationFrame(() => {
      updateHeight()

      if (editorContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateHeight)
        })
        resizeObserver.observe(editorContainerRef.current)
      }
    })

    window.addEventListener("resize", updateHeight)

    return () => {
      cancelAnimationFrame(rafId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener("resize", updateHeight)
    }
  }, [isInterviewStarted, showFeedback, testResults.length])

  // Handle code change with protection validation
  const handleCodeChange = (newCode: string, event?: any) => {
    // Skip validation for programmatic changes
    if (event?.isFlush) {
      setCode(newCode)
      return
    }

    // Enforce code protection if enabled
    if (protectedElements && starterCode && isInterviewStarted && !showFeedback) {
      const validation = validateCodeProtection(newCode, protectedElements, selectedLanguage)

      if (!validation.valid) {
        toast.error(`Cannot remove required code: ${validation.errors[0]}`)
        return
      }
    }

    setCode(newCode)
  }

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
    <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0 px-6">
        <CardTitle className="text-white flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <Code className="h-3 w-3 text-[#00d9ff]" />
            <span>
              {selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.
              {getFileExtension(selectedLanguage)}
            </span>
          </div>
          {isInterviewStarted && (
            <div className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">LIVE</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      {/* Code Editor */}
      <div className="flex flex-col flex-1 min-h-0 gap-2 px-3 pb-3">
        <div
          ref={editorContainerRef}
          className="flex-1 min-h-0 rounded border border-gray-700 editor-wrapper"
        >
          <MonacoEditor
            uniqueKey={`editor-${selectedLanguage}-${selectedScenario?.id || "none"}`}
            height={editorHeight}
            language={selectedLanguage}
            value={code}
            onChange={handleCodeChange}
            readOnly={!isInterviewStarted || showFeedback}
            minimal
          />
        </div>

        {/* Terminal/Console Output */}
        {testResults.length > 0 && (
          <div className="flex-shrink-0 bg-black border border-gray-700 rounded flex flex-col max-h-48 min-h-[120px]">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-xs font-mono">Terminal</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge
                  className={`${
                    testSummary.passRate === 100
                      ? "bg-green-600"
                      : testSummary.passRate >= 60
                      ? "bg-yellow-600"
                      : "bg-red-600"
                  } text-xs h-5`}
                >
                  {testSummary.passed}/{testSummary.total} passed
                </Badge>
                {efficiencyMetrics && (
                  <Badge
                    className={`${
                      efficiencyMetrics.efficiencyScore >= 80
                        ? "bg-green-600/20 text-green-400 border-green-600"
                        : efficiencyMetrics.efficiencyScore >= 60
                        ? "bg-yellow-600/20 text-yellow-400 border-yellow-600"
                        : "bg-red-600/20 text-red-400 border-red-600"
                    } text-xs h-5 border`}
                  >
                    {efficiencyMetrics.efficiencyScore}% efficient
                  </Badge>
                )}
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              <div className="text-gray-400 mb-2">
                <span className="text-[#00d9ff]">$</span> Running tests...
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
                    <div className="ml-5 mt-1 space-y-0.5 text-gray-300">
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
                        <div className="flex items-start space-x-2 mt-1">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-400 mt-0.5" />
                          <span className="text-red-300 break-all">{result.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Efficiency Metrics */}
              {efficiencyMetrics && (
                <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
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
                        <span className="text-gray-500 ml-1">
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
                        <span className="text-gray-500 ml-1">
                          (optimal: {efficiencyMetrics.optimalSpaceComplexity})
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Code Quality:</span>
                      <span className="ml-2 text-gray-300">
                        {efficiencyMetrics.complexity} complexity, {efficiencyMetrics.linesOfCode} LOC
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <Button
            onClick={onRunTests}
            disabled={showFeedback || isRunningTests}
            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
            aria-label={isRunningTests ? "Running tests" : "Run tests"}
          >
            {!isRunningTests && <PlayCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
            {isRunningTests && (
              <div className="mr-1 h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
