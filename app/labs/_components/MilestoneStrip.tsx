"use client"

/**
 * The five-milestone strip on `/labs`, below the lab cards.
 *
 * It used to be five stacked paragraph cards ABOVE the labs, where it raised a question before the
 * visitor had seen anything. Below the cards it answers one instead, and as a strip of five columns
 * with one shared detail panel it costs a fifth of the height.
 *
 * ## Why hover is safe here
 *
 * Hover-to-reveal is normally an accessibility failure, so this deliberately never depends on it:
 *
 * - Every step's LABEL is always visible and self-explanatory: number, name, and a one-line summary.
 *   A visitor who never hovers, on a phone or otherwise, still reads the whole pipeline.
 * - Hover, keyboard focus AND click all open the same detail. `onFocus` runs the same handler as
 *   `onMouseEnter`, so tabbing through the strip walks the details in order.
 * - Each step is a real `<button>`, so it is tabbable and operable by Enter and Space for free.
 * - Click PINS a step. Leaving the strip with the mouse returns to the pinned step, or to step 1 if
 *   nothing is pinned, so a touch user's tap is not undone by a stray pointer event.
 *
 * ## Why all five paragraphs are rendered
 *
 * The panel holds every step's paragraph and hides four of them with `hidden`, rather than
 * rendering only the active one. This copy is a reason the page ranks; conditional rendering would
 * put four fifths of it behind an interaction a crawler never performs. Same reason the FAQ answers
 * ship expanded-in-the-DOM and collapsed in CSS.
 *
 * Every claim in the copy is checked against the code that implements it. The five milestones and
 * their order are pinned by `lib/labs/__tests__/case-labs-registry.test.ts`; the Build workspace
 * being multi-file with editable and read-only files is pinned by `case-lab-build-wiring.test.ts`;
 * the self-grade rubric is the five `CaseLabRubricDimension` values.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { MilestoneKind } from "@/lib/labs/types"

interface MilestoneStep {
  kind: MilestoneKind
  title: string
  /** Always visible under the step name. This is what makes hover optional. */
  oneLiner: string
  /** Revealed in the shared panel on hover, focus or click. */
  detail: string
}

const MILESTONE_STEPS: MilestoneStep[] = [
  {
    kind: "clarify",
    title: "Clarify",
    oneLiner: "Write the questions you would ask.",
    detail:
      "Write down the questions you would ask the interviewer, and the assumption you would make on each one if nobody answered. The brief is deliberately underspecified, the same way the real prompt is.",
  },
  {
    kind: "decompose",
    title: "Decompose",
    oneLiner: "Break the system into parts.",
    detail:
      "Lay out the workflow end to end, name the entities the system actually has, and draw the one state machine that matters. This is where the real bottleneck usually becomes obvious.",
  },
  {
    kind: "design",
    title: "Design",
    oneLiner: "Commit to an API contract.",
    detail:
      "Commit to an API contract with named inputs and outputs, argue the tradeoffs you chose between, and say what the system does when the primary path is unavailable.",
  },
  {
    kind: "build",
    title: "Build",
    oneLiner: "Make the tests pass.",
    detail:
      "Open the codebase. Several files, some you may edit and some you may only read, plus a test suite you run in the browser. You change the files you are allowed to change until the tests pass.",
  },
  {
    kind: "review",
    title: "Review",
    oneLiner: "Grade yourself, then read the feedback.",
    detail:
      "Grade yourself on handling ambiguity, decomposition, design, code correctness, and communication, then read the written feedback on the work you actually produced.",
  },
]

const DETAIL_PANEL_ID = "case-lab-milestone-detail"

export function MilestoneStrip() {
  const [active, setActive] = useState(0)
  const [pinned, setPinned] = useState<number | null>(null)

  return (
    <section aria-labelledby="how-a-case-lab-works" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="how-a-case-lab-works"
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          How a case lab works
        </h2>
        <p className="text-sm text-[var(--wb-text-secondary)]">
          Every lab runs the same five milestones in the same order. You can move between them
          freely, and nothing is hidden until you have earned it.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[var(--wb-border)] bg-[var(--wb-main)]"
        onMouseLeave={() => setActive(pinned ?? 0)}
      >
        <div className="grid grid-cols-1 divide-y divide-[var(--wb-border)] md:grid-cols-5 md:divide-x md:divide-y-0">
          {MILESTONE_STEPS.map((step, index) => {
            const isActive = index === active
            return (
              <button
                key={step.kind}
                type="button"
                aria-pressed={isActive}
                aria-controls={DETAIL_PANEL_ID}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => {
                  setPinned(index)
                  setActive(index)
                }}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[var(--wb-accent)] focus-visible:outline-none",
                  isActive && "bg-[var(--wb-accent-soft)]"
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                      isActive
                        ? "bg-[var(--wb-accent)] text-white"
                        : "bg-[var(--wb-panel)] text-[var(--wb-text-secondary)]"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isActive ? "text-[var(--wb-accent-strong)]" : "text-[var(--wb-text)]"
                    )}
                  >
                    {step.title}
                  </span>
                </span>
                <span className="text-xs leading-relaxed text-[var(--wb-text-secondary)]">
                  {step.oneLiner}
                </span>
              </button>
            )
          })}
        </div>

        {/* Fixed minimum height so swapping a short paragraph for a long one never reflows the page
            under the cursor. */}
        <div
          id={DETAIL_PANEL_ID}
          aria-live="polite"
          className="min-h-[62px] border-t border-[var(--wb-border)] bg-[var(--wb-panel)] p-3"
        >
          {MILESTONE_STEPS.map((step, index) => (
            <div
              key={step.kind}
              className={cn("flex flex-col gap-1", index !== active && "hidden")}
            >
              <span className="font-mono text-[11px] tracking-wider text-[var(--wb-accent-strong)] uppercase">
                Step {index + 1} · {step.title}
              </span>
              <p className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
