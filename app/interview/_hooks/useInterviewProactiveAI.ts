import { useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { extractTopicsFromMessage } from "@/lib/interview"
import type { Scenario } from "@/lib/scenarios"
import type { ChatMessage } from "../_types"
import { shouldTriggerSilenceNudge } from "./proactive-silence"

/** Minimal structural shape of the cached profile read into the proactive payload. */
interface ProactiveUserProfile {
  subscription_tier?: string
}

export interface UseInterviewProactiveAIOptions {
  // ---- gates (read by silence effect + trigger guard) ----
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
  chatWorkspaceContext: unknown
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

/**
 * Owns the LIVE proactive-interviewer "silence detection": a 30s poll that, after
 * 120s of candidate silence, fires a context-aware `POST /api/chat` nudge
 * (isProactive: true). Lifted verbatim from `app/interview/page.tsx` (the silence
 * effect + triggerProactiveInterviewerWithContext + analyzeCodeForProactiveFeedback);
 * behavior — threshold, cooldown, gating, refs, and the request payload — is
 * preserved exactly. The widely-shared message/loading/topic state stays in the
 * page (injected setters); cross-cutting effects are injected as callbacks. The
 * separate inactivity path remains disabled and stays inline in the page.
 */
export function useInterviewProactiveAI(
  options: UseInterviewProactiveAIOptions
): UseInterviewProactiveAIResult {
  const {
    isInterviewStarted,
    showFeedback,
    showPostInterviewDiscussion,
    isLoadingInterviewer,
    interviewerMessages,
    interviewerInput,
    elapsedTime,
    code,
    chatWorkspaceContext,
    selectedScenario,
    targetCompany,
    recentNudgeTopics,
    userAnsweredTopics,
    testResults,
    consoleLogs,
    experienceLevel,
    usageLimit,
    user,
    setInterviewerMessages,
    setIsLoadingInterviewer,
    setRecentNudgeTopics,
    updateTrackerOnMessage,
    getInterviewerChatParams,
    getEdgeCasesForInterviewer,
    getCachedUserProfile,
  } = options

  // Silence-detection refs (lifted from the inline proactive refs).
  const lastInterviewerMessageRef = useRef<number>(Date.now())
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredSilenceRef = useRef<boolean>(false)
  /** The cooldown handle, so teardown can cancel it instead of leaving it to fire. */
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** Cancels an in-flight nudge when the interview ends underneath it. */
  const abortRef = useRef<AbortController | null>(null)

  // The gates as of the latest render. The trigger below reads them again after its await:
  // a nudge that was legitimate when it was sent can land after the candidate has submitted,
  // and it would be appended to a finished interview and persisted into the transcript that
  // feeds scoring.
  const liveGatesRef = useRef({ showFeedback, showPostInterviewDiscussion })
  liveGatesRef.current = { showFeedback, showPostInterviewDiscussion }

  // When the candidate last did something other than talk. Silence detection measured chat
  // only, so a candidate reading the brief or heads-down editing and running tests was told
  // at the two-minute mark that they had not communicated at all and that silence hurts
  // their collaboration score. Working quietly is not the same as being stuck.
  const lastActivityRef = useRef<number>(Date.now())
  useEffect(() => {
    lastActivityRef.current = Date.now()
  }, [code, testResults])

  // Analyze code for context-aware proactive feedback
  // IMPORTANT: This analysis is NEUTRAL - do not praise patterns until correctness is verified
  const analyzeCodeForProactiveFeedback = (code: string): string => {
    const analysis: string[] = []
    const observations: string[] = []

    // Detect patterns - use NEUTRAL language, NOT praise
    if (code.includes("for") && code.includes("for")) {
      observations.push("Candidate is using nested loops - ASK about time complexity implications")
    }

    if (code.match(/sort|\.sort\(/)) {
      observations.push("Candidate is using sorting - ASK about the complexity tradeoffs")
    }

    if (code.match(/Map|Set|HashMap|HashSet/)) {
      observations.push(
        "Candidate is using hash-based data structures - ASK if they understand the space tradeoff"
      )
    }

    if (code.match(/recursion|function.*\(.*\)\s*{[\s\S]*function\s*\(/)) {
      observations.push("Candidate is using recursion - ASK about base cases and stack limits")
    }

    if (code.length > 300 && !code.includes("//")) {
      observations.push("Code is getting lengthy without comments - ASK about code organization")
    }

    if (code.match(/if.*if.*if/)) {
      observations.push("Multiple nested conditionals detected - ASK about simplifying the logic")
    }

    if (code.match(/\/\/ TODO|\/\/ FIXME|\/\/ HACK/)) {
      observations.push("Candidate has TODO/FIXME comments - ASK about their plan to address these")
    }

    // Time-based context
    const minutesSpent = Math.floor(elapsedTime / 60)
    if (minutesSpent > 10 && code.length < 100) {
      observations.push(
        `Candidate has been working for ${minutesSpent} minutes but code is still minimal - might need guidance`
      )
    }

    // Build the context prompt for the interviewer
    if (observations.length > 0) {
      analysis.push(`[INTERVIEWER OBSERVATION - CODE ANALYSIS]
The candidate has written code. Here are observations for you to probe:

${observations.join("\n")}

CRITICAL RULES:
1. DO NOT praise the code until tests have been run and passed
2. Ask probing questions about their approach and design decisions
3. If they haven't run tests yet, suggest they test their solution
4. If they haven't explained their approach, ask them to walk you through it
5. Focus on understanding their thought process, NOT validating their code

Ask ONE focused question based on these observations.`)
    }

    return analysis.length > 0 ? analysis.join("\n") : ""
  }

  const triggerProactiveInterviewerWithContext = async (
    contextType: string,
    timeSilentSeconds?: number
  ) => {
    if (isLoadingInterviewer || showFeedback || showPostInterviewDiscussion) return

    setIsLoadingInterviewer(true)
    try {
      const userProfile = await getCachedUserProfile()
      const minutesSpent = Math.floor(elapsedTime / 60)

      // Build context-specific prompt
      let contextPrompt = ""
      switch (contextType) {
        case "inactivity_no_code":
          contextPrompt = `[INTERVIEWER INTERVENTION - CANDIDATE NOT STARTED]
The candidate has been in the interview for ${minutesSpent} minute(s) but hasn't written any meaningful code yet.

As a supportive but direct interviewer, you should:
1. Check in with them - ask if they understand the problem
2. Ask them to walk through their approach before coding
3. Offer to clarify any requirements
4. Remind them that thinking out loud helps you assess their problem-solving skills

Be encouraging but also note that time is passing. Keep it natural and conversational.`
          break

        case "inactivity_stuck":
          contextPrompt = `[INTERVIEWER INTERVENTION - CANDIDATE SEEMS STUCK]
The candidate started coding but seems stuck. They've been inactive for a while with minimal code written.

As a helpful interviewer, you should:
1. Ask what they're thinking about
2. Offer a gentle hint or ask a guiding question
3. Suggest breaking down the problem into smaller steps
4. Ask if they want to discuss their approach

Be supportive - getting stuck is normal. Help them move forward.`
          break

        case "inactivity_paused":
          contextPrompt = `[INTERVIEWER INTERVENTION - CODING PAUSED]
The candidate was making progress but has paused coding for a while.

As an observant interviewer, you should:
1. Ask about their current thinking
2. If they have substantial code, ask about time/space complexity
3. Ask about edge cases they're considering
4. Check if they're debugging mentally or need help

Keep the conversation flowing - interviews should be collaborative.`
          break

        case "silence_no_communication":
          contextPrompt = `[INTERVIEWER INTERVENTION - NO COMMUNICATION]
The candidate hasn't communicated with you at all during the interview (${minutesSpent}+ minutes).

This is a problem in real interviews. As a direct interviewer, you should:
1. Remind them that communication is crucial in technical interviews
2. Ask them to walk you through what they're doing
3. Explain that you want to understand their thought process, not just see code
4. Note that silence hurts their collaboration score

Be direct but professional - this is important feedback.`
          break

        case "silence_stopped":
          contextPrompt = `[INTERVIEWER INTERVENTION - STOPPED COMMUNICATING]
The candidate was communicating earlier but has gone silent.

As an engaged interviewer, you should:
1. Check in with them - ask what they're working on
2. Ask about any challenges they're facing
3. Probe their current thinking about the solution
4. Keep the dialogue going

Interviews are conversations, not just coding exercises.`
          break

        default:
          contextPrompt = analyzeCodeForProactiveFeedback(code)
      }

      abortRef.current?.abort()
      const abortController = new AbortController()
      abortRef.current = abortController

      const token = await getCurrentUserToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const response = await fetch("/api/chat", {
        method: "POST",
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          message: contextPrompt,
          context: interviewerMessages,
          role: "interviewer",
          userContext: userProfile
            ? {
                email: user?.email,
                subscription_tier: userProfile.subscription_tier,
                sessions_used: usageLimit?.used || 0,
                skill_level: experienceLevel,
              }
            : { skill_level: experienceLevel },
          workspaceContext: chatWorkspaceContext,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          scenarioCompany: targetCompany, // Target company for RAG context
          isProactive: true,
          elapsedTime: elapsedTime,
          edgeCases: getEdgeCasesForInterviewer(),
          // Pass recent topics to prevent repetitive questions
          recentNudgeTopics: recentNudgeTopics,
          // Pass topics the user has already answered to prevent re-asking
          userAnsweredTopics: userAnsweredTopics,
          // Pass test results and console logs for interviewer awareness
          testResults: testResults,
          consoleLogs: consoleLogs,
          // Phase-aware interview tracking
          ...getInterviewerChatParams(),
          timeSinceLastMessage: timeSilentSeconds,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn("[API] Request failed:", response.status, response.url, data)
        // Un-latch so the next poll can try again. The caller sets the latch before calling,
        // then starts a three-minute cooldown, so a nudge lost to a transient 429 used to
        // take the next three minutes of silence detection down with it. Deliberately no
        // toast: the candidate never asked for this message and does not need to know it
        // failed.
        hasTriggeredSilenceRef.current = false
        return
      }

      // The interview may have ended while this was in flight. Appending here would put a
      // question into a finished transcript, and that transcript is persisted and scored.
      const { showFeedback: ended, showPostInterviewDiscussion: wrappingUp } = liveGatesRef.current
      if (ended || wrappingUp) return

      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        // Update tracker with interviewer's message
        updateTrackerOnMessage(data.reply, "interviewer")
        // Track topics from this proactive message
        const newTopics = extractTopicsFromMessage(data.reply)
        if (newTopics.length > 0) {
          setRecentNudgeTopics((prev) => [...prev, ...newTopics].slice(-10))
        }
      }
    } catch (error) {
      // An abort is the interview ending underneath us, which is not a failure and must not
      // re-arm the latch.
      if ((error as Error)?.name === "AbortError") return
      console.error("Proactive interviewer error:", error)
      hasTriggeredSilenceRef.current = false
    } finally {
      setIsLoadingInterviewer(false)
    }
  }

  // Keep the latest values the 30s silence poll reads in a ref, updated each
  // render, so the interval effect below can key ONLY on the stable gate flags.
  // The interview clock ticks `elapsedTime` every second; the old effect listed
  // it (and `interviewerMessages`/`isLoadingInterviewer`) in its deps, so the 30s
  // interval was torn down and recreated every tick (the EDGE-1 bug). Same ref
  // pattern as useInterviewAutosave.
  const proactiveLatestRef = useRef({
    interviewerMessages,
    interviewerInput,
    elapsedTime,
    isLoadingInterviewer,
    triggerProactiveInterviewerWithContext,
  })
  proactiveLatestRef.current = {
    interviewerMessages,
    interviewerInput,
    elapsedTime,
    isLoadingInterviewer,
    triggerProactiveInterviewerWithContext,
  }

  // Reset the silence clock whenever the candidate sends a message. Keyed on the
  // message list only; it creates no interval, so a new message never tears down
  // the 30s poll below.
  useEffect(() => {
    const lastMsg = interviewerMessages[interviewerMessages.length - 1]
    if (lastMsg?.type === "user") {
      lastInterviewerMessageRef.current = Date.now()
      hasTriggeredSilenceRef.current = false
    }
  }, [interviewerMessages])

  // LIVE silence-detection poll (lifted from page.tsx). Keyed ONLY on the stable
  // gate flags; the frequently-changing values it reads come from
  // proactiveLatestRef.current, so the 1s interview clock no longer recreates the
  // 30s interval every tick. Threshold (120s), cooldown (3m), context selection,
  // and the trigger payload are preserved exactly.
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) {
      return () => {
        if (silenceTimerRef.current) {
          clearInterval(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      }
    }

    const COOLDOWN_MS = 3 * 60 * 1000

    const checkAndTrigger = () => {
      const {
        interviewerMessages: latestMessages,
        interviewerInput: latestInput,
        elapsedTime: latestElapsed,
        isLoadingInterviewer: latestLoading,
        triggerProactiveInterviewerWithContext: latestTrigger,
      } = proactiveLatestRef.current

      if (hasTriggeredSilenceRef.current || latestLoading) return

      const userMessages = latestMessages.filter((m) => m.type === "user")
      const hasEverMessaged = userMessages.length > 0

      let timeSilentSec: number
      if (hasEverMessaged) {
        timeSilentSec = (Date.now() - lastInterviewerMessageRef.current) / 1000
      } else {
        timeSilentSec = latestElapsed
      }

      const shouldSpeak = shouldTriggerSilenceNudge({
        hasEverMessaged,
        timeSilentSec,
        secondsSinceActivity: (Date.now() - lastActivityRef.current) / 1000,
        isComposing: latestInput.trim().length > 0,
      })
      if (!shouldSpeak) return

      hasTriggeredSilenceRef.current = true
      const contextType = hasEverMessaged ? "silence_stopped" : "silence_no_communication"
      latestTrigger(contextType, Math.floor(timeSilentSec))
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = setTimeout(() => {
        hasTriggeredSilenceRef.current = false
        cooldownTimerRef.current = null
      }, COOLDOWN_MS)
    }

    checkAndTrigger()
    silenceTimerRef.current = setInterval(checkAndTrigger, 30 * 1000)

    return () => {
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }
  }, [isInterviewStarted, showFeedback, showPostInterviewDiscussion])

  // Cleanup on unmount. The cooldown and the in-flight request need this as much as the
  // interval does: a bare setTimeout kept the latch alive past teardown, and a fetch with
  // nobody listening still resolves into setInterviewerMessages.
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const resetProactiveState = () => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    hasTriggeredSilenceRef.current = false
    lastInterviewerMessageRef.current = Date.now()
    lastActivityRef.current = Date.now()
  }

  return { resetProactiveState }
}
