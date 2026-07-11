"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

/**
 * Drives every TRIGGERED lesson animation (JOIN match, window scrub, call stack, …).
 *
 * One place owns the interaction contract the research demanded of any motion:
 *  - NEVER autoplays on mount — the learner presses Play (a user trigger, WCAG 2.3.3).
 *  - Honors `prefers-reduced-motion`: autoplay is disabled and per-step transitions are
 *    reported as instant, so the diagram becomes a manually-stepped static sequence.
 *  - Full keyboard control (←/→ step, Home/End jump, Space play-pause) on a focusable region.
 *
 * It is presentation-agnostic: it tracks a step index over `[0, stepCount-1]` and hands
 * back the state + handlers; each diagram decides what a "step" looks like.
 */
export interface StepPlayer {
  index: number
  isPlaying: boolean
  atStart: boolean
  atEnd: boolean
  stepCount: number
  /** True when the user prefers reduced motion — diagrams should skip tween animation. */
  reducedMotion: boolean
  next: () => void
  prev: () => void
  reset: () => void
  goTo: (i: number) => void
  togglePlay: () => void
  /** Spread onto the focusable diagram container for keyboard control. */
  containerProps: {
    tabIndex: 0
    role: "group"
    "aria-roledescription": "step-through diagram"
    onKeyDown: (e: React.KeyboardEvent) => void
  }
}

export function useStepPlayer(stepCount: number, intervalMs = 1400): StepPlayer {
  const reducedPref = useReducedMotion() ?? false
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  // useReducedMotion reads matchMedia, which is false during SSR and on the client's
  // FIRST render, then flips post-mount. Gating on `mounted` keeps server and first
  // client render identical (reduced=false), so the Play button never causes a
  // hydration mismatch / layout flash for reduced-motion viewers.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const reduced = mounted && reducedPref
  const safeCount = Math.max(1, stepCount)

  const atStart = index <= 0
  const atEnd = index >= safeCount - 1

  const clamp = useCallback((i: number) => Math.min(safeCount - 1, Math.max(0, i)), [safeCount])

  const goTo = useCallback((i: number) => setIndex(clamp(i)), [clamp])
  const next = useCallback(() => setIndex((i) => clamp(i + 1)), [clamp])
  const prev = useCallback(() => setIndex((i) => clamp(i - 1)), [clamp])
  const reset = useCallback(() => {
    setIsPlaying(false)
    setIndex(0)
  }, [])

  const togglePlay = useCallback(() => {
    // From the end, Play restarts from the top rather than sitting inert.
    setIsPlaying((p) => {
      if (!p && index >= safeCount - 1) setIndex(0)
      return !p
    })
  }, [index, safeCount])

  // Autoplay tick — never runs under reduced motion, and stops itself at the end.
  useEffect(() => {
    if (!isPlaying || reduced) return
    if (index >= safeCount - 1) {
      setIsPlaying(false)
      return
    }
    const t = setTimeout(() => setIndex((i) => clamp(i + 1)), intervalMs)
    return () => clearTimeout(t)
  }, [isPlaying, index, safeCount, reduced, intervalMs, clamp])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault()
          setIsPlaying(false)
          next()
          break
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault()
          setIsPlaying(false)
          prev()
          break
        case "Home":
          e.preventDefault()
          reset()
          break
        case "End":
          e.preventDefault()
          setIsPlaying(false)
          goTo(safeCount - 1)
          break
        case " ":
        case "Enter":
          e.preventDefault()
          togglePlay()
          break
      }
    },
    [next, prev, reset, goTo, togglePlay, safeCount]
  )

  // Guard against a spec change shrinking the step list under a stale index — and
  // stop any in-flight autoplay so a reused instance never lands mid-sequence.
  const prevCount = useRef(safeCount)
  useEffect(() => {
    if (prevCount.current !== safeCount) {
      prevCount.current = safeCount
      setIndex((i) => Math.min(i, safeCount - 1))
      setIsPlaying(false)
    }
  }, [safeCount])

  return {
    index,
    isPlaying,
    atStart,
    atEnd,
    stepCount: safeCount,
    reducedMotion: reduced,
    next,
    prev,
    reset,
    goTo,
    togglePlay,
    containerProps: {
      tabIndex: 0,
      role: "group",
      "aria-roledescription": "step-through diagram",
      onKeyDown,
    },
  }
}
