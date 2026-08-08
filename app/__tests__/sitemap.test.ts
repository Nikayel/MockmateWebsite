/**
 * Sitemap contract.
 *
 * The sitemap is the one file that tells Google what this site is, so the failure modes are all
 * quiet ones: a URL against the wrong host is a redirect Google eventually stops following, a
 * duplicate is a crawl-budget leak, and a `/workspace` URL is the graded, auth-gated payload
 * advertised to every scraper on the internet. None of those throw at build time. They are pinned
 * here instead.
 *
 * Everything expected is DERIVED from `lib/tutorials/course-catalog.ts` and the route builders in
 * `lib/tutorials/lesson-routes.ts`. A concurrent authoring loop adds lessons to `main`, so any
 * hardcoded lesson id or lesson count in this file would be a false failure within days. The only
 * literal number below is the count of hand-listed static marketing pages, which is meant to be
 * bumped deliberately when someone adds one.
 *
 * `next/server` is stubbed by `vitest.setup.ts`, but neither `app/sitemap.ts` nor `app/robots.ts`
 * imports it: both take `MetadataRoute` from `next`, which is a type-only import erased at compile
 * time. `app/sitemap.ts` does read the filesystem through `lib/mdx`, which is fine under the `node`
 * test environment.
 */
import { describe, expect, it } from "vitest"
import sitemap from "../sitemap"
import robots from "../robots"
import { SITE_ORIGIN } from "@/lib/seo/site"
import {
  COURSE_IDS,
  listAllCatalogEntries,
  listAllCourseLevels,
} from "@/lib/tutorials/course-catalog"
import {
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
  WORKSPACE_SEGMENT,
} from "@/lib/tutorials/lesson-routes"
import { getAllBlogPosts } from "@/lib/mdx"
import { ALL_COMPANIES } from "@/lib/data/company-questions"
import { listCaseLabs } from "@/lib/labs/case-labs"

/**
 * Hand-listed non-Learn pages in `app/sitemap.ts`: marketing, guides, comparisons, the interview-prep
 * index, the roadmap preview, the blog index, samples, and the secondary pages. Company pages, blog
 * posts, and Case Lab detail pages are excluded here because all three are derived and counted
 * separately.
 *
 * This is intentionally a literal. Adding a marketing page should be a deliberate act that shows up
 * as a one-line diff here, not something that silently changes the shape of the sitemap.
 */
const STATIC_PAGE_COUNT = 31

/** Learn URLs only, so the derived half can be checked independently of the hand-listed half. */
function learnUrls(urls: string[]): string[] {
  return urls.filter((url) => url.startsWith(`${SITE_ORIGIN}/learn`))
}

/** Every Learn URL the sitemap is supposed to contain, rebuilt from the live catalog. */
function expectedLearnUrls(): string[] {
  const hub = [`${SITE_ORIGIN}${LEARN_HUB_PATH}`, `${SITE_ORIGIN}${LEARN_HUB_PATH}/all`]
  const tracks = COURSE_IDS.map((courseId) => `${SITE_ORIGIN}${trackPath(courseId)}`)
  const levels = listAllCourseLevels().map(
    ({ courseId, level }) => `${SITE_ORIGIN}${levelPath(courseId, level.slug)}`
  )
  const lessons = listAllCatalogEntries().map(
    ({ courseId, level, lesson }) =>
      `${SITE_ORIGIN}${publicLessonPath(courseId, level.slug, lesson.id)}`
  )
  return [...hub, ...tracks, ...levels, ...lessons]
}

