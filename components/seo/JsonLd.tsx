/**
 * JSON-LD structured data components.
 *
 * Every `@id`, `url`, and `item` below has to name the SAME host the page's `rel=canonical` names,
 * or the graph describes a different document than the one being served. That is why the origin is
 * imported from `lib/seo/site.ts` rather than re-derived here: this file used to hold one of four
 * independent copies of the apex literal, each free to drift.
 *
 * Only schema types Google still renders a rich result for are worth adding. Verified against
 * Google's structured data gallery (checked 2026-08): Breadcrumb and Course list are supported; the
 * practice-problem / Quiz type was pulled from Search Console and the Rich Results Test in January
 * 2026; FAQ rich results end 2026-05-07; `LearningResource` has never had a Google rich result at
 * all. Nothing belongs here on the theory that "more schema is better" - an unrendered type is bytes
 * on every page for no return.
 */
import { PRICING_CONFIG } from "@/lib/config"
import {
  COMPETITOR_PRICING,
  MOCKS_FOR_IMPACT,
  getHumanMockCostMultiple,
  getHumanMockTotalCost,
  getLeetCodeComparisonClaim,
} from "@/lib/pricing-comparison"
import { SITE_ORIGIN, absoluteUrl } from "@/lib/seo/site"

// WebSite Schema - enables sitelinks search box in Google SERPs
// This is a powerful SEO feature that shows a search box directly in search results
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CodeSparring",
    alternateName: ["Code Sparring", "CodeSparring.dev"],
    url: SITE_ORIGIN,
    description:
      "AI interview practice platform for software engineers and data engineers, with free Python, data engineering, and system design courses",
    // potentialAction enables the sitelinks search box
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      url: SITE_ORIGIN,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Organization Schema - for brand recognition in search
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CodeSparring",
    url: SITE_ORIGIN,
    // Use PNG for better Google search result display (dynamically generated at /api/logo.png)
    logo: {
      "@type": "ImageObject",
      url: `${SITE_ORIGIN}/api/logo.png`,
      width: 512,
      height: 512,
    },
    description:
      "AI interview practice platform: voice-enabled mock interviews for DSA, debugging, and system design, spaced repetition, and free Python, data engineering, and system design courses.",
    foundingDate: "2025",
    founder: {
      "@type": "Person",
      name: "Nikayel Ali Jamal",
      // alternateName helps Google understand name variations people might search
      alternateName: [
        "Nikayel",
        "Nikayeel",
        "Nikayel Ali",
        "Nikayeel Ali",
        "Nikayel Jamal",
        "Nikayeel Jamal",
        "Ali Nikayel",
        "Nikayel Ali Jamal",
        "Nikayeel Ali Jamal",
      ],
      jobTitle: "Founder & CEO",
      description:
        "Computer Science student at Sacramento State. Built CodeSparring to help engineers prepare for technical interviews with AI.",
      url: "https://linkedin.com/in/nikayel-ali",
      sameAs: [
        "https://linkedin.com/in/nikayel-ali",
        "https://github.com/nikayel",
        "https://twitter.com/codesparring",
      ],
    },
    sameAs: ["https://twitter.com/codesparring", "https://linkedin.com/company/codesparring"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "nikayel@codesparring.dev",
      contactType: "customer support",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// SoftwareApplication Schema - for product details in search
// Enhanced with specific differentiators for AI crawlers and Google
export function SoftwareApplicationJsonLd() {
  // Structured data is a price claim Google indexes and can surface in results,
  // so it is the last place a stale literal should live. Every number below used
  // to be hand-typed here, independently of the pricing page it describes.
  const { monthly, yearly } = PRICING_CONFIG.pro.website
  const humanMockCost = getHumanMockTotalCost()
  const comparisonClaim = getLeetCodeComparisonClaim()
  const humanMockMultiple = getHumanMockCostMultiple()

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CodeSparring",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: SITE_ORIGIN,
    description: `CodeSparring is an AI mock interview platform for software engineers and data engineers that trains interview performance, not just problem-solving. It runs DSA, debugging, and system design interview rounds where you speak your solution out loud (voice or text) and get feedback on communication, approach, and code quality, and it includes free Python, data engineering, and system design courses that need no account to read. Available 24/7 with no scheduling, at a fraction of the cost of human mock interviews (${monthly.priceDisplay}/month vs $${COMPETITOR_PRICING.humanMock.perSessionMax}/session).`,
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        price: "0",
        priceCurrency: "USD",
        description:
          "8 full interview sessions per month, 20+ problems with unlimited practice, full AI interviewer feedback, and the whole Learn curriculum. No credit card required.",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Monthly",
        price: String(monthly.price),
        priceCurrency: "USD",
        billingDuration: "P1M",
        description: `${PRICING_CONFIG.pro.sessionsPerMonth} interview sessions/month, spaced repetition scheduling, personalized study roadmap, company-specific prep for FAANG and top tech companies. ${comparisonClaim}.`,
      },
      {
        "@type": "Offer",
        name: "Pro Plan Yearly",
        price: String(yearly.totalPrice),
        priceCurrency: "USD",
        billingDuration: "P1Y",
        description: `Everything in Pro, billed annually. Save ${yearly.savingsPercent}% ($${yearly.savings}/year).`,
      },
    ],
    featureList: [
      // Core differentiators
      "Voice-enabled mock interviews - practice speaking your solution out loud like real interviews",
      "AI interviewer available 24/7 - no scheduling needed unlike Interviewing.io or Pramp",
      "Real-time feedback on communication, problem-solving, and code quality",
      "Spaced repetition system for long-term retention",
      // Comparison points
      `${humanMockMultiple}x cheaper than human mock interviews (${monthly.priceDisplay}/month vs $${humanMockCost.max.toLocaleString()} for ${MOCKS_FOR_IMPACT} sessions)`,
      `${comparisonClaim} with interview simulation included`,
      "Consistent quality unlike peer-to-peer platforms where quality varies",
      // Technical features
      "170+ DSA interview scenarios across 18 patterns, with per-pattern mastery tracking",
      "Company-specific prep for 38 companies including Google, Meta, Amazon, Apple, Netflix, and Stripe",
      "System design interviews and real-world coding scenarios",
      "Free Python, data engineering, and system design courses, readable without an account",
      "Debugging rounds and case labs inside multi-file codebases, run against a failing test suite",
      "Code runs in the browser: Python via Pyodide, SQL via sql.js",
    ],
    // Keywords for AI understanding
    keywords:
      "coding interview prep, mock interview, AI interviewer, LeetCode alternative, voice interview practice, FAANG interview prep, spaced repetition, interview performance training",
    // Competitive positioning
    isRelatedTo: [
      {
        "@type": "SoftwareApplication",
        name: "LeetCode",
        description:
          "Problem repository for algorithm practice. Does not include interview simulation or voice practice.",
      },
      {
        "@type": "Service",
        name: "Interviewing.io",
        description: "Human mock interviews at $225/session. Requires scheduling.",
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// FAQPageJsonLd was removed when its last caller (the pricing page) dropped it.
// Google stopped rendering FAQ rich results on 2026-05-07, which is the date this
// file's own header records, so the schema was bytes on every pricing view for no
// return. HomepagePositioningFAQJsonLd below is deliberately KEPT: it exists to
// give AI crawlers a differentiation answer, which is a separate purpose from a
// Google rich result and one this site actively courts (see public/llms.txt and
// the AI-crawler allowances in app/robots.ts).

// WebPage Schema - generic page schema
export function WebPageJsonLd({
  title,
  description,
  url,
}: {
  title: string
  description: string
  url: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: description,
    url: absoluteUrl(url),
    isPartOf: {
      "@type": "WebSite",
      name: "CodeSparring",
      url: SITE_ORIGIN,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// How-To Schema - for the why-codesparring page explaining the process
export function HowToJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Prepare for Coding Interviews with CodeSparring",
    description:
      "A science-backed approach to acing coding interviews using spaced repetition and AI-powered practice.",
    step: [
      {
        "@type": "HowToStep",
        name: "Create Your Roadmap",
        text: "Enter your interview date and target company. Our AI generates your personalized study plan based on your timeline and skill level.",
        position: 1,
      },
      {
        "@type": "HowToStep",
        name: "Practice Smart",
        text: "Follow daily recommendations. We track your performance and optimize review timing using spaced repetition.",
        position: 2,
      },
      {
        "@type": "HowToStep",
        name: "Ace Your Interview",
        text: "Arrive confident with patterns deeply embedded in long-term memory through science-backed learning techniques.",
        position: 3,
      },
    ],
    totalTime: "P30D",
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Article Schema - for blog posts (improves SERP appearance)
export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  author,
  image,
}: {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  author?: string
  image?: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    url: absoluteUrl(url),
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author || "Nikayel Ali Jamal",
      url: "https://linkedin.com/in/nikayel-ali",
      sameAs: ["https://linkedin.com/in/nikayel-ali", "https://github.com/nikayel"],
    },
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/api/logo.png`,
        width: 512,
        height: 512,
      },
    },
    // Use dynamically generated OG image (Next.js serves opengraph-image.tsx at /opengraph-image)
    image: absoluteUrl(image ?? "/opengraph-image"),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(url),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * BreadcrumbList - the navigation trail Google renders in place of the raw URL in a result.
 *
 * `url` is a site-relative path and is resolved through `absoluteUrl`, not string-concatenated.
 * Google matches breadcrumb `item` values against the page's canonical URL, so a trailing-slash or
 * double-slash mismatch quietly disqualifies the whole trail rather than erroring.
 *
 * This is the highest-value schema on a deep Learn corpus: a lesson four segments down otherwise
 * shows a URL, and instead shows "CodeSparring > Learn > Python > Truthiness traps".
 */
export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// CollectionPage + ItemList Schema - richer SERP for the /blog listing
export function BlogCollectionJsonLd({
  posts,
}: {
  posts: Array<{ slug: string; title: string; description: string; date: string }>
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "CodeSparring Blog",
    description:
      "Guides on technical interview prep, real-codebase debugging, spaced repetition, and FAANG interviews.",
    url: `${SITE_ORIGIN}/blog`,
    isPartOf: {
      "@type": "WebSite",
      name: "CodeSparring",
      url: SITE_ORIGIN,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SITE_ORIGIN}/blog/${post.slug}`,
        item: {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          url: `${SITE_ORIGIN}/blog/${post.slug}`,
        },
      })),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Person Schema - for founder name SEO (helps your name show up in searches)
// This is a standalone Person schema separate from Organization.founder
export function FounderPersonJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": "https://linkedin.com/in/nikayel-ali#person",
    name: "Nikayel Ali Jamal",
    // Multiple alternate names for different search variations
    alternateName: ["Nikayel Jamal", "Nikayel Ali", "Nikayeel Jamal", "Nikayeel Ali", "Nikayel"],
    givenName: "Nikayel",
    familyName: "Jamal",
    additionalName: "Ali",
    jobTitle: "Founder & Software Engineer",
    description:
      "Computer Science student at Sacramento State University. Founder of CodeSparring, an AI-powered coding interview preparation platform. Passionate about helping developers ace technical interviews through spaced repetition and AI mock interviews.",
    url: "https://linkedin.com/in/nikayel-ali",
    image: `${SITE_ORIGIN}/api/logo.png`,
    // Educational background
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Sacramento State University",
      alternateName: ["Sac State", "CSUS", "California State University Sacramento"],
    },
    // Professional affiliations
    worksFor: {
      "@type": "Organization",
      name: "CodeSparring",
      url: SITE_ORIGIN,
    },
    // Knowledge areas (helps with topical authority)
    knowsAbout: [
      "Software Engineering",
      "Data Structures and Algorithms",
      "Coding Interviews",
      "Technical Interview Preparation",
      "AI/Machine Learning",
      "Spaced Repetition Learning",
      "EdTech",
      "Web Development",
      "React",
      "Next.js",
      "TypeScript",
    ],
    // Social profiles
    sameAs: [
      "https://linkedin.com/in/nikayel-ali",
      "https://github.com/nikayel",
      "https://twitter.com/codesparring",
      SITE_ORIGIN,
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/** One course as both the `Course` schema and a `ListItem` in a course list carousel needs it. */
export interface CourseSchemaInput {
  /** Course title, e.g. "Python for Interviews". Required by Google. */
  name: string
  /** Required by Google. Displayed with a 60-character limit, so lead with the substance. */
  description: string
  /** Site-relative path to the course landing page. Resolved through `absoluteUrl`. */
  url: string
  /**
   * Total authored minutes across the whole track, summed from the live curriculum at build time.
   * Never a guess: this used to be a hardcoded `PT30M` on a track that is many hours long.
   */
  workloadMinutes: number
  /** Optional skill list, e.g. the union of lesson `skills`. Surfaced as `teaches`. */
  teaches?: string[]
}

/**
 * Minutes to an ISO 8601 duration, which is the only format `courseWorkload` accepts.
 *
 * Hours are NOT rolled into days. `P1DT4H` would claim the work is spread over a calendar day, while
 * `PT28H` states the honest thing: twenty-eight hours of study, whenever the learner takes them.
 */
function toIsoDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  if (hours === 0) return `PT${minutes}M`
  if (minutes === 0) return `PT${hours}H`
  return `PT${hours}H${minutes}M`
}

