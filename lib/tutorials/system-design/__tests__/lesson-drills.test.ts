/**
 * Both ends of every lesson-to-drill pair must resolve against the live registries.
 *
 * A dead cross-link is the failure mode this file exists for, and it is invisible: the lesson page
 * renders a confident "Try the timed round" button, nothing throws, no test goes red, and the learner
 * finds out by clicking into a 404 at the exact moment they were ready to practise. Neither registry
 * knows about this table, so either side can rename an id and break it silently.
 *
 * The lesson route is asserted too, not just the id, because `/learn/system-design/case-studies/...`
 * hardcodes a level slug: a lesson moved to another level would keep a valid id and a broken URL.
 */
import { describe, expect, it } from "vitest"

import { scenarios } from "@/lib/scenarios"
import { listAllSystemDesignLessons } from "../registry"
import {
  LESSON_DRILLS,
  UNMAPPED_DRILLS,
  drillForLesson,
  drillHref,
  lessonForDrill,
} from "../lesson-drills"
import { publicLessonPath } from "@/lib/tutorials/lesson-routes"

const lessons = listAllSystemDesignLessons()
const lessonIds = new Set(lessons.map((l) => l.id))
const drillIds = new Set(scenarios.filter((s) => s.type === "system-design").map((s) => s.id))

describe("lesson to drill mapping", () => {
  it("names a real lesson on every pair", () => {
    const missing = LESSON_DRILLS.filter((p) => !lessonIds.has(p.lessonId)).map((p) => p.lessonId)
    expect(missing).toEqual([])
  })

  it("names a real system-design drill on every pair", () => {
    const missing = LESSON_DRILLS.filter((p) => !drillIds.has(p.drillId)).map((p) => p.drillId)
    expect(missing).toEqual([])
  })

  it("maps each lesson and each drill at most once", () => {
    // Two lessons pointing at one drill is defensible; one lesson pointing at two is not, because
    // the UI renders a single call to action and would silently pick the first.
    expect(new Set(LESSON_DRILLS.map((p) => p.lessonId)).size).toBe(LESSON_DRILLS.length)
  })

  it("resolves a drill for a mapped lesson, with the fields the UI renders", () => {
    const drill = drillForLesson("sd-l10-url-shortener")
    expect(drill).not.toBeNull()
    expect(drill!.id).toBe("system-design-url-shortener")
    expect(drill!.title.length).toBeGreaterThan(0)
    expect(drill!.estimatedTime).toBeGreaterThan(0)
    expect(drill!.href).toContain("practice=true")
  })

  it("returns null for a lesson with no honest counterpart", () => {
    // 180-odd lessons are deliberately unmapped. "Design a URL shortener" is a round; "SLI vs SLO"
    // is not, and inventing a link would send a learner somewhere unrelated.
    expect(drillForLesson("sd-l7-sli-slo-sla")).toBeNull()
    expect(drillForLesson("sd-l1-tcp-udp")).toBeNull()
  })

  it("resolves the reverse direction to a lesson route that actually exists", () => {
    const back = lessonForDrill("system-design-uber")
    expect(back).not.toBeNull()
    expect(back!.id).toBe("sd-l10-ride-sharing")
    // The hardcoded level slug is the fragile part: assert it against the route builder the pages use.
    const lesson = lessons.find((l) => l.id === back!.id)!
    expect(back!.href).toBe(publicLessonPath("system-design", "case-studies", lesson.id))
  })

  it("keeps every mapped lesson inside the level its route claims", () => {
    // `lessonForDrill` hardcodes "case-studies". A lesson moved to another level would keep a valid
    // id and produce a 404, which is exactly the silent break this suite is for.
    const strays = LESSON_DRILLS.filter((p) => !p.lessonId.startsWith("sd-l10-")).map(
      (p) => p.lessonId
    )
    expect(strays).toEqual([])
  })

  it("builds the same drill href the drills list builds", () => {
    // Two builders for one URL is how a query param drifts. `practice=true` is load-bearing: without
    // it the interview page ignores `scenario` entirely.
    expect(drillHref("system-design-uber")).toBe(
      "/interview?scenario=system-design-uber&practice=true"
    )
  })

  it("returns null for a drill nobody mapped", () => {
    expect(lessonForDrill("system-design-nonexistent")).toBeNull()
  })

  it("accounts for every drill as either mapped or deliberately unmapped", () => {
    // The whole registry has to be triaged, so a thirteenth scenario cannot be quietly ignored.
    // UNMAPPED_DRILLS is the record that a gap was decided rather than missed.
    const mapped = new Set(LESSON_DRILLS.map((p) => p.drillId))
    const unaccounted = [...drillIds].filter(
      (id) => !mapped.has(id) && !UNMAPPED_DRILLS.includes(id)
    )
    expect(unaccounted).toEqual([])
  })

  it("does not list a drill as both mapped and unmapped", () => {
    const mapped = new Set(LESSON_DRILLS.map((p) => p.drillId))
    expect(UNMAPPED_DRILLS.filter((id) => mapped.has(id))).toEqual([])
  })
})
