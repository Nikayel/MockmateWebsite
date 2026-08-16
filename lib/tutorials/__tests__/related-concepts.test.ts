/**
 * The guard for the curated related-concepts graph (SEO-24).
 *
 * Everything here is a failure that is invisible in review and invisible in the browser until a
 * reader clicks. A renamed lesson id turns a confident keyword anchor into a 404 on however many
 * pages point at it. An anchor that drifts to "Learn more" still renders and still looks fine, and
 * silently throws away the only reason the link was worth adding. A CTA pointing at `/interview`
 * spends a link on a `noindex` page. So each of those is asserted, against the live corpus rather
 * than against a fixture, which is what makes the check survive a curriculum edit.
 *
 * The graph shape is asserted too. SEO-24's acceptance is "median internal inbound links per lesson
 * rises above 3", and the operative half of that is that no seeded lesson is a dead end: a lesson
 * that only sends links out has gained nothing.
 */
import { describe, expect, it } from "vitest"

import { listAllCatalogEntries } from "../course-catalog"
import { isLessonWorkspacePath, publicLessonPath } from "../lesson-routes"
import {
  PRACTICE_CTA_DESTINATIONS,
  RELATED_CONCEPTS,
  resolveRelatedConcepts,
} from "../related-concepts"
import { LESSON_DRILLS } from "../system-design/lesson-drills"

const entries = listAllCatalogEntries()
const catalog = new Map(entries.map((entry) => [entry.lesson.id, entry]))
const registryIds = Object.keys(RELATED_CONCEPTS)

/**
 * Anchors that carry no query phrase. An algorithmic "related" block produces these by default,
 * which is the whole reason this registry is hand-written, so the denylist is what stops the
 * registry decaying back into the thing it replaced. Matched case-insensitively as whole phrases.
 */
const GENERIC_ANCHORS = [
  "learn more",
  "read more",
  "click here",
  "see more",
  "find out more",
  "continue reading",
  "this lesson",
  "related lesson",
  "more info",
  "more information",
  "here",
  "next",
  "previous",
]

/** Labels that describe nothing. Brief section 3 names the first one explicitly. */
const GENERIC_CTA_LABELS = [
  "start now",
  "get started",
  "try it free",
  "try it now",
  "sign up",
  "learn more",
  "click here",
]

function inboundCounts(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const entry of Object.values(RELATED_CONCEPTS)) {
    for (const concept of entry.related) {
      counts.set(concept.id, (counts.get(concept.id) ?? 0) + 1)
    }
  }
  return counts
}

describe("related-concepts registry", () => {
  it("keys every entry on a lesson that exists", () => {
    const missing = registryIds.filter((id) => !catalog.has(id))
    expect(missing).toEqual([])
  })

  it("resolves every related lesson id in the catalog", () => {
    const dangling = registryIds.flatMap((sourceId) =>
      RELATED_CONCEPTS[sourceId].related
        .filter((concept) => !catalog.has(concept.id))
        .map((concept) => `${sourceId} -> ${concept.id}`)
    )
    expect(dangling).toEqual([])
  })

  it("never links a lesson to itself", () => {
    const selfLinks = registryIds.filter((sourceId) =>
      RELATED_CONCEPTS[sourceId].related.some((concept) => concept.id === sourceId)
    )
    expect(selfLinks).toEqual([])
  })

  it("names each target at most once per lesson", () => {
    const duplicated = registryIds.filter((sourceId) => {
      const ids = RELATED_CONCEPTS[sourceId].related.map((concept) => concept.id)
      return new Set(ids).size !== ids.length
    })
    expect(duplicated).toEqual([])
  })

  it("carries a substantive anchor on every edge", () => {
    const thin = registryIds.flatMap((sourceId) =>
      RELATED_CONCEPTS[sourceId].related
        .filter((concept) => concept.anchor.trim().length < 20)
        .map((concept) => `${sourceId} -> ${concept.id}: ${concept.anchor}`)
    )
    expect(thin).toEqual([])
  })

  it("rejects generic anchor text", () => {
    const generic = registryIds.flatMap((sourceId) =>
      RELATED_CONCEPTS[sourceId].related
        .filter((concept) => {
          // Padded on both sides so a phrase at the START or END of the anchor is caught too. The
          // first version of this check only matched mid-string and let "Learn more about X"
          // through, which is exactly the anchor it exists to reject.
          const words = ` ${concept.anchor.toLowerCase().replace(/[^a-z0-9 ]+/g, " ")} `.replace(
            /\s+/g,
            " "
          )
          return GENERIC_ANCHORS.some((phrase) => words.includes(` ${phrase} `))
        })
        .map((concept) => `${sourceId} -> ${concept.id}: ${concept.anchor}`)
    )
    expect(generic).toEqual([])
  })

  it("uses no em dashes in reader-facing text", () => {
    const offenders: string[] = []
    for (const sourceId of registryIds) {
      const entry = RELATED_CONCEPTS[sourceId]
      for (const concept of entry.related) {
        if (concept.anchor.includes("—")) offenders.push(`${sourceId}: ${concept.anchor}`)
      }
      if (entry.cta?.label.includes("—")) offenders.push(`${sourceId}: ${entry.cta.label}`)
    }
    expect(offenders).toEqual([])
  })
})

