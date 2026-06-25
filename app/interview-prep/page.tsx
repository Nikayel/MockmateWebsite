import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { ALL_COMPANIES, COMPANY_TIERS } from "@/lib/data/company-questions"
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"

export const metadata: Metadata = {
  title: "Interview Prep Guides by Company | Google, Meta, Amazon & More",
  description:
    "Free interview preparation guides for top tech companies. Learn company-specific patterns, difficulty distributions, must-know questions, and interview tips for Google, Meta, Amazon, Apple, Netflix, Microsoft, and 13 more companies.",
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
  openGraph: {
    title: "Company Interview Prep Guides | CodeSparring",
    description:
      "Free interview guides for 19 top tech companies. Company-specific patterns, questions, and tips.",
    type: "website",
  },
}

function getDifficultyColor(distribution: { easy: number; medium: number; hard: number }) {
  if (distribution.hard >= 35) return difficultyColorClass("hard", "text")
  if (distribution.hard >= 25) return difficultyColorClass("medium", "text")
  return difficultyColorClass("easy", "text")
}

export default function InterviewPrepPage() {
  const tiers = [
    { key: "faang", ...COMPANY_TIERS.faang },
    { key: "topTech", ...COMPANY_TIERS.topTech },
    { key: "growthFinance", ...COMPANY_TIERS.growthFinance },
  ]

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
        description="Free interview preparation guides for top tech companies including Google, Meta, Amazon, and more."
        url="/interview-prep"
      />

      <Header />

      {/* Hero Section - Clean, no filler */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-heading mb-4 text-3xl font-semibold text-white md:text-4xl">
              Interview prep by company
            </h1>
            <p className="text-lg text-zinc-400">
              Different companies, different patterns. Pick yours.
            </p>
          </div>
        </div>
      </section>

      {/* Company Tiers - Simplified cards */}
      {tiers.map((tier) => (
        <section key={tier.key} className="py-10">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white">{tier.name}</h2>
                <p className="text-sm text-zinc-500">{tier.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tier.companies.map((companyId) => {
                  const company = ALL_COMPANIES.find((c) => c.id === companyId)
                  if (!company) return null

                  return (
                    <Link key={company.id} href={`/interview-prep/${company.id}`}>
                      <div className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
                        <div>
                          <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                            {company.name}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                            <span>{company.topPatterns.length} patterns</span>
                            <span>·</span>
                            <span>{company.interviewProcess.timeline}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Simple difficulty indicator */}
                          <span className={`text-xs ${getDifficultyColor(company.difficultyDistribution)}`}>
                            {company.difficultyDistribution.hard}% hard
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Personalized Roadmap Value Prop */}
      <section className="border-t border-zinc-800 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Your interview. Your timeline. Your plan.
            </h2>
            <p className="text-zinc-400 mb-8">
              Tell us when your interview is and we'll build a day-by-day study schedule
              that prioritizes what matters most for your target company.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="text-sm">
                <div className="text-white font-medium mb-1">Interview date</div>
                <div className="text-zinc-500">We work backwards from your deadline</div>
              </div>
              <div className="text-sm">
                <div className="text-white font-medium mb-1">Your skill level</div>
                <div className="text-zinc-500">Skip what you know, focus on gaps</div>
              </div>
              <div className="text-sm">
                <div className="text-white font-medium mb-1">Company patterns</div>
                <div className="text-zinc-500">Prioritized by what they actually ask</div>
              </div>
            </div>

            <Link href="/roadmap/preview">
              <Button className="bg-white text-black hover:bg-zinc-200">
                Create your roadmap
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
