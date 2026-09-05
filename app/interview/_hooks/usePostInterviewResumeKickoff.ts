import { useEffect, useRef } from "react"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { ChatMessage, TestResult, TestSummary } from "../_types"

interface UsePostInterviewResumeKickoffOptions {
  searchParams: ReadonlyURLSearchParams | null
  hasUser: boolean
  currentSessionId: string | null
  showPostInterviewDiscussion: boolean
  interviewerMessages: ChatMessage[]
  testResults: TestResult[]
  testSummary: TestSummary
  triggerPostInterviewDiscussion: (
    testResults: TestResult[],
    summary: TestSummary
  ) => Promise<boolean>
}

const sessionMarker = (sessionId: string) => `post_interview_kickoff_${sessionId}`

/** Starts a redirected guest's debrief once the migrated session is hydrated. */
export function usePostInterviewResumeKickoff(opts: UsePostInterviewResumeKickoffOptions): void {
  const latestOptsRef = useRef(opts)
  latestOptsRef.current = opts
  const attemptedSessionRef = useRef<string | null>(null)
  const shouldStart = opts.searchParams?.get("startDebrief") === "true"
  const hasPersistedKickoff = opts.interviewerMessages.some(
    (message) => message.phase === "post_interview"
  )

  useEffect(() => {
    const sessionId = opts.currentSessionId
    if (!shouldStart || !opts.hasUser || !opts.showPostInterviewDiscussion || !sessionId) return
    if (attemptedSessionRef.current === sessionId) return

    if (hasPersistedKickoff || sessionStorage.getItem(sessionMarker(sessionId)) === "started") {
      attemptedSessionRef.current = sessionId
      return
    }

    attemptedSessionRef.current = sessionId
    const latest = latestOptsRef.current
    void latest
      .triggerPostInterviewDiscussion(latest.testResults, latest.testSummary)
      .then((started) => {
        if (started) sessionStorage.setItem(sessionMarker(sessionId), "started")
      })
  }, [
    hasPersistedKickoff,
    opts.currentSessionId,
    opts.hasUser,
    opts.showPostInterviewDiscussion,
    shouldStart,
  ])
}
