import { GuidedLabEvidence } from "./GuidedLabEvidence"
import { Check, Circle, RotateCcw } from "lucide-react"
import type { LabAssessment } from "@/lib/bugfix/guided-lab/assessment/schema"

const verificationLabels = {
  passed: "Checks passing",
  failing: "Checks need work",
  stale: "Run checks again",
  not_observed: "Checks not recorded",
  not_applicable: "Investigation",
}
const ratingLabels = {
  demonstrated: "Demonstrated",
  developing: "Needs work",
  not_observed: "Not observed",
}
const dimensions = {
  communication: "Explanation",
  investigation: "Investigation",
  repair: "Code changes",
} as const

export function GuidedLabFeedback({ assessment }: { assessment?: LabAssessment | null }) {
  if (!assessment)
    return (
      <p className="text-muted-foreground text-sm">
        Phase evidence is unavailable for this older attempt. Recorded test results are preserved.
      </p>
    )
  return (
    <section aria-label="Phase feedback" className="space-y-3">
      <h2 className="text-base font-semibold">Phase feedback</h2>
      <p className="text-muted-foreground text-sm">
        Feedback uses your explanations, code checkpoints and workspace checks. Hints and retries
        carry no point penalty.
      </p>
      {assessment.reviewStatus === "unavailable" && (
        <p role="status" className="text-muted-foreground text-sm">
          The reasoning review is unavailable. Your recorded checks are shown below.
        </p>
      )}
      {assessment.evidenceTruncated && (
        <p className="text-muted-foreground text-xs">
          Some earlier evidence is missing or was shortened. Findings are limited to the recorded
          evidence.
        </p>
      )}
      {assessment.phases.map((phase, index) => {
        const Icon =
          phase.verification === "passed" ? Check : phase.regressions ? RotateCcw : Circle
        const prefix = `lab-${phase.phaseId}`
        return (
          <details key={phase.phaseId} className="border-border rounded-lg border">
            <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer flex-wrap items-center gap-2 rounded-lg px-4 py-3 text-sm focus-visible:ring-2">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-medium">
                {index + 1}. {phase.title}
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                {verificationLabels[phase.verification]}
              </span>
            </summary>
            <div className="space-y-4 px-4 pb-4">
              {phase.testsTotal > 0 && (
                <p className="text-muted-foreground text-xs">
                  {phase.testsPassed}/{phase.testsTotal} recorded checks passing · revision{" "}
                  {phase.revision}
                  {phase.verification === "stale" && " · superseded by edits"}
                </p>
              )}
              {phase.regressions > 0 && (
                <p className="text-muted-foreground text-xs">
                  Reopened after a regression. Earlier attempts remain in the evidence.
                </p>
              )}
              {phase.assistanceAvailable && (
                <p className="text-muted-foreground text-xs">
                  Guidance was available during this phase. Feedback distinguishes supplied guidance
                  from your explanation.
                </p>
              )}
              <dl className="space-y-3">
                {(Object.keys(dimensions) as (keyof typeof dimensions)[]).map((key) => {
                  const result = phase.review[key]
                  return (
                    <div key={key}>
                      <dt className="text-sm font-medium">
                        {dimensions[key]}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {ratingLabels[result.status]}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm leading-relaxed">
                        {result.feedback}
                        {result.evidenceIds.length > 0 && (
                          <span className="ml-1 text-xs">
                            Evidence: {result.evidenceIds.join(", ")}
                          </span>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>
              <details>
                <summary className="text-muted-foreground focus-visible:ring-ring min-h-11 cursor-pointer py-3 text-xs underline underline-offset-4 focus-visible:ring-2">
                  Review recorded evidence
                </summary>
                <ol className="space-y-3">
                  {phase.evidence.map((event) => (
                    <GuidedLabEvidence
                      key={event.id}
                      event={event}
                      prefix={prefix}
                      sourcePhase={
                        event.phaseId !== phase.phaseId
                          ? assessment.phases.find((p) => p.phaseId === event.phaseId)?.title
                          : undefined
                      }
                    />
                  ))}
                </ol>
                {!phase.evidence.length && (
                  <p className="text-muted-foreground text-xs">No phase evidence was recorded.</p>
                )}
              </details>
            </div>
          </details>
        )
      })}
    </section>
  )
}
