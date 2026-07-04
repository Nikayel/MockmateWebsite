import { describe, expect, it } from "vitest"
import { computeLevelPath, toLevelListModel, type LevelListModel } from "../level-path"
import type { TutorialLevel } from "../types"

/** A minimal 2-section (2 + 1 lessons) list model, easy to reason about by hand. */
function makeModel(): LevelListModel {
  return {
    id: 2,
    slug: "apply",
    title: "Apply",
    tagline: "Write it, not just read it.",
    sections: [
      {
        id: "sec-a",
        title: "Section A",
        description: "",
        lessons: [
          { id: "l1", title: "One", summary: "", estimatedMinutes: 10, difficulty: "easy" },
          { id: "l2", title: "Two", summary: "", estimatedMinutes: 15, difficulty: "medium" },
        ],
      },
      {
        id: "sec-b",
        title: "Section B",
        description: "",
        lessons: [
          { id: "l3", title: "Three", summary: "", estimatedMinutes: 20, difficulty: "hard" },
        ],
      },
    ],
  }
}

const BASE = "/learn/python"

describe("toLevelListModel", () => {
  it("projects authored content to the slim list model, dropping exercises", () => {
    const level = {
      id: 1,
      slug: "fundamentals",
      title: "Fundamentals",
      tagline: "Start here.",
      defaultExecutionMode: "single-file",
      estimatedHours: 3,
      modules: [
        {
          id: "m1",
          title: "Module 1",
          description: "desc",
          lessons: [
            {
              id: "py-1",
              title: "Lesson 1",
              summary: "sum",
              estimatedMinutes: 12,
              difficulty: "easy",
              skills: ["variables"],
              teach: { markdown: "big teach", estimatedMinutes: 5 },
              apply: { id: "py-1-apply", prompt: "p" },
              practice: { id: "py-1-practice", prompt: "p" },
            },
          ],
        },
      ],
    } as unknown as TutorialLevel<unknown>

    const model = toLevelListModel(level)
    expect(model.sections).toHaveLength(1)
    expect(model.sections[0]!.lessons[0]).toEqual({
      id: "py-1",
      title: "Lesson 1",
      summary: "sum",
      estimatedMinutes: 12,
      difficulty: "easy",
    })
    // No exercise / teach payloads leak into the list model.
    expect(JSON.stringify(model)).not.toContain("big teach")
  })
})

describe("computeLevelPath", () => {
  it("fresh learner: lesson 1 is current, the rest are locked", () => {
    const path = computeLevelPath(makeModel(), new Set(), BASE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("current")
    expect(l2!.status).toBe("locked")
    expect(l3!.status).toBe("locked")
    expect(l2!.href).toBeNull()
    expect(path.percent).toBe(0)
    expect(path.minutesLeft).toBe(45)
    expect(path.continueTarget).toEqual({
      href: "/learn/python/apply/l1",
      lessonId: "l1",
      lessonTitle: "One",
    })
    expect(path.isComplete).toBe(false)
  })

  it("mid-progress: done lessons resolve, next unlocks as current, later stays locked", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1"]), BASE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("done")
    expect(l2!.status).toBe("current")
    expect(l3!.status).toBe("locked")
    expect(path.percent).toBe(33)
    expect(path.minutesLeft).toBe(35)
    expect(path.continueTarget?.lessonId).toBe("l2")
  })

  it("out-of-order completion produces an 'open' node (prereq met, not the resume target)", () => {
    // l1 incomplete but l2 done → l3's prereq (l2) is met, and l3 isn't the first incomplete.
    const path = computeLevelPath(makeModel(), new Set(["l2"]), BASE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("current") // first incomplete
    expect(l2!.status).toBe("done")
    expect(l3!.status).toBe("open") // navigable, but not the resume target
    expect(l3!.href).toBe("/learn/python/apply/l3")
  })

  it("section status dots: complete / in_progress / untouched", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1", "l2"]), BASE)
    expect(path.sections[0]!.status).toBe("complete") // both done
    expect(path.sections[0]!.done).toBe(2)
    expect(path.sections[1]!.status).toBe("in_progress") // holds the current lesson
  })

  it("fully complete: 100%, no continue target, isComplete", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1", "l2", "l3"]), BASE)
    expect(path.percent).toBe(100)
    expect(path.minutesLeft).toBe(0)
    expect(path.continueTarget).toBeNull()
    expect(path.isComplete).toBe(true)
    expect(path.sections.every((s) => s.status === "complete")).toBe(true)
  })

  it("empty (unauthored) level: isEmpty, no continue target", () => {
    const empty: LevelListModel = { id: 4, slug: "engineering", title: "Eng", tagline: "", sections: [] }
    const path = computeLevelPath(empty, new Set(), BASE)
    expect(path.isEmpty).toBe(true)
    expect(path.total).toBe(0)
    expect(path.continueTarget).toBeNull()
    expect(path.percent).toBe(0)
  })

  it("running index is continuous across sections", () => {
    const path = computeLevelPath(makeModel(), new Set(), BASE)
    const indices = path.sections.flatMap((s) => s.lessons.map((l) => l.index))
    expect(indices).toEqual([1, 2, 3])
  })
})
