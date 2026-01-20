"use client"

import { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Code,
  CheckCircle,
  Brain,
  User,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { FormattedText } from "@/components/ui/FormattedText"
import nextDynamic from "next/dynamic"

const VoiceModeToggle = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.VoiceModeToggle })),
  { ssr: false }
)

const CodeEditor = nextDynamic(
  () => import("@/components/editor").then((mod) => mod.CodeMirrorEditor),
  { ssr: false }
)

interface ChatMessage {
  type: "user" | "ai"
  message: string
}

interface TestResult {
  description: string
  passed: boolean
  input: unknown
  expected: unknown
  actual: unknown
  error: string | null
}

interface EfficiencyMetrics {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface PostInterviewViewProps {
  testSummary: TestSummary
  efficiencyMetrics: EfficiencyMetrics | null
  code: string
  selectedLanguage: string
  testResults: TestResult[]
  interviewerMessages: ChatMessage[]
  isLoadingInterviewer: boolean
  isGeneratingDiscussion: boolean
  interviewerInput: string
  setInterviewerInput: (input: string) => void
  handleSendMessage: (isInterviewer: boolean) => void
  isRecordingInterviewer: boolean
  toggleVoiceRecording: (isInterviewer: boolean) => void
  interviewerEndRef: RefObject<HTMLDivElement | null>
  showCodeInDiscussion: boolean
  setShowCodeInDiscussion: (show: boolean) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  proceedToFinalFeedback: () => void
}

export function PostInterviewView({
  testSummary,
  efficiencyMetrics,
  code,
  selectedLanguage,
  testResults,
  interviewerMessages,
  isLoadingInterviewer,
  isGeneratingDiscussion,
  interviewerInput,
  setInterviewerInput,
  handleSendMessage,
  isRecordingInterviewer,
  toggleVoiceRecording,
  interviewerEndRef,
  showCodeInDiscussion,
  setShowCodeInDiscussion,
  setShowPostInterviewDiscussion,
  proceedToFinalFeedback,
}: PostInterviewViewProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 text-center">
        <CheckCircle className="text-accent mx-auto mb-3 h-12 w-12" />
        <h2 className="font-heading mb-2 text-2xl font-bold text-white">Solution Complete!</h2>
        <p className="mb-4 text-gray-300">
          {testSummary.passRate === 100
            ? "All tests passed! Let's discuss your solution with the interviewer."
            : `${testSummary.passed}/${testSummary.total} tests passed. Let's discuss your solution.`}
        </p>
        {/* Continue Editing button - allows users to go back and fix their code */}
        {testSummary.passRate < 100 && (
          <Button
            onClick={() => setShowPostInterviewDiscussion(false)}
            variant="outline"
            className="border-accent text-accent hover:bg-accent/10 mb-4"
          >
            <Code className="mr-2 h-4 w-4" />
            Continue Editing
          </Button>
        )}
        {testSummary.total > 0 && (
          <div className="mb-4 flex items-center justify-center gap-4">
            <Badge className="bg-[#00d9ff] text-black">
              {testSummary.passed}/{testSummary.total} Tests Passed
            </Badge>
            {efficiencyMetrics && (
              <>
                <Badge
                  className={`${
                    efficiencyMetrics.efficiencyScore >= 80
                      ? "bg-[#00d9ff]"
                      : efficiencyMetrics.efficiencyScore >= 60
                        ? "bg-[#00d9ff]/70"
                        : "bg-gray-600"
                  } text-black`}
                >
                  Efficiency: {efficiencyMetrics.efficiencyScore}/100
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  Time: {efficiencyMetrics.estimatedTimeComplexity}
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  Space: {efficiencyMetrics.estimatedSpaceComplexity}
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Code Viewer */}
      <Card className="glass-effect mb-6 border-gray-700 bg-gray-900/50">
        <CardHeader
          className="cursor-pointer transition-colors hover:bg-gray-800/50"
          onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
        >
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Code className="text-accent h-5 w-5" />
              <span>Your Solution</span>
              <Badge variant="outline" className="border-gray-600 text-gray-400">
                {selectedLanguage}
              </Badge>
            </div>
            {showCodeInDiscussion ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </CardTitle>
        </CardHeader>
        {showCodeInDiscussion && (
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-gray-700">
              <CodeEditor height="400px" language={selectedLanguage} value={code} readOnly />
            </div>
            {testResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-white">Test Results:</h4>
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`rounded border p-2 ${
                      result.passed
                        ? "border-green-700 bg-green-900/20"
                        : "border-red-700 bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={result.passed ? "text-green-400" : "text-red-400"}>
                        {result.passed ? "✓" : "✗"} {result.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Interviewer Discussion Panel */}
      <Card className="glass-effect mb-6 border-gray-700 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <div className="relative">
              <Brain className="text-accent animate-neural-pulse h-5 w-5" />
              <div className="bg-accent absolute inset-0 rounded-full opacity-30 blur-md"></div>
            </div>
            <span className="from-accent to-neural bg-gradient-to-r bg-clip-text font-bold text-transparent">
              Post-Interview Discussion
            </span>
            {isGeneratingDiscussion && (
              <span className="ml-2 text-xs text-gray-400">(Analyzing your solution...)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-h-[500px] space-y-4 overflow-y-auto pr-2">
            {interviewerMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <div className="mb-1 flex items-center space-x-2">
                    {msg.type === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Brain className="text-accent animate-neural-pulse h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {msg.type === "user" ? "You" : "CodeSparring AI"}
                    </span>
                  </div>
                  <FormattedText className="text-sm leading-relaxed">{msg.message}</FormattedText>
                </div>
              </div>
            ))}
            {/* Thinking indicator for post-interview discussion */}
            {(isLoadingInterviewer || isGeneratingDiscussion) && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg border border-gray-700/50 bg-gray-800/50 p-3 text-gray-400">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 animate-pulse text-[#00d9ff]" />
                    <span className="text-sm">
                      {isGeneratingDiscussion
                        ? "Analyzing your solution..."
                        : "CodeSparring AI is thinking"}
                    </span>
                    <span className="flex space-x-0.5">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                        style={{ animationDelay: "300ms" }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={interviewerEndRef} />
          </div>

          {/* Chat Input with Simplified Voice Mode */}
          <div className="border-border flex flex-col gap-3 border-t pt-4">
            <VoiceModeToggle
              isRecording={isRecordingInterviewer}
              onToggleRecording={() => toggleVoiceRecording(true)}
              transcript={interviewerInput}
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
              compact={false}
            />
            {/* Text input for typing when not recording */}
            {!isRecordingInterviewer && (
              <div className="flex space-x-2">
                <Input
                  value={interviewerInput}
                  onChange={(e) => setInterviewerInput(e.target.value)}
                  placeholder="Type or use voice above..."
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground flex-1"
                  onKeyPress={(e) =>
                    e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)
                  }
                  disabled={isLoadingInterviewer || isGeneratingDiscussion}
                  aria-label="Chat with interviewer"
                />
                <Button
                  onClick={() => handleSendMessage(true)}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground"
                  disabled={
                    !interviewerInput.trim() || isLoadingInterviewer || isGeneratingDiscussion
                  }
                  aria-label="Send message"
                >
                  {!(isLoadingInterviewer || isGeneratingDiscussion) && (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Button
          onClick={proceedToFinalFeedback}
          className="bg-accent hover:bg-accent/80 text-accent-foreground px-6"
        >
          View Detailed Feedback
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