describe("sitemap", () => {
  const entries = sitemap()
  const urls = entries.map((entry) => entry.url)

  it("emits every URL against the canonical origin", () => {
    const offOrigin = urls.filter(
      (url) => !url.startsWith(`${SITE_ORIGIN}/`) && url !== SITE_ORIGIN
    )
    expect(offOrigin).toEqual([])
  })

  it("emits no double slash in any path", () => {
    // `https://` is the only legal `//` in a sitemap URL. Anything after the origin is a distinct,
    // duplicate URL to a crawler.
    const doubled = urls.filter((url) => url.slice(SITE_ORIGIN.length).includes("//"))
    expect(doubled).toEqual([])
  })

  it("emits no duplicate URLs anywhere", () => {
    const seen = new Set<string>()
    const duplicates = urls.filter((url) => {
      if (seen.has(url)) return true
      seen.add(url)
      return false
    })
    expect(duplicates).toEqual([])
  })

  it("never advertises a lesson workspace", () => {
    // The security invariant. The workspace carries starter code, hints, reference solutions, and
    // test cases; it is auth-gated and noindexed, and it must not be discoverable from here.
    const leaked = urls.filter((url) => url.includes(`/${WORKSPACE_SEGMENT}`))
    expect(leaked).toEqual([])
  })

  it("lists every public lesson exactly once", () => {
    const expected = listAllCatalogEntries().map(
      ({ courseId, level, lesson }) =>
        `${SITE_ORIGIN}${publicLessonPath(courseId, level.slug, lesson.id)}`
    )
    const present = new Set(urls)
    const missing = expected.filter((url) => !present.has(url))
    expect(missing).toEqual([])

    const counts = new Map<string, number>()
    for (const url of urls) counts.set(url, (counts.get(url) ?? 0) + 1)
    const repeated = expected.filter((url) => (counts.get(url) ?? 0) > 1)
    expect(repeated).toEqual([])
  })

  it("lists every track and every level", () => {
    const present = new Set(urls)

    const missingTracks = COURSE_IDS.map(
      (courseId) => `${SITE_ORIGIN}${trackPath(courseId)}`
    ).filter((url) => !present.has(url))
    expect(missingTracks).toEqual([])

    const missingLevels = listAllCourseLevels()
      .map(({ courseId, level }) => `${SITE_ORIGIN}${levelPath(courseId, level.slug)}`)
      .filter((url) => !present.has(url))
    expect(missingLevels).toEqual([])
  })

  it("contains no Learn URL that the catalog does not account for", () => {
    // The other direction: a stale hand-written Learn URL left behind would 404 for every crawler
    // that follows it.
    const expected = new Set(expectedLearnUrls())
    const unexpected = learnUrls(urls).filter((url) => !expected.has(url))
    expect(unexpected).toEqual([])
  })

  it("totals catalog size plus levels plus tracks plus the static pages", () => {
    // 2 = the hub plus the flat /learn/all lesson index.
    const expectedLearn = 2 + COURSE_IDS.length + listAllCourseLevels().length
    const expectedLessons = listAllCatalogEntries().length
    const expectedStatic =
      STATIC_PAGE_COUNT + ALL_COMPANIES.length + getAllBlogPosts().length + listCaseLabs().length

    expect(urls.length).toBe(expectedLearn + expectedLessons + expectedStatic)
  })

  it("lists the public product pages that were previously missing", () => {
    // `/rounds` and `/labs` are linked from the homepage hero and carry real marketing metadata, but
    // neither was ever submitted, so neither had a path into the index that did not depend on Google
    // discovering it by crawl. `/python-executor` and `/referral-terms` are the same class of
    // omission, lower value.
    const present = new Set(urls)
    const missing = ["/rounds", "/labs", "/python-executor", "/referral-terms"].filter(
      (path) => !present.has(`${SITE_ORIGIN}${path}`)
    )
    expect(missing).toEqual([])
  })

  it("lists every Case Lab detail page, derived from the registry", () => {
    // Derived, not hand-listed: authoring a lab must be enough to get it submitted. A literal list
    // here would be stale the first time someone adds a fifth lab.
    const present = new Set(urls)
    const missing = listCaseLabs()
      .map((lab) => `${SITE_ORIGIN}/labs/${lab.id}`)
      .filter((url) => !present.has(url))
    expect(missing).toEqual([])
  })

  it("actually loaded the Case Lab registry", () => {
    // Guards the two assertions above from passing vacuously on an empty registry import.
    expect(listCaseLabs().length).toBeGreaterThan(0)
  })

  it("submits no URL that robots.txt disallows", () => {
    // The contradiction that motivated this pass: a sitemap says "index this", a robots disallow says
    // "do not fetch this". Google reports it as an error and the URL stays in limbo. `/knowledge` and
    // `/metrics` were just added to the disallow list, so this pins the two files against each other.
    const config = robots()
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules]
    const disallowed = rules.flatMap((rule) => {
      const list = rule.disallow
      if (!list) return []
      return Array.isArray(list) ? list : [list]
    })

    const conflicts = urls.filter((url) => {
      const path = url.slice(SITE_ORIGIN.length) || "/"
      return disallowed.some((pattern) =>
        // `$` anchors the pattern to the end of the URL, exactly as robots.txt defines it.
        pattern.endsWith("$") ? path === pattern.slice(0, -1) : path.startsWith(pattern)
      )
    })
    expect(conflicts).toEqual([])
  })

  it("actually loaded the curriculum registries", () => {
    // A loose lower bound, not a pinned count: the corpus grows continuously. Its only job is to
    // fail loudly if a registry import silently resolves to an empty array, which would make every
    // assertion above vacuously pass.
    expect(listAllCatalogEntries().length).toBeGreaterThan(100)
    expect(listAllCourseLevels().length).toBeGreaterThan(5)
  })
})

