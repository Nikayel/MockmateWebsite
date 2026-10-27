"use client"

import { type ComponentProps } from "react"
import nextDynamic from "next/dynamic"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import type { ProfilePersonalizationData } from "@/lib/onboarding/profile-personalization"
import type { Profile } from "@/lib/types"
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

const ProfilePersonalizationPrompt = nextDynamic(
  () =>
    import("@/components/onboarding/profile-personalization/ProfilePersonalizationPrompt").then(
      (module) => module.ProfilePersonalizationPrompt
    ),
  { ssr: false }
)

type PracticeFeedbackProps = ComponentProps<typeof PracticeFeedback>

interface InterviewFeedbackViewProps {
  isGuidedLab?: boolean
  guidedLabAssessment?: PracticeFeedbackProps["guidedLabAssessment"]
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
  interviewerMediaStream?: PostInterviewViewProps["interviewerMediaStream"]
  toggleVoiceRecording: PostInterviewViewProps["toggleVoiceRecording"]
  interviewerEndRef: PostInterviewViewProps["interviewerEndRef"]
  showCodeInDiscussion: PostInterviewViewProps["showCodeInDiscussion"]
  setShowCodeInDiscussion: PostInterviewViewProps["setShowCodeInDiscussion"]
  setShowPostInterviewDiscussion: PostInterviewViewProps["setShowPostInterviewDiscussion"]
  proceedToFinalFeedback: PostInterviewViewProps["proceedToFinalFeedback"]
  isGeneratingFeedback: PostInterviewViewProps["isGeneratingFeedback"]
  // FeedbackLoadingState
  feedbackStats: FeedbackLoadingStateProps["interviewStats"]
  phaseMessage: FeedbackLoadingStateProps["phaseMessage"]
  // Progress is computed in the page, above this view: the scoring wait outlives
  // any single mount of the loader, so its state cannot live inside it.
  scoringProgress: FeedbackLoadingStateProps["progress"]
  scoringStepIndex: FeedbackLoadingStateProps["stepIndex"]
  scoringCompletedThrough: FeedbackLoadingStateProps["completedThrough"]
  scoringElapsedMs: FeedbackLoadingStateProps["elapsedMs"]
  scoringStalled: FeedbackLoadingStateProps["stalled"]
  scoringRingTweenMs: FeedbackLoadingStateProps["ringTweenMs"]
  scoringRingEase: FeedbackLoadingStateProps["ringEase"]
  // PracticeFeedback
  feedbackQueued?: boolean
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
  sessionId?: PracticeFeedbackProps["sessionId"]
  problemType: PracticeFeedbackProps["problemType"]
  difficulty: PracticeFeedbackProps["difficulty"]
  problemTitle: PracticeFeedbackProps["problemTitle"]
  language: PracticeFeedbackProps["language"]
  onNewProblem: PracticeFeedbackProps["onNewProblem"]
  clarifyingQuestionsAssessment: PracticeFeedbackProps["clarifyingQuestionsAssessment"]
  showProfilePersonalization: boolean
  personalizationProfile: Profile | null
  onProfilePersonalizationCompleted: (data: ProfilePersonalizationData) => void
}

/**
 * Post-interview result surface: the discussion view, the feedback loading
 * state, or the final feedback report. All loading/branch conditions are
 * pre-computed in the page; this component only selects and renders.
 */
export function InterviewFeedbackView({
  isGuidedLab,
  guidedLabAssessment,
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
  interviewerMediaStream,
  toggleVoiceRecording,
  interviewerEndRef,
  showCodeInDiscussion,
  setShowCodeInDiscussion,
  setShowPostInterviewDiscussion,
  proceedToFinalFeedback,
  isGeneratingFeedback,
  feedbackStats,
  phaseMessage,
  scoringProgress,
  scoringStepIndex,
  scoringCompletedThrough,
  scoringElapsedMs,
  scoringStalled,
  scoringRingTweenMs,
  scoringRingEase,
  feedback,
  feedbackQueued = false,
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
  sessionId,
  problemType,
  difficulty,
  problemTitle,
  language,
  onNewProblem,
  clarifyingQuestionsAssessment,
  showProfilePersonalization,
  personalizationProfile,
  onProfilePersonalizationCompleted,
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
      interviewerMediaStream={interviewerMediaStream}
      toggleVoiceRecording={toggleVoiceRecording}
      interviewerEndRef={interviewerEndRef}
      showCodeInDiscussion={showCodeInDiscussion}
      setShowCodeInDiscussion={setShowCodeInDiscussion}
      setShowPostInterviewDiscussion={setShowPostInterviewDiscussion}
      proceedToFinalFeedback={proceedToFinalFeedback}
      isGeneratingFeedback={isGeneratingFeedback}
      onClose={onGoToDashboard}
    />
  ) : isFeedbackLoading ? (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <FeedbackLoadingState
        onGoToDashboard={onGoToDashboard}
        interviewStats={feedbackStats}
        phaseMessage={phaseMessage}
        progress={scoringProgress}
        stepIndex={scoringStepIndex}
        completedThrough={scoringCompletedThrough}
        elapsedMs={scoringElapsedMs}
        stalled={scoringStalled}
        ringTweenMs={scoringRingTweenMs}
        ringEase={scoringRingEase}
      />
    </div>
  ) : (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ErrorBoundary>
        <PracticeFeedback
          contained
          isGuidedLab={isGuidedLab}
          guidedLabAssessment={guidedLabAssessment}
          feedback={feedback}
          feedbackPending={feedbackQueued}
          sessionId={sessionId}
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
          afterScore={
            feedbackQueued ? (
              <div className="border-primary/20 bg-primary/5 rounded-xl border p-4" role="status">
                <p className="font-medium">
                  Your score is ready. Written feedback is taking longer.
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  We’ll retry it in the background. Check Sessions for the finished report.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={onGoToDashboard}>
                  Go to dashboard
                </Button>
              </div>
            ) : showProfilePersonalization && userId && !feedbackQueued ? (
              <ProfilePersonalizationPrompt
                userId={userId}
                source="feedback"
                profile={personalizationProfile}
                onCompleted={onProfilePersonalizationCompleted}
              />
            ) : undefined
          }
        />
      </ErrorBoundary>
      {isFromRoadmap && Boolean(activeRoadmap) && (
        <div className="flex shrink-0 justify-center py-2">
          <Button
            onClick={onBackToRoadmap}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roadmap
          </Button>
        </div>
      )}
    </div>
  )
}
