import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { useInterviewChat } from "@/app/interview/_hooks/useInterviewChat"
import type { ChatMessage } from "@/app/interview/_types"
import type { Scenario } from "@/lib/scenarios"

const noop = () => {}
interface FixtureChatOptions {
  scenario: Scenario
  code: string
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  chatMessages: ChatMessage[]
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  interviewerInput: string
  setInterviewerInput: Dispatch<SetStateAction<string>>
  interviewerMessages: ChatMessage[]
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsLoadingInterviewer: (value: boolean) => void
  onOpenSparra: () => void
}

/** Real send hook + real workspace components. Only the API/identity are fixtures. */
export function useWorkspaceChatFixture(options: FixtureChatOptions) {
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [paused, setPaused] = useState(false)
  const generationRef = useRef(1)
  const chat = useInterviewChat({
    ...options,
    selectedScenario: options.scenario,
    currentSessionId: null,
    firebaseUser: { getIdToken: async () => "fixture-token" },
    user: null,
    usageLimit: null,
    experienceLevel: "beginner",
    targetCompany: null,
    showPostInterviewDiscussion: false,
    interviewStartTime: null,
    recentNudgeTopics: [],
    userAnsweredTopics: [],
    testResults: [],
    consoleLogs: [],
    chatWorkspaceContext: [],
    interviewerVoice: {
      isRecording: false,
      stopRecording: noop,
      resetTranscript: noop,
      clearSentTracker: noop,
    },
    setIsLoadingChat,
    setRecentNudgeTopics: noop,
    updateTrackerOnMessage: noop,
    getInterviewerChatParams: () => ({}),
    getEdgeCasesForInterviewer: () => [],
    getCachedUserProfile: async () => null,
    recordBugfixEvidence: noop,
    classifyBugfixAIHelpKind: () => "hypothesis-check",
    proceedToFinalFeedback: noop,
    generationRef,
    paused,
  })
  return {
    ...chat,
    isLoadingChat,
    pause: () => {
      generationRef.current++
      setPaused(true)
    },
  }
}
