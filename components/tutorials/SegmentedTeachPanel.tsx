"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { segmentTeachMarkdown, teachSegmentStorageKey } from "@/lib/tutorials/teach-segments"
import { usePersistentState } from "./usePersistentState"
import type { TeachSection } from "@/lib/tutorials/types"

/**
 * The System-Design "Read" phase with progressive disclosure: long teaches arrive as
 * 2-4 segments (see `lib/tutorials/teach-segments.ts`) revealed one Continue at a
 * time, so a 900-word wall becomes learner-paced chunks with a checkpoint between
 * them. The revealed position persists per lesson (localStorage) and survives
 * reloads; a completed teach opens fully revealed. Content is never modified —
 * segmentation only paces it — and short teaches render exactly as before.
 *
 * A11y: the Continue affordance is a real button; on reveal, focus moves to the new
 * segment's container (tabIndex -1) so keyboard and screen-reader flow lands on the
 * next chunk, which also scrolls it into view. No animations are used, so there is
 * nothing to degrade under prefers-reduced-motion.
 *
 * Sable note: the live tutor is not shipped yet (SableTutor renders a locked
 * placeholder). When it lands it reads the same persisted key
 * (`teachSegmentStorageKey(lessonId)`) to know which sections the learner has seen.
 */
export function SegmentedTeachPanel({
  lessonId,
  teach,
  teachCompleted,
  onContinue,
  continueLabel = "I've got it — let me try",
}: {
  lessonId: string
  teach: TeachSection
  /** A completed teach renders fully revealed (revisits should never re-gate). */
  teachCompleted: boolean
  onContinue: () => void
  continueLabel?: string
}) {
  const segments = useMemo(() => segmentTeachMarkdown(teach.markdown), [teach.markdown])

  const [revealedRaw, setRevealedRaw] = usePersistentState(teachSegmentStorageKey(lessonId), "1")
  const storedRevealed = Number.parseInt(revealedRaw, 10)
  const revealed = teachCompleted
    ? segments.length
    : Math.min(Math.max(Number.isNaN(storedRevealed) ? 1 : storedRevealed, 1), segments.length)

  // Focus the newly revealed segment ONLY after a click (never on hydration restore),
  // so keyboards land on the fresh chunk without stealing focus on page load.
  const [focusTarget, setFocusTarget] = useState<number | null>(null)
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([])
  useEffect(() => {
    if (focusTarget === null) return
    segmentRefs.current[focusTarget]?.focus()
    setFocusTarget(null)
  }, [focusTarget])

  const revealNext = () => {
    const next = Math.min(revealed + 1, segments.length)
    setRevealedRaw(String(next))
    setFocusTarget(next - 1)
  }

  const allRevealed = revealed >= segments.length

  return (
    <div className="flex flex-col gap-5">
      {segments.slice(0, revealed).map((segment, i) => (
        <div
          key={i}
          ref={(el) => {
            segmentRefs.current[i] = el
          }}
          tabIndex={-1}
          className="prose prose-sm dark:prose-invert max-w-none outline-none"
        >
          <MarkdownRenderer content={segment} />
        </div>
      ))}

      {!allRevealed ? (
        <div className="flex items-center gap-3">
          <Button onClick={revealNext} variant="outline" className="gap-2">
            Continue
            <ArrowDown className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-xs">
            Part {revealed} of {segments.length}
          </span>
        </div>
      ) : (
        <div>
          <Button onClick={onContinue} className="gap-2">
            {continueLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