/** Shared object builder so a standalone `Course` and a `Course` nested in a list never diverge. */
function buildCourseSchema(course: CourseSchemaInput): Record<string, unknown> {
  return {
    "@type": "Course",
    name: course.name,
    description: course.description,
    url: absoluteUrl(course.url),
    provider: {
      "@type": "Organization",
      name: "CodeSparring",
      url: SITE_ORIGIN,
    },
    // Every Learn track is readable without an account, which is the single most useful fact a
    // search or answer engine can carry about this corpus.
    isAccessibleForFree: true,
    inLanguage: "en",
    ...(course.teaches?.length ? { teaches: course.teaches } : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: toIsoDuration(course.workloadMinutes),
    },
  }
}

/**
 * `Course` for a single Learn track page.
 *
 * Honest scope note: Google retired the standalone "course info" rich result in June 2025, so this
 * on its own does not draw a SERP treatment. It is still worth emitting because the vocabulary is
 * current, it is what the `Course list` carousel points at (see {@link CourseListJsonLd}), and it is
 * how an answer engine learns that `/learn/python` is a free multi-hour course rather than a blog
 * index. It replaces a version that shipped a hardcoded `courseWorkload: "PT30M"` and had zero call
 * sites, so nothing downstream depended on the old shape.
 *
 * Mount on: `/learn/python`, `/learn/data-engineering`, `/learn/system-design`.
 */
