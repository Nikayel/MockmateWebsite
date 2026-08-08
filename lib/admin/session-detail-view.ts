/**
 * What the session drill-in shows, as data rather than JSX.
 *
 * The interesting decisions in a detail panel are which fields appear, in what
 * grouping, and how an absent value reads. Those are rules, so they live here
 * where a test can hold them, and the page is left rendering sections in a loop.
 *
 * The panel deliberately reports the existence of the private material rather
 * than its contents: an admin needs to know a round has stored feedback and how
 * many silent notes it produced, not to read the interviewer's private notes on
 * a candidate out of an analytics screen.
 */

import type { SessionDetail } from "./session-rows"
import {
  SESSION_STATUS_DISPLAY,
  absoluteTime,
  formatDuration,
  formatScore,
  sessionTypeLabel,
} from "./session-display"

export interface DetailField {
  label: string
  value: string
  /** `absent` greys the value out: the field has no data rather than a short one. */
  tone?: "absent" | "accent"
}

export interface DetailSection {
  title: string
  fields: DetailField[]
}

/** A value, or an explicit "we do not have this" that never looks like a real one. */
function present(value: string | null, fallback = "Not recorded"): DetailField["value"] {
  return value === null || value.trim() === "" ? fallback : value
}

function toneFor(value: string | null): DetailField["tone"] {
  return value === null || value.trim() === "" ? "absent" : undefined
}

export function buildSessionDetailSections(detail: SessionDetail): DetailSection[] {
  const sections: DetailSection[] = [
    {
      title: "Round",
      fields: [
        { label: "Problem", value: detail.scenarioTitle },
        { label: "Type", value: sessionTypeLabel(detail.sessionType) },
        { label: "Difficulty", value: detail.difficulty },
        {
          label: "Pattern",
          value: present(detail.pattern, "None recorded"),
          tone: toneFor(detail.pattern),
        },
        {
          label: "Scenario id",
          value: present(detail.scenarioId, "None recorded"),
          tone: toneFor(detail.scenarioId),
        },
        {
          label: "Target company",
          value: present(detail.targetCompany, "None chosen"),
          tone: toneFor(detail.targetCompany),
        },
        ...(detail.isGuidedLab
          ? [{ label: "Guided lab", value: "Yes", tone: "accent" as const }]
          : []),
      ],
    },
    {
      title: "Who",
      fields: [
        { label: "User", value: detail.userLabel },
        {
          label: "User id",
          value: present(detail.userId, "None"),
          tone: toneFor(detail.userId),
        },
        { label: "Guest", value: detail.isGuest ? "Yes" : "No" },
      ],
    },
    {
      title: "Timing",
      fields: [
        { label: "Status", value: SESSION_STATUS_DISPLAY[detail.status].label, tone: "accent" },
        { label: "Started", value: absoluteTime(detail.startedAt) },
        { label: "Completed", value: absoluteTime(detail.completedAt) },
        { label: "Duration", value: formatDuration(detail.durationMinutes) },
        { label: "Last updated", value: absoluteTime(detail.updatedAt) },
      ],
    },
    {
      title: "Scores",
      fields: [
        { label: "Performance", value: formatScore(detail.performanceScore), tone: "accent" },
        { label: "Technical", value: formatScore(detail.technicalScore) },
        { label: "Efficiency", value: formatScore(detail.efficiencyScore) },
        { label: "Mastery", value: formatScore(detail.masteryScore) },
      ],
    },
  ]

  if (detail.scoreBreakdown) {
    sections.push({
      title: "Score breakdown",
      fields: [
        { label: "Understanding", value: formatScore(detail.scoreBreakdown.understanding) },
        { label: "Problem solving", value: formatScore(detail.scoreBreakdown.problemSolving) },
        { label: "Code quality", value: formatScore(detail.scoreBreakdown.codeQuality) },
        { label: "Communication", value: formatScore(detail.scoreBreakdown.communication) },
        { label: "Overall", value: formatScore(detail.scoreBreakdown.overall) },
      ],
    })
  }

  sections.push({
    title: "Feedback",
    fields: [
      {
        label: "Feedback state",
        value: present(detail.feedbackStatus, "Never generated"),
        tone: toneFor(detail.feedbackStatus),
      },
      { label: "Persisted", value: absoluteTime(detail.feedbackPersistedAt) },
      {
        label: "Full feedback stored",
        // Reported, never shipped: the body is the whole model output for the round.
        value: detail.hasStoredFeedback ? "Yes, held server side" : "No",
        tone: detail.hasStoredFeedback ? undefined : "absent",
      },
      {
        label: "Silent notes",
        // The count answers "did the interviewer notice things it never said" without
        // putting a private read on a candidate into an analytics screen.
        value: detail.silentNoteCount === 0 ? "None" : `${detail.silentNoteCount} recorded`,
        tone: detail.silentNoteCount === 0 ? "absent" : undefined,
      },
    ],
  })

  return sections
}

/** The one-line feedback summary, when there is one worth showing above the grid. */
export function sessionDetailHeadline(detail: SessionDetail): string | null {
  return detail.feedbackSummary
}
