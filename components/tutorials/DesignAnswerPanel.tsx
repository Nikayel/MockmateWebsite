"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Eye, EyeOff, FileText, ListChecks, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { ExerciseBrief, type ExerciseBriefMeta } from "./ExerciseBrief"
import { ExerciseLayout } from "./ExerciseLayout"
import type { DesignExercise } from "@/lib/tutorials/types"

/**
 * The free-response answer surface for a System-Design lesson. It occupies the slot the code runners
 * (`ExerciseRunner`, `SqlExerciseRunner`) occupy in the other players and reuses the same
 * `ExerciseLayout` + `ExerciseBrief` chrome so the screen reads identically — but there is NO
 * execution: no CodeMirror, no `useExerciseRun`, no results panel, no grading.
 *
 * The loop: read the prompt + "Think about" list, write a design answer in the textarea, Save it
 * (a non-empty saved answer flips the completion gate via `onReady`), then reveal the model answer to
 * self-compare (reveal is gated behind saving, so the learner commits before seeing the model).
 */
export interface DesignAnswerPanelProps {
  exercise: DesignExercise
  /** Controlled answer text (owned by the player, keyed by exercise id, survives phase switches). */
  answer: string
  onAnswerChange: (value: string) => void
  /** Fires once a non-empty answer is first saved — the player uses it to un-hide SectionDoneButton. */
  onReady?: () => void
  /** Phase framing for the left brief (eyebrow + title + resurfaces chip). */
  brief?: ExerciseBriefMeta
  /** The last server-saved answer text (resume). Non-empty ⇒ the learner already saved before. */
  savedAnswer?: string
  /** Persist the answer (best-effort; no-ops when signed out). */
  onSave?: (text: string) => void
  /** While the saved answer is being fetched on mount, show a skeleton instead of the editor. */
  loading?: boolean
}

export function DesignAnswerPanel({
  exercise,
  answer,
  onAnswerChange,
  onReady,
  brief,
  savedAnswer,
  onSave,
  loading = false,
}: DesignAnswerPanelProps) {
  // The snapshot of what is currently persisted, so "dirty" and the reveal gate track real saves.
  const [savedSnapshot, setSavedSnapshot] = useState(savedAnswer ?? "")
  const [showModel, setShowModel] = useState(false)
  // Which "Think about" prompts the learner has ticked off — a thinking aid only, gates nothing.
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  // Keep the snapshot in sync when a slower server resume arrives after first paint.
  useEffect(() => {
    if (savedAnswer !== undefined) setSavedSnapshot(savedAnswer)
  }, [savedAnswer])

  const hasSaved = savedSnapshot.trim().length > 0
  const isDirty = answer !== savedSnapshot
  const canSave = answer.trim().length > 0 && isDirty

  // Fire onReady exactly once, the first time a non-empty answer is persisted (incl. on resume).
  const readyFired = useRef(false)
  useEffect(() => {
    if (hasSaved && !readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [hasSaved, onReady])

  const handleSave = () => {
    if (!canSave) return
    setSavedSnapshot(answer)
    onSave?.(answer)
  }

  const handleReset = () => {
    onAnswerChange(exercise.starterAnswer ?? "")
  }

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0

  return (
    <ExerciseLayout
      aside={
        <ExerciseBrief
          eyebrow={brief?.eyebrow ?? "Apply"}
          title={brief?.title ?? "Your turn"}
          resurfaces={brief?.resurfaces}
          prompt={exercise.prompt}
          goal="Sketch your design in the editor, Save it, then reveal the model answer to self-compare. There is no auto-grading: the learning is in attempting, then comparing."
          data={
            exercise.thinkAbout.length > 0 ? (
              <div className="border-border bg-muted/20 flex flex-col gap-2 rounded-xl border p-3">
                <p className="text-foreground inline-flex items-center gap-1.5 text-xs font-semibold">
                  <ListChecks className="text-accent h-3.5 w-3.5" aria-hidden="true" />
                  Think about
                </p>
                <ul className="flex flex-col gap-1.5">
                  {exercise.thinkAbout.map((item, i) => (
                    <li key={i}>
                      <label className="text-muted-foreground flex cursor-pointer items-start gap-2 text-xs leading-relaxed">
                        <input
                          type="checkbox"
                          checked={Boolean(checked[i])}
                          onChange={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className="accent-accent mt-0.5 h-3.5 w-3.5 shrink-0"
                        />
                        <span className={checked[i] ? "line-through opacity-70" : undefined}>
                          {item}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ) : undefined
          }
        />
      }
    >
      <div className="border-border overflow-hidden rounded-lg border">
        <div className="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-1.5">
          <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="text-muted-foreground font-mono text-xs">answer.md</span>
          {/* The /70 alpha measured 2.87:1 on the page background. Its position (ml-auto,
              small, tabular-nums) already reads as secondary without paying in contrast. */}
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>
        </div>
        {loading ? (
          <div className="flex flex-col gap-2 p-4" aria-hidden="true">
            <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
            <div className="bg-muted h-3 w-full animate-pulse rounded" />
            <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
          </div>
        ) : (
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            spellCheck
            aria-label="Your design answer"
            placeholder={
              "Sketch your design. Assumptions -> clarifying questions -> the design -> tradeoffs.\n\nWrite in plain prose and bullet points; add an ASCII box diagram if it helps."
            }
            // See NotesPanel: the /60 alpha measured 2.41:1 in light mode. This is a
            // free-response design answer, so the placeholder is the prompt's scaffolding.
            className="text-foreground placeholder:text-muted-foreground min-h-[280px] w-full resize-y bg-transparent px-3.5 py-3 font-mono text-sm leading-relaxed focus:outline-none"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!canSave} className="gap-2">
          <Save className="h-4 w-4" />
          {hasSaved && !isDirty ? "Saved" : "Save answer"}
        </Button>

        <Button
          variant="ghost"
          onClick={() => setShowModel((prev) => !prev)}
          disabled={!hasSaved}
          title={hasSaved ? undefined : "Save your answer first, then compare"}
          className="gap-2"
        >
          {showModel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showModel ? "Hide model answer" : "Reveal model answer"}
        </Button>

        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={answer === (exercise.starterAnswer ?? "")}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>

        {hasSaved && !isDirty && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" />
            Answer saved
          </span>
        )}
      </div>

      {!hasSaved && (
        <p className="text-muted-foreground text-xs">
          Save your answer to unlock the model answer, then mark the section done.
        </p>
      )}

      {showModel && hasSaved && (
        <div className="border-accent/30 bg-accent/[0.04] flex flex-col gap-2 rounded-xl border p-4">
          <p className="text-foreground inline-flex items-center gap-1.5 text-sm font-semibold">
            <Eye className="text-accent h-4 w-4" aria-hidden="true" />
            Model answer
          </p>
          <p className="text-muted-foreground text-xs">
            Compare against your own answer. A strong answer covers most of these; note what you
            missed.
          </p>
          <div className="prose prose-sm dark:prose-invert prose-li:text-muted-foreground max-w-none">
            <MarkdownRenderer
              content={exercise.modelAnswerOutline.map((point) => `- ${point}`).join("\n")}
            />
          </div>
        </div>
      )}
    </ExerciseLayout>
  )
}
