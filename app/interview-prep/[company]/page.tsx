import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  ALL_COMPANIES,
  COMPANY_TIERS,
  getCompanyById,
  CompanyId,
} from "@/lib/data/company-questions"
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"
import { CompanyPrepContent } from "@/components/interview-prep/CompanyPrepContent"
import { CompanyHeroCTA } from "@/components/interview-prep/CompanyHeroCTA"
import { CompanyLearnPaths } from "@/components/interview-prep/CompanyLearnPaths"
import { CompanyCulture } from "@/components/interview-prep/CompanyCulture"
import { PlatformSummary } from "@/components/interview-prep/PlatformSummary"
import {
  listCompanyLearnPaths,
  summarizeLearnCorpus,
} from "@/lib/interview-prep/company-learn-routes"
import { absoluteUrl } from "@/lib/seo/site"

/**
 * One company's interview guide. Statically generated for every company in `ALL_COMPANIES`.
 *
 * This is the most-crawled template on the site, and it used to be the least representative of the
 * product: pattern tables, lock icons, and an invented social-proof counter. It now ends with three
 * ungated, server-rendered sections that are all driven by data already in the repo:
 * `CompanyLearnPaths` (real public lesson URLs resolved from the live curriculum catalog),
 * `CompanyCulture` (the `coreValues` / `engineeringCulture` records that had zero render sites), and
 * `PlatformSummary` (what CodeSparring is, with live curriculum totals).
 *
 * Keeping those three as Server Components matters: they land in the static HTML, so a signed-out
 * visitor and a crawler see the same thing, and the company pages stop being crawl dead ends.
 */

// Generate static paths for all companies
export async function generateStaticParams() {
  return ALL_COMPANIES.map((company) => ({
    company: company.id,
  }))
}

// Dynamic metadata for each company
export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string }>
}): Promise<Metadata> {
  const { company: companyId } = await params
  const company = getCompanyById(companyId as CompanyId)

  if (!company) {
    return {
      title: "Company Not Found",
    }
  }

  const currentYear = new Date().getFullYear()
  const title = `${company.name} Interview Prep Guide ${currentYear} | Patterns, Questions & Tips`
  const description = `Complete ${company.name} coding interview preparation guide. The top ${company.topPatterns.length} DSA patterns, ${company.mustKnowQuestions.length} commonly reported questions, the ${company.interviewProcess.totalRounds}-round loop, and free lessons you can start reading without an account.`

  return {
    title,
    description,
    keywords: [
      `${company.name} interview prep`,
      `${company.name} coding interview`,
      `${company.name} technical interview`,
      `${company.name} DSA questions`,
      `${company.name} interview questions ${currentYear}`,
      `${company.name} interview process`,
      `${company.name} interview tips`,
      `how to prepare for ${company.name} interview`,
      `${company.name} leetcode questions`,
      `${company.name} interview difficulty`,
    ],
    alternates: {
      canonical: `/interview-prep/${company.id}`,
    },
    openGraph: {
      // `images` is intentionally omitted: `app/opengraph-image.tsx` is inherited by this segment.
      title: `${company.name} Interview Prep | CodeSparring`,
      description: `${company.name} interview guide: ${company.topPatterns.length} patterns, ${company.mustKnowQuestions.length} commonly reported questions, and the ${company.interviewProcess.totalRounds}-round loop.`,
      url: `/interview-prep/${company.id}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${company.name} Interview Prep Guide`,
      description: `Everything you need to prepare for your ${company.name} coding interview.`,
    },
  }
}

