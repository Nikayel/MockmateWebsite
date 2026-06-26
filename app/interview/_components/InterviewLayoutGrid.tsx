"use client"

import type { ComponentProps } from "react"
import { FocusProblemPeek } from "./FocusProblemPeek"
import { ProblemColumn, type ProblemColumnCtx } from "./ProblemColumn"
import { EditorColumn } from "./EditorColumn"
import { ChatColumn } from "./ChatColumn"
import { BugfixOnboardingTour } from "./BugfixOnboardingTour"

type FocusProblemPeekProps = ComponentProps<typeof FocusProblemPeek>
type EditorColumnProps = ComponentProps<typeof EditorColumn>
type ChatColumnProps = ComponentProps<typeof ChatColumn>
type BugfixOnboardingTourProps = ComponentProps<typeof BugfixOnboardingTour>

interface InterviewLayoutGridProps {
  focusMode: boolean
  // FocusProblemPeek
  selectedScenario: FocusProblemPeekProps["scenario"]
  realInterviewMode: FocusProblemPeekProps["realInterviewMode"]
  showProblemPeek: FocusProblemPeekProps["showProblemPeek"]
  onShowProblemPeekChange: FocusProblemPeekProps["onShowProblemPeekChange"]
  // ProblemColumn
  problemCtx: ProblemColumnCtx
  // EditorColumn
  activePanel: EditorColumnProps["activePanel"]
  activeWorkspaceFile: EditorColumnProps["activeWorkspaceFile"]
  selectedLanguage: EditorColumnProps["selectedLanguage"]
  editorLanguage: EditorColumnProps["editorLanguage"]
  code: EditorColumnProps["code"]
  onCodeChange: EditorColumnProps["onCodeChange"]
  isInterviewStarted: EditorColumnProps["isInterviewStarted"]
  showScenarioBrowser: EditorColumnProps["showScenarioBrowser"]
  showFeedback: EditorColumnProps["showFeedback"]
  showPostInterviewDiscussion: EditorColumnProps["showPostInterviewDiscussion"]
  isActiveWorkspaceFileEditable: EditorColumnProps["isActiveWorkspaceFileEditable"]
  onStartInterview: EditorColumnProps["onStartInterview"]
  editorConsoleOutputs: EditorColumnProps["editorConsoleOutputs"]
  testResults: EditorColumnProps["testResults"]
  testSummary: EditorColumnProps["testSummary"]
  isRunningTests: EditorColumnProps["isRunningTests"]
  onClearConsole: EditorColumnProps["onClearConsole"]
  onSubmitSystemDesign: EditorColumnProps["onSubmitSystemDesign"]
  onRunCode: EditorColumnProps["onRunCode"]
  onSubmitCode: EditorColumnProps["onSubmitCode"]
  onSelectedLanguageChange: EditorColumnProps["onSelectedLanguageChange"]
  onResetActiveFile: EditorColumnProps["onResetActiveFile"]
  onResetWorkspace: EditorColumnProps["onResetWorkspace"]
  isAIPartnerExpanded: EditorColumnProps["isAIPartnerExpanded"]
  onAIPartnerExpandedChange: EditorColumnProps["onAIPartnerExpandedChange"]
  chatMessages: EditorColumnProps["chatMessages"]
  chatEndRef: EditorColumnProps["chatEndRef"]
  chatInput: EditorColumnProps["chatInput"]
  onChatInputChange: EditorColumnProps["onChatInputChange"]
  isLoadingChat: EditorColumnProps["isLoadingChat"]
  onSendPartnerMessage: EditorColumnProps["onSendPartnerMessage"]
  workspaceContext: EditorColumnProps["workspaceContext"]
  onEditorFileSelect: EditorColumnProps["onFileSelect"]
  // ChatColumn
  interviewerMessages: ChatColumnProps["interviewerMessages"]
  isLoadingInterviewer: ChatColumnProps["isLoadingInterviewer"]
  isGeneratingDiscussion: ChatColumnProps["isGeneratingDiscussion"]
  interviewerEndRef: ChatColumnProps["interviewerEndRef"]
  isRecordingInterviewer: ChatColumnProps["isRecordingInterviewer"]
  onToggleInterviewerRecording: ChatColumnProps["onToggleRecording"]
  onCancelInterviewerRecording: ChatColumnProps["onCancelRecording"]
  onCancelInterviewerCountdown: ChatColumnProps["onCancelCountdown"]
  onSendInterviewerMessage: ChatColumnProps["onSendMessage"]
  countdownActive: ChatColumnProps["countdownActive"]
  interviewerInput: ChatColumnProps["interviewerInput"]
  onInterviewerInputChange: ChatColumnProps["onInterviewerInputChange"]
  // BugfixOnboardingTour
  bugfixTourEnabled: BugfixOnboardingTourProps["enabled"]
  bugfixHypothesis: BugfixOnboardingTourProps["hypothesis"]
  bugfixScenarioId: BugfixOnboardingTourProps["scenarioId"]
  testResultsCount: BugfixOnboardingTourProps["testResultsCount"]
  userId: BugfixOnboardingTourProps["userId"]
  userProfile: BugfixOnboardingTourProps["userProfile"]
  onActivePanelChange: BugfixOnboardingTourProps["onActivePanelChange"]
}

/**
 * The active interview workspace grid (Problem | Editor | Chat) plus focus-mode
 * peek and the bugfix onboarding tour. Pure presentational layout — all state,
 * handlers, and the render guard live in the page.
 */