export function CourseJsonLd(course: CourseSchemaInput) {
  const schema = {
    "@context": "https://schema.org",
    ...buildCourseSchema(course),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * `ItemList` of `Course` - the shape behind Google's Course list carousel.
 *
 * Google's all-in-one variant puts the full `Course` inside each `ListItem`, alongside the
 * `position` and `url` the carousel requires. Eligibility needs at least three courses from one
 * provider, which is exactly what the Learn hub lists.
 *
 * Mount on: `/learn` (the hub), passing every course in `COURSE_IDS` order.
 */
export function CourseListJsonLd({ courses }: { courses: CourseSchemaInput[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(course.url),
      item: buildCourseSchema(course),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * `ItemList` of lessons, for a track page or a level page.
 *
 * This one earns no rich result by itself, and that is fine. Its job is to state the page's real
 * structure: a track index and a level index are ordered collections of lesson URLs, and saying so
 * explicitly gives a crawler the ordering and the titles without depending on it inferring both from
 * link markup. On a corpus this deep that is the difference between lessons being discovered in
 * curriculum order and being discovered at random.
 *
 * `name` on each item carries the lesson title so the list is readable on its own; `url` is what
 * makes each entry resolvable.
 *
 * Mount on: `/learn/{track}` (all lessons in the track) and `/learn/{track}/{levelSlug}` (that
 * level's lessons).
 */
export function LessonListJsonLd({
  name,
  lessons,
}: {
  /** What the list is, e.g. "Python for Interviews lessons". */
  name: string
  lessons: Array<{ title: string; url: string }>
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: lessons.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: lessons.map((lesson, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: lesson.title,
      url: absoluteUrl(lesson.url),
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Homepage Positioning FAQ - helps AI crawlers and Google understand our differentiation
// These FAQs are specifically designed to answer common comparison questions
export function HomepagePositioningFAQJsonLd() {
  const { monthly, yearly } = PRICING_CONFIG.pro.website
  const humanMockCost = getHumanMockTotalCost()
  const comparisonClaim = getLeetCodeComparisonClaim()

  const faqs = [
    {
      question: "What is CodeSparring and how is it different from LeetCode?",
      answer:
        "CodeSparring is an AI-powered mock interview platform that trains interview performance, not just problem-solving. While LeetCode provides coding problems to solve alone in silence, CodeSparring simulates real interview conditions where you speak your solution out loud and receive AI feedback on your communication, problem-solving approach, and code quality. LeetCode tests if you can solve problems; CodeSparring trains you to perform in actual interviews. It also includes free Python, data engineering, and system design courses, and the reading half of every lesson needs no account.",
    },
    {
      question: "Is CodeSparring better than LeetCode for interview preparation?",
      answer: `They serve different purposes. LeetCode is excellent for building algorithm and data structure fundamentals with its vast problem library. CodeSparring is better for practicing the actual interview experience - speaking through your thought process, handling follow-up questions, and getting feedback on how you communicate. Many users use both: LeetCode to learn patterns, CodeSparring to practice performing. CodeSparring is also ${comparisonClaim} (${monthly.priceDisplay}/month vs $${COMPETITOR_PRICING.leetcodePremium.monthlyPrice}/month) and includes interview simulation.`,
    },
    {
      question: "How much does CodeSparring cost compared to mock interview services?",
      answer: `CodeSparring Pro costs ${monthly.priceDisplay}/month for ${PRICING_CONFIG.pro.sessionsPerMonth} AI mock interview sessions a month. Human mock interview services like Interviewing.io charge up to $${COMPETITOR_PRICING.humanMock.perSessionMax} per session. Research shows ${MOCKS_FOR_IMPACT} mock interviews significantly improve your pass rate, which would cost up to $${humanMockCost.max.toLocaleString()} with human interviewers. With CodeSparring, you get the same skill-building for ${monthly.priceDisplay}/month - that's ${getHumanMockCostMultiple()}x less expensive.`,
    },
    {
      question: "Can I practice coding interviews with voice on CodeSparring?",
      answer:
        "Yes, CodeSparring is voice-enabled. You can speak your solution out loud just like in a real interview, and the AI interviewer responds with follow-up questions and feedback. This is a key differentiator from platforms like LeetCode where you only type in silence. Real interviews test your ability to communicate your thinking, and CodeSparring trains that skill.",
    },
    {
      question: "What companies can I prepare for on CodeSparring?",
      answer:
        "CodeSparring offers company-specific preparation for 38 tech companies including Google, Meta (Facebook), Amazon, Apple, Netflix, Microsoft, Stripe, Airbnb, Uber, and more. Each company track includes patterns and question styles commonly seen in their interviews.",
    },
    {
      question: "Does CodeSparring use spaced repetition?",
      answer:
        "Yes, CodeSparring uses a spaced repetition system to schedule your practice at scientifically optimal intervals for long-term retention. Research shows spaced repetition improves retention by 10-30% compared to cramming. This means you remember patterns when it matters - during your actual interview.",
    },
    {
      question: "Is there a free trial for CodeSparring?",
      answer: `Yes. The free plan includes 8 full AI interview sessions per month and 20+ problems with unlimited practice, no credit card required. You can open the workspace and try a problem before creating an account; signing in unlocks the AI interviewer and feedback. Pro is ${monthly.priceDisplay}/month or $${yearly.totalPrice}/year for ${PRICING_CONFIG.pro.sessionsPerMonth} sessions per month.`,
    },
    {
      question: "Does CodeSparring have free courses?",
      answer:
        "Yes. CodeSparring includes free courses in Python, data engineering, and system design at codesparring.dev/learn. The reading half of every lesson is public and requires no account. The Python track has 5 levels, the data engineering track has 11 levels with SQL exercises graded against a real SQLite engine in the browser, and the system design track has 12 levels of free-response lessons with model answers.",
    },
    {
      question: "Can I practice data engineering interviews on CodeSparring?",
      answer:
        "Yes. CodeSparring has an 11-level data engineering track covering SQL foundations through data modeling, warehouses and lakehouse, batch pipelines, streaming and change data capture, Spark, and data for AI. Exercises run against a real SQLite engine in the browser and are graded on the result set they return. Debugging rounds and case labs cover pipeline-style problems such as billing webhook idempotency, event ordering, and deduplication.",
    },
    {
      question: "Can I practice system design interviews on CodeSparring?",
      answer:
        "Yes. CodeSparring has a free 12-level system design course, from interview method and estimation through distributed systems, event-driven architecture, and reliability, ending in applied case studies like a URL shortener, news feed, and rate limiter. Lessons are free-response: you write your own answer and compare it against a model answer. System design interview sessions also run as timed rounds with the AI interviewer.",
    },
  ]

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
