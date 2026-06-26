"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Bug, CheckCircle, X } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { trackEvent } from "@/lib/analytics"
import type { Profile } from "@/lib/types"

const BUGFIX_TOUR_VERSION = "bugfix-tour-v1"
const BUGFIX_TOUR_STORAGE_KEY = "codesparring:bugfix-tour:v1"

type BugfixTourStatus = "completed" | "skipped"
type TourPanel = "problem" | "editor" | "chat"

interface StoredBugfixTourState {
  status: BugfixTourStatus
  updatedAt: string
  version: typeof BUGFIX_TOUR_VERSION
}

interface BugfixTourStep {
  id: "incident-report" | "workspace-files" | "hypothesis" | "run-tests" | "ai-partner"
  target: string
  panel: TourPanel
  title: string
  body: string
  action: string
}

const TOUR_STEPS: BugfixTourStep[] = [
  {
    id: "incident-report",
    target: "incident-report",
    panel: "problem",
    title: "Start with the incident",
    body: "Read the report like a production ticket. Look for symptoms, affected behavior, and what fixed should mean.",
    action: "Read the report, then go to the workspace files.",
  },
  {
    id: "workspace-files",
    target: "workspace-files",
    panel: "editor",
    title: "Inspect the codebase",
    body: "Bugfix scenarios include docs, source, helpers, and tests. Start with docs and visible tests before changing code.",
    action: "Open a docs or test file.",
  },
  {
    id: "hypothesis",
    target: "hypothesis",
    panel: "problem",
    title: "Write your hypothesis",
    body: "Before editing, write what you think is causing the bug. The AI interviewer can use this to ask better follow-ups.",
    action: "Type a short hypothesis and click Save hypothesis.",
  },
  {
    id: "run-tests",
    target: "run-tests",
    panel: "editor",
    title: "Reproduce and verify",
    body: "Run tests before and after your fix. Passing tests matter, but your investigation and explanation matter too.",
    action: "Click Run Tests to see the current failure.",
  },
  {
    id: "ai-partner",
    target: "ai-partner",
    panel: "editor",
    title: "Use AI like a debugging partner",
    body: "Ask for help interpreting files or test output. When your fix is verified, save root cause and prevention, then submit.",
    action: "Ask a debugging question or finish the tour.",
  },
]

function readStoredTourState(): StoredBugfixTourState | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(BUGFIX_TOUR_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredBugfixTourState>
    if (
      parsed.version === BUGFIX_TOUR_VERSION &&
      (parsed.status === "completed" || parsed.status === "skipped") &&
      typeof parsed.updatedAt === "string"
    ) {
      return parsed as StoredBugfixTourState
    }
  } catch {
    return null
  }

  return null
}

function writeStoredTourState(status: BugfixTourStatus) {
  if (typeof window === "undefined") return

  const nextState: StoredBugfixTourState = {
    status,
    updatedAt: new Date().toISOString(),
    version: BUGFIX_TOUR_VERSION,
  }

  window.localStorage.setItem(BUGFIX_TOUR_STORAGE_KEY, JSON.stringify(nextState))
}

function profileHasCurrentTourState(profile: Profile | null | undefined) {
  return (
    profile?.bugfix_tour_version === BUGFIX_TOUR_VERSION &&
    (profile.bugfix_tour_completed || profile.bugfix_tour_skipped)
  )
}

function getTargetRect(target: string): DOMRect | null {
  const element = document.querySelector<HTMLElement>(`[data-bugfix-tour="${target}"]`)
  if (!element) return null

  element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" })
  return element.getBoundingClientRect()
}

