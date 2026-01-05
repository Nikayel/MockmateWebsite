import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Building2, Clock, Target } from "lucide-react"
import { ALL_COMPANIES, COMPANY_TIERS } from "@/lib/data/company-questions"
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"

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
  if (distribution.hard >= 35) return "text-red-400"
  if (distribution.hard >= 25) return "text-yellow-400"
  return "text-green-400"
}

function getDifficultyLabel(distribution: { easy: number; medium: number; hard: number }) {
  if (distribution.hard >= 35) return "Challenging"
  if (distribution.hard >= 25) return "Moderate"
  return "Accessible"
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

      {/* Hero Section */}
      <section className="from-background via-secondary to-background bg-gradient-to-br pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 border-[#00d9ff]/30 bg-[#00d9ff]/20 text-[#00d9ff]">
              19 Companies Covered
            </Badge>
            <h1 className="font-heading mb-6 text-4xl font-bold text-white md:text-6xl">
              Company-Specific
              <span className="text-gradient"> Interview Prep</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-300">
              Each company has its own interview style, favorite patterns, and must-know questions.
              Our guides give you the insider knowledge to prepare strategically.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/roadmap/preview">
                <Button size="lg" className="bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80">
                  Create Your Personalized Roadmap
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-900/50 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
            <div>
              <div className="mb-2 text-4xl font-bold text-[#00d9ff]">19</div>
              <div className="text-gray-400">Companies</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-[#00d9ff]">150+</div>
              <div className="text-gray-400">Must-Know Questions</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-[#00d9ff]">15</div>
              <div className="text-gray-400">DSA Patterns</div>
            </div>
            <div>
              <div className="mb-2 text-4xl font-bold text-[#00d9ff]">100%</div>
              <div className="text-gray-400">Free Guides</div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Tiers */}
      {tiers.map((tier) => (
        <section key={tier.key} className="bg-gradient-to-b from-gray-900 to-black py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-10">
                <h2 className="font-heading mb-3 text-3xl font-bold text-white">{tier.name}</h2>
                <p className="text-gray-400">{tier.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tier.companies.map((companyId) => {
                  const company = ALL_COMPANIES.find((c) => c.id === companyId)
                  if (!company) return null

                  return (
                    <Link key={company.id} href={`/interview-prep/${company.id}`}>
                      <Card className="glass-effect h-full cursor-pointer border-gray-700 bg-gray-900/50 transition-all duration-300 hover:border-[#00d9ff]/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-xl text-white">
                              <Building2 className="h-6 w-6 text-[#00d9ff]" />
                              {company.name}
                            </CardTitle>
                            <Badge
                              className={`${getDifficultyColor(company.difficultyDistribution)} border-gray-600 bg-gray-800`}
                            >
                              {getDifficultyLabel(company.difficultyDistribution)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Difficulty Distribution */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Difficulty Mix</span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-gray-800">
                              <div
                                className="bg-green-500"
                                style={{ width: `${company.difficultyDistribution.easy}%` }}
                              />
                              <div
                                className="bg-yellow-500"
                                style={{ width: `${company.difficultyDistribution.medium}%` }}
                              />
                              <div
                                className="bg-red-500"
                                style={{ width: `${company.difficultyDistribution.hard}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Easy {company.difficultyDistribution.easy}%</span>
                              <span>Medium {company.difficultyDistribution.medium}%</span>
                              <span>Hard {company.difficultyDistribution.hard}%</span>
                            </div>
                          </div>

                          {/* Key Stats */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Target className="h-4 w-4 text-[#00d9ff]" />
                              <span>{company.topPatterns.length} patterns</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Clock className="h-4 w-4 text-[#00d9ff]" />
                              <span>{company.interviewProcess.timeline}</span>
                            </div>
                          </div>

                          {/* Top Patterns Preview */}
                          <div className="flex flex-wrap gap-1">
                            {company.topPatterns.slice(0, 3).map((p) => (
                              <Badge
                                key={p.pattern}
                                variant="outline"
                                className="border-gray-600 text-xs text-gray-400"
                              >
                                {p.pattern.replace(/-/g, " ")}
                              </Badge>
                            ))}
                            {company.topPatterns.length > 3 && (
                              <Badge
                                variant="outline"
                                className="border-gray-600 text-xs text-gray-500"
                              >
                                +{company.topPatterns.length - 3} more
                              </Badge>
                            )}
                          </div>

                          {/* CTA */}
                          <div className="pt-2">
                            <Button
                              variant="ghost"
                              className="w-full text-[#00d9ff] hover:bg-[#00d9ff]/10"
                            >
                              View Full Guide
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#00d9ff]/10 to-purple-500/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
            Ready for a Personalized Study Plan?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Our AI creates a day-by-day roadmap based on your interview date, target company, and
            current skill level.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/roadmap/preview">
              <Button
                size="lg"
                className="bg-[#00d9ff] px-8 py-4 text-lg text-white hover:bg-[#00d9ff]/80"
              >
                Create Your Roadmap
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white bg-transparent px-8 py-4 text-lg text-white hover:bg-white hover:text-black"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