describe("robots", () => {
  const config = robots()
  const rules = Array.isArray(config.rules) ? config.rules : [config.rules]

  function disallowList(rule: (typeof rules)[number]): string[] {
    const { disallow } = rule
    if (!disallow) return []
    return Array.isArray(disallow) ? disallow : [disallow]
  }

  it("points the sitemap at the canonical origin", () => {
    expect(config.sitemap).toBe(`${SITE_ORIGIN}/sitemap.xml`)
  })

  it("never disallows /learn", () => {
    // The public reading corpus is the reason this SEO work exists. A `/learn` disallow would make
    // several hundred pages uncrawlable in one line.
    for (const rule of rules) {
      for (const path of disallowList(rule)) {
        expect(path.startsWith("/learn")).toBe(false)
      }
    }
  })

  it("never disallows a lesson workspace", () => {
    // Disallow + noindex on one path is self-defeating: a blocked crawler never reads the noindex,
    // so the URL stays eligible for URL-only indexing. The workspace relies on noindex alone.
    for (const rule of rules) {
      for (const path of disallowList(rule)) {
        expect(path.includes(WORKSPACE_SEGMENT)).toBe(false)
      }
    }
  })

  it("gives every crawler group the same private-path list", () => {
    // robots.txt groups do not inherit: a named user-agent group REPLACES the `*` group. A shorter
    // list on any named group silently opens private routes to that crawler, which is exactly the
    // bug the old static file shipped.
    const [first, ...rest] = rules
    for (const rule of rest) {
      expect(disallowList(rule)).toEqual(disallowList(first))
    }
  })

  it("still blocks the admin surface and the API", () => {
    for (const rule of rules) {
      const disallowed = disallowList(rule)
      expect(disallowed).toContain("/admin")
      expect(disallowed).toContain("/api/")
    }
  })

  it("uses Anthropic's current crawler tokens, not the retired ones", () => {
    const agents = rules.flatMap((rule) => {
      const { userAgent } = rule
      if (!userAgent) return []
      return Array.isArray(userAgent) ? userAgent : [userAgent]
    })
    expect(agents).toContain("ClaudeBot")
    expect(agents).not.toContain("Claude-Web")
    expect(agents).not.toContain("Anthropic-AI")
    expect(agents).not.toContain("anthropic-ai")
  })
})