function useBugfixTourState({
  enabled,
  userId,
  userProfile,
  scenarioId,
}: {
  enabled: boolean
  userId?: string
  userProfile?: Profile | null
  scenarioId?: string
}) {
  const [hasLocalDecision, setHasLocalDecision] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const [isReplaying, setIsReplaying] = useState(false)
  const didShowWelcomeRef = useRef(false)

  useEffect(() => {
    setHasLocalDecision(Boolean(readStoredTourState()))
  }, [])

  useEffect(() => {
    if (enabled) return
    setShowWelcome(false)
    setIsTourActive(false)
    setIsReplaying(false)
  }, [enabled])

  useEffect(() => {
    if (!enabled || isTourActive || isReplaying || didShowWelcomeRef.current) return
    if (hasLocalDecision || profileHasCurrentTourState(userProfile)) return

    didShowWelcomeRef.current = true
    setShowWelcome(true)
    trackEvent("bugfix_tour_welcome_shown", {
      scenario_id: scenarioId,
      version: BUGFIX_TOUR_VERSION,
    })
  }, [enabled, hasLocalDecision, isReplaying, isTourActive, scenarioId, userProfile])

  const persistDecision = useCallback(
    async (status: BugfixTourStatus, source: "welcome" | "coachmark" | "finish") => {
      writeStoredTourState(status)
      setHasLocalDecision(true)

      if (!userId) return

      const now = new Date().toISOString()
      const updateData: Record<string, string | boolean> = {
        bugfix_tour_completed: status === "completed",
        bugfix_tour_skipped: status === "skipped",
        bugfix_tour_version: BUGFIX_TOUR_VERSION,
        updated_at: now,
      }

      if (status === "completed") {
        updateData.bugfix_tour_completed_at = now
      } else {
        updateData.bugfix_tour_skipped_at = now
      }

      try {
        await setDoc(doc(db, "profiles", userId), updateData, { merge: true })
      } catch (error) {
        trackEvent("bugfix_tour_persistence_failed", {
          status,
          source,
          scenario_id: scenarioId,
          reason: error instanceof Error ? error.message : "unknown",
        })
      }
    },
    [scenarioId, userId]
  )

  const startTour = useCallback(
    (source: "welcome" | "replay") => {
      setShowWelcome(false)
      setIsTourActive(true)
      setIsReplaying(source === "replay")
      trackEvent(source === "replay" ? "bugfix_tour_replayed" : "bugfix_tour_started", {
        scenario_id: scenarioId,
        version: BUGFIX_TOUR_VERSION,
      })
    },
    [scenarioId]
  )

  const skipTour = useCallback(
    async (source: "welcome" | "coachmark", stepId?: string) => {
      setShowWelcome(false)
      setIsTourActive(false)
      setIsReplaying(false)
      trackEvent("bugfix_tour_skipped", {
        scenario_id: scenarioId,
        step_id: stepId,
        source,
        version: BUGFIX_TOUR_VERSION,
      })
      await persistDecision("skipped", source)
    },
    [persistDecision, scenarioId]
  )

  const completeTour = useCallback(async () => {
    setShowWelcome(false)
    setIsTourActive(false)
    setIsReplaying(false)
    trackEvent("bugfix_tour_completed", {
      scenario_id: scenarioId,
      version: BUGFIX_TOUR_VERSION,
    })
    await persistDecision("completed", "finish")
  }, [persistDecision, scenarioId])

  const replayTour = useCallback(() => {
    startTour("replay")
  }, [startTour])

  return {
    completeTour,
    isTourActive,
    replayTour,
    showWelcome,
    skipTour,
    startTour,
  }
}

interface BugfixOnboardingTourProps {
  activePanel: TourPanel
  enabled: boolean
  hypothesis: string
  isAIPartnerExpanded: boolean
  onAIPartnerExpandedChange: (expanded: boolean) => void
  onActivePanelChange: (panel: TourPanel) => void
  scenarioId?: string
  testResultsCount: number
  userId?: string
  userProfile?: Profile | null
}

