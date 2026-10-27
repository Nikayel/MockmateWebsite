import type { InterviewSession } from "@/lib/types"

/** Report stored observations; different tasks do not establish a causal score improvement. */
export function practiceObservations(before: InterviewSession, after: InterviewSession): string[] {
  if (before.type !== after.type) return []
  const observations: string[] = []
  if (before.type === "bugfix") {
    const previous = before.bugfix_evidence_summary
    const current = after.bugfix_evidence_summary
    if (previous?.reproducedBeforeEditing === false && current?.reproducedBeforeEditing === true)
      observations.push("This time, you reproduced the failure before editing the code.")
    if (
      previous?.rootCauseAssessment?.status === "observed" &&
      current?.rootCauseAssessment?.status === "observed" &&
      (previous.rootCauseAssessment.score ?? 100) < 70 &&
      (current.rootCauseAssessment.score ?? 0) >= 70
    )
      observations.push("This time, your session recorded an explanation of the root cause.")
  }
  const labels = {
    understandingScore: "Understanding",
    problemSolvingScore: "Problem solving",
    codeQualityScore: "Code quality",
    communicationScore: "Communication",
  } as const
  // A scoring-rule change is not a change in the learner's ability.
  if (before.measurement_version !== after.measurement_version) return observations
  const valid = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
  const weakest = (Object.keys(labels) as (keyof typeof labels)[])
    .filter((key) => valid(before.score_breakdown?.[key]) && valid(after.score_breakdown?.[key]))
    .sort((a, b) => before.score_breakdown![a]! - before.score_breakdown![b]!)[0]
  if (weakest && !observations.length) {
    observations.push(
      `${labels[weakest]}: ${Math.round(before.score_breakdown![weakest]!)} / 100 in your previous task; ${Math.round(after.score_breakdown![weakest]!)} / 100 in this task. These were different exercises.`
    )
  }
  return observations
}
