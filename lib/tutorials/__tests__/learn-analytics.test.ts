/**
 * Pins the aggregation rules that decide what the curriculum team sees.
 *
 * The load-bearing one is per-learner deduplication. Checks are freely retryable, so a
 * naive count would let one persistent learner's five wrong answers dominate an item's
 * misconception profile and make heavily-retried items look far harder than they are.
 */
import { describe, it, expect } from "vitest"
import {
  deidentify,
  pseudonymize,
  summarizeCheckDifficulty,
  summarizeExerciseStruggle,
  summarizeLessonFunnel,
} from "../learn-analytics"
import type { LearnItemResponse, TutorialLessonProgress } from "../types"

function checkRow(over: Partial<LearnItemResponse>): LearnItemResponse {
  return {
    id: `${over.user_id ?? "u"}-${over.timestamp ?? "t"}`,
    user_id: "u1",
    timestamp: "2026-08-02T10:00:00.000Z",
    kind: "check_answer",
    course_id: "python",
    lesson_id: "py-l1-loops",
    level_id: 1,
    item_id: "py-l1-loops#is-vs-eq",
    section: "teach",
    skills: ["identity"],
    research_consent: true,
    check_kind: "predict",
    ...over,
  } as LearnItemResponse
}

function runRow(over: Partial<LearnItemResponse>): LearnItemResponse {
  return checkRow({ kind: "exercise_run", item_id: "py-l1-loops-apply", section: "apply", ...over })
}

describe("summarizeCheckDifficulty", () => {
  it("counts each learner once, at their first commit", () => {
    const rows = [
      // One learner, wrong then right. Should read as ONE learner, wrong on first try.
      checkRow({
        user_id: "u1",
        timestamp: "2026-08-02T10:00:00.000Z",
        correct: false,
        selected_label: "It copies the list",
      }),
      checkRow({
        user_id: "u1",
        timestamp: "2026-08-02T10:00:30.000Z",
        correct: true,
        retry_index: 1,
      }),
      checkRow({ user_id: "u2", timestamp: "2026-08-02T10:01:00.000Z", correct: true }),
    ]
    const [item] = summarizeCheckDifficulty(rows)
    expect(item.learners).toBe(2)
    expect(item.responses).toBe(3)
    expect(item.firstTryAccuracy).toBe(0.5)
  })

  it("ranks distractors by how often they fired on first contact", () => {
    const rows = [
      checkRow({ user_id: "a", correct: false, selected_label: "It copies the list" }),
      checkRow({ user_id: "b", correct: false, selected_label: "It copies the list" }),
      checkRow({ user_id: "c", correct: false, selected_label: "It raises an error" }),
      checkRow({ user_id: "d", correct: true }),
    ]
    const [item] = summarizeCheckDifficulty(rows)
    expect(item.topDistractors).toEqual([
      { label: "It copies the list", count: 2 },
      { label: "It raises an error", count: 1 },
    ])
  })

  it("sorts hardest first, since that is the content review queue", () => {
    const rows = [
      checkRow({ item_id: "easy", user_id: "a", correct: true }),
      checkRow({ item_id: "hard", user_id: "b", correct: false, selected_label: "x" }),
    ]
    expect(summarizeCheckDifficulty(rows).map((i) => i.itemId)).toEqual(["hard", "easy"])
  })

  it("ignores non-check rows", () => {
    expect(summarizeCheckDifficulty([runRow({ passed: true })])).toEqual([])
  })
})

describe("summarizeExerciseStruggle", () => {
  it("measures attempts up to and including the first pass", () => {
    const rows = [
      runRow({
        user_id: "u1",
        timestamp: "2026-08-02T10:00:00.000Z",
        passed: false,
        error_kind: "name",
      }),
      runRow({
        user_id: "u1",
        timestamp: "2026-08-02T10:01:00.000Z",
        passed: false,
        error_kind: "name",
      }),
      runRow({ user_id: "u1", timestamp: "2026-08-02T10:02:00.000Z", passed: true }),
    ]
    const [item] = summarizeExerciseStruggle(rows)
    expect(item.medianAttemptsToPass).toBe(3)
    expect(item.passRate).toBe(1)
    expect(item.topErrorKinds).toEqual([{ kind: "name", count: 2 }])
  })

  it("reports hint reliance per learner, not per reveal", () => {
    const rows = [
      runRow({ user_id: "u1", passed: true }),
      runRow({ user_id: "u2", passed: true }),
      checkRow({ kind: "hint_reveal", item_id: "py-l1-loops-apply", user_id: "u1", hint_index: 1 }),
      checkRow({ kind: "hint_reveal", item_id: "py-l1-loops-apply", user_id: "u1", hint_index: 2 }),
    ]
    const [item] = summarizeExerciseStruggle(rows)
    expect(item.hintRate).toBe(0.5)
  })

  it("leaves attempts null when nobody has passed", () => {
    const [item] = summarizeExerciseStruggle([runRow({ user_id: "u1", passed: false })])
    expect(item.medianAttemptsToPass).toBeNull()
    expect(item.passRate).toBe(0)
  })
})

describe("summarizeLessonFunnel", () => {
  it("counts starts and completions per lesson", () => {
    const progress = [
      { lessonId: "py-l1-hello", levelId: 1, lessonStatus: "completed", courseId: "python" },
      { lessonId: "py-l1-hello", levelId: 1, lessonStatus: "in_progress", courseId: "python" },
      { lessonId: "py-l1-loops", levelId: 1, lessonStatus: "completed", courseId: "python" },
    ] as TutorialLessonProgress[]
    const rows = summarizeLessonFunnel(progress)
    const hello = rows.find((r) => r.lessonId === "py-l1-hello")
    expect(hello).toMatchObject({ started: 2, completed: 1, completionRate: 0.5 })
  })

  it("defaults a missing courseId to python, matching the progress service", () => {
    const progress = [
      { lessonId: "py-l1-hello", levelId: 1, lessonStatus: "completed" },
    ] as TutorialLessonProgress[]
    expect(summarizeLessonFunnel(progress)[0].courseId).toBe("python")
  })
})

describe("de-identification", () => {
  it("is stable for one user and different across users", () => {
    expect(pseudonymize("user-a")).toBe(pseudonymize("user-a"))
    expect(pseudonymize("user-a")).not.toBe(pseudonymize("user-b"))
  })

  it("strips the real uid entirely from an exported row", () => {
    // Regression: the doc id is composed as `${userId}_${itemId}_${ms}`, so removing
    // only `user_id` left the uid sitting inside the row's own primary key. Assert on
    // the whole serialized row, not just the obvious field.
    const row = deidentify(checkRow({ user_id: "real-uid-123" }))
    expect(JSON.stringify(row)).not.toContain("real-uid-123")
    expect(row).not.toHaveProperty("user_id")
    expect(row).not.toHaveProperty("id")
    expect(row.subject).toBe(pseudonymize("real-uid-123"))
    expect(row.row_id).toContain(pseudonymize("real-uid-123"))
  })
})
