"use client"

import { type ComponentProps } from "react"
import nextDynamic from "next/dynamic"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { PostInterviewView, type PostInterviewViewProps } from "./PostInterviewView"
import { FeedbackLoadingState, type FeedbackLoadingStateProps } from "./FeedbackLoadingState"

const PracticeFeedback = nextDynamic(() => import("@/components/PracticeFeedback"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-muted-foreground text-sm">Loading feedback...</div>
    </div>
  ),
})

type PracticeFeedbackProps = ComponentProps<typeof PracticeFeedback>

interface InterviewFeedbackViewProps {
  showPostInterviewDiscussion: boolean
  isFeedbackLoading: boolean
  isFromRoadmap: boolean
  activeRoadmap: unknown
  onGoToDashboard: () => void
  onBackToRoadmap: () => void
  // PostInterviewView
  testSummary: PostInterviewViewProps["testSummary"]
  efficiencyMetrics: PostInterviewViewProps["efficiencyMetrics"]
  code: PostInterviewViewProps["code"]
  selectedLanguage: PostInterviewViewProps["selectedLanguage"]
  testResults: PostInterviewViewProps["testResults"]
  interviewerMessages: PostInterviewViewProps["interviewerMessages"]
  isLoadingInterviewer: PostInterviewViewProps["isLoadingInterviewer"]
  isGeneratingDiscussion: PostInterviewViewProps["isGeneratingDiscussion"]
  interviewerInput: PostInterviewViewProps["interviewerInput"]
  setInterviewerInput: PostInterviewViewProps["setInterviewerInput"]
  handleSendMessage: PostInterviewViewProps["handleSendMessage"]
  isRecordingInterviewer: PostInterviewViewProps["isRecordingInterviewer"]
  toggleVoiceRecording: PostInterviewViewProps["toggleVoiceRecording"]
  interviewerEndRef: PostInterviewViewProps["interviewerEndRef"]
  showCodeInDiscussion: PostInterviewViewProps["showCodeInDiscussion"]
  setShowCodeInDiscussion: PostInterviewViewProps["setShowCodeInDiscussion"]
  setShowPostInterviewDiscussion: PostInterviewViewProps["setShowPostInterviewDiscussion"]
  proceedToFinalFeedback: PostInterviewViewProps["proceedToFinalFeedback"]
  // FeedbackLoadingState
  feedbackStats: FeedbackLoadingStateProps["interviewStats"]
  streamingPhase: FeedbackLoadingStateProps["streamingPhase"]
  phaseMessage: FeedbackLoadingStateProps["phaseMessage"]
  // PracticeFeedback
  feedback: PracticeFeedbackProps["feedback"]
  performanceScore: PracticeFeedbackProps["performanceScore"]
  technicalScore: PracticeFeedbackProps["technicalScore"]
  scoreBreakdown: PracticeFeedbackProps["scoreBreakdown"]
  constitutionalAICritique: PracticeFeedbackProps["constitutionalAICritique"]
  structuredFeedback: PracticeFeedbackProps["structuredFeedback"]
  testsPassed: PracticeFeedbackProps["testsPassed"]
  testsTotal: PracticeFeedbackProps["testsTotal"]
  timeComplexity: PracticeFeedbackProps["timeComplexity"]
  spaceComplexity: PracticeFeedbackProps["spaceComplexity"]
  efficiencyScore: PracticeFeedbackProps["efficiencyScore"]
  elapsedTime: PracticeFeedbackProps["elapsedTime"]
  userId: PracticeFeedbackProps["userId"]
  problemType: PracticeFeedbackProps["problemType"]
  difficulty: PracticeFeedbackProps["difficulty"]
  problemTitle: PracticeFeedbackProps["problemTitle"]
  language: PracticeFeedbackProps["language"]
  onNewProblem: PracticeFeedbackProps["onNewProblem"]
  clarifyingQuestionsAssessment: PracticeFeedbackProps["clarifyingQuestionsAssessment"]
}

/**
 * Post-interview result surface: the discussion view, the feedback loading
 * state, or the final feedback report. All loading/branch conditions are
 * pre-computed in the page; this component only selects and renders.
 */
export function InterviewFeedbackView({
  showPostInterviewDiscussion,
  isFeedbackLoading,
  isFromRoadmap,
  activeRoadmap,
  onGoToDashboard,
  onBackToRoadmap,
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
  feedbackStats,
  streamingPhase,
  phaseMessage,
  feedback,
  performanceScore,
  technicalScore,
  scoreBreakdown,
  constitutionalAICritique,
  structuredFeedback,
  testsPassed,
  testsTotal,
  timeComplexity,
  spaceComplexity,
  efficiencyScore,
  elapsedTime,
  userId,
  problemType,
  difficulty,
  problemTitle,
  language,
  onNewProblem,
  clarifyingQuestionsAssessment,
}: InterviewFeedbackViewProps) {
  return showPostInterviewDiscussion ? (
    <PostInterviewView
      testSummary={testSummary}
      efficiencyMetrics={efficiencyMetrics}
      code={code}
      selectedLanguage={selectedLanguage}
      testResults={testResults}
      interviewerMessages={interviewerMessages}
      isLoadingInterviewer={isLoadingInterviewer}
      isGeneratingDiscussion={isGeneratingDiscussion}
      interviewerInput={interviewerInput}
      setInterviewerInput={setInterviewerInput}
      handleSendMessage={handleSendMessage}
      isRecordingInterviewer={isRecordingInterviewer}
      toggleVoiceRecording={toggleVoiceRecording}
      interviewerEndRef={interviewerEndRef}
      showCodeInDiscussion={showCodeInDiscussion}
      setShowCodeInDiscussion={setShowCodeInDiscussion}
      setShowPostInterviewDiscussion={setShowPostInterviewDiscussion}
      proceedToFinalFeedback={proceedToFinalFeedback}
      onClose={onGoToDashboard}
    />
  ) : isFeedbackLoading ? (
    <FeedbackLoadingState
      onGoToDashboard={onGoToDashboard}
      interviewStats={feedbackStats}
      // Pass streaming phase for better UX messaging
      streamingPhase={streamingPhase}
      phaseMessage={phaseMessage}
    />
  ) : (
    <>
      <ErrorBoundary>
        <PracticeFeedback
          feedback={feedback}
          performanceScore={performanceScore}
          technicalScore={technicalScore}
          scoreBreakdown={scoreBreakdown}
          constitutionalAICritique={constitutionalAICritique}
          structuredFeedback={structuredFeedback}
          testsPassed={testsPassed}
          testsTotal={testsTotal}
          timeComplexity={timeComplexity}
          spaceComplexity={spaceComplexity}
          efficiencyScore={efficiencyScore}
          elapsedTime={elapsedTime}
          userId={userId}
          problemType={problemType}
          difficulty={difficulty}
          problemTitle={problemTitle}
          code={code}
          language={language}
          onNewProblem={onNewProblem}
          onClose={onGoToDashboard}
          clarifyingQuestionsAssessment={clarifyingQuestionsAssessment}
        />
      </ErrorBoundary>
      {isFromRoadmap && activeRoadmap && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onBackToRoadmap}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roadmap
          </Button>
        </div>
      )}
    </>
  )
}
