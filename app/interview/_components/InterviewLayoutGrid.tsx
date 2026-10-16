"use client"

import { useRef, type ComponentProps, type CSSProperties } from "react"
import dynamic from "next/dynamic"
import { PanelLeftOpen, PanelRightOpen } from "lucide-react"
import { useWorkspaceRails } from "../_hooks/useWorkspaceRails"
import { isWorkspaceScenario } from "../_utils/workspace"
import { FocusProblemPeek } from "./FocusProblemPeek"
import { ProblemColumn, type ProblemColumnCtx } from "./ProblemColumn"
import { EditorColumn } from "./EditorColumn"
import { ChatColumn } from "./ChatColumn"
import { SparraPartnerWidget } from "./SparraPartnerWidget"
import type { BugfixOnboardingTour } from "./BugfixOnboardingTour"

/**
 * The bugfix onboarding tour pulls in framer-motion (a ~271KB chunk) but only
 * ever renders for bugfix scenarios once the interview has started. Load it
 * lazily (client-only) and gate the render on `bugfixTourEnabled` so that chunk
 * never enters the initial /interview bundle for other scenario types.
 */
const BugfixOnboardingTourLazy = dynamic(
  () => import("./BugfixOnboardingTour").then((mod) => mod.BugfixOnboardingTour),
  { ssr: false }
)

type FocusProblemPeekProps = ComponentProps<typeof FocusProblemPeek>
type EditorColumnProps = ComponentProps<typeof EditorColumn>
type PartnerProps = ComponentProps<typeof SparraPartnerWidget>
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
  packRun: EditorColumnProps["packRun"]
  isRunningTests: EditorColumnProps["isRunningTests"]
  onClearConsole: EditorColumnProps["onClearConsole"]
  onSubmitSystemDesign: EditorColumnProps["onSubmitSystemDesign"]
  onRunCode: EditorColumnProps["onRunCode"]
  onSubmitCode: EditorColumnProps["onSubmitCode"]
  onSelectedLanguageChange: EditorColumnProps["onSelectedLanguageChange"]
  onResetActiveFile: EditorColumnProps["onResetActiveFile"]
  onResetWorkspace: EditorColumnProps["onResetWorkspace"]
  isAIPartnerExpanded: PartnerProps["expanded"]
  onAIPartnerExpandedChange: PartnerProps["onExpandedChange"]
  chatMessages: PartnerProps["messages"]
  chatEndRef: PartnerProps["messagesEndRef"]
  chatInput: PartnerProps["input"]
  onChatInputChange: PartnerProps["onInputChange"]
  isLoadingChat: PartnerProps["isLoading"]
  onSendPartnerMessage: PartnerProps["onSendMessage"]
  workspaceContext: EditorColumnProps["workspaceContext"]
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
  voiceUnavailable?: ChatColumnProps["voiceUnavailable"]
  interviewerInput: ChatColumnProps["interviewerInput"]
  onInterviewerInputChange: ChatColumnProps["onInterviewerInputChange"]
  // BugfixOnboardingTour
  bugfixTourEnabled: BugfixOnboardingTourProps["enabled"]
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
  packRun,
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
  voiceUnavailable = null,
  interviewerInput,
  onInterviewerInputChange,
  bugfixTourEnabled,
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
  const hasPartner = Boolean(selectedScenario && selectedScenario.type !== "dsa")
  // Multi-file tasks still need navigation in focus mode; only the interviewer rail disappears.
  const focusHasExplorer =
    focusMode && isWorkspaceScenario(selectedScenario) && Boolean(workspaceContext?.length)
  const partnerExpanded = hasPartner && isAIPartnerExpanded && !focusMode
  // Opening Sparra reveals the rail without overwriting the user's saved width/collapse choice.
  const leftCollapsed = labCollapsed && !partnerExpanded && !focusHasExplorer

  return (
    <div
      ref={containerRef}
      className={`relative grid min-h-0 flex-1 gap-1.5 overflow-hidden sm:gap-2 ${
        isDragging ? "transition-none select-none" : "transition-all duration-300"
      } ${
        focusMode
          ? focusHasExplorer
            ? "grid-cols-1 lg:[grid-template-columns:var(--w-lab)_minmax(0,1fr)]"
            : "grid-cols-1"
          : "grid-cols-1 lg:[grid-template-columns:var(--w-lab)_minmax(0,1fr)_var(--w-int)]"
      }`}
      style={
        focusMode && !focusHasExplorer
          ? undefined
          : ({
              "--w-lab": leftCollapsed ? "0px" : `${labWidth}px`,
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
          {!leftCollapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize problem panel"
              onPointerDown={startLabDrag}
              className="group absolute inset-y-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none lg:block"
              style={{ left: "calc(var(--w-lab) + 0.25rem)" }}
            >
              <div className="group-hover:bg-accent/40 mx-auto h-full w-px bg-transparent transition-colors" />
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
              <div className="group-hover:bg-accent/40 mx-auto h-full w-px bg-transparent transition-colors" />
            </div>
          )}
          {leftCollapsed && (
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
      <aside
        aria-label="Problem and partner"
        className={`order-1 min-h-0 min-w-0 flex-col gap-2 overflow-hidden ${focusMode && !focusHasExplorer ? "hidden" : `${activePanel === "problem" ? "flex" : "hidden lg:flex"} ${leftCollapsed ? "lg:invisible" : ""}`}`}
      >
        <div className={`min-h-0 flex-1 ${partnerExpanded ? "hidden" : ""}`}>
          <ProblemColumn ctx={problemCtx} onToggleCollapse={focusMode ? undefined : toggleLab} />
        </div>
        {hasPartner && !focusMode && (
          <SparraPartnerWidget
            expanded={isAIPartnerExpanded}
            onExpandedChange={onAIPartnerExpandedChange}
            messages={chatMessages}
            messagesEndRef={chatEndRef}
            input={chatInput}
            onInputChange={onChatInputChange}
            isLoading={isLoadingChat}
            onSendMessage={onSendPartnerMessage}
            isDebuggingScenario={selectedScenario?.type === "bugfix"}
          />
        )}
      </aside>

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
        packRun={packRun}
        testSummary={testSummary}
        isRunningTests={isRunningTests}
        onClearConsole={onClearConsole}
        onSubmitSystemDesign={onSubmitSystemDesign}
        onRunCode={onRunCode}
        onSubmitCode={onSubmitCode}
        onSelectedLanguageChange={onSelectedLanguageChange}
        onResetActiveFile={onResetActiveFile}
        onResetWorkspace={onResetWorkspace}
        workspaceContext={workspaceContext}
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
        voiceUnavailable={voiceUnavailable}
        interviewerInput={interviewerInput}
        onInterviewerInputChange={onInterviewerInputChange}
        collapsed={intCollapsed}
        onToggleCollapse={toggleInt}
      />
      {bugfixTourEnabled && (
        <BugfixOnboardingTourLazy
          activePanel={activePanel}
          enabled={bugfixTourEnabled}
          isAIPartnerExpanded={isAIPartnerExpanded}
          onAIPartnerExpandedChange={onAIPartnerExpandedChange}
          onActivePanelChange={onActivePanelChange}
          scenarioId={bugfixScenarioId}
          testResultsCount={testResultsCount}
          userId={userId}
          userProfile={userProfile}
        />
      )}
    </div>
  )
}
