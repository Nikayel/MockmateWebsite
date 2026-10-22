import type { LabAssessment } from "./schema"

export function summarizeLabFeedback(report: LabAssessment) {
  const verified = report.phases.filter((p) => p.verification === "passed").length
  const checkPhases = report.phases.filter((p) => p.verification !== "not_applicable").length
  const findings = report.phases.flatMap((p) =>
    [p.review.communication, p.review.investigation, p.review.repair].map((d) => ({
      ...d,
      title: p.title,
    }))
  )
  return {
    tldr: `${verified}/${checkPhases} test-gated phases have current passing checks. Guided practice is separate from interview readiness.`,
    whatWorked: findings
      .filter((d) => d.status === "demonstrated")
      .map((d) => `${d.title}: ${d.feedback}`)
      .slice(0, 4),
    fixNext: findings
      .filter((d) => d.status === "developing")
      .map((d) => `${d.title}: ${d.feedback}`)
      .slice(0, 4),
    actionPlan: [
      verified < checkPhases
        ? "Run the full regression suite on your latest code and revisit failing phases."
        : "Try an independent debugging round to practise applying these skills without phase guidance.",
    ],
  }
}
