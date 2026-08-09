"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bug } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/firebase"
import { trackEvent } from "@/lib/analytics"
import type { Profile } from "@/lib/types"
import {
  BUGFIX_TOUR_VERSION,
  TOUR_STEPS,
  profileHasCurrentTourState,
  readStoredTourState,
  writeStoredTourState,
  type BugfixTourStatus,
  type TourPanel,
} from "@/app/interview/_utils/bugfix-tour-state"
import { BugfixTourStep } from "@/app/interview/_components/_sub/BugfixTourStep"

function getTargetRect(target: string): DOMRect | null {
  const element = document.querySelector<HTMLElement>(`[data-bugfix-tour="${target}"]`)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  // A hidden panel (a collapsed rail, or the inactive panel on a one-panel mobile layout)
  // still exists in the DOM but reports a 0x0 rect at the origin. Treat it as missing so the
  // tour advances past the step instead of spotlighting an empty corner of the screen.
  if (rect.width === 0 && rect.height === 0) return null

  element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" })
  return rect
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
    trackEvent("bugfix_tour_completed", { scenario_id: scenarioId, version: BUGFIX_TOUR_VERSION })
    await persistDecision("completed", "finish")
  }, [persistDecision, scenarioId])

  const replayTour = useCallback(() => {
    startTour("replay")
  }, [startTour])

  return { completeTour, isTourActive, replayTour, showWelcome, skipTour, startTour }
}

interface BugfixOnboardingTourProps {
  activePanel: TourPanel
  enabled: boolean
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
    useBugfixTourState({ enabled, userId, userProfile, scenarioId })

  const step = TOUR_STEPS[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === TOUR_STEPS.length - 1

  const handleNext = useCallback(
    (actionType: "button" | "keyboard" | "run-tests") => {
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
    [completeTour, isLastStep, scenarioId, step.id]
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
      if (event.key === "ArrowRight") {
        handleNext("keyboard")
      }
      if (event.key === "ArrowLeft" && !isFirstStep) {
        handleBack()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleBack, handleNext, isFirstStep, isTourActive, skipTour, step.id])

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

  const coachMarkPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined") {
      return { left: 16, top: 96, width: "calc(100vw - 32px)" }
    }

    const isMobile = window.innerWidth < 768
    if (isMobile) {
      return { bottom: 16, left: 16, width: "calc(100vw - 32px)" }
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

    return { left, top, width: cardWidth }
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
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="bg-background/80 fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-sm"
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-describedby="bugfix-tour-welcome-description"
              aria-labelledby="bugfix-tour-welcome-title"
              className="bg-background w-full max-w-md rounded-lg border border-cyan-400/25 p-5 shadow-2xl shadow-cyan-950/40"
              exit={reduceMotion ? undefined : { scale: 0.98, y: 12 }}
              initial={reduceMotion ? undefined : { scale: 0.98, y: 12 }}
              animate={reduceMotion ? undefined : { scale: 1, y: 0 }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="bg-accent/10 text-accent-strong flex h-10 w-10 items-center justify-center rounded-md">
                  <Bug className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="bugfix-tour-welcome-title"
                    className="text-foreground text-lg font-semibold"
                  >
                    Debug real code, like the interview
                  </h2>
                  <p className="text-muted-foreground text-xs">Bugfix tour</p>
                </div>
              </div>
              <p
                id="bugfix-tour-welcome-description"
                className="text-muted-foreground mb-5 text-sm leading-relaxed"
              >
                Bugfix practice is different from DSA. You&apos;ll inspect files, reproduce the
                failure, make a minimal fix, and talk your interviewer through what broke and why.
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
                  className="text-foreground focus:ring-offset-background inline-flex h-10 items-center justify-center rounded-md bg-cyan-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-cyan-200 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none"
                >
                  Start tour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isTourActive && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[100]"
            exit={reduceMotion ? undefined : { opacity: 0 }}
            initial={reduceMotion ? undefined : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
          >
            <div className="bg-background/55 absolute inset-0" aria-hidden="true" />
            {spotlightStyle && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none fixed rounded-lg border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_28px_rgba(103,232,249,0.45)]"
                style={spotlightStyle}
                layout={!reduceMotion}
              />
            )}
            <BugfixTourStep
              coachMarkPosition={coachMarkPosition}
              stepIndex={stepIndex}
              step={step}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              onBack={handleBack}
              onNext={() => handleNext("button")}
              onSkip={() => void skipTour("coachmark", step.id)}
              closeButtonRef={closeButtonRef}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
