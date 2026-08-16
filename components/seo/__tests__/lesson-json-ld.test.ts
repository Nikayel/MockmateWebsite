/**
 * The lesson graph must describe the LESSON, and every claim in it must be true.
 *
 * Structured data is the one part of a page that a machine reads literally and a human never
 * proofreads, so a wrong claim here survives indefinitely. Two classes of failure are worth
 * failing the build over: describing the wrong thing (the defect this shipped to fix, where 425
 * lesson URLs told Google they were a $25-a-month software product), and asserting something the
 * page does not support (a fabricated date, a free-access claim on a paywall).
 */
import { describe, expect, it } from "vitest"

import { buildLessonSchema } from "../LessonJsonLd"
import { listAllCatalogEntries } from "@/lib/tutorials/course-catalog"
import { learnLessonMetadata, lessonMetaDescription } from "@/lib/seo/learn-metadata"
import { publicLessonPath } from "@/lib/tutorials/lesson-routes"
import { toPublicLessonPreview } from "@/lib/tutorials/public-preview"
import { GATED_FIELD_NAMES } from "@/lib/tutorials/public-preview"

const ENTRIES = listAllCatalogEntries()

function schemaFor(entry: (typeof ENTRIES)[number]) {
  const preview = toPublicLessonPreview(entry)
  return buildLessonSchema({
    preview,
    path: publicLessonPath(preview.courseId, preview.levelSlug, preview.id),
    description: lessonMetaDescription(preview),
  })
}

describe("lesson structured data", () => {
  it("walks a real, non-empty corpus", () => {
    expect(ENTRIES.length).toBeGreaterThan(300)
  })

  it("describes the lesson rather than the product", () => {
    // The exact defect: the only JSON-LD on a lesson page was site-level, so a page about
    // fencing tokens declared itself software priced at $25 a month.
    for (const entry of ENTRIES.slice(0, 40)) {
      const schema = schemaFor(entry)
      expect(schema["@type"]).toBe("Article")
      expect(schema.headline).toBe(entry.lesson.title)
      const serialized = JSON.stringify(schema)
      expect(serialized).not.toContain("SoftwareApplication")
      expect(serialized).not.toContain("offers")
      expect(serialized).not.toContain("price")
    }
  })

  it("points @id, url and mainEntityOfPage at the same canonical URL", () => {
    // A graph whose @id names a different document than rel=canonical describes a page that is
    // not the one being served, which is how a page ends up not indexed at all.
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const schema = schemaFor(entry)
      const canonical = schema.url
      if (schema["@id"] !== canonical) offenders.push(`${entry.lesson.id}: @id !== url`)
      if (schema.mainEntityOfPage["@id"] !== canonical) {
        offenders.push(`${entry.lesson.id}: mainEntityOfPage !== url`)
      }
      if (!canonical.startsWith("https://")) offenders.push(`${entry.lesson.id}: relative url`)
    }
    expect(offenders).toEqual([])
  })

  it("never fabricates a publication or modification date", () => {
    // The honest value is the last commit touching the lesson source and it is unavailable at
    // build time (Vercel clones --depth=10 with no remote). The fallback everyone reaches for
    // is the build timestamp, and this repo already paid for that: stamping it as sitemap
    // lastModified asserted the whole corpus changed every deploy, and Search Console left
    // nearly all 545 URLs in "Discovered - currently not indexed". An absent field beats a
    // wrong one, and app/sitemap.ts + sitemap.test.ts already pin the same rule.
    const schema = schemaFor(ENTRIES[0]) as Record<string, unknown>
    expect(schema.datePublished).toBeUndefined()
    expect(schema.dateModified).toBeUndefined()
  })

  it("claims free access only because the reading page really is free", () => {
    // The teach section is published in full to a signed-out visitor; the graded workspace is
    // the gated half and it is noindexed. If that ever changes, this claim becomes a lie that
    // Google penalises, so it is worth an assertion rather than a comment.
    for (const entry of ENTRIES.slice(0, 20)) {
      expect(schemaFor(entry).isAccessibleForFree).toBe(true)
    }
  })

  it("never leaks a gated field into the published graph", () => {
    // The schema is built from the public projection, so this should be structurally
    // impossible. It is asserted anyway because structured data is published verbatim and a
    // future field added to the projection would flow straight through.
    //
    // Checked as KEYS at any depth, not as substrings, which is what `GATED_FIELD_NAMES`
    // documents itself to be. A substring match reports `py-l2-writing-files` as a leak
    // because its authored `skills` list contains the word "files", and a guard that cries
    // wolf on real content is a guard someone deletes.
    const gated = new Set<string>(GATED_FIELD_NAMES)
    const keysIn = (value: unknown, found: string[] = []): string[] => {
      if (Array.isArray(value)) {
        for (const item of value) keysIn(item, found)
      } else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          if (gated.has(key)) found.push(key)
          keysIn(child, found)
        }
      }
      return found
    }

    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const leaked = keysIn(schemaFor(entry))
      if (leaked.length > 0) offenders.push(`${entry.lesson.id}: ${leaked.join(", ")}`)
    }
    expect(offenders).toEqual([])
  })

  it("keeps the description identical to the meta description", () => {
    // Two different descriptions for one URL is a contradiction a crawler has to resolve, and
    // it resolves it by trusting neither. The comparison is against the head this page actually
    // renders, not against a second copy of the same formula: the graph used to build its own
    // string from the summary, which held only while `seoDescription` was unset everywhere.
    for (const entry of ENTRIES) {
      const preview = toPublicLessonPreview(entry)
      expect(schemaFor(entry).description, entry.lesson.id).toBe(
        learnLessonMetadata(preview).description
      )
    }
  })

  it("carries the authored seoDescription, not the summary, wherever one is set", () => {
    // The regression this guards: an authored override reaching the meta tag while the graph
    // kept describing the page from its summary, which is the drift the test above forbids and
    // the reason a shared builder replaced the inline truncation here.
    const authored = ENTRIES.filter((entry) => entry.lesson.seoDescription)
    expect(authored.length).toBeGreaterThan(0)
    for (const entry of authored) {
      expect(schemaFor(entry).description, entry.lesson.id).toBe(entry.lesson.seoDescription)
    }
  })

  it("states a time requirement in valid ISO 8601 duration form", () => {
    const offenders: string[] = []
    for (const entry of ENTRIES) {
      const { timeRequired } = schemaFor(entry)
      if (!/^PT\d+M$/.test(timeRequired)) offenders.push(`${entry.lesson.id}: ${timeRequired}`)
    }
    expect(offenders).toEqual([])
  })

  it("serializes to valid JSON on every lesson", () => {
    // The graph is injected with dangerouslySetInnerHTML, so a value that breaks JSON breaks
    // the whole script tag and Search Console reports unparsable structured data.
    for (const entry of ENTRIES) {
      expect(() => JSON.parse(JSON.stringify(schemaFor(entry)))).not.toThrow()
    }
  })
})
