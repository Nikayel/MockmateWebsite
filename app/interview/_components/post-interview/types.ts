import type { RefObject } from "react"

export interface ReviewMessage {
  id?: string
  type: "user" | "ai"
  message: string
  isStreaming?: boolean
}

export interface ReviewTestResult {
  description: string
  passed: boolean
  input: unknown
  expected: unknown
  actual: unknown
  error: string | null
}

export interface PostInterviewViewProps {
  testSummary: { total: number; passed: number; failed: number; passRate: number }
  efficiencyMetrics: {
    linesOfCode: number
    complexity: string
    estimatedTimeComplexity: string
    estimatedSpaceComplexity: string
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    efficiencyScore: number
  } | null
  code: string
  selectedLanguage: string
  testResults: ReviewTestResult[]
  interviewerMessages: ReviewMessage[]
  isLoadingInterviewer: boolean
  isGeneratingDiscussion: boolean
  interviewerInput: string
  setInterviewerInput: (input: string) => void
  handleSendMessage: (isInterviewer: boolean) => void
  isRecordingInterviewer: boolean
  interviewerMediaStream?: MediaStream | null
  toggleVoiceRecording: (isInterviewer: boolean) => void
  interviewerEndRef?: RefObject<HTMLDivElement | null>
  showCodeInDiscussion: boolean
  setShowCodeInDiscussion: (show: boolean) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  proceedToFinalFeedback: () => void
  isGeneratingFeedback: boolean
  onClose?: () => void
}
