"use client"

import { useEffect, useRef, useState } from "react"

import {
  ANCHORS,
  closeDurationMs,
  isStalled,
  opaqueProgress,
  progressFor,
  stepForFraction,
  type ScoringSignal,
} from "./scoring-progress"

/**
 * Drives the scoring ring from the real event stream.
 *
 * CALL THIS ABOVE THE LOADER, not inside it. The wait outlives any one render of
 * the loading view, and progress that resets because a parent re-rendered is worse
 * than no progress at all. Keeping the timestamps here means the component that
 * draws the ring holds no state, so it cannot lose any.
 */

/** Streaming phases (and the opaque path's absence of one) mapped to model signals. */
const PHASE_TO_SIGNAL: Record<string, ScoringSignal> = {
  idle: "connect",
  calculating_scores: "connect",
  analyzing: "analyzing",
  generating: "generating",
  persisting: "persisting",
  // "complete" is deliberately absent. The server used to push it before the
  // payload had been sent, so it means "generation finished", not "you can see
  // your results". Only `hasResult` closes the ring.
}

const SAMPLE_MS = 100
const CLOSE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)"
const TWEEN_MS = 180

export interface ScoringProgress {
  /** 0..1. Reaches 1 only once the results are actually renderable. */
  progress: number
  /** Which checklist row is current, derived from the same anchors as the ring. */
  stepIndex: number
  /** Rows strictly before this are finished. */
  completedThrough: number
  /** The current segment is running far past expectation; say so rather than pretend. */
  stalled: boolean
  /** Wall-clock since the wait began. Survives the loader re-rendering. */
  elapsedMs: number
  /** Tween settings for the ring's current move. */
  tweenMs: number
  ease: string
  /** True from the moment the result lands until the closing sweep finishes. */
  closing: boolean
}

export function useScoringProgress(opts: {
  /** The scoring wait is on screen. */
  active: boolean
  /** Streaming phase, or undefined when the caller has no phase signal at all. */
  phase?: string
  /** Results are genuinely renderable. The ONLY thing that closes the ring. */
  hasResult: boolean
  /** Total row count in the checklist beside the ring. */
  stepCount: number
  /**
   * When the wait actually began, if that is knowable and earlier than this mount.
   * Resuming a scoring run in a new tab is a real case: the work started when the
   * session was submitted, not when this page opened, and starting the curve from
   * zero there would under-report by however long the user was away.
   */
  startedAtMs?: number
}): ScoringProgress {
  const { active, phase, hasResult, stepCount, startedAtMs } = opts

  const startedAtRef = useRef<number | null>(null)
  const signalAtRef = useRef<{ signal: ScoringSignal; at: number } | null>(null)
  // Monotonic floor. A late-arriving signal must never walk the ring backwards.
  const shownRef = useRef(0)
  const closeRef = useRef<{ from: number; ms: number } | null>(null)

  const [, forceSample] = useState(0)

  // Reset only when the wait genuinely restarts, so a re-render mid-wait is a no-op.
  useEffect(() => {
    if (active) return
    startedAtRef.current = null
    signalAtRef.current = null
    shownRef.current = 0
    closeRef.current = null
  }, [active])

  if (active && startedAtRef.current === null) startedAtRef.current = startedAtMs ?? Date.now()

  // Record when each signal first arrived; the creep is measured from there.
  const signal = phase ? PHASE_TO_SIGNAL[phase] : undefined
  if (active && signal && signalAtRef.current?.signal !== signal) {
    signalAtRef.current = { signal, at: Date.now() }
  }

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => forceSample((n) => n + 1), SAMPLE_MS)
    return () => clearInterval(id)
  }, [active])

  const now = Date.now()
  const startedAt = startedAtRef.current ?? now
  const elapsedMs = active ? now - startedAt : 0

  let progress: number
  let stalled = false

  if (hasResult) {
    // The close is the arrival. Latch the duration off wherever the ring had
    // reached, so a fast answer gets a sweep and a slow one gets out of the way.
    if (!closeRef.current) {
      closeRef.current = { from: shownRef.current, ms: closeDurationMs(shownRef.current) }
    }
    progress = 1
  } else if (signalAtRef.current) {
    const { signal: sig, at } = signalAtRef.current
    const inSegment = now - at
    progress = progressFor(sig, inSegment)
    stalled = isStalled(sig, inSegment)
  } else {
    // No phase signal at all: one long segment over the whole expected wait. It
    // walks instead of freezing, without inventing phases we cannot observe.
    progress = opaqueProgress(elapsedMs)
    stalled = elapsedMs > 60_000
  }

  progress = Math.max(progress, shownRef.current)
  shownRef.current = progress

  const stepIndex = hasResult ? stepCount - 1 : stepForFraction(progress, stepCount)

  return {
    progress,
    stepIndex,
    // Mid-wait, the current row is in flight and everything before it is done.
    // On close, every row is done -- including the last, which under the old
    // clamp could never render a checkmark at all.
    completedThrough: hasResult ? stepCount : stepIndex,
    stalled,
    elapsedMs,
    tweenMs: closeRef.current ? closeRef.current.ms : TWEEN_MS,
    ease: closeRef.current ? CLOSE_EASE : "linear",
    closing: closeRef.current !== null,
  }
}

export { ANCHORS }
