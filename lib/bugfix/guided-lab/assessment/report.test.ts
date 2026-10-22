import { describe, expect, it } from "vitest"
import { bookclubGuidedLab as config } from "@/lib/scenarios/real-world/bugfix/bookclub/milestones"
import { appendLabEvidence, emptyLabEvidence } from "./evidence"
import { applyLabReviews, buildLabAssessment, unobservedReview } from "./report"
import { labAssessmentSchema, labEvidenceSchema, type LabObservation } from "./schema"
import { evidenceMatchesLab } from "./validation"
import { describePatch } from "./patch"

const phaseId = "m2-streak"
const run = (passed: boolean, stale = false): LabObservation => ({
  kind: "test_run",
  runId: "run-1",
  stale,
  results: ["visible streak", "hidden streak"].map((suite) => ({
    name: "completion days",
    suite,
    passed,
    harnessError: false,
  })),
})
const logWith = (...events: LabObservation[]) =>
  events.reduce((log, e) => appendLabEvidence(log, phaseId, e), emptyLabEvidence())
const phase = (log: unknown) => buildLabAssessment(config, log).phases[1]

describe("guided phase assessment", () => {
  it("leaves missing evidence unobserved instead of assigning a low score", () => {
    const report = buildLabAssessment(config, undefined)
    expect(report.phases[1].verification).toBe("not_observed")
    expect(report.phases[1].review.communication.status).toBe("not_observed")
    expect(report).not.toHaveProperty("overall")
    expect(labAssessmentSchema.safeParse(report).success).toBe(true)
  })
  it("retains the reproduced failure and later verified outcome", () => {
    const result = phase(logWith(run(false), run(true)))
    expect(result.reproducedFailure).toBe(true)
    expect(result.verification).toBe("passed")
    expect(result.evidence.filter((e) => e.kind === "test_run")).toHaveLength(2)
    expect(result.review.investigation.status).toBe("not_observed")
  })
  it("requires all required suites in one run", () => {
    const log = logWith(run(true))
    const event = log.events[0]
    if (event.kind === "test_run") event.results.pop()
    expect(phase(log).verification).toBe("not_observed")
  })
  it("does not count harness failures as evidence of a broken learner repair", () => {
    const log = logWith(run(false))
    const event = log.events[0]
    if (event.kind === "test_run") event.results.forEach((r) => (r.harnessError = true))
    expect(phase(log).verification).toBe("not_observed")
    expect(phase(log).reproducedFailure).toBe(false)
  })
  it("marks an old green run stale after edits", () => {
    const log = logWith(run(true))
    log.revision++
    expect(phase(log).verification).toBe("stale")
  })
  it("ignores a late stale response when current checks already passed", () => {
    let log = logWith(run(true))
    log.revision = 1
    log = appendLabEvidence(log, phaseId, run(true), 1)
    log = appendLabEvidence(log, phaseId, run(false, true), 0)
    expect(phase(log).verification).toBe("passed")
    expect(phase(log).revision).toBe(1)
  })
  it("rechecks earlier contracts with the release run and preserves reopen history", () => {
    let log = logWith(run(false))
    log = appendLabEvidence(log, "m5-cache", {
      kind: "transition",
      reason: "regression",
      toPhaseId: phaseId,
    })
    log = appendLabEvidence(log, "m6-release", run(true))
    expect(phase(log).verification).toBe("passed")
    expect(phase(log).regressions).toBe(1)
  })
  it("keeps assistance as context without lowering verified outcomes", () => {
    const result = phase(
      logWith({ kind: "hint", text: "Check completion dates", truncated: false }, run(true))
    )
    expect(result.assistanceAvailable).toBe(true)
    expect(result.verification).toBe("passed")
  })
  it("rejects invented citations and AI-only communication evidence", () => {
    const log = logWith({
      kind: "message",
      role: "ai_partner",
      lane: "partner",
      text: "Use finished_at",
      truncated: false,
    })
    const review = unobservedReview(phaseId)
    review.communication = { status: "demonstrated", feedback: "Good cause", evidenceIds: ["e0"] }
    review.repair = { status: "demonstrated", feedback: "Good patch", evidenceIds: ["made-up"] }
    const result = applyLabReviews(buildLabAssessment(config, log), [review]).phases[1]
    expect(result.review.communication.status).toBe("not_observed")
    expect(result.review.repair.status).toBe("not_observed")
  })
  it("requires a patch for code assessment and a candidate message for reasoning", () => {
    const log = logWith(
      {
        kind: "message",
        role: "candidate",
        lane: "interviewer",
        text: "Started dates explain the zero streak.",
        truncated: false,
      },
      { kind: "checkpoint", patches: [describePatch("stats.py", "started_at", "finished_at")!] }
    )
    const review = unobservedReview(phaseId)
    review.communication = {
      status: "demonstrated",
      feedback: "Explained the date contract.",
      evidenceIds: ["e0"],
    }
    review.repair = {
      status: "demonstrated",
      feedback: "Changed completion-day input.",
      evidenceIds: ["e1"],
    }
    const report = applyLabReviews(buildLabAssessment(config, log), [review])
    expect(report.phases[1].review).toEqual(review)
    expect(report.phases[1].verification).toBe("not_observed")
  })
  it("never turns a model outage into a learner failure", () => {
    const report = applyLabReviews(buildLabAssessment(config, logWith(run(true))), null)
    expect(report.reviewStatus).toBe("unavailable")
    expect(report.phases[1].verification).toBe("passed")
    expect(report.phases[1].review.repair.status).toBe("not_observed")
  })
  it("validates event bounds, unique IDs, and the actual lab contract", () => {
    const log = { ...logWith(run(true)), attemptId: "attempt" }
    expect(evidenceMatchesLab(log, config, "attempt", [])).toBe(true)
    expect(evidenceMatchesLab(log, config, "another", [])).toBe(false)
    log.events[0].phaseId = "fake-phase"
    expect(evidenceMatchesLab(log, config, "attempt", [])).toBe(false)
    log.events.push(log.events[0])
    expect(labEvidenceSchema.safeParse(log).success).toBe(false)
    expect(labEvidenceSchema.safeParse({ ...log, revision: NaN }).success).toBe(false)
  })
  it("keeps evidence bounded and marks lost history, including unicode", () => {
    let log = emptyLabEvidence()
    for (let n = 0; n < 340; n++)
      log = appendLabEvidence(log, phaseId, {
        kind: "message",
        role: "candidate",
        lane: "interviewer",
        text: "🔧".repeat(1000),
        truncated: false,
      })
    expect(log.truncated).toBe(true)
    expect(log.events[0].id).toBe("e0")
    expect(log.events.at(-1)?.id).toBe("e339")
    expect(labEvidenceSchema.safeParse(log).success).toBe(true)
  })
  it("captures an actual before/after changed region and marks excerpt limits", () => {
    const patch = describePatch(
      "stats.py",
      "unchanged\nstarted_at\nend",
      "unchanged\nfinished_at\nend"
    )!
    expect(patch.before).toContain("started_at")
    expect(patch.after).toContain("finished_at")
    expect(describePatch("stats.py", "same", "same")).toBeNull()
    expect(describePatch("stats.py", "a".repeat(4000), "b".repeat(4000))?.truncated).toBe(true)
  })
})

