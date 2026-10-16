import { useRef, useState } from "react"
import { InterviewLayoutGrid } from "@/app/interview/_components/InterviewLayoutGrid"
import { InterviewTopBar } from "@/app/interview/_components/InterviewTopBar"
import { genericCacheEvictionMutationScenario as scenario } from "@/lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"
import { toWorkspaceScenarioFiles } from "@/app/interview/_utils/workspace"
import type { EditorLanguage } from "@/app/interview/_types"
import type { PartnerChatMessage } from "@/app/interview/_components/SparraPartnerWidget"

const noop = () => {}
export function WorkspaceFixture({ onSubmit }: { onSubmit: () => void }) {
  const [activePanel, setActivePanel] = useState<"problem" | "editor" | "chat">("editor")
  const [expanded, setExpanded] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [language, setLanguage] = useState<EditorLanguage>("python")
  const [files, setFiles] = useState(() => toWorkspaceScenarioFiles(scenario))
  const [path, setPath] = useState(files.find((file) => file.role === "editable")!.path)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<PartnerChatMessage[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const active = files.find((file) => file.path === path)!
  return (
    <>
      <InterviewTopBar
        selectedScenario={scenario}
        selectedLanguage={language}
        onLanguageChange={setLanguage}
        activePanel={activePanel}
        onActivePanelChange={setActivePanel}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        calmMode={false}
        onCalmModeChange={noop}
        isInterviewStarted
        hideTimer={false}
        onHideTimerChange={noop}
        strictTimeLimit={null}
        elapsedTime={900}
        onCloseClick={noop}
        onOpenSparra={() => {
          setFocusMode(false)
          setActivePanel("problem")
          setExpanded(true)
        }}
      />
      <InterviewLayoutGrid
        focusMode={focusMode}
        selectedScenario={scenario}
        realInterviewMode={false}
        showProblemPeek={false}
        onShowProblemPeekChange={noop}
        problemCtx={{
          activePanel,
          activeWorkspacePath: path,
          onWorkspaceFileSelect: (file) => {
            setPath(file.path)
            setActivePanel("editor")
          },
          elapsedTime: 900,
          fetchRAGHints: async () => {},
          fileInputRef: fileRef,
          focusMode,
          handleFileUpload: async () => {},
          hintAgent: { revealHint: noop },
          hintFeedback: new Map(),
          hintFetchStatus: "idle",
          hintsStale: false,
          isInterviewStarted: true,
          ragHints: [],
          realInterviewMode: false,
          revealedAIHintIndices: new Set(),
          revealedHintIndices: new Set(),
          revealedHints: 0,
          selectedScenario: scenario,
          setIsCodeViewerOpen: noop,
          setRevealedAIHintIndices: noop,
          setRevealedHintIndices: noop,
          setSelectedFile: noop,
          setShowOptimalApproach: noop,
          showOptimalApproach: false,
          submitHintFeedback: async () => {},
          workspaceContext: files,
        }}
        activePanel={activePanel}
        activeWorkspaceFile={active}
        selectedLanguage={language}
        editorLanguage="python"
        code={active.content}
        onCodeChange={(content) =>
          setFiles((previous) =>
            previous.map((file) => (file.path === path ? { ...file, content } : file))
          )
        }
        isInterviewStarted
        showScenarioBrowser={false}
        showFeedback={false}
        showPostInterviewDiscussion={false}
        isActiveWorkspaceFileEditable={active.role === "editable"}
        onStartInterview={noop}
        editorConsoleOutputs={[]}
        testResults={[]}
        testSummary={{ total: 12, passed: 8, failed: 4, passRate: 67 }}
        packRun={null}
        isRunningTests={false}
        onClearConsole={noop}
        onSubmitSystemDesign={onSubmit}
        onRunCode={noop}
        onSubmitCode={onSubmit}
        onSelectedLanguageChange={setLanguage}
        onResetActiveFile={noop}
        onResetWorkspace={noop}
        isAIPartnerExpanded={expanded}
        onAIPartnerExpandedChange={setExpanded}
        chatMessages={messages}
        chatEndRef={endRef}
        chatInput={input}
        onChatInputChange={setInput}
        isLoadingChat={false}
        onSendPartnerMessage={() => {
          setMessages((previous) => [
            ...previous,
            { type: "user", message: input },
            { type: "ai", message: "Which evidence would help you check that hypothesis?" },
          ])
          setInput("")
        }}
        workspaceContext={files}
        interviewerMessages={[
          {
            type: "ai",
            message: "Start by reproducing the failure and inspecting the relevant files.",
          },
        ]}
        isLoadingInterviewer={false}
        isGeneratingDiscussion={false}
        interviewerEndRef={endRef}
        isRecordingInterviewer={false}
        onToggleInterviewerRecording={noop}
        onCancelInterviewerRecording={noop}
        onCancelInterviewerCountdown={noop}
        onSendInterviewerMessage={noop}
        countdownActive={false}
        interviewerInput=""
        onInterviewerInputChange={noop}
        bugfixTourEnabled={false}
        bugfixScenarioId={scenario.id}
        testResultsCount={0}
        userId={undefined}
        userProfile={null}
        onActivePanelChange={setActivePanel}
      />
    </>
  )
}
