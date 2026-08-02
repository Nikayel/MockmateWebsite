import { describe, it, expect, vi } from "vitest"

// The hook module is a client component that pulls in Firebase Analytics and the
// tutorial store. Only the pure transition helper is under test, so the heavy
// leaves are stubbed rather than initialised.
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }))
vi.mock("@/lib/tutorials/progress-client", () => ({
  fetchLessonProgress: vi.fn(),
  saveLessonProgress: vi.fn(),
}))

import { lessonStatusAnalyticsEvent } from "../useTutorialProgressSync"

/**
 * Guards the Learn funnel against the two ways a status-derived event goes wrong:
 * counting a resumed lesson as a new start, and counting one completion twice.
 * Both inflate the only retention number the product reports on.
 */
describe("lessonStatusAnalyticsEvent", () => {
  it("reports a start when a fresh lesson is first touched", () => {
    expect(lessonStatusAnalyticsEvent("not_started", "in_progress")).toBe("lesson_started")
  })

  it("treats a null baseline as a fresh lesson", () => {
    // Null is the pre-load baseline. A lesson whose progress doc never existed
    // resolves to it, so it has to behave exactly like "not_started".
    expect(lessonStatusAnalyticsEvent(null, "in_progress")).toBe("lesson_started")
  })

  it("reports a completion when the lesson finishes", () => {
    expect(lessonStatusAnalyticsEvent("in_progress", "completed")).toBe("lesson_complete")
  })

  it("completes straight from untouched without a start event", () => {
    // Possible when hydration lands mid-flight or a lesson is finished in one
    // store update. The completion is the event that matters; the start is lost
    // rather than fabricated.
    expect(lessonStatusAnalyticsEvent("not_started", "completed")).toBe("lesson_complete")
  })

  it("stays silent when the status has not moved", () => {
    // The autosave path re-runs on every store write, including server timestamp
    // stamps. Without this, one completion would emit on every save.
    expect(lessonStatusAnalyticsEvent("completed", "completed")).toBeNull()
    expect(lessonStatusAnalyticsEvent("in_progress", "in_progress")).toBeNull()
    expect(lessonStatusAnalyticsEvent("not_started", "not_started")).toBeNull()
  })

  it("does not re-report a start when returning to an unfinished lesson", () => {
    // The baseline is captured POST-hydration, so a resumed in_progress lesson
    // arrives with prevSynced already in_progress and emits nothing above.
    // The reverse move (completed -> in_progress) is a reset, not a new start.
    expect(lessonStatusAnalyticsEvent("completed", "in_progress")).toBeNull()
  })

  it("never emits for a move back to not_started", () => {
    expect(lessonStatusAnalyticsEvent("completed", "not_started")).toBeNull()
    expect(lessonStatusAnalyticsEvent("in_progress", "not_started")).toBeNull()
    expect(lessonStatusAnalyticsEvent(null, "not_started")).toBeNull()
  })
})