export function BugfixOnboardingTour({
  activePanel,
  enabled,
  hypothesis,
  isAIPartnerExpanded,
  onAIPartnerExpandedChange,
  onActivePanelChange,
  scenarioId,
  testResultsCount,
  userId,
  userProfile,
}: BugfixOnboardingTourProps) {
  const reduceMotion = useReducedMotion()
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const startButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastTestResultsCountRef = useRef(testResultsCount)
  const activeScenarioIdRef = useRef(scenarioId)

  const { completeTour, isTourActive, replayTour, showWelcome, skipTour, startTour } =
    useBugfixTourState({
      enabled,
      userId,
      userProfile,
      scenarioId,
    })

  const step = TOUR_STEPS[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === TOUR_STEPS.length - 1
  const hypothesisReady = hypothesis.trim().length > 0
  const canContinue = step.id !== "hypothesis" || hypothesisReady

  const handleNext = useCallback(
    (actionType: "button" | "keyboard" | "run-tests") => {
      if (!canContinue) return

      trackEvent("bugfix_tour_step_completed", {
        scenario_id: scenarioId,
        step_id: step.id,
        action_type: actionType,
      })

      if (isLastStep) {
        void completeTour()
      } else {
        setStepIndex((current) => current + 1)
      }
    },
    [canContinue, completeTour, isLastStep, scenarioId, step.id]
  )

  const handleBack = useCallback(() => {
    if (isFirstStep) return
    setStepIndex((current) => current - 1)
  }, [isFirstStep])

  useEffect(() => {
    if (activeScenarioIdRef.current !== scenarioId) {
      activeScenarioIdRef.current = scenarioId
      setStepIndex(0)
      setTargetRect(null)
    }
  }, [scenarioId])

  useEffect(() => {
    if (enabled) return
    setStepIndex(0)
    setTargetRect(null)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const handleReplay = () => {
      setStepIndex(0)
      replayTour()
    }

    window.addEventListener("codesparring:bugfix-tour-replay", handleReplay)
    return () => window.removeEventListener("codesparring:bugfix-tour-replay", handleReplay)
  }, [enabled, replayTour])

  useEffect(() => {
    if (!showWelcome) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    window.setTimeout(() => startButtonRef.current?.focus(), 0)
  }, [showWelcome])

  useEffect(() => {
    if (!isTourActive) {
      previousFocusRef.current?.focus?.()
      return
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)
  }, [isTourActive])

  useEffect(() => {
    if (!isTourActive) return

    onActivePanelChange(step.panel)
    if (step.id === "ai-partner" && !isAIPartnerExpanded) {
      onAIPartnerExpandedChange(true)
    }
  }, [
    isAIPartnerExpanded,
    isTourActive,
    onAIPartnerExpandedChange,
    onActivePanelChange,
    step.id,
    step.panel,
  ])

  useEffect(() => {
    if (!isTourActive) return

    let cancelled = false
    const updateTarget = () => {
      if (cancelled) return
      const nextRect = getTargetRect(step.target)

      if (!nextRect) {
        trackEvent("bugfix_tour_target_missing", {
          scenario_id: scenarioId,
          step_id: step.id,
          viewport: window.innerWidth < 1024 ? "mobile" : "desktop",
        })
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex((current) => current + 1)
        }
        return
      }

      setTargetRect(nextRect)
      trackEvent("bugfix_tour_step_viewed", {
        scenario_id: scenarioId,
        step_id: step.id,
        step_index: stepIndex + 1,
        version: BUGFIX_TOUR_VERSION,
      })
    }

    const timeoutId = window.setTimeout(updateTarget, 180)
    window.addEventListener("resize", updateTarget)
    window.addEventListener("scroll", updateTarget, true)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      window.removeEventListener("resize", updateTarget)
      window.removeEventListener("scroll", updateTarget, true)
    }
  }, [isTourActive, scenarioId, step.id, step.target, stepIndex])

  useEffect(() => {
    if (!isTourActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void skipTour("coachmark", step.id)
      }
      if (event.key === "ArrowRight" && canContinue) {
        handleNext("keyboard")
      }
      if (event.key === "ArrowLeft" && !isFirstStep) {
        handleBack()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canContinue, handleBack, handleNext, isFirstStep, isTourActive, skipTour, step.id])

  useEffect(() => {
    if (!isTourActive) {
      lastTestResultsCountRef.current = testResultsCount
      return
    }

    if (step.id === "run-tests" && testResultsCount > lastTestResultsCountRef.current) {
      handleNext("run-tests")
    }

    lastTestResultsCountRef.current = testResultsCount
  }, [handleNext, isTourActive, step.id, testResultsCount])

  useEffect(() => {
    if (!isTourActive || activePanel === step.panel) return
    setTargetRect(null)
  }, [activePanel, isTourActive, step.panel])

  const handleWelcomeStart = () => {
    setStepIndex(0)
    startTour("welcome")
  }

  const welcomeModal = (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          exit={reduceMotion ? undefined : { opacity: 0 }}
          initial={reduceMotion ? undefined : { opacity: 0 }}
          role="dialog"
          animate={reduceMotion ? undefined : { opacity: 1 }}
        >
          <motion.div
            aria-describedby="bugfix-tour-welcome-description"
            aria-labelledby="bugfix-tour-welcome-title"
            className="w-full max-w-md rounded-lg border border-cyan-400/25 bg-background p-5 shadow-2xl shadow-cyan-950/40"
            exit={reduceMotion ? undefined : { scale: 0.98, y: 12 }}
            initial={reduceMotion ? undefined : { scale: 0.98, y: 12 }}
            animate={reduceMotion ? undefined : { scale: 1, y: 0 }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-400/15 text-cyan-200">
                <Bug className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="bugfix-tour-welcome-title" className="text-lg font-semibold text-foreground">
                  Debug real code, like the interview
                </h2>
                <p className="text-xs text-muted-foreground">Bugfix tour</p>
              </div>
            </div>
            <p
              id="bugfix-tour-welcome-description"
              className="mb-5 text-sm leading-relaxed text-muted-foreground"
            >
              Bugfix practice is different from DSA. You&apos;ll inspect files, form a hypothesis,
              run tests, make a minimal fix, and explain how to prevent the bug next time.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void skipTour("welcome")}
                className="text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </Button>
              <button
                ref={startButtonRef}
                type="button"
                onClick={handleWelcomeStart}
                className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-300 px-4 py-2 text-sm font-medium text-gray-950 transition-colors hover:bg-cyan-200 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-gray-950 focus:outline-none"
              >
                Start tour
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const coachMarkPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined") {
      return { left: 16, top: 96, width: "calc(100vw - 32px)" }
    }

    const isMobile = window.innerWidth < 768
    if (isMobile) {
      return {
        bottom: 16,
        left: 16,
        width: "calc(100vw - 32px)",
      }
    }

    const cardWidth = 360
    const gap = 16
    const fitsRight = targetRect.right + cardWidth + gap < window.innerWidth
    const fitsLeft = targetRect.left - cardWidth - gap > 0
    const left = fitsRight
      ? targetRect.right + gap
      : fitsLeft
        ? targetRect.left - cardWidth - gap
        : Math.max(16, Math.min(targetRect.left, window.innerWidth - cardWidth - 16))
    const top = Math.max(16, Math.min(targetRect.top, window.innerHeight - 260))

    return {
      left,
      top,
      width: cardWidth,
    }
  }, [targetRect])

  const spotlightStyle = targetRect
    ? {
        height: Math.max(56, targetRect.height + 12),
        left: Math.max(8, targetRect.left - 6),
        top: Math.max(8, targetRect.top - 6),
        width: Math.max(120, targetRect.width + 12),
      }
    : undefined

  return (
    <>
      <button
        type="button"
        className="sr-only"
        onClick={replayTour}
        aria-label="Replay bugfix tour"
        data-bugfix-tour-replay-trigger
      />
      {welcomeModal}
      <AnimatePresence>
        {isTourActive && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[100]"
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
          >
            <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
            {spotlightStyle && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none fixed rounded-lg border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_28px_rgba(103,232,249,0.45)]"
                style={spotlightStyle}
                layout={!reduceMotion}
              />
            )}
            <motion.div
              aria-describedby="bugfix-tour-step-description"
              aria-labelledby="bugfix-tour-step-title"
              aria-live="polite"
              className="pointer-events-auto fixed rounded-lg border border-cyan-300/30 bg-background p-4 text-foreground shadow-2xl shadow-black/50"
              role="dialog"
              style={coachMarkPosition}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-cyan-200">
                    Step {stepIndex + 1} of {TOUR_STEPS.length}
                  </p>
                  <h2 id="bugfix-tour-step-title" className="text-base font-semibold text-foreground">
                    {step.title}
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => void skipTour("coachmark", step.id)}
                  className="rounded p-1 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground focus:ring-2 focus:ring-cyan-300 focus:outline-none"
                  aria-label="Skip bugfix tour"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p
                id="bugfix-tour-step-description"
                className="mb-3 text-sm leading-relaxed text-muted-foreground"
              >
                {step.body}
              </p>
              <div className="mb-4 rounded-md border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                {step.id === "hypothesis" && hypothesisReady ? (
                  <span className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Hypothesis draft detected. You can continue.
                  </span>
                ) : (
                  step.action
                )}
              </div>
              <div className="mb-4 flex gap-1.5" aria-hidden="true">
                {TOUR_STEPS.map((tourStep, index) => (
                  <span
                    key={tourStep.id}
                    className={`h-1.5 flex-1 rounded-full ${
                      index <= stepIndex ? "bg-cyan-300" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isFirstStep}
                  onClick={handleBack}
                  className={`justify-self-start ${isFirstStep ? "invisible" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Back
                </Button>
                <span className="text-xs text-muted-foreground">
                  {stepIndex + 1} / {TOUR_STEPS.length}
                </span>
                <Button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => handleNext("button")}
                  className="justify-self-end bg-cyan-300 text-gray-950 hover:bg-cyan-200"
                >
                  {isLastStep ? "Finish" : "Next"}
                  {!isLastStep && <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