export default async function CompanyPrepPage({
  params,
}: {
  params: Promise<{ company: string }>
}) {
  const { company: companyId } = await params
  const company = getCompanyById(companyId as CompanyId)

  if (!company) {
    notFound()
  }

  // Resolved at build time against the live curriculum. Both lists can be empty, and the components
  // render nothing in that case rather than an empty container.
  const { patternLinks, systemDesignLinks } = listCompanyLearnPaths(company)
  const corpus = summarizeLearnCorpus()

  // Find related companies, preferring the same tier first, then filling from the
  // rest of the roster. Still capped at slice(0, 3) so the rendered shape is unchanged.
  const sameTierIds: readonly string[] =
    Object.values(COMPANY_TIERS).find((tier) => tier.companies.includes(company.id))?.companies ??
    []
  const relatedCompanies = [
    ...ALL_COMPANIES.filter((c) => c.id !== company.id && sameTierIds.includes(c.id)),
    ...ALL_COMPANIES.filter((c) => c.id !== company.id && !sameTierIds.includes(c.id)),
  ].slice(0, 3)

  return (
    <main className="bg-background min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Interview Prep", url: "/interview-prep" },
          { name: company.name, url: `/interview-prep/${company.id}` },
        ]}
      />

      {/*
        Company-specific JSON-LD. `courseWorkload` used to be emitted here as
        `P{ceil(mustKnowQuestions.length / 2)}D`, which published an invented study duration as a
        machine-readable fact; it is gone rather than re-derived, because no field in the data
        measures how long preparation takes.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${company.name} Interview Preparation`,
            description: `Coding interview preparation guide for ${company.name}. Covers ${company.topPatterns.length} DSA patterns, ${company.mustKnowQuestions.length} commonly reported questions, and the ${company.interviewProcess.totalRounds}-round interview loop.`,
            url: absoluteUrl(`/interview-prep/${company.id}`),
            provider: {
              "@type": "Organization",
              name: "CodeSparring",
              url: absoluteUrl("/"),
            },
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: "online",
            },
            about: {
              "@type": "Organization",
              name: company.name,
              url: company.careers_url,
            },
          }),
        }}
      />

      <Header />

      {/* Hero Section - Clean */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="text-muted-foreground mb-4 text-sm">
              <Link href="/interview-prep" className="hover:text-foreground">
                &larr; All companies
              </Link>
            </nav>

            <h1 className="font-heading text-foreground mb-2 text-3xl font-semibold md:text-4xl">
              {company.name}
            </h1>

            {/* Key info inline */}
            <div className="text-muted-foreground mb-6 flex flex-wrap items-center gap-4 text-sm">
              <span>{company.interviewProcess.totalRounds} rounds</span>
              <span aria-hidden="true">·</span>
              <span>{company.interviewProcess.timeline}</span>
              <span aria-hidden="true">·</span>
              <span>{company.topPatterns.length} patterns</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  company.difficultyDistribution.hard >= 30 ? "text-red-400" : "text-amber-400"
                }
              >
                {company.difficultyDistribution.hard}% hard
              </span>
            </div>

            <CompanyHeroCTA companyId={company.id} careersUrl={company.careers_url} />
          </div>
        </div>
      </section>

      {/* Main Content Grid - Client component with gating */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <CompanyPrepContent company={company} />
        </div>
      </section>

      {/* The secondary path: free public lessons, ungated, in the static HTML. */}
      <CompanyLearnPaths
        companyName={company.name}
        patternLinks={patternLinks}
        systemDesignLinks={systemDesignLinks}
      />

      {/* Authored company culture data that previously had no render site anywhere. */}
      <CompanyCulture company={company} />

      {/* The primary path: what practicing here actually looks like. */}
      <PlatformSummary corpus={corpus} companyName={company.name} />

      {/* Related Companies - Simple */}
      <section className="border-border border-t py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-muted-foreground mb-4 text-sm">Other companies</h2>
            <ul className="flex flex-wrap gap-2">
              {relatedCompanies.map((related) => (
                <li key={related.id}>
                  <Link
                    href={`/interview-prep/${related.id}`}
                    className="border-border bg-card text-foreground hover:border-border hover:bg-muted focus-visible:ring-ring inline-block rounded-lg border px-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {related.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
