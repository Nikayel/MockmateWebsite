import { sessionFetch } from "@/lib/interview/session-fetch"
import type { SessionContext } from "@/lib/interview/session-context/schema"
import { useEffect, useRef } from "react"
import { getWorkspacePrimaryCode } from "@/lib/workspace-execution/files"
import { isWorkspaceScenario } from "@/lib/workspace-execution/validators"
import type { Dispatch, SetStateAction } from "react"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { extractTopicsFromMessage } from "@/lib/interview"
import type { Scenario } from "@/lib/scenarios"
import type { ChatMessage, WorkspaceContextFile } from "../_types"
import { shouldTriggerSilenceNudge } from "./proactive-silence"
import { getProactiveBlockReason } from "@/lib/interview/conversation-pacing"

/** Minimal structural shape of the cached profile read into the proactive payload. */
interface ProactiveUserProfile {
  subscription_tier?: string
}

export interface UseInterviewProactiveAIOptions {
  sessionContext?: SessionContext
  // ---- gates (read by silence effect + trigger guard) ----
  currentSessionId: string | null
  ownerId: string
  activityRef: { current: number }
  generationRef: { current: number }
  chatMessages: ChatMessage[]
  chatInput: string
  isInterviewStarted: boolean
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  isLoadingInterviewer: boolean

  // ---- live inputs read by the silence effect / WithContext body ----
  interviewerMessages: ChatMessage[]
  /** Unsent text in the interviewer composer. A nudge must not interrupt a half-typed reply. */
  interviewerInput: string
  elapsedTime: number
  code: string
  chatWorkspaceContext: WorkspaceContextFile[]
  selectedScenario: Scenario | null
  targetCompany: string | null
  recentNudgeTopics: string[]
  userAnsweredTopics: string[]
  testResults: unknown[]
  consoleLogs: unknown[]
  experienceLevel: string
  usageLimit: { used?: number } | null
  user: { email?: string } | null

  // ---- state setters (page owns the widely-shared state) ----
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsLoadingInterviewer: (v: boolean) => void
  setRecentNudgeTopics: Dispatch<SetStateAction<string[]>>

  // ---- injected cross-cutting effects (other slices / page helpers) ----
  updateTrackerOnMessage: (message: string, role: "user" | "interviewer") => void
  getInterviewerChatParams: () => Record<string, unknown>
  getEdgeCasesForInterviewer: () => { description: string; input: unknown }[]
  getCachedUserProfile: () => Promise<ProactiveUserProfile | null>
}

export interface UseInterviewProactiveAIResult {
  /** Silence-timer teardown + flag reset, called by the page's resetInterview. */
  resetProactiveState: () => void
}

export function useInterviewProactiveAI(
  options: UseInterviewProactiveAIOptions
): UseInterviewProactiveAIResult {
  const latest = useRef(options)
  latest.current = options
  const abortRef = useRef<AbortController | null>(null)
  const nudgedActivityRef = useRef(0)
  const attemptsRef = useRef(0)
  useEffect(() => {
    attemptsRef.current = 0
    nudgedActivityRef.current = 0
  }, [options.currentSessionId])

  const resetProactiveState = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") resetProactiveState()
    }
    document.addEventListener("visibilitychange", stopWhenHidden)
    const check = async () => {
      const opts = latest.current
      if (
        !opts.isInterviewStarted ||
        opts.showFeedback ||
        opts.showPostInterviewDiscussion ||
        opts.isLoadingInterviewer ||
        document.visibilityState === "hidden" ||
        !opts.currentSessionId ||
        abortRef.current ||
        attemptsRef.current >= 3 ||
        getProactiveBlockReason(opts.interviewerMessages) !== null ||
        nudgedActivityRef.current === opts.activityRef.current
      )
        return
      const lastHuman = opts.interviewerMessages.filter((message) => message.type === "user").at(-1)
      const silence = lastHuman?.timestamp
        ? (Date.now() - lastHuman.timestamp) / 1000
        : opts.elapsedTime
      const inactive = (Date.now() - opts.activityRef.current) / 1000
      if (
        inactive >= 600 ||
        !shouldTriggerSilenceNudge({
          hasEverMessaged: !!lastHuman,
          timeSilentSec: silence,
          secondsSinceActivity: inactive,
          isComposing: !!(opts.interviewerInput.trim() || opts.chatInput.trim()),
        })
      )
        return
      // One attempt per period of human inactivity, with an attempt-wide server budget too.
      nudgedActivityRef.current = opts.activityRef.current
      attemptsRef.current++
      const controller = new AbortController()
      abortRef.current = controller
      const generation = opts.generationRef.current
      opts.setIsLoadingInterviewer(true)
      try {
        const token = await getCurrentUserToken()
        if (controller.signal.aborted) return
        const response = await sessionFetch("/api/chat", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message:
              "Offer one brief, grounded check-in. Do not infer disengagement or penalize silence.",
            sessionContext: opts.sessionContext,
            context: opts.interviewerMessages,
            role: "interviewer",
            isProactive: true,
            sessionId: opts.currentSessionId,
            ownerId: opts.ownerId,
            workspaceContext: opts.chatWorkspaceContext,
            currentCode:
              opts.selectedScenario && isWorkspaceScenario(opts.selectedScenario)
                ? getWorkspacePrimaryCode(opts.selectedScenario, opts.chatWorkspaceContext)
                : opts.code,
            scenarioId: opts.selectedScenario?.id,
            scenarioTitle: opts.selectedScenario?.title,
            scenarioType: opts.selectedScenario?.type,
            scenarioCompany: opts.targetCompany,
            elapsedTime: opts.elapsedTime,
            recentNudgeTopics: opts.recentNudgeTopics,
            userAnsweredTopics: opts.userAnsweredTopics,
            testResults: opts.testResults,
            consoleLogs: opts.consoleLogs,
            ...opts.getInterviewerChatParams(),
            timeSinceLastMessage: Math.floor(silence),
          }),
        })
        if (!response.ok) return
        const data = await response.json()
        if (
          controller.signal.aborted ||
          opts.generationRef.current !== generation ||
          !latest.current.isInterviewStarted ||
          latest.current.showFeedback ||
          latest.current.showPostInterviewDiscussion
        )
          return
        if (typeof data.reply === "string" && data.reply) {
          opts.setInterviewerMessages((previous) => [
            ...previous,
            { id: crypto.randomUUID(), timestamp: Date.now(), type: "ai", message: data.reply },
          ])
          opts.updateTrackerOnMessage(data.reply, "interviewer")
          const topics = extractTopicsFromMessage(data.reply)
          opts.setRecentNudgeTopics((previous) => [...previous, ...topics].slice(-10))
        }
      } catch (error) {
        if (!controller.signal.aborted) console.warn("Proactive check-in unavailable", error)
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        opts.setIsLoadingInterviewer(false)
      }
    }
    const timer = setInterval(() => {
      void check()
    }, 30000)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", stopWhenHidden)
      resetProactiveState()
    }
  }, [])
  useEffect(() => {
    if (!options.isInterviewStarted) resetProactiveState()
  }, [options.isInterviewStarted])
  return { resetProactiveState }
}
