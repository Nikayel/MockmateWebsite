// JSON-LD Structured Data Components for SEO Rich Snippets

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codesparring.com"

// Organization Schema - for brand recognition in search
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CodeSparring",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-codesparring.svg`,
    description: "AI-powered coding interview practice platform with voice-enabled mock interviews and spaced repetition learning.",
    foundingDate: "2024",
    sameAs: [
      "https://twitter.com/codesparring",
      "https://linkedin.com/company/codesparring",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "hello@codesparring.com",
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
        description: "35 scenarios/month with unlimited practice",
      },
      {
        "@type": "Offer",
        name: "Pro Plan Yearly",
        price: "225",
        priceCurrency: "USD",
        billingDuration: "P1Y",
        description: "35 scenarios/month, save 25% with annual billing",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
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
