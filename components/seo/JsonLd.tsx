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
    description: "AI-powered coding interview practice platform",
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
      "AI-powered coding interview practice platform with voice-enabled mock interviews and spaced repetition learning.",
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
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CodeSparring",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: SITE_ORIGIN,
    description:
      "CodeSparring is an AI mock interview platform that trains interview performance, not just problem-solving. Unlike LeetCode which only tests if you can solve problems alone, CodeSparring simulates real interview conditions where you speak your solution out loud and receive feedback on communication, problem-solving approach, and code quality. Available 24/7 with no scheduling required, at a fraction of the cost of human mock interviews ($25/month vs $225/session).",
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        price: "0",
        priceCurrency: "USD",
        description:
          "20+ problems with unlimited practice, full AI interviewer feedback, performance analytics. No credit card required.",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Monthly",
        price: "25",
        priceCurrency: "USD",
        billingDuration: "P1M",
        description:
          "35 interview sessions/month, spaced repetition scheduling, personalized study roadmap, company-specific prep for FAANG and top tech companies. 29% cheaper than LeetCode Premium.",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Yearly",
        price: "225",
        priceCurrency: "USD",
        billingDuration: "P1Y",
        description:
          "Everything in Pro, billed annually. Save 25% ($75/year). 45x cheaper than human mock interviews for the same skill building.",
      },
    ],
    featureList: [
      // Core differentiators
      "Voice-enabled mock interviews - practice speaking your solution out loud like real interviews",
      "AI interviewer available 24/7 - no scheduling needed unlike Interviewing.io or Pramp",
      "Real-time feedback on communication, problem-solving, and code quality",
      "Spaced repetition system for long-term retention",
      // Comparison points
      "45x cheaper than human mock interviews ($25/month vs $1,125 for 5 sessions)",
      "29% cheaper than LeetCode Premium with interview simulation included",
      "Consistent quality unlike peer-to-peer platforms where quality varies",
      // Technical features
      "15+ DSA patterns covered with mastery tracking",
      "Company-specific prep for Google, Meta, Amazon, Apple, Netflix, Stripe, and 35+ companies",
      "System design interviews and real-world coding scenarios",
      "Performance analytics across 40+ metrics",
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

// FAQ Schema - for pricing page FAQs
export function FAQPageJsonLd({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
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
 * Mount on: `/learn/python`, `/learn/sql`, `/learn/system-design`.
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
  const faqs = [
    {
      question: "What is CodeSparring and how is it different from LeetCode?",
      answer:
        "CodeSparring is an AI-powered mock interview platform that trains interview performance, not just problem-solving. While LeetCode provides coding problems to solve alone in silence, CodeSparring simulates real interview conditions where you speak your solution out loud and receive AI feedback on your communication, problem-solving approach, and code quality. LeetCode tests if you can solve problems; CodeSparring trains you to perform in actual interviews.",
    },
    {
      question: "Is CodeSparring better than LeetCode for interview preparation?",
      answer:
        "They serve different purposes. LeetCode is excellent for building algorithm and data structure fundamentals with its vast problem library. CodeSparring is better for practicing the actual interview experience - speaking through your thought process, handling follow-up questions, and getting feedback on how you communicate. Many users use both: LeetCode to learn patterns, CodeSparring to practice performing. CodeSparring is also 29% cheaper than LeetCode Premium ($25/month vs $35/month) and includes interview simulation.",
    },
    {
      question: "How much does CodeSparring cost compared to mock interview services?",
      answer:
        "CodeSparring Pro costs $25/month for 35 AI mock interview sessions a month. Human mock interview services like Interviewing.io charge $225 per session. Research shows 5 mock interviews doubles your pass rate, which would cost $1,125 with human interviewers. With CodeSparring, you get the same skill-building for $25/month - that's 45x less expensive.",
    },
    {
      question: "Can I practice coding interviews with voice on CodeSparring?",
      answer:
        "Yes, CodeSparring is voice-enabled. You can speak your solution out loud just like in a real interview, and the AI interviewer responds with follow-up questions and feedback. This is a key differentiator from platforms like LeetCode where you only type in silence. Real interviews test your ability to communicate your thinking, and CodeSparring trains that skill.",
    },
    {
      question: "What companies can I prepare for on CodeSparring?",
      answer:
        "CodeSparring offers company-specific preparation for 35+ tech companies including Google, Meta (Facebook), Amazon, Apple, Netflix, Microsoft, Stripe, Airbnb, Uber, and more. Each company track includes patterns and question styles commonly seen in their interviews.",
    },
    {
      question: "Does CodeSparring use spaced repetition?",
      answer:
        "Yes, CodeSparring uses a spaced repetition system to schedule your practice at scientifically optimal intervals for long-term retention. Research shows spaced repetition improves retention by 10-30% compared to cramming. This means you remember patterns when it matters - during your actual interview.",
    },
    {
      question: "Is there a free trial for CodeSparring?",
      answer:
        "Yes, CodeSparring offers a generous free tier with 20+ problems and unlimited practice. You can complete full mock interviews with AI feedback using a free account, no credit card required. This lets you experience the platform before upgrading to Pro.",
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
