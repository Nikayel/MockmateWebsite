import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"
import { ALL_COMPANIES, getCompanyById, CompanyId } from "@/lib/data/company-questions"
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"
import { CompanyPrepContent } from "@/components/interview-prep/CompanyPrepContent"

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

  const title = `${company.name} Interview Prep Guide 2025 | Patterns, Questions & Tips`
  const description = `Complete ${company.name} coding interview preparation guide. Learn the top ${company.topPatterns.length} DSA patterns, ${company.mustKnowQuestions.length}+ must-know questions, ${company.interviewProcess.totalRounds}-round interview process, and insider tips. Updated for 2025.`

  return {
    title,
    description,
    keywords: [
      `${company.name} interview prep`,
      `${company.name} coding interview`,
      `${company.name} technical interview`,
      `${company.name} DSA questions`,
      `${company.name} interview questions 2025`,
      `${company.name} interview process`,
      `${company.name} interview tips`,
      `how to prepare for ${company.name} interview`,
      `${company.name} leetcode questions`,
      `${company.name} interview difficulty`,
    ],
    openGraph: {
      title: `${company.name} Interview Prep | CodeSparring`,
      description: `Master your ${company.name} interview with our comprehensive guide. ${company.topPatterns.length} patterns, ${company.mustKnowQuestions.length}+ must-know questions.`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${company.name} Interview Prep Guide`,
      description: `Everything you need to ace your ${company.name} coding interview.`,
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

  // Find related companies in same tier
  const relatedCompanies = ALL_COMPANIES.filter((c) => c.id !== company.id).slice(0, 3)

  return (
    <main className="bg-background min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Interview Prep", url: "/interview-prep" },
          { name: company.name, url: `/interview-prep/${company.id}` },
        ]}
      />

      {/* Company-specific JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${company.name} Interview Preparation`,
            description: `Comprehensive coding interview preparation for ${company.name}. Covers ${company.topPatterns.length} DSA patterns and ${company.mustKnowQuestions.length}+ must-know questions.`,
            provider: {
              "@type": "Organization",
              name: "CodeSparring",
              url: "https://codesparring.dev",
            },
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: "online",
              courseWorkload: `P${Math.ceil(company.mustKnowQuestions.length / 2)}D`,
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
            <nav className="mb-4 text-sm text-zinc-500">
              <Link href="/interview-prep" className="hover:text-white">
                ← All companies
              </Link>
            </nav>

            <h1 className="font-heading text-3xl font-semibold text-white md:text-4xl mb-2">
              {company.name}
            </h1>

            {/* Key info inline */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-6">
              <span>{company.interviewProcess.totalRounds} rounds</span>
              <span>·</span>
              <span>{company.interviewProcess.timeline}</span>
              <span>·</span>
              <span>{company.topPatterns.length} patterns</span>
              <span>·</span>
              <span className={company.difficultyDistribution.hard >= 30 ? "text-rose-400" : "text-amber-400"}>
                {company.difficultyDistribution.hard}% hard
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/roadmap/preview?company=${company.id}`}>
                <Button className="bg-white text-black hover:bg-zinc-200">
                  Create study plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href={company.careers_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  Careers page
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid - Client component with gating */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <CompanyPrepContent company={company} />
        </div>
      </section>

      {/* Related Companies - Simple */}
      <section className="border-t border-zinc-800 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-sm text-zinc-500 mb-4">Other companies</h2>
            <div className="flex flex-wrap gap-2">
              {relatedCompanies.map((related) => (
                <Link key={related.id} href={`/interview-prep/${related.id}`}>
                  <span className="inline-block rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-white hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
                    {related.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
