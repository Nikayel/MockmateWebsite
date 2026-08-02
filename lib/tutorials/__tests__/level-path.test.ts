import { describe, expect, it } from "vitest"
import {
  computeLevelPath,
  firstPublishedLesson,
  toLevelListModel,
  withWorkspaceDestinations,
  type LevelListModel,
} from "../level-path"
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

// `computeLevelPath` takes a CourseId, not a base path: every destination is built by the route
// authority in `lesson-routes.ts` so a lesson's two URLs stay in one place.
const COURSE = "python" as const

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
  it("fresh learner: lesson 1 is current, the rest are open (never locked)", () => {
    const path = computeLevelPath(makeModel(), new Set(), COURSE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("current")
    expect(l2!.status).toBe("open")
    expect(l3!.status).toBe("open")
    // Every lesson is navigable — no gating.
    expect(l2!.href).toBe("/learn/python/apply/l2")
    expect(l3!.href).toBe("/learn/python/apply/l3")
    expect(path.percent).toBe(0)
    expect(path.minutesLeft).toBe(45)
    expect(path.continueTarget).toEqual({
      href: "/learn/python/apply/l1",
      workspaceHref: "/learn/python/apply/l1/workspace",
      lessonId: "l1",
      lessonTitle: "One",
    })
    expect(path.isComplete).toBe(false)
  })

  it("mid-progress: done lessons resolve, next is current, later stays open", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1"]), COURSE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("done")
    expect(l2!.status).toBe("current")
    expect(l3!.status).toBe("open")
    expect(path.percent).toBe(33)
    expect(path.minutesLeft).toBe(35)
    expect(path.continueTarget?.lessonId).toBe("l2")
  })

  it("out-of-order completion: first incomplete is current, other incomplete is open", () => {
    const path = computeLevelPath(makeModel(), new Set(["l2"]), COURSE)
    const [l1, l2] = path.sections[0]!.lessons
    const [l3] = path.sections[1]!.lessons
    expect(l1!.status).toBe("current") // first incomplete
    expect(l2!.status).toBe("done")
    expect(l3!.status).toBe("open") // navigable, not the resume target
    expect(l3!.href).toBe("/learn/python/apply/l3")
  })

  it("section status dots: complete / in_progress / untouched", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1", "l2"]), COURSE)
    expect(path.sections[0]!.status).toBe("complete") // both done
    expect(path.sections[0]!.done).toBe(2)
    expect(path.sections[1]!.status).toBe("in_progress") // holds the current lesson
  })

  it("fully complete: 100%, no continue target, isComplete", () => {
    const path = computeLevelPath(makeModel(), new Set(["l1", "l2", "l3"]), COURSE)
    expect(path.percent).toBe(100)
    expect(path.minutesLeft).toBe(0)
    expect(path.continueTarget).toBeNull()
    expect(path.isComplete).toBe(true)
    expect(path.sections.every((s) => s.status === "complete")).toBe(true)
  })

  it("empty (unauthored) level: isEmpty, no continue target", () => {
    const empty: LevelListModel = {
      id: 4,
      slug: "engineering",
      title: "Eng",
      tagline: "",
      sections: [],
    }
    const path = computeLevelPath(empty, new Set(), COURSE)
    expect(path.isEmpty).toBe(true)
    expect(path.total).toBe(0)
    expect(path.continueTarget).toBeNull()
    expect(path.percent).toBe(0)
  })

  it("running index is continuous across sections", () => {
    const path = computeLevelPath(makeModel(), new Set(), COURSE)
    const indices = path.sections.flatMap((s) => s.lessons.map((l) => l.index))
    expect(indices).toEqual([1, 2, 3])
  })

  it("every node carries both URLs: the public reading page and the gated workspace", () => {
    const path = computeLevelPath(makeModel(), new Set(), COURSE)
    for (const node of path.sections.flatMap((s) => s.lessons)) {
      expect(node.workspaceHref).toBe(`${node.href}/workspace`)
    }
  })
})

describe("withWorkspaceDestinations", () => {
  it("re-points every lesson and the continue target at the workspace", () => {
    const path = withWorkspaceDestinations(computeLevelPath(makeModel(), new Set(["l1"]), COURSE))
    const hrefs = path.sections.flatMap((s) => s.lessons.map((l) => l.href))
    expect(hrefs).toEqual([
      "/learn/python/apply/l1/workspace",
      "/learn/python/apply/l2/workspace",
      "/learn/python/apply/l3/workspace",
    ])
    expect(path.continueTarget?.href).toBe("/learn/python/apply/l2/workspace")
    // The public URL stays on the node, so the swap is not lossy and can be recomputed.
    expect(path.sections[0]!.lessons[0]!.workspaceHref).toBe("/learn/python/apply/l1/workspace")
  })

  it("leaves a completed level's null continue target alone", () => {
    const path = withWorkspaceDestinations(
      computeLevelPath(makeModel(), new Set(["l1", "l2", "l3"]), COURSE)
    )
    expect(path.continueTarget).toBeNull()
    expect(path.isComplete).toBe(true)
  })
})

describe("firstPublishedLesson", () => {
  const level = (slug: string, lessons: { id: string; title: string }[]) =>
    ({
      id: 1,
      slug,
      title: slug,
      tagline: "",
      estimatedHours: 1,
      modules: [{ id: "m1", title: "M", description: "", lessons }],
    }) as unknown as TutorialLevel<unknown>

  it("skips levels that are registered but not yet authored", () => {
    const levels = [
      level("empty-level", []),
      level("real-level", [{ id: "first", title: "First lesson" }]),
    ]
    expect(firstPublishedLesson(levels)).toEqual({
      levelSlug: "real-level",
      lessonId: "first",
      lessonTitle: "First lesson",
    })
  })

  it("returns null for an entirely unauthored course", () => {
    expect(firstPublishedLesson([level("empty-level", [])])).toBeNull()
    expect(firstPublishedLesson([])).toBeNull()
  })
})
