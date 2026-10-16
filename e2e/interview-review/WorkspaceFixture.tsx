import { useEffect, useRef, useState } from "react"
import { InterviewLayoutGrid } from "@/app/interview/_components/InterviewLayoutGrid"
import { InterviewTopBar } from "@/app/interview/_components/InterviewTopBar"
import { genericCacheEvictionMutationScenario as scenario } from "@/lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"
import { toWorkspaceScenarioFiles } from "@/app/interview/_utils/workspace"
import type { PackRunView } from "@/lib/workspace-execution"
import type { ChatMessage, EditorLanguage } from "@/app/interview/_types"
import type { PartnerChatMessage } from "@/app/interview/_components/SparraPartnerWidget"

const noop = () => {}
export function WorkspaceFixture({ onSubmit }: { onSubmit: () => void }) {
  const [activePanel, setActivePanel] = useState<"problem" | "editor" | "chat">("editor")
  const [expanded, setExpanded] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [packRun, setPackRun] = useState<PackRunView | null>(null)
  const [language, setLanguage] = useState<EditorLanguage>("python")
  const [files, setFiles] = useState(() => toWorkspaceScenarioFiles(scenario))
  const [path, setPath] = useState(files.find((file) => file.role === "editable")!.path)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<PartnerChatMessage[]>([])
  const [interviewerInput, setInterviewerInput] = useState("")
  const [replyPending, setReplyPending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([
    { type: "ai", message: "Start by reproducing the failure and inspecting the relevant files." },
    {
      type: "user",
      message:
        "The cleanup skips an entry after removing its neighbor. I'll check the loop boundary.",
    },
    {
      type: "ai",
      message:
        "Which regression case would show that? Explain the expected state before making the change.",
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    document.documentElement.classList.toggle("calm", calmMode)
    document.documentElement.classList.toggle("focus-mode-active", focusMode)
  }, [calmMode, focusMode])

  const run = () => {
    setIsRunning(true)
    window.setTimeout(() => {
      setPackRun({
        runCmd: "python3 fixtures/regression_checks.py fixtures/input.txt",
        ran: true,
        stdout:
          "=== Regression checks ===\ncheckpoint boundary: FAIL\nRegression checks: 8/12 passed\n",
        oraclePath: "tests/expected_output.txt",
        match: false,
        crashError: null,
      })
      setIsRunning(false)
    }, 150)
  }
  const active = files.find((file) => file.path === path)!
  const sendInterviewerMessage = () => {
    if (!interviewerInput.trim() || replyPending) return
    setInterviewerMessages((previous) => [...previous, { type: "user", message: interviewerInput }])
    setInterviewerInput("")
    setRecording(false)
    setReplyPending(true)
    window.setTimeout(() => {
      setInterviewerMessages((previous) => [
        ...previous,
        {
          id: "fixture-stream",
          type: "ai",
          message: "Compare the retained entries",
          isStreaming: true,
        },
      ])
    }, 800)
    window.setTimeout(() => {
      setInterviewerMessages((previous) =>
        previous.map((message) =>
          message.id === "fixture-stream"
            ? {
                ...message,
                id: undefined,
                message:
                  "Compare the retained entries at the exact checkpoint, then run the regression checks again.",
                isStreaming: false,
              }
            : message
        )
      )
      setReplyPending(false)
    }, 1400)
  }
  return (
    <>
      <InterviewLayoutGrid
        toolbar={
          <InterviewTopBar
            selectedScenario={scenario}
            selectedLanguage={language}
            onLanguageChange={setLanguage}
            focusMode={focusMode}
            onFocusModeChange={(enabled) => {
              if (enabled) setActivePanel("editor")
              setFocusMode(enabled)
            }}
            calmMode={calmMode}
            onCalmModeChange={setCalmMode}
            isInterviewStarted
            hideTimer={hideTimer}
            onHideTimerChange={setHideTimer}
            strictTimeLimit={null}
            elapsedTime={900}
            onCloseClick={noop}
            onOpenSparra={() => {
              setFocusMode(false)
              setActivePanel("problem")
              setExpanded(true)
            }}
          />
        }
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
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
        packRun={packRun}
        isRunningTests={isRunning}
        onClearConsole={() => setPackRun(null)}
        onSubmitSystemDesign={onSubmit}
        onRunCode={run}
        onSubmitCode={onSubmit}
        onSelectedLanguageChange={setLanguage}
        onResetActiveFile={() =>
          setFiles((current) =>
            current.map((file) =>
              file.path === path ? { ...file, content: file.originalContent ?? file.content } : file
            )
          )
        }
        onResetWorkspace={() => setFiles(toWorkspaceScenarioFiles(scenario))}
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
        interviewerMessages={interviewerMessages}
        isLoadingInterviewer={replyPending}
        isGeneratingDiscussion={false}
        interviewerEndRef={endRef}
        isRecordingInterviewer={recording}
        onToggleInterviewerRecording={() => {
          setRecording((current) => !current)
          if (!recording)
            setInterviewerInput("I traced the loop boundary and reproduced the skipped entry.")
        }}
        onCancelInterviewerRecording={() => {
          setRecording(false)
          setInterviewerInput("")
        }}
        onCancelInterviewerCountdown={noop}
        onSendInterviewerMessage={sendInterviewerMessage}
        countdownActive={false}
        interviewerInput={interviewerInput}
        onInterviewerInputChange={setInterviewerInput}
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
