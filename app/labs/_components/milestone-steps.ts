/**
 * The five milestones, authored once and rendered in exactly one place.
 *
 * There were briefly TWO five-step explainers on this page: a names-only pipeline band in the hero
 * and the full strip below the catalog. Two renderings of one list is the same defect as the
 * duplicate round-type definitions this page already deleted, and the reader pays for it by having
 * to check whether the second one says something new. One instance, below the catalog, matching
 * where `/learn` puts "How a lesson works".
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
  detail: string
}

export const MILESTONE_STEPS: MilestoneStep[] = [
  {
    kind: "clarify",
    title: "Clarify",
    detail:
      "Write down the questions you would ask the interviewer, and the assumption you would make on each one if nobody answered. The brief is deliberately underspecified, the same way the real prompt is.",
  },
  {
    kind: "decompose",
    title: "Decompose",
    detail:
      "Lay out the workflow end to end, name the entities the system actually has, and draw the one state machine that matters. This is where the real bottleneck usually becomes obvious.",
  },
  {
    kind: "design",
    title: "Design",
    detail:
      "Commit to an API contract with named inputs and outputs, argue the tradeoffs you chose between, and say what the system does when the primary path is unavailable.",
  },
  {
    kind: "build",
    title: "Build",
    detail:
      "Open the codebase. Several files, some you may edit and some you may only read, plus a test suite you run in the browser. You change the files you are allowed to change until the tests pass.",
  },
  {
    kind: "review",
    title: "Review",
    detail:
      "Grade yourself on handling ambiguity, decomposition, design, code correctness, and communication, then read the written feedback on the work you actually produced.",
  },
]

export const MILESTONE_SECTION_ID = "how-a-case-lab-works"