export function InterviewLayoutGrid({
  focusMode,
  selectedScenario,
  realInterviewMode,
  showProblemPeek,
  onShowProblemPeekChange,
  problemCtx,
  activePanel,
  activeWorkspaceFile,
  selectedLanguage,
  editorLanguage,
  code,
  onCodeChange,
  isInterviewStarted,
  showScenarioBrowser,
  showFeedback,
  showPostInterviewDiscussion,
  isActiveWorkspaceFileEditable,
  onStartInterview,
  editorConsoleOutputs,
  testResults,
  testSummary,
  isRunningTests,
  onClearConsole,
  onSubmitSystemDesign,
  onRunCode,
  onSubmitCode,
  onSelectedLanguageChange,
  onResetActiveFile,
  onResetWorkspace,
  isAIPartnerExpanded,
  onAIPartnerExpandedChange,
  chatMessages,
  chatEndRef,
  chatInput,
  onChatInputChange,
  isLoadingChat,
  onSendPartnerMessage,
  workspaceContext,
  onEditorFileSelect,
  interviewerMessages,
  isLoadingInterviewer,
  isGeneratingDiscussion,
  interviewerEndRef,
  isRecordingInterviewer,
  onToggleInterviewerRecording,
  onCancelInterviewerRecording,
  onCancelInterviewerCountdown,
  onSendInterviewerMessage,
  countdownActive,
  interviewerInput,
  onInterviewerInputChange,
  bugfixTourEnabled,
  bugfixHypothesis,
  bugfixScenarioId,
  testResultsCount,
  userId,
  userProfile,
  onActivePanelChange,
}: InterviewLayoutGridProps) {
  return (
    <div
      className={`relative grid min-h-0 flex-1 gap-1.5 overflow-hidden transition-all duration-300 sm:gap-2 ${
        focusMode
          ? "grid-cols-1" // Focus mode: editor only
          : "grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_240px] xl:grid-cols-[360px_minmax(0,1fr)_260px] 2xl:grid-cols-[400px_minmax(0,1fr)_280px]"
      }`}
    >
      {focusMode && (
        <FocusProblemPeek
          scenario={selectedScenario}
          realInterviewMode={realInterviewMode}
          showProblemPeek={showProblemPeek}
          onShowProblemPeekChange={onShowProblemPeekChange}
        />
      )}
      <ProblemColumn ctx={problemCtx} />

      <EditorColumn
        activePanel={activePanel}
        selectedScenario={selectedScenario}
        activeWorkspaceFile={activeWorkspaceFile}
        selectedLanguage={selectedLanguage}
        editorLanguage={editorLanguage}
        code={code}
        onCodeChange={onCodeChange}
        isInterviewStarted={isInterviewStarted}
        showScenarioBrowser={showScenarioBrowser}
        showFeedback={showFeedback}
        showPostInterviewDiscussion={showPostInterviewDiscussion}
        isActiveWorkspaceFileEditable={isActiveWorkspaceFileEditable}
        onStartInterview={onStartInterview}
        editorConsoleOutputs={editorConsoleOutputs}
        testResults={testResults}
        testSummary={testSummary}
        isRunningTests={isRunningTests}
        onClearConsole={onClearConsole}
        onSubmitSystemDesign={onSubmitSystemDesign}
        onRunCode={onRunCode}
        onSubmitCode={onSubmitCode}
        onSelectedLanguageChange={onSelectedLanguageChange}
        onResetActiveFile={onResetActiveFile}
        onResetWorkspace={onResetWorkspace}
        isAIPartnerExpanded={isAIPartnerExpanded}
        onAIPartnerExpandedChange={onAIPartnerExpandedChange}
        chatMessages={chatMessages}
        chatEndRef={chatEndRef}
        chatInput={chatInput}
        onChatInputChange={onChatInputChange}
        isLoadingChat={isLoadingChat}
        onSendPartnerMessage={onSendPartnerMessage}
        workspaceContext={workspaceContext}
        onFileSelect={onEditorFileSelect}
      />

      <ChatColumn
        focusMode={focusMode}
        activePanel={activePanel}
        interviewerMessages={interviewerMessages}
        isLoadingInterviewer={isLoadingInterviewer}
        isGeneratingDiscussion={isGeneratingDiscussion}
        interviewerEndRef={interviewerEndRef}
        isInterviewStarted={isInterviewStarted}
        showPostInterviewDiscussion={showPostInterviewDiscussion}
        isRecordingInterviewer={isRecordingInterviewer}
        onToggleRecording={onToggleInterviewerRecording}
        onCancelRecording={onCancelInterviewerRecording}
        onCancelCountdown={onCancelInterviewerCountdown}
        onSendMessage={onSendInterviewerMessage}
        countdownActive={countdownActive}
        interviewerInput={interviewerInput}
        onInterviewerInputChange={onInterviewerInputChange}
      />
      <BugfixOnboardingTour
        activePanel={activePanel}
        enabled={bugfixTourEnabled}
        hypothesis={bugfixHypothesis}
        isAIPartnerExpanded={isAIPartnerExpanded}
        onAIPartnerExpandedChange={onAIPartnerExpandedChange}
        onActivePanelChange={onActivePanelChange}
        scenarioId={bugfixScenarioId}
        testResultsCount={testResultsCount}
        userId={userId}
        userProfile={userProfile}
      />
    </div>
  )
}
