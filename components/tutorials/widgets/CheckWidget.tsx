"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { checkItemId, type CheckSpec } from "@/lib/tutorials/widgets/schema"
import { useLessonTelemetry } from "../LessonTelemetryProvider"
import { useWidgetA11y, WidgetFrame } from "./WidgetFrame"

/**
 * The `check` family: zero-stakes predict-then-reveal retrieval practice inside the
 * teach markdown. The learner COMMITS an answer (deliberate act, not hover), gets
 * immediate explanatory feedback that names why the tempting answer is wrong, and can
 * retry freely. Nothing is graded or gated.
 *
 * Answers ARE recorded (append-only, `learn_item_responses`), and that is deliberately
 * invisible to the learner: the zero-stakes feel is what makes retrieval practice work,
 * so nothing here shows a score, blocks progress, or changes based on being logged.
 * What the log buys is the reason these checks are worth authoring at all — each one
 * carries hand-written per-distractor rationale, so a wrong answer identifies WHICH
 * misconception fired, not merely that one did.
 *
 * Structure note: each kind is a thin wrapper (renders the WidgetFrame, owns only a
 * reset counter) around an inner body that owns the interaction state and consumes
 * `useWidgetA11y()` — the hook must be called BELOW the frame's provider, and the
 * frame's always-visible Reset works by remounting the body (`key`), which returns
 * every piece of state to its initial value without the body wiring its own reset.
 *
 * A11y (per the WidgetFrame contract): predict uses a native fieldset/legend radio
 * group; classify uses toggle buttons with aria-pressed; the commit moves focus to the
 * feedback box; correctness is announced through the frame's live region and always
 * carries a word plus an icon, never color alone.
 */
export function CheckWidget({ spec }: { spec: CheckSpec }) {
  const [resetKey, setResetKey] = useState(0)
  return (
    <WidgetFrame label="Check yourself" onReset={() => setResetKey((k) => k + 1)}>
      {spec.kind === "predict" ? (
        <PredictBody key={resetKey} spec={spec} />
      ) : (
        <ClassifyBody key={resetKey} spec={spec} />
      )}
    </WidgetFrame>
  )
}

/**
 * Authors open correct-option feedback with a verdict ("Right.", "Correct.") and wrong
 * options often with "Not quite." That reads fine in the source and badly on screen,
 * because the widget ALREADY renders its own verdict chip immediately before it: the
 * learner sees "Correct. Right. Replication fans out reads…".
 *
 * Stripping the duplicate here rather than rewriting ~400 authored checks keeps the
 * convention intact for authors (a verdict-first sentence is easier to write and review)
 * and fixes every existing check at once. Only an exact leading verdict token followed
 * by a boundary is removed, so feedback that genuinely begins "Correctness depends on…"
 * is untouched.
 */
// Only a SENTENCE-TERMINATING verdict is removed. A comma or colon means the verdict is
// the opening clause of a longer sentence ("Right, and that is the behaviour you want."),
// and stripping it leaves the chip followed by a lowercase fragment: "Correct. and that
// is the behaviour you want." That is worse than the redundancy it was meant to fix, and
// it hit 77 of 486 authored feedback strings.
const LEADING_VERDICT = /^(right|correct|yes|exactly|nope|no|not quite|almost)[.!]\s+/i

export function stripLeadingVerdict(feedback: string): string {
  return feedback.replace(LEADING_VERDICT, "")
}

/** Icon + word status chip. The word does the semantic work; the icon reinforces it. */
function StatusWord({ correct }: { correct: boolean }) {
  return correct ? (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      Correct.
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
      <X className="h-3.5 w-3.5" aria-hidden="true" />
      Not quite.
    </span>
  )
}

// ---- predict: MCQ with exactly one correct option ----

