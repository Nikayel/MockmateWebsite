import { useEffect, useState } from "react"
import { useInterviewLifecycle } from "@/app/interview/_hooks/useInterviewLifecycle"
import { useInterviewAutosave } from "@/app/interview/_hooks/useInterviewAutosave"
import { useInterviewTimer } from "@/app/interview/_hooks/useInterviewTimer"
import { SessionPauseNotice } from "@/app/interview/_components/SessionPauseNotice"
import { createChatMessage } from "@/lib/interview/session-context/conversation"
import { recoverLocalCheckpoint } from "@/lib/interview/session-lifecycle/recovery"
import type { ChatMessage } from "@/app/interview/_types"
import type { Scenario } from "@/lib/scenarios"
import { Button } from "@/components/ui/button"
import { attemptChunkErrorRecovery } from "@/components/monitoring/chunk-reload"

const scenario = { id: "lifecycle-task", type: "bugfix", title: "Rollup" } as Scenario
const sessionId = "lifecycle-attempt"
const storageKey = "interview_autosave_guest_lifecycle-task"
const initialMessages = () =>
  Array.from({ length: 25 }, (_, index) =>
    createChatMessage(index % 2 ? "user" : "ai", `Original conversation ${index}`)
  ) as ChatMessage[]

export function SessionLifecycleFixture() {
  const [restored] = useState(() => recoverLocalCheckpoint(null, storageKey, sessionId))
  const [code, setCode] = useState(restored?.code ?? "original")
  const [partner, setPartner] = useState<ChatMessage[]>(
    (restored?.chatMessages as ChatMessage[]) ?? initialMessages
  )
  const [interviewer, setInterviewer] = useState<ChatMessage[]>(
    (restored?.interviewerMessages as ChatMessage[]) ?? initialMessages
  )
  const [partnerDraft, setPartnerDraft] = useState(restored?.chatInput ?? "")
  const [interviewerDraft, setInterviewerDraft] = useState(restored?.interviewerInput ?? "")
  const [paused, setPaused] = useState(false)
  const [gone, setGone] = useState(false)
  const timer = useInterviewTimer(!paused && !gone)
  useEffect(() => {
    timer.setElapsedTime(restored?.elapsedTime ?? 0)
    timer.setStartTime(Date.now() - (restored?.elapsedTime ?? 0) * 1000)
    if (restored) lifecycle.restoreSession(sessionId)
    // Cold-load hydration is intentionally one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const lifecycle = useInterviewLifecycle({
    enabled: !gone,
    sessionId,
    onPause: () => setPaused(true),
    onResume: () => {
      setPaused(false)
      timer.setStartTime(Date.now() - timer.elapsedTime * 1000)
    },
  })
  const { saveNow } = useInterviewAutosave({
    isInterviewStarted: !gone,
    selectedScenario: scenario,
    firebaseUser: null,
    isGuestMode: true,
    guestId: "guest-fixture",
    currentSessionId: sessionId,
    code,
    chatMessages: partner,
    interviewerMessages: interviewer,
    selectedLanguage: "python",
    elapsedTime: timer.elapsedTime,
    testResults: [],
    testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
    workspaceContext: [
      { path: "rollup.py", content: code, originalContent: "original", role: "editable" },
    ],
    activeWorkspacePath: "rollup.py",
    consoleLogs: [],
    bugfixEvidenceEvents: [],
    showPostInterviewDiscussion: false,
    realInterviewMode: false,
    strictTimeLimit: null,
    paused,
    interviewerInput: interviewerDraft,
    chatInput: partnerDraft,
  })
  useEffect(() => {
    if (paused) void saveNow()
  }, [paused, saveNow])
  useEffect(() => {
    const incoming = () =>
      setInterviewer((messages) => [
        ...messages,
        createChatMessage("ai", "Automatic reply") as ChatMessage,
      ])
    window.addEventListener("fixture-ai-reply", incoming)
    return () => window.removeEventListener("fixture-ai-reply", incoming)
  }, [])
  const exit = async () => {
    lifecycle.pauseForExit()
    await saveNow()
    setGone(true)
  }
  if (gone)
    return (
      <div className="p-8">
        <h1>Saved attempt</h1>
        <Button onClick={() => setGone(false)}>Reopen attempt</Button>
      </div>
    )
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1>Rollup debugging session</h1>
      <p>
        Attempt: {sessionId} · <output aria-label="Elapsed time">{timer.elapsedTime}</output>{" "}
        seconds
      </p>
      <label className="block">
        Code
        <textarea
          aria-label="Code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <label className="block">
        Sparra draft
        <input
          aria-label="Sparra draft"
          value={partnerDraft}
          onChange={(event) => setPartnerDraft(event.target.value)}
        />
      </label>
      <Button
        onClick={() => {
          setPartner((messages) => [
            ...messages,
            createChatMessage("user", partnerDraft) as ChatMessage,
          ])
          setPartnerDraft("")
        }}
      >
        Ask Sparra
      </Button>
      <label className="block">
        Sable draft
        <input
          aria-label="Sable draft"
          value={interviewerDraft}
          onChange={(event) => setInterviewerDraft(event.target.value)}
        />
      </label>
      <Button
        onClick={() => {
          setInterviewer((messages) => [
            ...messages,
            createChatMessage("user", interviewerDraft) as ChatMessage,
          ])
          setInterviewerDraft("")
        }}
      >
        Tell Sable
      </Button>
      <p>
        Sparra messages: {partner.length}; Sable messages: {interviewer.length}
      </p>
      <Button onClick={exit}>Save and exit</Button>
      <Button
        onClick={() => attemptChunkErrorRecovery("ChunkLoadError: Loading chunk old-build failed.")}
      >
        Simulate missing deployment chunk
      </Button>
      <SessionPauseNotice
        paused={lifecycle.paused}
        warning={lifecycle.warning}
        onResume={lifecycle.resume}
        onExit={exit}
      />
    </div>
  )
}
