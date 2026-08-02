import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { ALL_COMPANIES, COMPANY_TIERS } from "@/lib/data/company-questions"
import type { CompanyQuestionData } from "@/lib/data/company-questions/types"
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { PlatformSummary } from "@/components/interview-prep/PlatformSummary"
import { summarizeLearnCorpus } from "@/lib/interview-prep/company-learn-routes"

/**
 * The company interview-prep hub.
 *
 * Two things were structurally wrong here and both are fixed below.
 *
 *  1. It rendered 3 of the 7 `COMPANY_TIERS` keys, so 18 of the 38 company pages had zero inbound
 *     internal links. They were statically generated and sitemapped and then orphaned, which is the
 *     one thing that reliably keeps a page out of an index. Every tier is now rendered, derived from
 *     `COMPANY_TIERS` itself so adding a tier cannot silently orphan another cohort.
 *  2. The counts in the copy were typed by hand ("and 32 more companies", "38 top tech companies").
 *     They were correct on the day they were written and are a standing liability afterwards, so
 *     every number on this page is now counted from `ALL_COMPANIES` or from the live Learn catalog.
 *
 * Server Component. No auth awareness anywhere on this route: everything it renders is public.
 */

/** Counted once and reused by the copy, the metadata, and the tier sections. */
const COMPANY_COUNT = ALL_COMPANIES.length

/**
 * Companies named explicitly in search-facing copy. These are the highest-volume queries, not a
 * ranking, and the "and N more" figure beside them is derived rather than typed.
 */
const HEADLINE_COMPANY_NAMES = ["Google", "Meta", "Amazon", "Apple", "Netflix", "Microsoft"]

export const metadata: Metadata = {
  title: "Interview Prep Guides by Company | Google, Meta, Amazon & More",
  description: `Free interview preparation guides for ${COMPANY_COUNT} tech companies. Company-specific patterns, difficulty distributions, must-know questions, round structure, and interview tips for ${HEADLINE_COMPANY_NAMES.join(", ")}, and ${COMPANY_COUNT - HEADLINE_COMPANY_NAMES.length} more.`,
  keywords: [
    "Google interview prep",
    "Meta interview preparation",
    "Amazon coding interview",
    "Apple technical interview",
    "Netflix interview questions",
    "Microsoft interview guide",
    "FAANG interview prep",
    "tech company interview",
    "coding interview by company",
    "company-specific interview prep",
    "Stripe interview",
    "Uber interview prep",
    "Airbnb coding interview",
  ],
  alternates: {
    canonical: "/interview-prep",
  },
  openGraph: {
    // No `images` key on purpose: `app/opengraph-image.tsx` is a route-segment metadata file and is
    // inherited by every route that does not declare its own, so hardcoding one here would only
    // duplicate it and create a second thing to keep in sync.
    title: "Company Interview Prep Guides | CodeSparring",
    description: `Free interview guides for ${COMPANY_COUNT} tech companies. Company-specific patterns, questions, round structure, and tips.`,
    url: "/interview-prep",
    type: "website",
  },
}

/**
 * Every tier, in declaration order, resolved to real company records.
 *
 * Derived from `COMPANY_TIERS` rather than a hand-written list: that is the fix for the orphaning
 * bug, and `app/interview-prep/__tests__/company-links.test.tsx` holds it in place by asserting the
 * rendered HTML links every id in `ALL_COMPANIES`.
 */
function listTierSections(): {
  key: string
  name: string
  description: string
  companies: CompanyQuestionData[]
}[] {
  return Object.entries(COMPANY_TIERS).map(([key, tier]) => ({
    key,
    name: tier.name,
    description: tier.description,
    companies: tier.companies
      .map((companyId) => ALL_COMPANIES.find((company) => company.id === companyId))
      .filter((company): company is CompanyQuestionData => company !== undefined),
  }))
}

function getDifficultyColor(distribution: { easy: number; medium: number; hard: number }) {
  if (distribution.hard >= 35) return difficultyColorClass("hard", "text")
  if (distribution.hard >= 25) return difficultyColorClass("medium", "text")
  return difficultyColorClass("easy", "text")
}

export default function InterviewPrepPage() {
  const tiers = listTierSections()
  const corpus = summarizeLearnCorpus()

  return (
    <main className="bg-background min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Interview Prep", url: "/interview-prep" },
        ]}
      />
      <WebPageJsonLd
        title="Company Interview Prep Guides"
        description={`Free interview preparation guides for ${COMPANY_COUNT} tech companies, covering the patterns they ask, how their loop is structured, and how they judge candidates.`}
        url="/interview-prep"
      />

      <Header />

      {/* Hero. Every figure derived, nothing typed. */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-heading text-foreground mb-4 text-3xl font-semibold md:text-4xl">
              Interview prep by company
            </h1>
            <p className="text-muted-foreground text-lg">
              Different companies ask different things. {COMPANY_COUNT} guides covering the patterns
              each one leans on, how their loop is structured, and what they say they are judging.
              Free, and no account needed to read any of them.
            </p>
          </div>
        </div>
      </section>

      {/* Every tier. Rendering fewer than all of them orphans the missing cohort. */}
      {tiers.map((tier) => (
        <section key={tier.key} aria-labelledby={`tier-${tier.key}`} className="py-10">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6">
                <h2 id={`tier-${tier.key}`} className="text-foreground text-xl font-medium">
                  {tier.name}
                </h2>
                <p className="text-muted-foreground text-sm">{tier.description}</p>
              </div>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tier.companies.map((company) => (
                  <li key={company.id}>
                    <Link
                      href={`/interview-prep/${company.id}`}
                      className="group border-border bg-card hover:border-border hover:bg-muted focus-visible:ring-ring flex items-center justify-between rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="block">
                        <span className="text-foreground block font-medium transition-colors group-hover:text-emerald-400">
                          {company.name}
                        </span>
                        <span className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                          <span>{company.topPatterns.length} patterns</span>
                          <span aria-hidden="true">·</span>
                          <span>{company.interviewProcess.totalRounds} rounds</span>
                          <span aria-hidden="true">·</span>
                          <span>{company.interviewProcess.timeline}</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`text-xs ${getDifficultyColor(company.difficultyDistribution)}`}
                        >
                          {company.difficultyDistribution.hard}% hard
                        </span>
                        <ArrowRight
                          className="text-muted-foreground/70 group-hover:text-foreground h-4 w-4 transition-colors"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* What the product actually is, plus the free curriculum totals, both from real modules. */}
      <PlatformSummary corpus={corpus} />

      {/* Personalized roadmap. Describes a shipped feature; the CTA is the real entry point. */}
      <section className="border-border border-t py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-foreground mb-2 text-2xl font-semibold">
              Your interview. Your timeline. Your plan.
            </h2>
            <p className="text-muted-foreground mb-8">
              Tell us when your interview is and we will build a day-by-day study schedule that
              prioritizes what matters most for your target company.
            </p>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="text-sm">
                <div className="text-foreground mb-1 font-medium">Interview date</div>
                <div className="text-muted-foreground">We work backwards from your deadline</div>
              </div>
              <div className="text-sm">
                <div className="text-foreground mb-1 font-medium">Your skill level</div>
                <div className="text-muted-foreground">Skip what you know, focus on gaps</div>
              </div>
              <div className="text-sm">
                <div className="text-foreground mb-1 font-medium">Company patterns</div>
                <div className="text-muted-foreground">Prioritized by what they actually ask</div>
              </div>
            </div>

            <Button asChild className="bg-white text-black hover:bg-zinc-200">
              <Link href="/roadmap/preview">
                Create your roadmap
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