it("allows a later phase to reference a relevant repair made early without changing its provenance", () => {
  const log = logWith({
    kind: "checkpoint",
    patches: [describePatch("history.py", "started_at", "finished_at")!],
  })
  const report = buildLabAssessment(config, log)
  const review = unobservedReview("m3-history")
  review.repair = {
    status: "demonstrated",
    feedback: "A relevant early patch.",
    evidenceIds: ["e0"],
  }
  const result = applyLabReviews(report, [review]).phases[2]
  expect(result.review.repair.status).toBe("demonstrated")
  expect(result.evidence[0].phaseId).toBe("m2-streak")
  expect(result.verification).toBe("not_observed")
})

it("uses a release debrief as retrospective explanation without rewriting its phase", () => {
  const log = appendLabEvidence(emptyLabEvidence(), "m6-release", {
    kind: "message",
    role: "candidate",
    lane: "interviewer",
    text: "The streak failed because started_at counted starts instead of finishes.",
    truncated: false,
  })
  const review = unobservedReview("m2-streak")
  review.communication = {
    status: "demonstrated",
    feedback: "Explained completion days in the debrief.",
    evidenceIds: ["e0"],
  }
  const phase = applyLabReviews(buildLabAssessment(config, log), [review]).phases[1]
  expect(phase.review.communication.status).toBe("demonstrated")
  expect(phase.evidence[0].phaseId).toBe("m6-release")
  expect(phase.review.investigation.status).toBe("not_observed")
})
