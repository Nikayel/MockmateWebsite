/**
 * The "how a lab works" explainer on `/labs`. A Server Component on purpose: this is the copy that
 * has to be in the initial HTML for a crawler and for a visitor who has never heard the phrase
 * "case lab", and the gallery below it is a client component that filters.
 *
 * Every claim here is checked against the code that implements it. The five milestones and their
 * order are pinned by `lib/labs/__tests__/case-labs-registry.test.ts`; the Build workspace being
 * multi-file with editable and read-only files is pinned by `case-lab-build-wiring.test.ts`; the
 * self-grade rubric is the five `CaseLabRubricDimension` values; Onsite mode adding a clock and a
 * mid-build curveball is `OnsiteTimer` plus the `run.mode === "onsite"` gate in `BuildStation`.
 */

import type { MilestoneKind } from "@/lib/labs/types"

const MILESTONE_STEPS: { kind: MilestoneKind; title: string; body: string }[] = [
  {
    kind: "clarify",
    title: "Clarify",
    body: "Write down the questions you would ask the interviewer, and the assumption you would make on each one if nobody answered. The brief is deliberately underspecified, the same way the real prompt is.",
  },
  {
    kind: "decompose",
    title: "Decompose",
    body: "Lay out the workflow end to end, name the entities the system actually has, and draw the one state machine that matters. This is where the real bottleneck usually becomes obvious.",
  },
  {
    kind: "design",
    title: "Design",
    body: "Commit to an API contract with named inputs and outputs, argue the tradeoffs you chose between, and say what the system does when the primary path is unavailable.",
  },
  {
    kind: "build",
    title: "Build",
    body: "Open the codebase. Several files, some you may edit and some you may only read, plus a test suite you run in the browser. You change the files you are allowed to change until the tests pass.",
  },
  {
    kind: "review",
    title: "Review",
    body: "Grade yourself on handling ambiguity, decomposition, design, code correctness, and communication, then read the written feedback on the work you actually produced.",
  },
]

export function HowCaseLabsWork() {
  return (
    <section aria-labelledby="how-a-case-lab-works" className="flex flex-col gap-4">
      <h2
        id="how-a-case-lab-works"
        className="text-xl font-semibold text-[var(--wb-text)] sm:text-2xl"
      >
        How a case lab works
      </h2>

      <p className="text-sm text-[var(--wb-text-secondary)]">
        Every lab runs the same five milestones in the same order. You can move between them freely,
        and nothing is hidden until you have earned it.
      </p>

      <ol className="flex flex-col gap-3">
        {MILESTONE_STEPS.map((step, index) => (
          <li key={step.kind} className="flex gap-3">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--wb-border-strong)] text-xs font-medium text-[var(--wb-text-secondary)]"
            >
              {index + 1}
            </span>
            <p className="text-sm text-[var(--wb-text-secondary)]">
              <strong className="font-semibold text-[var(--wb-text)]">{step.title}.</strong>{" "}
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <h3 className="text-base font-semibold text-[var(--wb-text)]">
        Practice mode and Onsite mode
      </h3>
      <p className="text-sm text-[var(--wb-text-secondary)]">
        You pick a mode before the lab starts. Practice is open and hint friendly. Onsite runs
        interview conditions: a clock against the lab&apos;s estimated time, and a curveball dropped
        into the Build milestone once your tests have run, which changes a constraint and asks
        whether your design survives it.
      </p>
      <p className="text-sm text-[var(--wb-text-secondary)]">
        You can open a lab and work through it without an account. Signing in is what saves the run
        so you can come back to it, and the interviewer chat and the written review are AI backed,
        so those need an account.
      </p>
    </section>
  )
}
