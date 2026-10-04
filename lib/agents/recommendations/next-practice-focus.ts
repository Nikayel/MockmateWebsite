import type { InterviewSession } from "@/lib/types"
import type { NextPracticeRecommendation } from "./next-practice-types"

type PracticeFocus = Pick<NextPracticeRecommendation, "focus" | "focusSource" | "feedbackNote">

/** Use observed behavior before generated advice; never infer a weakness from missing evidence. */
export function getNextPracticeFocus(session: InterviewSession): PracticeFocus {
  const evidence = session.bugfix_evidence_summary
  if (session.type === "bugfix" && evidence?.reproducedBeforeEditing === false) {
    return {
      focus: "Run the failing test and explain what it proves before editing the code.",
      focusSource: "bugfix-evidence",
    }
  }
  if (session.type === "bugfix" && evidence?.rootCauseExplained === false) {
    return {
      focus: "Explain the root cause and why your change fixes it, then verify with tests.",
      focusSource: "bugfix-evidence",
    }
  }
  const advice = session.structured_feedback?.fixNext?.find(
    (value) => typeof value === "string" && value.trim()
  )
  const feedbackNote = advice?.trim().slice(0, 500)
  const goals = {
    understandingScore:
      "Restate the requirements and check edge cases before choosing an approach.",
    problemSolvingScore: "Compare two approaches and explain your choice before implementing it.",
    codeQualityScore:
      session.type === "system-design"
        ? "Walk through a concrete failure and explain how the design recovers."
        : "Check normal and edge cases, then explain what your tests verify.",
    communicationScore:
      "Explain your reasoning as you work, including one tradeoff behind your choice.",
  } as const
  const weakest = (Object.keys(goals) as Array<keyof typeof goals>)
    .map((key) => ({ key, score: session.score_breakdown?.[key] }))
    .filter(
      (entry): entry is { key: keyof typeof goals; score: number } =>
        typeof entry.score === "number" &&
        Number.isFinite(entry.score) &&
        entry.score >= 0 &&
        entry.score < 70
    )
    .sort((a, b) => a.score - b.score)[0]
  if (weakest) return { focus: goals[weakest.key], focusSource: "score-breakdown", feedbackNote }
  return {
    focus:
      "Try a different problem, explain your approach, and check your result before submitting.",
    focusSource: "transfer",
    feedbackNote,
  }
}
