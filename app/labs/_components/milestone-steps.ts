/**
 * The five milestones, authored once.
 *
 * Two surfaces render this: the hero pipeline band (`MilestonePipelineBand`, names only) and the
 * full strip below the catalog (`MilestoneStrip`, everything). Sharing the array is what keeps the
 * band from ever disagreeing with the section it points at.
 *
 * THE BAND MAY ONLY EVER RENDER `title`. `lib/labs/case-lab-rounds.ts` and `app/labs/page.tsx` both
 * carry hard-won prohibitions on defining the same thing twice in two places, and this page already
 * deleted one duplicate-definition section. Five bare words are a table of contents pointing at
 * their own body. The moment the band grows a one-liner, a blurb or a tooltip, it becomes the
 * second definition, and the reader is back to diffing two descriptions of one thing.
 *
 * Every claim in this copy is checked against the code that implements it. The five milestones and
 * their order are pinned by `lib/labs/__tests__/case-labs-registry.test.ts`; the Build workspace
 * being multi-file with editable and read-only files is pinned by `case-lab-build-wiring.test.ts`;
 * the self-grade rubric is the five `CaseLabRubricDimension` values.
 */

import type { MilestoneKind } from "@/lib/labs/types"

export interface MilestoneStep {
  kind: MilestoneKind
  title: string
  /** Always visible under the step name in the full strip. This is what makes hover optional. */
  oneLiner: string
  /** The full paragraph, revealed by hover, focus or click on desktop. */
  detail: string
}

export const MILESTONE_STEPS: MilestoneStep[] = [
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

/** Where the band's nodes link to, and the id the strip's heading carries. */
export const MILESTONE_SECTION_ID = "how-a-case-lab-works"
