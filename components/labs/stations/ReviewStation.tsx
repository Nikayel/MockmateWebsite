"use client"

/**
 * ReviewStation (§7.5) — close the loop.
 *
 * A read-only recap of the prior milestones, a self-grade rubric, and (once
 * generated) the AI's structured feedback. Completing the lab marks the run
 * `completed` via the store. Generating feedback through the existing pipeline
 * and updating mastery is wired in the next increment.
 */

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { CaseLabRubricDimension } from "@/lib/labs/types"

const RUBRIC: { key: CaseLabRubricDimension; label: string }[] = [
  { key: "handlingAmbiguity", label: "Handling ambiguity" },
  { key: "decomposition", label: "Decomposition" },
  { key: "design", label: "Design" },
  { key: "codeCorrectness", label: "Code correctness" },
  { key: "communication", label: "Communication" },
]

const SCALE = [1, 2, 3, 4, 5]

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0">
      <span className="text-foreground text-xs font-medium">{label}</span>
      <span className="text-muted-foreground text-right text-xs">{value}</span>
    </div>
  )
}

export function ReviewStation() {
  const run = useCaseLabStore((s) => s.activeRun)
  const setReview = useCaseLabStore((s) => s.setReview)
  const completeRun = useCaseLabStore((s) => s.completeRun)

  const answers = run?.answers
  const review = answers?.review
  const selfScores = review?.selfScores ?? {}
  const aiFeedback = review?.aiFeedback
  const isCompleted = run?.status === "completed"

  const build = answers?.build
  const buildPassing = build?.testResults.filter((t) => t.passed).length ?? 0

  const recap: { label: string; value: string }[] = [
    {
      label: "Clarify",
      value: `${answers?.clarify?.length ?? 0} question(s) raised`,
    },
    {
      label: "Decompose",
      value: `${answers?.decompose?.workflow.length ?? 0} step(s), ${
        answers?.decompose?.entities.length ?? 0
      } entit(ies)`,
    },
    {
      label: "Design",
      value: answers?.design?.api.name
        ? `${answers.design.api.name} · ${answers.design.tradeoffs.length} tradeoff(s)`
        : `${answers?.design?.tradeoffs.length ?? 0} tradeoff(s)`,
    },
    {
      label: "Build",
      value: `${build?.touchedFiles.length ?? 0} file(s) touched · ${buildPassing}/${
        build?.testResults.length ?? 0
      } tests passing`,
    },
  ]

  const setScore = (key: CaseLabRubricDimension, value: number) => {
    setReview({
      selfScores: { ...selfScores, [key]: value },
      ...(aiFeedback ? { aiFeedback } : {}),
    })
  }

  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="review-title" className="text-foreground text-lg font-semibold">
            Review
          </h2>
          <p className="text-muted-foreground text-sm">
            Look back at the whole run, grade yourself, then close it out.
          </p>
        </div>
        {isCompleted && <Badge variant="secondary">Completed</Badge>}
      </header>

      {/* Recap */}
      <div className="border-border rounded-lg border p-3">
        <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
          Recap
        </h3>
        {recap.map((row) => (
          <RecapRow key={row.label} label={row.label} value={row.value} />
        ))}
      </div>

      {/* Self-grade rubric */}
      <div className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Self-grade
        </h3>
        <ul className="flex flex-col gap-2">
          {RUBRIC.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-foreground text-sm">{label}</span>
              <div className="flex gap-1" role="group" aria-label={label}>
                {SCALE.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={selfScores[key] === n}
                    onClick={() => setScore(key, n)}
                    className={cn(
                      "h-7 w-7 rounded-md border text-xs transition-colors",
                      selfScores[key] === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* AI feedback (once generated) */}
      {aiFeedback ? (
        <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Interviewer feedback
          </h3>
          {aiFeedback.tldr && <p className="text-foreground text-sm">{aiFeedback.tldr}</p>}
          {aiFeedback.whatWorked?.length ? (
            <FeedbackList title="What worked" items={aiFeedback.whatWorked} />
          ) : null}
          {aiFeedback.fixNext?.length ? (
            <FeedbackList title="Fix next" items={aiFeedback.fixNext} />
          ) : null}
          {aiFeedback.actionPlan?.length ? (
            <FeedbackList title="Action plan" items={aiFeedback.actionPlan} />
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Finish the lab to generate interviewer feedback.
        </p>
      )}

      {!isCompleted && (
        <Button type="button" onClick={completeRun} className="self-start">
          Complete lab
        </Button>
      )}
    </section>
  )
}

function FeedbackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-foreground text-xs font-medium">{title}</span>
      <ul className="text-muted-foreground ml-4 list-disc text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
