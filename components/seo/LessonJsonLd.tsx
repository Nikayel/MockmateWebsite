/**
 * Structured data that describes THE LESSON.
 *
 * ## What was wrong
 *
 * Verified against production on 2026-08-13: lesson pages already emitted JSON-LD, but only the
 * four site-level blocks (`WebSite`, `Organization`, `SoftwareApplication`, `Person`). Every one
 * of them describes CodeSparring the product. So a page about fencing tokens told Google it was a
 * piece of software priced at $25 a month, across all 425 lesson URLs, which are the bulk of the
 * indexed surface. The plumbing was already firing on every page; nothing was describing the page.
 *
 * ## Three decisions worth recording, because each looks like an omission
 *
 * **No `datePublished` or `dateModified`, deliberately.** The honest value is the last commit that
 * touched the lesson's source file, and it is not available at build time: Vercel clones shallow
 * (`--depth=10`) with no remote, so `git log` on a curriculum file returns nothing. The fallback
 * everyone reaches for is the build timestamp, and this repo has already paid for that once. It
 * used to stamp build time as `lastModified` on every sitemap entry, which asserted that the whole
 * corpus changed on every deploy; Search Console's answer was to leave nearly all 545 URLs in
 * "Discovered - currently not indexed". `app/sitemap.ts` now omits the field for exactly this
 * reason and `sitemap.test.ts` pins it. Emitting a fabricated `dateModified` here would reintroduce
 * the same false freshness signal through a different tag. `datePublished` is recommended for
 * `Article`, never required, and an absent field beats a wrong one.
 *
 * **No `FAQPage`, despite the lessons carrying real question-and-answer content.** Google stopped
 * rendering FAQ rich results on 2026-05-07, which is why `FAQPageJsonLd` was already deleted from
 * `JsonLd.tsx`. The tempting source here is the inline `check` widgets, which genuinely are
 * questions with visible answers. They are formative quiz items rather than frequently-asked
 * questions, and the `Quiz` type that would fit them was pulled from Search Console and the Rich
 * Results Test in January 2026. Marking up 516 retrieval checks as an FAQ would be schema that no
 * consumer renders, attached to content it misdescribes.
 *
 * **`isAccessibleForFree: true` is a real claim and it is true.** The reading page publishes the
 * entire teach section to a signed-out visitor; only the graded workspace is gated, and that half
 * is `noindex`. Claiming free access on a page that is actually paywalled is what
 * `hasPart`/`isAccessibleForFree` exists to catch, so making the claim correctly is worth the bytes.
 *
 * `LearningResource` carries no Google rich result of its own, which is why it rides as
 * `additionalType` on an `Article` rather than replacing it: `Article` is the type Google renders,
 * and the extra URI costs nothing while telling an AI crawler what kind of page this is. This site
 * courts those crawlers on purpose (see `public/llms.txt` and the allowances in `app/robots.ts`).
 */
import { SITE_ORIGIN, absoluteUrl } from "@/lib/seo/site"
import { LEARN_COURSE_LABEL, trackPath } from "@/lib/tutorials/lesson-routes"
import type { PublicLessonPreview } from "@/lib/tutorials/public-preview"

/** Everything the schema needs, taken from the public projection so nothing gated can leak in. */
export interface LessonSchemaInput {
  preview: PublicLessonPreview
  /** The lesson's canonical path, so the `@id` matches `rel=canonical` exactly. */
  path: string
  /** The meta description, reused so the two never drift apart. */
  description: string
}

/**
 * Build the lesson graph. Pure and exported so a test can assert on the object rather than on a
 * regex over rendered HTML.
 */
export function buildLessonSchema({ preview, path, description }: LessonSchemaInput) {
  const url = absoluteUrl(path)
  const courseLabel = LEARN_COURSE_LABEL[preview.courseId]

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    // No Google rich result of its own; free signal to an AI crawler about what this page is.
    additionalType: "https://schema.org/LearningResource",
    "@id": url,
    url,
    headline: preview.title,
    description,
    inLanguage: "en",
    // The reading page publishes the whole teach section to a signed-out visitor. The graded
    // workspace is the gated half and it is noindexed, so this claim is true of what is indexed.
    isAccessibleForFree: true,
    learningResourceType: "Lesson",
    educationalLevel: preview.difficulty,
    // Authored per lesson, so this is a real estimate rather than a guess from word count.
    timeRequired: `PT${preview.estimatedMinutes}M`,
    // `skills` is the authored list of what the lesson teaches, which is exactly `teaches`.
    teaches: preview.skills,
    about: preview.skills.map((skill) => ({ "@type": "Thing", name: skill })),
    isPartOf: {
      "@type": "Course",
      name: `Learn ${courseLabel}`,
      url: absoluteUrl(trackPath(preview.courseId)),
    },
    author: {
      "@type": "Person",
      name: "Nikayel Ali Jamal",
      url: "https://linkedin.com/in/nikayel-ali",
    },
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/api/logo.png`,
        width: 512,
        height: 512,
      },
    },
    image: absoluteUrl("/opengraph-image"),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  }
}

/** Emit the lesson graph as a JSON-LD script tag. */
export function LessonJsonLd(input: LessonSchemaInput) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLessonSchema(input)) }}
    />
  )
}
