import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Building2,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Calendar,
  Lightbulb,
  BookOpen,
} from "lucide-react"
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

function getFrequencyBadge(frequency: string) {
  switch (frequency) {
    case "very_common":
      return <Badge className="border-red-500/30 bg-red-500/20 text-red-400">Very Common</Badge>
    case "common":
      return <Badge className="border-yellow-500/30 bg-yellow-500/20 text-yellow-400">Common</Badge>
    case "occasional":
      return <Badge className="border-blue-500/30 bg-blue-500/20 text-blue-400">Occasional</Badge>
    default:
      return <Badge className="border-gray-500/30 bg-gray-500/20 text-gray-400">Rare</Badge>
  }
}

function getRoundTypeIcon(type: string) {
  switch (type) {
    case "phone_screen":
      return "📞"
    case "coding":
      return "💻"
    case "system_design":
      return "🏗️"
    case "behavioral":
      return "🤝"
    case "team_match":
      return "👥"
    default:
      return "📋"
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

      {/* Hero Section */}
      <section className="from-background via-secondary to-background bg-gradient-to-br pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/interview-prep" className="hover:text-white">
                Interview Prep
              </Link>
              <span className="mx-2">/</span>
              <span className="text-[#00d9ff]">{company.name}</span>
            </nav>

            <div className="mb-6 flex items-center gap-4">
              <div className="rounded-xl bg-gray-800 p-4">
                <Building2 className="h-12 w-12 text-[#00d9ff]" />
              </div>
              <div>
                <h1 className="font-heading text-4xl font-bold text-white md:text-5xl">
                  {company.name} Interview Prep
                </h1>
                <p className="mt-2 text-gray-400">Updated for 2025</p>
              </div>
            </div>

            <p className="mb-8 text-xl text-gray-300">
              Everything you need to prepare for your {company.name} coding interview.
              {company.interviewProcess.totalRounds} rounds, {company.interviewProcess.timeline}{" "}
              timeline, and {company.topPatterns.length} key patterns to master.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href={`/roadmap/preview?company=${company.id}`}>
                <Button size="lg" className="bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80">
                  Create {company.name} Roadmap
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href={company.careers_url} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 bg-transparent text-white hover:bg-gray-800"
                >
                  {company.name} Careers
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="border-y border-gray-800 bg-gray-900/50 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-5">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#00d9ff]">
                {company.interviewProcess.totalRounds}
              </div>
              <div className="text-sm text-gray-400">Interview Rounds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#00d9ff]">
                {company.interviewProcess.timeline}
              </div>
              <div className="text-sm text-gray-400">Timeline</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#00d9ff]">{company.topPatterns.length}</div>
              <div className="text-sm text-gray-400">Key Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#00d9ff]">
                {company.mustKnowQuestions.length}+
              </div>
              <div className="text-sm text-gray-400">Must-Know Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {company.difficultyDistribution.hard}%
              </div>
              <div className="text-sm text-gray-400">Hard Problems</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="bg-gradient-to-b from-gray-900 to-black py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="space-y-8 lg:col-span-2">
              {/* Difficulty Distribution */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="h-5 w-5 text-[#00d9ff]" />
                    Difficulty Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex h-6 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="flex items-center justify-center bg-green-500 text-xs font-medium text-white"
                        style={{ width: `${company.difficultyDistribution.easy}%` }}
                      >
                        {company.difficultyDistribution.easy > 15 && "Easy"}
                      </div>
                      <div
                        className="flex items-center justify-center bg-yellow-500 text-xs font-medium text-black"
                        style={{ width: `${company.difficultyDistribution.medium}%` }}
                      >
                        Medium
                      </div>
                      <div
                        className="flex items-center justify-center bg-red-500 text-xs font-medium text-white"
                        style={{ width: `${company.difficultyDistribution.hard}%` }}
                      >
                        {company.difficultyDistribution.hard > 15 && "Hard"}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-lg bg-green-500/10 p-3">
                        <div className="text-2xl font-bold text-green-400">
                          {company.difficultyDistribution.easy}%
                        </div>
                        <div className="text-sm text-gray-400">Easy</div>
                      </div>
                      <div className="rounded-lg bg-yellow-500/10 p-3">
                        <div className="text-2xl font-bold text-yellow-400">
                          {company.difficultyDistribution.medium}%
                        </div>
                        <div className="text-sm text-gray-400">Medium</div>
                      </div>
                      <div className="rounded-lg bg-red-500/10 p-3">
                        <div className="text-2xl font-bold text-red-400">
                          {company.difficultyDistribution.hard}%
                        </div>
                        <div className="text-sm text-gray-400">Hard</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Patterns */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="h-5 w-5 text-[#00d9ff]" />
                    Top {company.topPatterns.length} DSA Patterns at {company.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {company.topPatterns.map((pattern, idx) => (
                      <div
                        key={pattern.pattern}
                        className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 font-mono text-sm text-gray-500">#{idx + 1}</span>
                          <div>
                            <div className="font-medium text-white capitalize">
                              {pattern.pattern.replace(/-/g, " ")}
                            </div>
                            <div className="text-xs text-gray-500">
                              Priority: {pattern.priority}/10
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`${
                              pattern.typicalDifficulty === "easy"
                                ? "bg-green-500/20 text-green-400"
                                : pattern.typicalDifficulty === "medium"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {pattern.typicalDifficulty}
                          </Badge>
                          <div className="w-24">
                            <div className="mb-1 flex justify-between text-xs text-gray-400">
                              <span>Frequency</span>
                              <span>{pattern.frequency}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                              <div
                                className="h-full bg-[#00d9ff]"
                                style={{ width: `${pattern.frequency}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link href="/blog/15-dsa-patterns">
                      <Button
                        variant="outline"
                        className="w-full border-gray-600 text-white hover:bg-gray-800"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Learn All 15 DSA Patterns
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Must-Know Questions */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle2 className="h-5 w-5 text-[#00d9ff]" />
                    Must-Know Questions for {company.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {company.mustKnowQuestions.map((question) => (
                      <div
                        key={question.scenarioId}
                        className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3"
                      >
                        <div>
                          <div className="font-medium text-white">{question.title}</div>
                          {question.lastReported && (
                            <div className="mt-1 text-xs text-gray-500">
                              Last reported: {question.lastReported}
                            </div>
                          )}
                        </div>
                        {getFrequencyBadge(question.frequency)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link href="/interview">
                      <Button className="w-full bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80">
                        Practice These Questions
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Process */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Calendar className="h-5 w-5 text-[#00d9ff]" />
                    {company.name} Interview Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {company.interviewProcess.rounds.map((round, idx) => (
                      <div key={idx} className="flex gap-4 rounded-lg bg-gray-800/50 p-4">
                        <div className="flex-shrink-0 text-2xl">{getRoundTypeIcon(round.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-white">
                              Round {idx + 1}: {round.description}
                            </div>
                            <Badge variant="outline" className="border-gray-600 text-gray-400">
                              {round.duration} min
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {round.focusAreas.map((area) => (
                              <Badge key={area} className="bg-gray-700 text-xs text-gray-300">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Interview Style */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Interview Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Pace</span>
                      <Badge
                        className={`${
                          company.interviewStyle.pace === "fast"
                            ? "bg-red-500/20 text-red-400"
                            : company.interviewStyle.pace === "moderate"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {company.interviewStyle.pace}
                      </Badge>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-400">Communication</span>
                        <span className="text-white">
                          {company.interviewStyle.communicationEmphasis}/10
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full bg-[#00d9ff]"
                          style={{
                            width: `${company.interviewStyle.communicationEmphasis * 10}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-gray-400">Code Quality</span>
                        <span className="text-white">
                          {company.interviewStyle.codeQualityEmphasis}/10
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${company.interviewStyle.codeQualityEmphasis * 10}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-700 pt-4">
                    <div className="flex items-center gap-2 text-sm">
                      {company.interviewStyle.optimalSolutionRequired ? (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                      <span className="text-gray-300">
                        Optimal solution{" "}
                        {company.interviewStyle.optimalSolutionRequired
                          ? "required"
                          : "not required"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {company.interviewStyle.allowsPseudocode ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-gray-300">
                        Pseudocode{" "}
                        {company.interviewStyle.allowsPseudocode ? "allowed" : "not allowed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {company.interviewStyle.providesHints ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                      )}
                      <span className="text-gray-300">
                        Interviewers{" "}
                        {company.interviewStyle.providesHints ? "give hints" : "rarely hint"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compensation */}
              {company.compensation && (
                <Card className="border-gray-700 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Compensation (TC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded bg-gray-800/50 p-2">
                      <span className="text-gray-400">Entry Level</span>
                      <span className="font-medium text-green-400">
                        {company.compensation.entryLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-gray-800/50 p-2">
                      <span className="text-gray-400">Mid Level</span>
                      <span className="font-medium text-green-400">
                        {company.compensation.midLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded bg-gray-800/50 p-2">
                      <span className="text-gray-400">Senior Level</span>
                      <span className="font-medium text-green-400">
                        {company.compensation.seniorLevel}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Insider Tips */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    Insider Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {company.interviewProcess.tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-gray-300">
                        <span className="flex-shrink-0 text-[#00d9ff]">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Unique Traits */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">
                    What Makes {company.name} Unique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {company.interviewStyle.uniqueTraits.map((trait, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-gray-300">
                        <span className="flex-shrink-0 text-purple-400">→</span>
                        {trait}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* CTA Card */}
              <Card className="border-[#00d9ff]/30 bg-gradient-to-br from-[#00d9ff]/20 to-purple-500/20">
                <CardContent className="p-6 text-center">
                  <h3 className="mb-3 text-xl font-bold text-white">
                    Ready to Prep for {company.name}?
                  </h3>
                  <p className="mb-4 text-sm text-gray-300">
                    Get a personalized day-by-day study plan based on your interview date.
                  </p>
                  <Link href={`/roadmap/preview?company=${company.id}`}>
                    <Button className="w-full bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80">
                      Create Your Roadmap
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Related Companies */}
      <section className="bg-black py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-heading mb-8 text-2xl font-bold text-white">
              Explore Other Companies
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {relatedCompanies.map((related) => (
                <Link key={related.id} href={`/interview-prep/${related.id}`}>
                  <Card className="cursor-pointer border-gray-700 bg-gray-900/50 transition-all hover:border-[#00d9ff]/50">
                    <CardContent className="p-6">
                      <div className="mb-3 flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-[#00d9ff]" />
                        <div className="text-xl font-bold text-white">{related.name}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{related.topPatterns.length} patterns</span>
                        <span>{related.interviewProcess.timeline}</span>
                      </div>
                    </CardContent>
                  </Card>
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