describe("related-concepts graph", () => {
  it("gives every seeded lesson at least two inbound links", () => {
    const counts = inboundCounts()
    const dead = registryIds
      .filter((id) => (counts.get(id) ?? 0) < 2)
      .map((id) => `${id}: ${counts.get(id) ?? 0}`)
    expect(dead).toEqual([])
  })

  it("crosses track boundaries rather than building three separate islands", () => {
    const crossTrack = registryIds.flatMap((sourceId) =>
      RELATED_CONCEPTS[sourceId].related.filter(
        (concept) => catalog.get(concept.id)?.courseId !== catalog.get(sourceId)?.courseId
      )
    )
    // The point of the registry is that Data Engineering, System Design and Python share subjects.
    // A floor rather than an exact count, so adding entries never has to touch this number.
    expect(crossTrack.length).toBeGreaterThanOrEqual(15)
  })
})

describe("practice CTAs", () => {
  it("points only at allowed, indexable destinations", () => {
    const allowed = new Set<string>(PRACTICE_CTA_DESTINATIONS)
    const offenders = registryIds
      .filter((id) => RELATED_CONCEPTS[id].cta && !allowed.has(RELATED_CONCEPTS[id].cta!.href))
      .map((id) => `${id} -> ${RELATED_CONCEPTS[id].cta!.href}`)
    expect(offenders).toEqual([])
  })

  it("never points at the noindex interview shell or a gated workspace", () => {
    const offenders = registryIds
      .map((id) => RELATED_CONCEPTS[id].cta?.href)
      .filter(
        (href): href is string =>
          Boolean(href) && (href!.startsWith("/interview") || isLessonWorkspacePath(href!))
      )
    expect(offenders).toEqual([])
  })

  it("describes what the reader will practice", () => {
    const offenders = registryIds
      .filter((id) => {
        const label = RELATED_CONCEPTS[id].cta?.label
        if (!label) return false
        const normalised = label.trim().toLowerCase()
        return normalised.length < 25 || GENERIC_CTA_LABELS.some((bad) => normalised === bad)
      })
      .map((id) => `${id}: ${RELATED_CONCEPTS[id].cta?.label}`)
    expect(offenders).toEqual([])
  })

  it("leaves the timed-drill lessons alone so no page shows two practice boxes", () => {
    const drillLessons = new Set(LESSON_DRILLS.map((pair) => pair.lessonId))
    const doubled = registryIds.filter(
      (id) => drillLessons.has(id) && Boolean(RELATED_CONCEPTS[id].cta)
    )
    expect(doubled).toEqual([])
  })
})

describe("resolveRelatedConcepts", () => {
  it("returns nothing for a lesson with no entry", () => {
    const unseeded = entries.find((entry) => !RELATED_CONCEPTS[entry.lesson.id])
    expect(unseeded).toBeDefined()
    const resolved = resolveRelatedConcepts(unseeded!.lesson.id, unseeded!.courseId)
    expect(resolved.links).toEqual([])
    expect(resolved.cta).toBeNull()
  })

  it("builds the canonical public reading path for every edge", () => {
    for (const sourceId of registryIds) {
      const source = catalog.get(sourceId)!
      const resolved = resolveRelatedConcepts(sourceId, source.courseId)
      expect(resolved.links).toHaveLength(RELATED_CONCEPTS[sourceId].related.length)

      for (const link of resolved.links) {
        expect(link.href.startsWith("/learn/")).toBe(true)
        expect(isLessonWorkspacePath(link.href)).toBe(false)
        expect(link.anchor.length).toBeGreaterThan(0)
      }
    }
  })

  it("points each edge at the level the target actually lives in", () => {
    const sourceId = registryIds[0]
    const source = catalog.get(sourceId)!
    const resolved = resolveRelatedConcepts(sourceId, source.courseId)

    for (const [index, link] of resolved.links.entries()) {
      const target = catalog.get(RELATED_CONCEPTS[sourceId].related[index].id)!
      expect(link.href).toBe(publicLessonPath(target.courseId, target.level.slug, target.lesson.id))
      expect(link.crossTrack).toBe(target.courseId !== source.courseId)
    }
  })
})
