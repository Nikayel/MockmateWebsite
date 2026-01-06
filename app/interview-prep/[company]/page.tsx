import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"
import { ALL_COMPANIES, getCompanyById, CompanyId } from "@/lib/data/company-questions"
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"

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

      {/* Main Content Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Top Patterns - Simplified */}
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Key patterns</h2>
                <div className="space-y-2">
                  {company.topPatterns.map((pattern, idx) => (
                    <div
                      key={pattern.pattern}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600 w-5">{idx + 1}</span>
                        <span className="text-white capitalize">
                          {pattern.pattern.replace(/-/g, " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={
                          pattern.typicalDifficulty === "easy" ? "text-emerald-400" :
                          pattern.typicalDifficulty === "medium" ? "text-amber-400" : "text-rose-400"
                        }>
                          {pattern.typicalDifficulty}
                        </span>
                        <span className="text-zinc-500">{pattern.frequency}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Must-Know Questions - Simplified */}
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Common questions</h2>
                <div className="space-y-2">
                  {company.mustKnowQuestions.map((question) => (
                    <div
                      key={question.scenarioId}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                    >
                      <span className="text-white">{question.title}</span>
                      <span className={`text-xs ${
                        question.frequency === "very_common" ? "text-rose-400" :
                        question.frequency === "common" ? "text-amber-400" : "text-zinc-500"
                      }`}>
                        {question.frequency.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/interview" className="block mt-4">
                  <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    Practice these
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Interview Process - No emojis */}
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Interview process</h2>
                <div className="space-y-3">
                  {company.interviewProcess.rounds.map((round, idx) => (
                    <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">
                          {idx + 1}. {round.description}
                        </span>
                        <span className="text-xs text-zinc-500">{round.duration} min</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {round.focusAreas.map((area) => (
                          <span key={area} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar (consolidated) */}
            <div className="space-y-6">
              {/* Quick facts */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-medium text-white mb-3">Quick facts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Pace</span>
                    <span className={
                      company.interviewStyle.pace === "fast" ? "text-rose-400" :
                      company.interviewStyle.pace === "moderate" ? "text-amber-400" : "text-emerald-400"
                    }>{company.interviewStyle.pace}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Optimal required</span>
                    <span className={company.interviewStyle.optimalSolutionRequired ? "text-rose-400" : "text-emerald-400"}>
                      {company.interviewStyle.optimalSolutionRequired ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Hints given</span>
                    <span className={company.interviewStyle.providesHints ? "text-emerald-400" : "text-amber-400"}>
                      {company.interviewStyle.providesHints ? "yes" : "rarely"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips - Combined */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="text-sm font-medium text-white mb-3">Tips</h3>
                <ul className="space-y-2">
                  {company.interviewProcess.tips.slice(0, 4).map((tip, idx) => (
                    <li key={idx} className="text-sm text-zinc-400 flex gap-2">
                      <span className="text-zinc-600">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Compensation - if available */}
              {company.compensation && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                  <h3 className="text-sm font-medium text-white mb-3">Compensation (TC)</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Entry</span>
                      <span className="text-emerald-400">{company.compensation.entryLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Mid</span>
                      <span className="text-emerald-400">{company.compensation.midLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Senior</span>
                      <span className="text-emerald-400">{company.compensation.seniorLevel}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
