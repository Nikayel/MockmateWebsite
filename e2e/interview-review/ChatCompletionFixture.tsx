import { useState } from "react"
import { PostInterviewView } from "@/app/interview/_components/PostInterviewView"
import type { ChatMessage } from "@/app/interview/_types"
import { genericSessionWindowCountScenario } from "@/lib/scenarios/real-world/bugfix/packs/generic-session-window-count"
import { useWorkspaceChatFixture } from "./useWorkspaceChatFixture"

const noop = () => {}

export function ChatCompletionFixture() {
  const [scoring, setScoring] = useState(false)
  const [interviewerInput, setInterviewerInput] = useState("")
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([
    { type: "ai", message: "What session count should a gap just over 1800 seconds produce?" },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)
  const chat = useWorkspaceChatFixture({
    scenario: genericSessionWindowCountScenario,
    code: "",
    chatInput,
    setChatInput,
    chatMessages,
    setChatMessages,
    interviewerInput,
    setInterviewerInput,
    interviewerMessages,
    setInterviewerMessages,
    setIsLoadingInterviewer,
    onOpenSparra: noop,
    showPostInterviewDiscussion: true,
    proceedToFinalFeedback: () => setScoring(true),
  })

  return scoring ? (
    <h1>Scoring your interview</h1>
  ) : (
    <div className="flex h-dvh flex-col">
      <PostInterviewView
        testSummary={{ passed: 1, failed: 0, total: 1, passRate: 100 }}
        efficiencyMetrics={null}
        code=""
        selectedLanguage="javascript"
        testResults={[]}
        interviewerMessages={interviewerMessages}
        isLoadingInterviewer={isLoadingInterviewer}
        isGeneratingDiscussion={false}
        interviewerInput={interviewerInput}
        setInterviewerInput={setInterviewerInput}
        handleSendMessage={chat.handleSendMessage}
        isRecordingInterviewer={false}
        toggleVoiceRecording={noop}
        showCodeInDiscussion={false}
        setShowCodeInDiscussion={noop}
        setShowPostInterviewDiscussion={noop}
        proceedToFinalFeedback={() => setScoring(true)}
        isGeneratingFeedback={false}
      />
    </div>
  )
}
