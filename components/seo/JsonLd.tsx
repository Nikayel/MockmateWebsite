// JSON-LD Structured Data Components for SEO Rich Snippets

// Use consistent URL - codesparring.dev is the canonical domain
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codesparring.dev"

// WebSite Schema - enables sitelinks search box in Google SERPs
// This is a powerful SEO feature that shows a search box directly in search results
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CodeSparring",
    alternateName: ["Code Sparring", "CodeSparring.dev"],
    url: SITE_URL,
    description: "AI-powered coding interview practice platform",
    // potentialAction enables the sitelinks search box
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "CodeSparring",
      url: SITE_URL,
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
    url: SITE_URL,
    // Use PNG for better Google search result display (dynamically generated at /api/logo.png)
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/api/logo.png`,
      width: 512,
      height: 512,
    },
    description: "AI-powered coding interview practice platform with voice-enabled mock interviews and spaced repetition learning.",
    foundingDate: "2025",
    founder: {
      "@type": "Person",
      name: "Nikayel Ali Jamal",
      // alternateName helps Google understand name variations people might search
      alternateName: ["Nikayel Jamal", "Nikayel Ali", "Nikayeel Jamal"],
      jobTitle: "Founder & CEO",
      description: "Computer Science student at Sacramento State building AI-powered interview prep tools",
      url: "https://linkedin.com/in/nikayel-ali",
      sameAs: [
        "https://linkedin.com/in/nikayel-ali",
        "https://github.com/nikayel",
        "https://twitter.com/codesparring",
      ],
    },
    sameAs: [
      "https://twitter.com/codesparring",
      "https://linkedin.com/company/codesparring",
    ],
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
export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CodeSparring",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: "AI mock interview platform for coding interviews. Practice DSA problems with voice-enabled AI feedback and spaced repetition learning.",
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        price: "0",
        priceCurrency: "USD",
        description: "2 interview scenarios per month with full AI feedback",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Monthly",
        price: "25",
        priceCurrency: "USD",
        billingDuration: "P1M",
        description: "350+ problems/month with unlimited practice",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Yearly",
        price: "225",
        priceCurrency: "USD",
        billingDuration: "P1Y",
        description: "350+ problems/month, save 25% with annual billing",
      },
    ],
    // NOTE: aggregateRating removed - only add back when you have real user reviews
    // Google may penalize fake/manufactured ratings. Once you have real reviews,
    // uncomment and connect to your actual review data:
    // aggregateRating: {
    //   "@type": "AggregateRating",
    //   ratingValue: "4.8",
    //   ratingCount: "127",
    //   bestRating: "5",
    //   worstRating: "1",
    // },
    featureList: [
      "AI-powered mock interviews",
      "Voice-enabled practice",
      "Spaced repetition scheduling",
      "Real-time code feedback",
      "DSA pattern mastery",
      "Company-specific preparation",
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
    url: `${SITE_URL}${url}`,
    isPartOf: {
      "@type": "WebSite",
      name: "CodeSparring",
      url: SITE_URL,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// How-To Schema - for the why-skillon page explaining the process
export function HowToJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Prepare for Coding Interviews with CodeSparring",
    description: "A science-backed approach to acing coding interviews using spaced repetition and AI-powered practice.",
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
    url: `${SITE_URL}${url}`,
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
        url: `${SITE_URL}/api/logo.png`,
        width: 512,
        height: 512,
      },
    },
    // Use dynamically generated OG image (Next.js serves opengraph-image.tsx at /opengraph-image)
    image: image ? `${SITE_URL}${image}` : `${SITE_URL}/opengraph-image`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${url}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// BreadcrumbList Schema - for navigation trail in SERP
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
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
    alternateName: [
      "Nikayel Jamal",
      "Nikayel Ali",
      "Nikayeel Jamal",
      "Nikayeel Ali",
      "Nikayel",
    ],
    givenName: "Nikayel",
    familyName: "Jamal",
    additionalName: "Ali",
    jobTitle: "Founder & Software Engineer",
    description: "Computer Science student at Sacramento State University. Founder of CodeSparring, an AI-powered coding interview preparation platform. Passionate about helping developers ace technical interviews through spaced repetition and AI mock interviews.",
    url: "https://linkedin.com/in/nikayel-ali",
    image: `${SITE_URL}/api/logo.png`,
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
      url: SITE_URL,
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
      SITE_URL,
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// Course Schema - for educational content (DSA patterns, interview prep)
export function CourseJsonLd({
  name,
  description,
  provider,
}: {
  name: string
  description: string
  provider?: string
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: name,
    description: description,
    provider: {
      "@type": "Organization",
      name: provider || "CodeSparring",
      url: SITE_URL,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT30M", // 30 minutes average per session
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
