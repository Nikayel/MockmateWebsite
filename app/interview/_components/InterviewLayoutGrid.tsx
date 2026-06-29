"use client"

import { useRef, type ComponentProps, type CSSProperties } from "react"
import { PanelLeftOpen, PanelRightOpen } from "lucide-react"
import { useWorkspaceRails } from "../_hooks/useWorkspaceRails"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    labWidth,
    intWidth,
    labCollapsed,
    intCollapsed,
    isDragging,
    startLabDrag,
    startIntDrag,
    toggleLab,
    toggleInt,
  } = useWorkspaceRails(containerRef)

  return (
    <div
      ref={containerRef}
      className={`relative grid min-h-0 flex-1 gap-1.5 overflow-hidden sm:gap-2 ${
        isDragging ? "transition-none select-none" : "transition-all duration-300"
      } ${
        focusMode
          ? "grid-cols-1" // Focus mode: editor only
          : "grid-cols-1 lg:[grid-template-columns:var(--w-lab)_minmax(0,1fr)_var(--w-int)]"
      }`}
      style={
        focusMode
          ? undefined
          : ({
              "--w-lab": labCollapsed ? "0px" : `${labWidth}px`,
              "--w-int": intCollapsed ? "0px" : `${intWidth}px`,
            } as CSSProperties)
      }
    >
      {/* Desktop-only resize handles — drag to give the code panel more room.
          The center editor column is 1fr, so it absorbs whatever the rails give
          up. Pointer-capture drag works for mouse + touch; widths persist.
          A collapsed rail hides its handle and shows a slim re-open tab. */}
      {!focusMode && (
        <>
          {!labCollapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize problem panel"
              onPointerDown={startLabDrag}
              className="group absolute inset-y-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none lg:block"
              style={{ left: "calc(var(--w-lab) + 0.25rem)" }}
            >
              <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-accent/40" />
            </div>
          )}
          {!intCollapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize interviewer panel"
              onPointerDown={startIntDrag}
              className="group absolute inset-y-0 z-20 hidden w-2 translate-x-1/2 cursor-col-resize touch-none lg:block"
              style={{ right: "calc(var(--w-int) + 0.25rem)" }}
            >
              <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-accent/40" />
            </div>
          )}
          {labCollapsed && (
            <button
              type="button"
              onClick={toggleLab}
              aria-label="Expand problem panel"
              title="Expand problem panel"
              className="bg-card/80 border-border text-muted-foreground hover:border-accent/50 hover:text-accent absolute top-3 left-0 z-20 hidden flex-col items-center gap-2 rounded-r-md border border-l-0 py-3 pr-1 pl-0.5 shadow-sm backdrop-blur transition-colors lg:flex"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-[10px] font-semibold tracking-widest [writing-mode:vertical-rl]">
                PROBLEM
              </span>
            </button>
          )}
          {intCollapsed && (
            <button
              type="button"
              onClick={toggleInt}
              aria-label="Expand interviewer panel"
              title="Expand interviewer panel"
              className="bg-card/80 border-border text-muted-foreground hover:border-accent/50 hover:text-accent absolute top-3 right-0 z-20 hidden flex-col items-center gap-2 rounded-l-md border border-r-0 py-3 pr-0.5 pl-1 shadow-sm backdrop-blur transition-colors lg:flex"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
              <span className="text-[10px] font-semibold tracking-widest [writing-mode:vertical-rl]">
                SABLE
              </span>
            </button>
          )}
        </>
      )}
      {focusMode && (
        <FocusProblemPeek
          scenario={selectedScenario}
          realInterviewMode={realInterviewMode}
          showProblemPeek={showProblemPeek}
          onShowProblemPeekChange={onShowProblemPeekChange}
        />
      )}
      <ProblemColumn ctx={problemCtx} collapsed={labCollapsed} onToggleCollapse={toggleLab} />

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
        collapsed={intCollapsed}
        onToggleCollapse={toggleInt}
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
