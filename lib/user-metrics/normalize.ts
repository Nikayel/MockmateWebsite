import { isScoredCompletedSession } from "@/lib/interview/completion-status"
import { clampPracticeMinutes } from "@/lib/session-duration"
import { calculateTechnicalScoreFromBreakdown } from "@/lib/constants"
import type { MetricSession } from "./types"

export function score(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback
}

/** Final feedback owns scores. Null means unobserved; zero is a valid score. */
export function normalizeMetricSession(
  id: string,
  raw: unknown,
  now = Date.now()
): MetricSession | null {
  const doc = record(raw)
  const completedMs = typeof doc.completed_at === "string" ? Date.parse(doc.completed_at) : NaN
  if (!Number.isFinite(completedMs) || completedMs > now) return null
  if (!isScoredCompletedSession(doc)) return null
  const scenarioId = text(doc.scenario_id, id)
  const guided =
    doc.is_guided_lab === true ||
    record(doc.guided_lab_assessment).kind === "guided_practice" ||
    scenarioId === "bugfix-bookclub-reading-streak-workspace"
  const performance = guided
    ? (score(record(doc.guided_lab_mastery).masteryScore) ??
      score(doc.mastery_score) ??
      score(doc.performance_score))
    : score(doc.performance_score)
  if (performance === null) return null
  const breakdown = record(doc.score_breakdown ?? doc.scoreBreakdown)
  const categories = {
    understanding: score(breakdown.understandingScore ?? breakdown.understanding),
    problemSolving: score(breakdown.problemSolvingScore ?? breakdown.problemSolving),
    codeQuality: score(breakdown.codeQualityScore ?? breakdown.codeQuality),
    communication: score(breakdown.communicationScore ?? breakdown.communication),
  }
  let technical = score(doc.technical_score) ?? score(doc.mastery_score)
  if (
    technical === null &&
    categories.understanding !== null &&
    categories.problemSolving !== null &&
    categories.codeQuality !== null
  ) {
    technical = calculateTechnicalScoreFromBreakdown({
      understandingScore: categories.understanding,
      problemSolvingScore: categories.problemSolving,
      codeQualityScore: categories.codeQuality,
    })
  }
  const rawEvidence = record(doc.bugfix_evidence_summary)
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : undefined
  const count = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
  // Only fields actually observed are exposed. Missing evidence is never a zero.
  const evidence = Object.fromEntries(
    Object.entries({
      reproducedBeforeEditing:
        typeof rawEvidence.reproducedBeforeEditing === "boolean"
          ? rawEvidence.reproducedBeforeEditing
          : undefined,
      inspectedFiles: strings(rawEvidence.inspectedFiles),
      inspectedTestOrDocs: strings(rawEvidence.inspectedTestOrDocs),
      visibleTestsRun: count(rawEvidence.visibleTestsRun),
      aiShortcutCount: count(rawEvidence.aiShortcutCount),
    }).filter(([, value]) => value !== undefined)
  )
  return {
    id,
    scenarioId,
    title: text(doc.topic, text(doc.scenario_title, scenarioId)),
    type: text(doc.type, "unknown"),
    pattern: text(doc.pattern, text(doc.type, "unknown")),
    difficulty: text(doc.difficulty, "unknown"),
    completedAt: new Date(completedMs).toISOString(),
    durationMinutes: clampPracticeMinutes(
      doc.started_at as string | undefined,
      doc.completed_at as string
    ),
    kind: guided ? "guided_lab" : "interview",
    measurementVersion: typeof doc.measurement_version === "number" ? doc.measurement_version : 1,
    performanceScore: performance,
    technicalScore: guided ? null : technical,
    debuggingScore: score(record(doc.bugfix_score_breakdown).overall) ?? performance,
    scoreBreakdown:
      guided || Object.values(categories).every((v) => v === null) ? null : categories,
    evidence: Object.keys(evidence).length ? evidence : null,
  }
}