function PredictBody({ spec }: { spec: CheckSpec }) {
  const options = spec.options ?? []
  const groupName = useId()
  const { announce } = useWidgetA11y()
  const { lessonId, record } = useLessonTelemetry()

  const [selected, setSelected] = useState<number | null>(null)
  const [committed, setCommitted] = useState<number | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  // Retries are the signal: a learner who lands it second try knows something different
  // from one who lands it first try, and both differ from one who never lands it.
  const retryIndex = useRef(0)
  const shownAt = useRef(Date.now())

  // Focus lands on the feedback box the moment an answer is committed, so keyboard and
  // screen-reader learners read the verdict next instead of hunting for it.
  useEffect(() => {
    if (committed !== null) feedbackRef.current?.focus()
  }, [committed])

  const commit = () => {
    if (selected === null) return
    const option = options[selected]
    setCommitted(selected)
    announce(option?.correct ? "Correct." : "Not quite.")
    record({
      kind: "check_answer",
      section: "teach",
      itemId: checkItemId(spec, lessonId),
      checkKind: "predict",
      selectedIndex: selected,
      selectedLabel: option?.label,
      correct: option?.correct === true,
      itemsTotal: options.length,
      retryIndex: retryIndex.current,
      latencyMs: Date.now() - shownAt.current,
    })
  }

  const committedOption = committed !== null ? options[committed] : null
  const isCorrect = committedOption?.correct === true

  return (
    <div>
      <fieldset disabled={committed !== null} className="min-w-0">
        <legend className="text-foreground mb-3 text-sm font-medium">{spec.prompt}</legend>
        <div className="flex flex-col gap-2">
          {options.map((option, i) => (
            <label
              key={i}
              className={cn(
                "border-border/70 hover:bg-muted/40 flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                selected === i && "border-accent/60 bg-accent/[0.07]",
                committed !== null && "cursor-default"
              )}
            >
              <input
                type="radio"
                name={groupName}
                checked={selected === i}
                onChange={() => setSelected(i)}
                className="accent-accent mt-0.5 shrink-0"
              />
              <span className="text-foreground/90">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {committed === null ? (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={selected === null}
          onClick={commit}
        >
          Check answer
        </Button>
      ) : (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="group"
          aria-label="Feedback"
          className={cn(
            "mt-3 rounded-md border px-3 py-2.5 text-sm outline-none",
            isCorrect
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          )}
        >
          <p className="text-foreground/90">
            <StatusWord correct={isCorrect} />{" "}
            {stripLeadingVerdict(committedOption?.feedback ?? "")}
          </p>
          {isCorrect && spec.reveal && (
            <p className="text-foreground/80 border-border/60 mt-2 border-t pt-2">{spec.reveal}</p>
          )}
          {!isCorrect && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2.5"
              onClick={() => {
                retryIndex.current += 1
                shownAt.current = Date.now()
                setCommitted(null)
              }}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ---- classify: sort items into 2-3 buckets ----

function ClassifyBody({ spec }: { spec: CheckSpec }) {
  const buckets = spec.buckets ?? []
  const items = spec.items ?? []
  const { announce } = useWidgetA11y()
  const { lessonId, record } = useLessonTelemetry()

  const [assignments, setAssignments] = useState<(string | null)[]>(() => items.map(() => null))
  const [committed, setCommitted] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const retryIndex = useRef(0)
  const shownAt = useRef(Date.now())

  useEffect(() => {
    if (committed) resultsRef.current?.focus()
  }, [committed])

  const assign = (itemIndex: number, bucket: string) => {
    if (committed) return
    setAssignments((prev) => prev.map((b, i) => (i === itemIndex ? bucket : b)))
  }

  const allAssigned = assignments.every((b) => b !== null)
  const rightCount = items.filter((item, i) => assignments[i] === item.bucket).length
  const allCorrect = rightCount === items.length

  const commit = () => {
    if (!allAssigned) return
    setCommitted(true)
    const right = items.filter((item, i) => assignments[i] === item.bucket).length
    announce(`${right} of ${items.length} sorted correctly.`)
    record({
      kind: "check_answer",
      section: "teach",
      itemId: checkItemId(spec, lessonId),
      checkKind: "classify",
      // Per-item choices in authored order, so a misgrouping is recoverable from the row
      // itself: which item went where is the misconception, not the total right count.
      selectedBuckets: assignments.map((bucket) => bucket ?? ""),
      correct: right === items.length,
      correctCount: right,
      itemsTotal: items.length,
      retryIndex: retryIndex.current,
      latencyMs: Date.now() - shownAt.current,
    })
  }

  return (
    <div>
      <p className="text-foreground mb-3 text-sm font-medium">{spec.prompt}</p>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => {
          const chosen = assignments[i]
          const itemCorrect = committed && chosen === item.bucket
          const itemWrong = committed && chosen !== item.bucket
          return (
            <div
              key={i}
              role="group"
              aria-label={item.label}
              className={cn(
                "border-border/70 rounded-md border px-3 py-2",
                itemCorrect && "border-emerald-500/40 bg-emerald-500/[0.06]",
                itemWrong && "border-amber-500/40 bg-amber-500/[0.06]"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <span className="text-foreground/90 text-sm">{item.label}</span>
                <span className="flex shrink-0 gap-1.5">
                  {buckets.map((bucket) => (
                    <button
                      key={bucket}
                      type="button"
                      aria-pressed={chosen === bucket}
                      disabled={committed}
                      onClick={() => assign(i, bucket)}
                      className={cn(
                        "border-border/70 text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                        !committed && "hover:bg-muted/50 cursor-pointer",
                        chosen === bucket &&
                          "border-accent/60 bg-accent/10 text-accent-strong font-semibold"
                      )}
                    >
                      {bucket}
                    </button>
                  ))}
                </span>
              </div>
              {itemWrong && (
                <p className="text-foreground/80 mt-1.5 text-xs">
                  <StatusWord correct={false} />{" "}
                  {item.feedback
                    ? stripLeadingVerdict(item.feedback)
                    : `This one belongs in ${item.bucket}.`}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {!committed ? (
        <Button type="button" size="sm" className="mt-3" disabled={!allAssigned} onClick={commit}>
          Check answers
        </Button>
      ) : (
        <div
          ref={resultsRef}
          tabIndex={-1}
          role="group"
          aria-label="Results"
          className={cn(
            "mt-3 rounded-md border px-3 py-2.5 text-sm outline-none",
            allCorrect
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          )}
        >
          <p className="text-foreground/90">
            <StatusWord correct={allCorrect} /> {rightCount} of {items.length} sorted correctly.
          </p>
          {allCorrect && spec.reveal && (
            <p className="text-foreground/80 border-border/60 mt-2 border-t pt-2">{spec.reveal}</p>
          )}
          {!allCorrect && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2.5"
              onClick={() => {
                retryIndex.current += 1
                shownAt.current = Date.now()
                setCommitted(false)
              }}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
