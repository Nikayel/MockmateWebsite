"use client"

import { useEffect, useState } from "react"
import { ClipboardCheck } from "lucide-react"

import {
  RUBRIC_BANDS,
  parseSelfScore,
  rubricStorageKey,
  summarizeSelfScore,
  type RubricBand,
  type SelfScore,
} from "@/lib/tutorials/system-design/rubric"
import type { RubricDimension } from "@/lib/tutorials/types"

/**
 * The learner grades their own saved answer against named dimensions.
 *
 * ## What this replaces, and why a bullet list was not enough
 *
 * The reveal used to be a model-answer bullet list and nothing else. A bullet list states what a good
 * answer contains; it does not state how to tell whether yours did. Since there is no grader anywhere
 * in the 208-lesson System Design track, that comparison WAS the entire feedback loop, and it has a
 * known failure mode: a learner reads the model answer, recognises every idea in it, and files the
 * exercise as understood. Recognition is not production, and the gap between them is most of what an
 * interview measures.
 *
 * Three bands per dimension force a different question. "Which of these three paragraphs describes
 * what I actually wrote?" is answerable by looking at their own text, and it lands somewhere
 * specific: weak on failure modes, strong on the data model.
 *
 * Nothing here grades, gates, or is transmitted. The score lives in localStorage (see
 * `lib/tutorials/system-design/rubric.ts` for why it stays on the device) and the model answer still
 * renders below, because the rubric tells you where you stand and the outline tells you what you
 * missed.
 */
export interface RubricSelfScoreProps {
  exerciseId: string
  dimensions: RubricDimension[]
}

const BAND_LABEL: Record<RubricBand, string> = {
  weak: "Weak",
  adequate: "Adequate",
  strong: "Strong",
}

/** Selected-band styling. Weak is amber, not red: it is a starting point, not a failure. */
const BAND_SELECTED: Record<RubricBand, string> = {
  weak: "border-amber-500/60 bg-amber-500/10",
  adequate: "border-sky-500/60 bg-sky-500/10",
  strong: "border-emerald-500/60 bg-emerald-500/10",
}

export function RubricSelfScore({ exerciseId, dimensions }: RubricSelfScoreProps) {
  const [score, setScore] = useState<SelfScore>({})

  // Read after mount rather than lazily in useState: this component renders inside a page that is
  // also server-rendered for crawlers, and touching localStorage during render would mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      setScore(
        parseSelfScore(window.localStorage.getItem(rubricStorageKey(exerciseId)), dimensions.length)
      )
    } catch {
      // Private browsing or a disabled store. Self-scoring still works, it just does not persist.
    }
  }, [exerciseId, dimensions.length])

  const choose = (index: number, band: RubricBand) => {
    setScore((prev) => {
      // Clicking the selected band again clears it, so a misclick is recoverable without a Reset.
      const next: SelfScore = { ...prev }
      if (next[index] === band) delete next[index]
      else next[index] = band
      try {
        window.localStorage.setItem(rubricStorageKey(exerciseId), JSON.stringify(next))
      } catch {
        // Same as above: persistence is a convenience, not a requirement.
      }
      return next
    })
  }

  const summary = summarizeSelfScore(dimensions, score)

  return (
    <section
      aria-label="Score your answer"
      className="border-border bg-card/60 flex flex-col gap-3 rounded-xl border p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-foreground inline-flex items-center gap-1.5 text-sm font-semibold">
          <ClipboardCheck className="text-accent h-4 w-4" aria-hidden="true" />
          Score your answer
        </p>
        <p className="text-muted-foreground text-xs">
          Read your own saved answer against each row and pick the description that fits what you
          actually wrote, not what you meant. Nothing is graded or sent anywhere.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {dimensions.map((dimension, index) => (
          <li key={dimension.name} className="flex flex-col gap-2">
            <fieldset>
              <legend className="text-foreground text-xs font-semibold">{dimension.name}</legend>
              <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {RUBRIC_BANDS.map((band) => {
                  const selected = score[index] === band
                  return (
                    <button
                      key={band}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => choose(index, band)}
                      className={`border-border hover:border-accent/50 flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors ${
                        selected ? BAND_SELECTED[band] : "bg-background/40"
                      }`}
                    >
                      <span className="text-foreground text-[0.7rem] font-semibold tracking-wide uppercase">
                        {BAND_LABEL[band]}
                      </span>
                      <span className="text-muted-foreground text-xs">{dimension[band]}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-xs" role="status">
        {summary.complete && summary.weakest.length > 0
          ? `Scored ${summary.total} of ${summary.total}. Weakest: ${summary.weakest.join(", ")}. Reread the model answer for those rows first.`
          : summary.complete
            ? `Scored ${summary.total} of ${summary.total}, none weak. Check the model answer for anything you did not think to mention at all.`
            : `Scored ${summary.scored} of ${summary.total}.`}
      </p>
    </section>
  )
}
