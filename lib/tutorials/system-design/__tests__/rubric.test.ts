/**
 * The rubric: its rules catch what they claim to, its scores survive a round trip, and the corpus
 * satisfies both.
 *
 * The rules half feeds `auditRubric` one synthetic defect at a time, because the corpus test below
 * would pass on an empty corpus no matter how vacuous the rules were.
 */
import { describe, expect, it } from "vitest"

import { listAllSystemDesignLessons } from "../registry"
import { auditRubric } from "../rubric-rules"
import { parseSelfScore, rubricStorageKey, summarizeSelfScore } from "../rubric"
import { GATED_FIELD_NAMES, toPublicLessonPreview } from "@/lib/tutorials/public-preview"
import type { RubricDimension } from "@/lib/tutorials/types"

const SOUND: RubricDimension[] = [
  {
    name: "Consistency contract",
    weak: "Does not say what a client sees between the write and the replica catching up.",
    adequate: "Names replication lag as a risk but does not say which reads are affected.",
    strong:
      "States the window, names which reads are routed to the primary during it, and says what the UI shows meanwhile.",
  },
  {
    name: "Failure modes",
    weak: "Describes only the path where every component is healthy.",
    adequate: "Names one failure, usually the primary dying, without saying what recovers it.",
    strong:
      "Walks at least two failures end to end, including what detects each one and what the blast radius is.",
  },
  {
    name: "Cost and operational burden",
    weak: "Never mentions what the design costs to run or who is paged by it.",
    adequate: "Gestures at cost without attaching a number to any component.",
    strong:
      "Attaches a rough monthly figure to the dominant component and names the ongoing operational work it creates.",
  },
]

function withBand(index: number, band: "weak" | "adequate" | "strong", text: string) {
  return SOUND.map((d, i) => (i === index ? { ...d, [band]: text } : d))
}

describe("auditRubric", () => {
  it("passes a sound rubric", () => {
    expect(auditRubric(SOUND)).toEqual([])
  })

  it("ignores exercises with no rubric", () => {
    expect(auditRubric(undefined)).toEqual([])
  })

  it("catches a band written as advice instead of a description", () => {
    // The defect this module exists for. Three bands of advice are three ways of saying the same
    // thing, and the learner picks the middle one every time.
    expect(
      auditRubric(withBand(0, "strong", "Make sure to state the replication window.")).join(" ")
    ).toMatch(/is advice, not a description/)
  })

  it("catches the softer advice openers too", () => {
    for (const opener of [
      "Should quantify the lag clearly",
      "Consider the read-after-write path",
      "Discuss the failure modes here",
    ]) {
      expect(auditRubric(withBand(1, "adequate", opener)).join(" ")).toMatch(/is advice/)
    }
  })

  it("does not flag a description that merely contains an advice word", () => {
    // "should" mid-sentence is describing what the answer says, not instructing the learner. A rule
    // that fired here would push authors into stilted phrasings to appease it.
    const fine = withBand(
      0,
      "adequate",
      "Says the client should see its own write, but never says how that is arranged."
    )
    expect(auditRubric(fine)).toEqual([])
  })

  it("catches bands that repeat each other", () => {
    const flat = withBand(2, "adequate", SOUND[2].strong)
    expect(auditRubric(flat).join(" ")).toMatch(/bands that repeat/)
  })

  it("catches a rubric too small to localise anything", () => {
    expect(auditRubric(SOUND.slice(0, 2)).join(" ")).toMatch(/under the 3 minimum/)
  })

  it("catches a rubric that has become a grading form", () => {
    const many = [...SOUND, ...SOUND.map((d, i) => ({ ...d, name: `${d.name} ${i}` }))]
    expect(auditRubric(many).join(" ")).toMatch(/over the 5 cap/)
  })

  it("catches a stub band and a wall-of-text band", () => {
    expect(auditRubric(withBand(0, "weak", "Vague.")).join(" ")).toMatch(/under 24/)
    expect(auditRubric(withBand(0, "weak", "x".repeat(300))).join(" ")).toMatch(/over 220/)
  })

  it("catches duplicate dimension names", () => {
    const dupes = [...SOUND, { ...SOUND[0] }]
    expect(auditRubric(dupes).join(" ")).toMatch(/duplicate dimension/)
  })
})

