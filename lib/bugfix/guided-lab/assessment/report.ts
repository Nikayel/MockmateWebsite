import type { GuidedLabConfig } from "../types"
import { emptyLabEvidence } from "./evidence"
import { labEvidenceSchema, type LabAssessment, type PhaseReview, type LabEvent } from "./schema"

export function unobservedReview(phaseId: string, unavailable = false): PhaseReview {
  const dimension = {
    status: "not_observed" as const,
    evidenceIds: [],
    feedback: unavailable
      ? "The reasoning review is unavailable. Your workspace checks are preserved."
      : "There is not enough recorded evidence to assess this yet.",
  }
  return {
    phaseId,
    communication: { ...dimension },
    investigation: { ...dimension },
    repair: { ...dimension },
  }
}

/** Observations are practice evidence, not proof of independently demonstrated skill. */
export function buildLabAssessment(config: GuidedLabConfig, raw: unknown): LabAssessment {
  const parsed = labEvidenceSchema.safeParse(raw)
  const log = parsed.success ? parsed.data : emptyLabEvidence()
  const report: LabAssessment = {
    version: 1,
    kind: "guided_practice",
    reviewStatus: "not_observed",
    evidenceTruncated: log.truncated || !parsed.success,
    phases: config.milestones.map((phase) => {
      const suites = phase.gate.kind === "tests-pass" ? phase.gate.testSuites : []
      const relevantRuns = log.events.filter(
        (e): e is Extract<LabEvent, { kind: "test_run" }> =>
          e.kind === "test_run" && e.results.some((r) => suites.includes(r.suite))
      )
      const latest =
        relevantRuns.filter((e) => !e.stale && e.revision === log.revision).at(-1) ??
        relevantRuns.at(-1)
      const rows = latest?.results.filter((r) => suites.includes(r.suite) && !r.harnessError) ?? []
      const complete =
        suites.length > 0 && suites.every((suite) => rows.some((r) => r.suite === suite))
      const stale = latest && (latest.stale || latest.revision !== log.revision)
      const runIds = new Set(relevantRuns.map((e) => e.id))
      const allEvidence = log.events.filter(
        (e) =>
          e.phaseId === phase.id ||
          (phase.gate.kind === "tests-pass" &&
            e.kind === "message" &&
            e.phaseId === config.verificationMilestoneId) ||
          (phase.gate.kind === "tests-pass" &&
            e.kind === "checkpoint" &&
            (!latest || e.timestamp <= latest.timestamp)) ||
          runIds.has(e.id) ||
          (e.kind === "transition" && e.toPhaseId === phase.id)
      )
      // Keep both the initial reasoning and recent repairs, with a per-phase storage budget.
      const evidence: LabEvent[] = []
      let bytes = 0
      const candidates = [...allEvidence.slice(0, 3), ...allEvidence.slice(3).reverse()]
      for (const event of candidates) {
        const sized =
          event.kind === "test_run"
            ? { ...event, results: event.results.filter((row) => suites.includes(row.suite)) }
            : event
        const size = new TextEncoder().encode(JSON.stringify(sized)).byteLength
        if (bytes + size > 48000) continue
        evidence.push(sized)
        bytes += size
      }
      evidence.sort(
        (a, b) =>
          log.events.findIndex((e) => e.id === a.id) - log.events.findIndex((e) => e.id === b.id)
      )
      return {
        phaseId: phase.id,
        title: phase.title,
        verification:
          phase.gate.kind === "manual-ack"
            ? "not_applicable"
            : !latest || !complete
              ? "not_observed"
              : stale
                ? "stale"
                : rows.every((r) => r.passed)
                  ? "passed"
                  : "failing",
        testsPassed: rows.filter((r) => r.passed).length,
        testsTotal: rows.length,
        runId: latest?.runId ?? null,
        revision: latest?.revision ?? null,
        reproducedFailure: relevantRuns.some(
          (e) =>
            !e.stale &&
            e.results.some((r) => suites.includes(r.suite) && !r.passed && !r.harnessError)
        ),
        regressions: log.events.filter(
          (e) => e.kind === "transition" && e.reason === "regression" && e.toPhaseId === phase.id
        ).length,
        assistanceAvailable: log.events.some(
          (e) =>
            e.phaseId === phase.id &&
            (e.kind === "hint" || (e.kind === "message" && e.role !== "candidate"))
        ),
        evidence,
        review: unobservedReview(phase.id),
      }
    }),
  }
  report.evidenceTruncated ||= report.phases.some((phase) =>
    log.events
      .filter((e) => e.phaseId === phase.phaseId)
      .some((e) => !phase.evidence.some((kept) => kept.id === e.id))
  )
  return report
}

/** A model may interpret evidence; it cannot invent references or change verification. */
export function applyLabReviews(
  report: LabAssessment,
  reviews: PhaseReview[] | null
): LabAssessment {
  return {
    ...report,
    reviewStatus: reviews === null ? "unavailable" : "available",
    phases: report.phases.map((phase) => {
      const proposed = reviews?.find((r) => r.phaseId === phase.phaseId)
      const review = unobservedReview(phase.phaseId, reviews === null)
      for (const key of ["communication", "investigation", "repair"] as const) {
        const dimension = proposed?.[key]
        if (!dimension) continue
        const cited = dimension.evidenceIds.map((id) => phase.evidence.find((e) => e.id === id))
        const valid = cited.length > 0 && cited.every(Boolean)
        const hasCandidate = cited.some((e) => e?.kind === "message" && e.role === "candidate")
        const hasPatch = cited.some((e) => e?.kind === "checkpoint" && e.patches.length > 0)
        if (dimension.status === "not_observed") continue
        const hasRun = cited.some(
          (e) => e?.kind === "test_run" && !e.stale && e.results.some((r) => !r.harnessError)
        )
        const grounded =
          key === "repair"
            ? hasPatch
            : key === "investigation"
              ? hasCandidate && (hasRun || hasPatch)
              : hasCandidate
        if (valid && grounded) review[key] = dimension
      }
      return { ...phase, review }
    }),
  }
}
