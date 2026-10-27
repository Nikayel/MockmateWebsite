import type { BugfixScoreBreakdown } from "./types"

export type BugfixScoreDimension = keyof Omit<BugfixScoreBreakdown, "overall">

/** Public scoring criteria shared by calculation and the feedback explanation. */
export const BUGFIX_SCORE_DIMENSIONS = {
  reproductionDiscipline: {
    label: "Reproduction",
    description: "Whether you ran a failing test before editing the code.",
    weight: 0.1,
  },
  codebaseNavigation: {
    label: "File navigation",
    description: "Whether you opened the expected relevant source files.",
    weight: 0.1,
  },
  evidenceGathering: {
    label: "Evidence gathering",
    description: "Currently uses the same failing-test-before-editing evidence as reproduction.",
    weight: 0.1,
  },
  hypothesisQuality: {
    label: "Hypothesis",
    description: "How specific and plausible your proposed explanation of the bug was.",
    weight: 0.1,
  },
  minimalFixQuality: {
    label: "Patch scope",
    description: "Which files you edited compared with the expected change area.",
    weight: 0.12,
  },
  verificationDiscipline: {
    label: "Verification",
    description: "Your final test results and whether they match the submitted code.",
    weight: 0.12,
  },
  overEditControl: {
    label: "Edit control",
    description: "How many files you edited outside the expected change area.",
    weight: 0.08,
  },
  rootCauseUnderstanding: {
    label: "Root-cause understanding",
    description: "How accurately you explained the cause of the bug in the conversation.",
    weight: 0.1,
  },
  regressionPrevention: {
    label: "Regression prevention",
    description: "How specific and technically sound your idea for preventing the bug was.",
    weight: 0.08,
  },
  aiCollaborationQuality: {
    label: "AI collaboration",
    description: "Currently unassessed; this dimension receives a neutral 50/100.",
    weight: 0.05,
  },
  communication: {
    label: "Communication clarity",
    description: "How clearly and relevantly you explained your debugging process.",
    weight: 0.05,
  },
} satisfies Record<BugfixScoreDimension, { label: string; description: string; weight: number }>

export const BUGFIX_SCORE_CATEGORIES = {
  understanding: {
    label: "Investigation",
    dimensions: ["reproductionDiscipline", "codebaseNavigation", "evidenceGathering"],
  },
  problemSolving: {
    label: "Root Cause",
    dimensions: ["hypothesisQuality", "rootCauseUnderstanding", "regressionPrevention"],
  },
  codeQuality: {
    label: "Fix Quality",
    dimensions: ["minimalFixQuality", "verificationDiscipline", "overEditControl"],
  },
  communication: {
    label: "Communication",
    dimensions: ["communication", "aiCollaborationQuality"],
  },
} as const satisfies Record<string, { label: string; dimensions: readonly BugfixScoreDimension[] }>

export type BugfixScoreCategory = keyof typeof BUGFIX_SCORE_CATEGORIES

/** Combined budget of the dimensions; category scores themselves are simple averages. */
export function bugfixCategoryOverallWeight(category: BugfixScoreCategory): number {
  return Math.round(
    BUGFIX_SCORE_CATEGORIES[category].dimensions.reduce(
      (total, dimension) => total + BUGFIX_SCORE_DIMENSIONS[dimension].weight,
      0
    ) * 100
  )
}
