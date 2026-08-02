/**
 * The corpus-drift alarm for the company -> Learn bridge.
 *
 * `company-learn-routes.ts` joins two vocabularies that have a measured intersection of ZERO (23
 * company pattern slugs against 947 authored skill tags), so the join is a hand-written alias table.
 * A hand-written table over a corpus that a concurrent authoring loop rewrites weekly has exactly
 * one failure mode: a lesson gets retagged, an alias stops matching anything, and a section quietly
 * empties on 38 statically generated, indexed pages with nothing failing anywhere.
 *
 * These tests are that alarm. They deliberately assert against the LIVE registries rather than a
 * fixture, and they deliberately avoid asserting exact counts or lesson ids, because both move.
 */
import { describe, it, expect } from "vitest"
import {
  PATTERN_LEARN_ALIASES,
  findLessonsBySkillTags,
  hasSystemDesignRound,
  listCompanyLearnPaths,
  listPatternLearnLinks,
  listSystemDesignMethodLinks,
  summarizeLearnCorpus,
} from "../company-learn-routes"
import { ALL_COMPANIES } from "@/lib/data/company-questions"
import { isLessonWorkspacePath } from "@/lib/tutorials/lesson-routes"
import { findCatalogEntry } from "@/lib/tutorials/course-catalog"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

/** `/learn/{track}/{levelSlug}/{lessonId}` and nothing deeper. */
const PUBLIC_LESSON_PATH = /^\/learn\/[^/]+\/[^/]+\/[^/]+$/

const aliasRows = Object.entries(PATTERN_LEARN_ALIASES) as [DSAPattern, readonly string[]][]

describe("PATTERN_LEARN_ALIASES", () => {
  it("has at least one alias row (the table was not emptied by a bad merge)", () => {
    expect(aliasRows.length).toBeGreaterThan(0)
  })

  it.each(aliasRows)("pattern %s resolves to at least one live lesson", (_pattern, tags) => {
    expect(findLessonsBySkillTags(tags).length).toBeGreaterThan(0)
  })

  it.each(aliasRows.flatMap(([pattern, tags]) => tags.map((tag) => [pattern, tag] as const)))(
    "individual tag %s (from %s) still matches a live lesson",
    (_pattern, tag) => {
      // Per-tag rather than per-row so a row that keeps working through one surviving tag still
      // reports the dead ones, which is what stops the table rotting one tag at a time.
      expect(findLessonsBySkillTags([tag]).length).toBeGreaterThan(0)
    }
  )

  it("only resolves lessons from the Python course", () => {
    // Skill tags collide across courses with different meanings ("indexing", "sorting"), which is
    // why the join is scoped. If that scoping regresses, a company page starts recommending SQL
    // window functions for two-pointers.
    for (const [, tags] of aliasRows) {
      for (const entry of findLessonsBySkillTags(tags)) {
        expect(entry.courseId).toBe("python")
      }
    }
  })
})

describe("listPatternLearnLinks", () => {
  it.each(ALL_COMPANIES.map((company) => [company.name, company] as const))(
    "%s returns only valid, public, resolvable lesson URLs",
    (_name, company) => {
      const links = listPatternLearnLinks(company)

      for (const link of links) {
        expect(link.href).toMatch(PUBLIC_LESSON_PATH)
        expect(isLessonWorkspacePath(link.href)).toBe(false)
        expect(link.href).not.toContain("/workspace")

        // The URL must address a lesson that actually exists under that exact level slug, which is
        // the same check the public route performs before it renders instead of 404ing.
        const [, , track, levelSlug, lessonId] = link.href.split("/")
        expect(findCatalogEntry(link.courseId, levelSlug, lessonId)).toBeDefined()
        expect(track).toBeTruthy()

        expect(link.title.length).toBeGreaterThan(0)
        expect(link.summary.length).toBeGreaterThan(0)
        expect(link.because.length).toBeGreaterThan(0)
      }
    }
  )

  it("never repeats a lesson within one company", () => {
    for (const company of ALL_COMPANIES) {
      const ids = listPatternLearnLinks(company).map((link) => link.lessonId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it("gives every company at least one lesson", () => {
    // Not a vanity assertion: every company in the roster carries at least one aliased pattern
    // today, so an empty result means the alias table stopped resolving rather than that a company
    // legitimately has nothing to link.
    for (const company of ALL_COMPANIES) {
      expect(listPatternLearnLinks(company).length).toBeGreaterThan(0)
    }
  })

  it("orders lessons by the company's own pattern priority", () => {
    // The first link must come from the company's highest-priority aliased pattern, so the ordering
    // signal stays the authored data rather than catalog order.
    for (const company of ALL_COMPANIES) {
      const links = listPatternLearnLinks(company)
      if (links.length === 0) continue

      const topAliased = [...company.topPatterns]
        .sort((a, b) => b.priority - a.priority || b.frequency - a.frequency)
        .find((entry) => PATTERN_LEARN_ALIASES[entry.pattern])
      expect(topAliased).toBeDefined()

      const expectedTags = PATTERN_LEARN_ALIASES[topAliased!.pattern]!
      const firstFromTopPattern = findLessonsBySkillTags(expectedTags)[0]
      expect(links[0].lessonId).toBe(firstFromTopPattern.lesson.id)
    }
  })
})

describe("listSystemDesignMethodLinks", () => {
  it("resolves the interview-method level and returns public System Design URLs", () => {
    const links = listSystemDesignMethodLinks()
    expect(links.length).toBeGreaterThan(0)

    for (const link of links) {
      expect(link.courseId).toBe("system-design")
      expect(link.href).toMatch(PUBLIC_LESSON_PATH)
      expect(isLessonWorkspacePath(link.href)).toBe(false)

      const [, , , levelSlug, lessonId] = link.href.split("/")
      expect(findCatalogEntry("system-design", levelSlug, lessonId)).toBeDefined()
    }
  })

  it("is attached only to companies that actually run a design round", () => {
    for (const company of ALL_COMPANIES) {
      const { systemDesignLinks } = listCompanyLearnPaths(company)
      expect(systemDesignLinks.length > 0).toBe(hasSystemDesignRound(company))
    }
  })
})

describe("listCompanyLearnPaths", () => {
  it("never emits a workspace URL for any company", () => {
    // The one invariant that would be a real leak: workspace routes carry the graded payload and are
    // auth-gated and noindexed, so a public marketing page must never link into one.
    for (const company of ALL_COMPANIES) {
      const { patternLinks, systemDesignLinks } = listCompanyLearnPaths(company)
      for (const link of [...patternLinks, ...systemDesignLinks]) {
        expect(isLessonWorkspacePath(link.href)).toBe(false)
      }
    }
  })
})

describe("summarizeLearnCorpus", () => {
  it("counts the live corpus without any hardcoded totals", () => {
    const summary = summarizeLearnCorpus()

    // Loose lower bounds only. The corpus grows weekly; an exact count here would be a maintenance
    // trap and would fail the next time the authoring loop commits.
    expect(summary.courses.length).toBeGreaterThanOrEqual(3)
    expect(summary.lessonCount).toBeGreaterThan(100)
    expect(summary.lessonCount).toBe(
      summary.courses.reduce((total, course) => total + course.lessonCount, 0)
    )

    for (const course of summary.courses) {
      expect(course.lessonCount).toBeGreaterThan(0)
      expect(course.levelCount).toBeGreaterThan(0)
      expect(course.href).toBe(`/learn/${course.courseId}`)
      expect(course.label.length).toBeGreaterThan(0)
    }
  })
})
