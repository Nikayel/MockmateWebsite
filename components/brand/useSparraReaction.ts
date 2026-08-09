"use client"

import { useCallback, useState, type AnimationEvent } from "react"
import type { SparraState } from "@/components/brand/Sparra"

/**
 * Drives the one-shot pass/fail reactions per the brand rules: fire once,
 * then return to the base state when the wrapper animation ends.
 *
 * const { state, react, handleAnimationEnd } = useSparraReaction("idle")
 * <Sparra state={state} onAnimationEnd={handleAnimationEnd} />
 * // on suite green: react("pass") — on failure: react("fail")
 */
export function useSparraReaction(base: SparraState = "idle") {
  const [state, setState] = useState<SparraState>(base)

  const react = useCallback((reaction: "pass" | "fail" | "streak") => {
    setState(reaction)
  }, [])

  const handleAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLSpanElement>) => {
      if (event.animationName === "sparra-pop" || event.animationName === "sparra-shake") {
        setState(base)
      }
    },
    [base]
  )

  return { state, setState, react, handleAnimationEnd }
}
