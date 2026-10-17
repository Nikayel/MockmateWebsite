import { useEffect, useRef, useState } from "react"
import { InterviewLayoutGrid } from "@/app/interview/_components/InterviewLayoutGrid"
import { InterviewTopBar } from "@/app/interview/_components/InterviewTopBar"
import { useEditorLanguageChange } from "@/app/interview/_hooks/useEditorLanguageChange"
import { genericCacheEvictionMutationScenario as workspaceScenario } from "@/lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation"
import { dsaTwoSumScenario } from "@/lib/scenarios/dsa/arrays-hashing/dsa-two-sum"
import { bugfixScenarios } from "@/lib/scenarios/real-world/bugfix/all"
import { addFunctionalityScenarios } from "@/lib/scenarios/add-functionality"
import { isWorkspaceScenario, toWorkspaceScenarioFiles } from "@/app/interview/_utils/workspace"
import { isLanguageSupported } from "@/app/interview/_utils/language"
import type { TestResult } from "@/components/interview/CodeConsole"
import type { PackRunView } from "@/lib/workspace-execution"
import type { ChatMessage, EditorLanguage } from "@/app/interview/_types"
import type { PartnerChatMessage } from "@/app/interview/_components/SparraPartnerWidget"
import { useVoiceInput } from "@/lib/voice"
import { voiceUnavailableCopy } from "@/lib/voice/voice-availability"

const noop = () => {}
export function WorkspaceFixture({ onSubmit }: { onSubmit: () => void }) {
  const params = new URLSearchParams(window.location.search)
  const isDsa = params.get("scenario") === "dsa"
  const started = params.get("started") !== "0"
  const scenario = isDsa
    ? dsaTwoSumScenario
    : ([...bugfixScenarios, ...addFunctionalityScenarios].find(
        (entry) => entry.id === params.get("scenario")
      ) ?? workspaceScenario)
  const [activePanel, setActivePanel] = useState<"problem" | "editor" | "chat">("editor")
  const [expanded, setExpanded] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [packRun, setPackRun] = useState<PackRunView | null>(null)
  const scenarioLanguage = isWorkspaceScenario(scenario)
    ? scenario.workspace.language
    : "javascript"
  const [language, setLanguage] = useState<EditorLanguage>(
    isLanguageSupported(scenarioLanguage) ? scenarioLanguage : "javascript"
  )
  const [testResults, setTestResults] = useState<TestResult[]>(
    params.get("results") === "1"
      ? [
          {
            description:
              "visible reconciliation lookup: does not explain an adjustment with a row that was already reconciled",
            input: "visible reconciliation lookup",
            passed: false,
            error: "Expected deep equality\nExpected: []\nReceived: [0,1]",
          },
          {
            description: "hidden reconciliation edges: protects the open-row contract",
            input: "hidden reconciliation edges",
            passed: false,
            isHidden: true,
            error: "private hidden assertion",
          },
        ]
      : []
  )
  const [singleFileCode, setSingleFileCode] = useState(
    dsaTwoSumScenario.starterCode.javascript ?? ""
  )
  const [files, setFiles] = useState(() =>
    toWorkspaceScenarioFiles(scenario).filter(
      (file) => params.get("saved") !== "1" || file.path !== "task.md"
    )
  )
  const [path, setPath] = useState(files.find((file) => file.role === "editable")?.path ?? "")
  const [documentPreviewPath, setDocumentPreviewPath] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<PartnerChatMessage[]>([])
  const [interviewerInput, setInterviewerInput] = useState("")
  const [replyPending, setReplyPending] = useState(false)
  const [simulatedRecording, setRecording] = useState(false)
  const realVoice = params.get("voice") === "1"
  const voice = useVoiceInput({
    apiKey: "fixture-only",
    autoSendEnabled: false,
    onTranscript: setInterviewerInput,
  })
  const recording = realVoice ? voice.isRecording : simulatedRecording
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
  const changeLanguage = useEditorLanguageChange(scenario, (next) => {
    setLanguage(next)
    if (isDsa) setSingleFileCode(dsaTwoSumScenario.starterCode[next] ?? "")
  })
  const sendInterviewerMessage = () => {
    if (!interviewerInput.trim() || replyPending) return
    setInterviewerMessages((previous) => [...previous, { type: "user", message: interviewerInput }])
    setInterviewerInput("")
    if (realVoice) {
      voice.stopRecording()
      voice.resetTranscript()
    }
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
            focusMode={focusMode}
            onFocusModeChange={(enabled) => {
              if (enabled) setActivePanel("editor")
              setFocusMode(enabled)
            }}
            calmMode={calmMode}
            onCalmModeChange={setCalmMode}
            isInterviewStarted={started}
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
          onWorkspaceFileSelect: (file, options) => {
            setPath(file.path)
            setDocumentPreviewPath(options?.readable ? file.path : null)
            if (options?.readable && file.role === "docs")
              setFiles((current) =>
                current.some((entry) => entry.path === file.path)
                  ? current
                  : [...current, { ...file, originalContent: file.content }]
              )
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
          isInterviewStarted: started,
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
        documentPreviewPath={documentPreviewPath}
        onDocumentPreviewChange={(preview) => setDocumentPreviewPath(preview ? path : null)}
        selectedLanguage={language}
        editorLanguage={language}
        code={active?.content ?? singleFileCode}
        onCodeChange={(content) => {
          if (isDsa) setSingleFileCode(content)
          else
            setFiles((previous) =>
              previous.map((file) => (file.path === path ? { ...file, content } : file))
            )
        }}
        isInterviewStarted={started}
        showScenarioBrowser={false}
        showFeedback={false}
        showPostInterviewDiscussion={false}
        isActiveWorkspaceFileEditable={isDsa || active?.role === "editable"}
        onStartInterview={noop}
        editorConsoleOutputs={[]}
        testResults={testResults}
        testSummary={
          testResults.length
            ? {
                total: testResults.length,
                passed: testResults.filter((result) => result.passed).length,
                failed: testResults.filter((result) => !result.passed).length,
                passRate: 0,
              }
            : { total: 12, passed: 8, failed: 4, passRate: 67 }
        }
        packRun={packRun}
        isRunningTests={isRunning}
        onClearConsole={() => {
          setPackRun(null)
          setTestResults([])
        }}
        onSubmitSystemDesign={onSubmit}
        onRunCode={run}
        onSubmitCode={onSubmit}
        onSelectedLanguageChange={changeLanguage}
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
        interviewerMediaStream={realVoice ? voice.mediaStream : null}
        voiceUnavailable={
          realVoice && voice.unavailableReason
            ? voiceUnavailableCopy(voice.unavailableReason)
            : null
        }
        onToggleInterviewerRecording={() => {
          if (realVoice) {
            void voice.toggleRecording().catch(() => {})
            return
          }
          setRecording((current) => !current)
          if (!recording)
            setInterviewerInput("I traced the loop boundary and reproduced the skipped entry.")
        }}
        onCancelInterviewerRecording={() => {
          if (realVoice) {
            voice.stopRecording()
            voice.resetTranscript()
          }
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