describe("self-score persistence", () => {
  it("keys storage per exercise, so apply and practice do not share a score", () => {
    expect(rubricStorageKey("sd-l3-x-apply")).not.toBe(rubricStorageKey("sd-l3-x-practice"))
  })

  it("round-trips a score", () => {
    const raw = JSON.stringify({ 0: "strong", 2: "weak" })
    expect(parseSelfScore(raw, 3)).toEqual({ 0: "strong", 2: "weak" })
  })

  it("discards anything that is not a known band or a real dimension index", () => {
    // localStorage is user-writable and survives a rubric being re-authored with fewer rows, so a
    // stale index or a hand-edited value must not reach the renderer.
    const raw = JSON.stringify({ 0: "strong", 1: "excellent", 7: "weak", nope: "weak" })
    expect(parseSelfScore(raw, 3)).toEqual({ 0: "strong" })
  })

  it("survives corrupt storage without throwing", () => {
    expect(parseSelfScore("{not json", 3)).toEqual({})
    expect(parseSelfScore("[1,2,3]", 3)).toEqual({})
    expect(parseSelfScore(null, 3)).toEqual({})
  })

  it("summarises by naming the weak axes rather than computing a grade", () => {
    const summary = summarizeSelfScore(SOUND, { 0: "weak", 1: "strong", 2: "weak" })
    expect(summary.complete).toBe(true)
    expect(summary.weakest).toEqual(["Consistency contract", "Cost and operational burden"])
    // Deliberately no percentage: a self-assessed number invites tracking yourself against a scale
    // you invented ten seconds ago.
    expect(summary).not.toHaveProperty("percentage")
  })

  it("reports partial progress before every row is scored", () => {
    expect(summarizeSelfScore(SOUND, { 1: "adequate" })).toMatchObject({
      scored: 1,
      total: 3,
      complete: false,
    })
  })
})

describe("the rubric is answer material", () => {
  it("is listed as a gated field", () => {
    // The "strong" band states the bar an answer must clear, which is answer content under another
    // noun. Publishing it would hand a signed-out reader the marking scheme.
    expect(GATED_FIELD_NAMES).toContain("rubric")
  })

  it("never reaches the public preview", () => {
    const preview = toPublicLessonPreview({
      courseId: "system-design",
      level: { id: 3, slug: "scaling-data", title: "T", tagline: "t", modules: [] } as never,
      lesson: {
        id: "sd-l3-read-replicas",
        title: "Read replicas",
        summary: "s",
        estimatedMinutes: 10,
        difficulty: "medium",
        skills: ["replication"],
        teach: { markdown: "body", estimatedMinutes: 8 },
        apply: {
          id: "sd-l3-read-replicas-apply",
          prompt: "p",
          thinkAbout: [],
          modelAnswerOutline: ["a"],
          rubric: SOUND,
        },
        practice: {
          id: "sd-l3-read-replicas-practice",
          prompt: "p",
          thinkAbout: [],
          modelAnswerOutline: ["a"],
          rubric: SOUND,
        },
      } as never,
    })
    expect(JSON.stringify(preview)).not.toContain("Attaches a rough monthly figure")
  })
})

describe("the authored corpus", () => {
  const lessons = listAllSystemDesignLessons()
  const exercises = lessons.flatMap((lesson) => [
    { id: lesson.id, phase: "apply", exercise: lesson.apply },
    { id: lesson.id, phase: "practice", exercise: lesson.practice },
  ])

  it("authors every rubric soundly", () => {
    const broken = exercises.flatMap(({ id, phase, exercise }) =>
      auditRubric(exercise.rubric).map((problem) => `${id} [${phase}]: ${problem}`)
    )
    expect(broken).toEqual([])
  })
})
