import { beforeEach, describe, expect, it } from "vitest"
import { useGuidedLabStore, getGuidedAttemptProgress } from "@/lib/stores/guided-lab-store"
import { bookclubGuidedLab as config } from "@/lib/scenarios/real-world/bugfix/bookclub/milestones"
import { captureLabCheckpoint, captureLabMessage, seedLabCheckpoint } from "./capture"
import { applyGuidedLabGating } from "./execution"
import { parseGuidedLabProgress } from "../persistence"
import { serializeCheckpoint } from "@/lib/interview/session-lifecycle/checkpoint"
import { normalizeStoredCheckpoint } from "@/lib/interview/session-lifecycle/recovery"

const store = () => useGuidedLabStore.getState()
const id = "bugfix-bookclub-reading-streak-workspace"
const files = [
  { path: "stats.py", role: "editable", originalContent: "started_at", content: "started_at" },
]
beforeEach(() => {
  store().clear()
  store().initGuidedLab(id, config)
  store().bindAttempt(id, "attempt-1")
})
describe("phase evidence capture and recovery", () => {
  it("captures code once per checkpoint, not per keystroke or repeated run", () => {
    seedLabCheckpoint(id, files)
    captureLabCheckpoint(id, [{ ...files[0], content: "finished_at" }])
    captureLabCheckpoint(id, [{ ...files[0], content: "finished_at" }])
    expect(store().progress?.evidence?.events).toHaveLength(1)
    expect(store().progress?.evidence?.events[0].kind).toBe("checkpoint")
  })
  it("does not reinterpret restored changes as a new phase patch", () => {
    seedLabCheckpoint(id, [{ ...files[0], content: "already fixed" }])
    captureLabCheckpoint(id, [{ ...files[0], content: "already fixed" }])
    expect(store().progress?.evidence?.events).toEqual([])
  })
  it("records candidate and assistance separately, without claiming AI prose is the learner's", () => {
    captureLabMessage(id, "candidate", "partner", "Could this be the cache key?")
    captureLabMessage(id, "ai_partner", "partner", "Compare reader identities.")
    expect(store().progress?.evidence?.events.map((e) => e.kind === "message" && e.role)).toEqual([
      "candidate",
      "ai_partner",
    ])
  })
  it("captures a run under its original phase before gating advances it", () => {
    store().ackCheckpoint("investigation#0")
    store().ackCheckpoint("investigation#1")
    store().ackMilestone("m1-investigate")
    const revision = store().sourceRevision
    applyGuidedLabGating(
      id,
      ["visible streak", "hidden streak"].map((input) => ({
        input,
        description: "date contract",
        passed: true,
        error: null,
      })),
      revision,
      "m2-streak"
    )
    expect(store().progress?.currentMilestoneId).toBe("m3-history")
    const run = store().progress?.evidence?.events.find((e) => e.kind === "test_run")
    expect(run?.phaseId).toBe("m2-streak")
    expect(run?.revision).toBe(revision)
  })
  it("preserves but never uses in-flight results from edited source to unlock a phase", () => {
    store().ackCheckpoint("investigation#0")
    store().ackCheckpoint("investigation#1")
    store().ackMilestone("m1-investigate")
    const revision = store().sourceRevision
    store().invalidateVerification(id)
    applyGuidedLabGating(
      id,
      ["visible streak", "hidden streak"].map((input) => ({
        input,
        description: "date contract",
        passed: true,
        error: null,
      })),
      revision,
      "m2-streak"
    )
    expect(store().progress?.currentMilestoneId).toBe("m2-streak")
    const run = store().progress?.evidence?.events.find((e) => e.kind === "test_run")
    expect(run?.kind === "test_run" && run.stale).toBe(true)
  })
  it("does not leak another attempt's evidence or phases", () => {
    captureLabMessage(id, "candidate", "interviewer", "my diagnosis")
    expect(getGuidedAttemptProgress(id, "attempt-2")).toBeUndefined()
    store().bindAttempt(id, "attempt-2")
    expect(store().progress?.evidence?.events).toEqual([])
    expect(store().progress?.evidence?.attemptId).toBe("attempt-2")
  })
  it("round-trips evidence through both local and cloud checkpoint contracts", () => {
    captureLabMessage(id, "candidate", "interviewer", "finished_at, not started_at")
    const saved = store().progress!
    expect(parseGuidedLabProgress(JSON.parse(JSON.stringify(saved)))?.evidence).toEqual(
      saved.evidence
    )
    const serialized = serializeCheckpoint(
      { code: "", selectedLanguage: "python", elapsedTime: 1, guidedLabProgress: saved },
      []
    )
    expect(normalizeStoredCheckpoint(serialized)?.guidedLabProgress?.evidence).toEqual(
      saved.evidence
    )
    store().initGuidedLab(id, config, saved)
    expect(store().sourceRevision).toBeGreaterThan(saved.evidence!.revision)
    expect(store().progress?.evidence?.events).toHaveLength(1)
  })
  it("retains valid phase progress when optional telemetry is corrupt", () => {
    expect(
      parseGuidedLabProgress({ ...store().progress, evidence: { version: "invalid" } })
        ?.currentMilestoneId
    ).toBe("m1-investigate")
    expect(
      parseGuidedLabProgress({ ...store().progress, evidence: { version: "invalid" } })?.evidence
    ).toBeUndefined()
  })
})
