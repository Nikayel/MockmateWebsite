/**
 * XML sitemap.
 *
 * Two things here are load-bearing.
 *
 * **Every URL goes through `absoluteUrl`.** The origin used to be a local literal, and it named a
 * host that answers with a redirect, so every entry in the file pointed at a 3xx. Submitting a few
 * hundred more Learn URLs against that host would have multiplied the defect rather than introduced
 * it, so there is exactly one origin now and no string concatenation of it anywhere below.
 *
 * **The Learn section is derived, never listed.** It used to hand-list three track URLs, all of
 * which 307'd to `/login` because the whole tree was auth-gated. Now the public reading corpus is
 * real and it is a moving target: a concurrent authoring loop commits lessons to `main`, and Python
 * grew by thirteen lessons during the week this was written. So the tracks, the levels, and every
 * lesson are walked out of `lib/tutorials/course-catalog.ts` at build time. Nothing below hardcodes
 * a lesson id, a level, or a count.
 *
 * ## Why Learn URLs carry no `lastModified`
 *
 * The honest value would be the last commit that touched the lesson's source file. It is not
 * available at build time: Vercel clones shallow (`--depth=10`) with no remote, so a `git log` on a
 * curriculum file almost always falls outside the fetched range and returns nothing. That would emit
 * either an empty value or, worse, the clone timestamp on every lesson, which tells a crawler the
 * entire corpus changes on every deploy and trains it to ignore the field. An absent `lastmod` is a
 * legal, well-understood sitemap and is strictly better than a wrong one, so Learn URLs omit it.
 *
 * The static marketing pages keep their pre-existing build-time timestamp. That is not defensible
 * either, but changing it is a behaviour change for sixty-odd unrelated URLs and is out of scope
 * here; it is recorded as a follow-up rather than fixed silently.
 *
 * ## Size
 *
 * Google's limit is 50,000 URLs and 50MB per sitemap file. This file emits well under a thousand.
 * A sitemap index would be pure ceremony at that size, so there is one file.
 */
import type { MetadataRoute } from "next"
import { getAllBlogPosts } from "@/lib/mdx"
import { ALL_COMPANIES } from "@/lib/data/company-questions"
import { listCaseLabs } from "@/lib/labs/case-labs"
import { absoluteUrl } from "@/lib/seo/site"
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
} from "@/lib/tutorials/lesson-routes"

/**
 * Public Learn URLs: the hub, each track, each level, each lesson.
 *
 * Only ever built from `lesson-routes.ts`, which is the same module the pages and the proxy use, so
 * a URL cannot appear here in a shape the app does not actually serve. In particular
 * `lessonWorkspacePath` is deliberately NOT imported: the workspace carries the graded payload, is
 * `noindex`, and must never be advertised. `sitemap.test.ts` asserts no `/workspace` URL escapes.
 */
function buildLearnPages(): MetadataRoute.Sitemap {
  const hub: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(LEARN_HUB_PATH),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      // The flat all-lessons index (app/learn/all): the one page from which a crawler reaches the
      // entire corpus in a single hop, and the page that keeps every lesson within three hops of
      // the homepage.
      url: absoluteUrl(`${LEARN_HUB_PATH}/all`),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]

  const tracks: MetadataRoute.Sitemap = COURSE_IDS.map((courseId) => ({
    url: absoluteUrl(trackPath(courseId)),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }))

  const levels: MetadataRoute.Sitemap = listAllCourseLevels().map(({ courseId, level }) => ({
    url: absoluteUrl(levelPath(courseId, level.slug)),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  const lessons: MetadataRoute.Sitemap = listAllCatalogEntries().map(
    ({ courseId, level, lesson }) => ({
      url: absoluteUrl(publicLessonPath(courseId, level.slug, lesson.id)),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  )

  return [...hub, ...tracks, ...levels, ...lessons]
}

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date().toISOString()

  // Core marketing pages - high priority
  const marketingPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/why-codesparring"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/docs"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // SEO Landing Pages
    {
      url: absoluteUrl("/ai-coding-interview-practice"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/system-design-interview-practice"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/bug-fix-interview-practice"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/software-engineer-interview-practice"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/new-grad-coding-interview-practice"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Comparison Pages
    {
      url: absoluteUrl("/codesparring-vs-leetcode"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/codesparring-vs-hellointerview"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/codesparring-vs-interviewing-io"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/codesparring-vs-pramp"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/best-ai-coding-interview-tools"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Guides
    {
      url: absoluteUrl("/guides/how-to-practice-bug-fix-interviews"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/guides/how-to-talk-through-coding-interviews"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/guides/what-is-a-real-world-coding-interview-round"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Free Public Practice
    {
      url: absoluteUrl("/free-ai-coding-interview"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // Product pages linked from the homepage hero. Both carry real metadata and real marketing copy
    // and were simply never listed here, so neither had a submitted path into the index.
    {
      url: absoluteUrl("/rounds"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/labs"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ]

  // Case Lab detail pages, derived from the registry for the same reason blog posts are derived from
  // their front matter: authoring a lab should put it in the sitemap, not require a second edit here.
  const caseLabPages: MetadataRoute.Sitemap = listCaseLabs().map((lab) => ({
    url: absoluteUrl(`/labs/${lab.id}`),
    lastModified: currentDate,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  // Interview prep pages - high SEO value
  const interviewPrepPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/interview-prep"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Individual company prep pages
    ...ALL_COMPANIES.map((company) => ({
      url: absoluteUrl(`/interview-prep/${company.id}`),
      lastModified: currentDate,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
  ]

  // Roadmap preview page
  const roadmapPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/roadmap/preview"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]

  // Blog pages - high SEO value
  const blogListPage: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/blog"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ]

  // Individual blog posts from MDX files. These carry a REAL lastModified: the post's own front
  // matter date, which is authored and therefore trustworthy.
  const blogPostPages: MetadataRoute.Sitemap = getAllBlogPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  // Sample feedback pages - showcase content
  const samplePages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/samples"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/samples/two-sum-excellent"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/samples/binary-tree-good"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/samples/dynamic-programming-needs-work"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]

  // Secondary pages
  const secondaryPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/careers"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/legal"),
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/python-executor"),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/referral-terms"),
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]

  return [
    ...marketingPages,
    ...interviewPrepPages,
    ...roadmapPages,
    ...blogListPage,
    ...blogPostPages,
    ...samplePages,
    ...caseLabPages,
    ...secondaryPages,
    ...buildLearnPages(),
  ]
}
