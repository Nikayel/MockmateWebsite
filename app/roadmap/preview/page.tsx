import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Calendar,
  Target,
  Clock,
  CheckCircle2,
  TrendingUp,
  Brain,
  Sparkles,
  Building2,
  BookOpen,
  BarChart3,
  Zap,
} from "lucide-react"
import { BreadcrumbJsonLd, HowToJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Personalized Interview Roadmap | AI-Powered Study Plans",
  description:
    "Get a personalized day-by-day coding interview study plan. Enter your interview date, target company, and skill level. Our AI creates an optimized roadmap using spaced repetition and company-specific patterns.",
  keywords: [
    "personalized interview roadmap",
    "coding interview study plan",
    "DSA roadmap generator",
    "interview prep schedule",
    "spaced repetition study plan",
    "FAANG interview roadmap",
    "coding interview timeline",
    "custom study plan coding",
    "interview prep calendar",
    "AI study plan generator",
  ],
  openGraph: {
    title: "Create Your Personalized Interview Roadmap | CodeSparring",
    description:
      "AI-powered study plans tailored to your interview date, company, and skill level.",
    type: "website",
  },
}

// Sample roadmap data for preview
const sampleRoadmap = {
  company: "Google",
  daysRemaining: 30,
  totalQuestions: 42,
  hoursPerDay: 2,
  dailyPlans: [
    {
      day: 1,
      theme: "Arrays & Hashing Fundamentals",
      questions: [
        { title: "Two Sum", difficulty: "Easy", pattern: "Arrays & Hashing", time: 15 },
        { title: "Valid Anagram", difficulty: "Easy", pattern: "Arrays & Hashing", time: 10 },
        { title: "Group Anagrams", difficulty: "Medium", pattern: "Arrays & Hashing", time: 25 },
      ],
    },
    {
      day: 2,
      theme: "Binary Search Basics",
      questions: [
        { title: "Binary Search", difficulty: "Easy", pattern: "Binary Search", time: 10 },
        { title: "Search Insert Position", difficulty: "Easy", pattern: "Binary Search", time: 15 },
        {
          title: "Find Minimum in Rotated Array",
          difficulty: "Medium",
          pattern: "Binary Search",
          time: 30,
        },
      ],
    },
    {
      day: 3,
      theme: "Sliding Window",
      questions: [
        {
          title: "Best Time to Buy Stock",
          difficulty: "Easy",
          pattern: "Sliding Window",
          time: 15,
        },
        {
          title: "Longest Substring No Repeat",
          difficulty: "Medium",
          pattern: "Sliding Window",
          time: 25,
        },
        {
          title: "Minimum Window Substring",
          difficulty: "Hard",
          pattern: "Sliding Window",
          time: 40,
        },
      ],
    },
  ],
  milestones: [
    { day: 7, name: "Core Patterns Complete", patterns: 5 },
    { day: 14, name: "Mid-Point Review", patterns: 10 },
    { day: 21, name: "Advanced Topics", patterns: 13 },
    { day: 28, name: "Final Review & Mock Interviews", patterns: 15 },
  ],
  patternCoverage: [
    { pattern: "Arrays & Hashing", percentage: 95, questions: 8 },
    { pattern: "Binary Search", percentage: 85, questions: 6 },
    { pattern: "Trees", percentage: 80, questions: 7 },
    { pattern: "Sliding Window", percentage: 75, questions: 5 },
    { pattern: "Two Pointers", percentage: 70, questions: 4 },
  ],
}

export default function RoadmapPreviewPage() {
  return (
    <main className="bg-background min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Roadmap Preview", url: "/roadmap/preview" },
        ]}
      />
      <WebPageJsonLd
        title="Personalized Interview Roadmap"
        description="AI-powered study plans tailored to your interview date, company, and skill level."
        url="/roadmap/preview"
      />
      <HowToJsonLd />

      <Header />

      {/* Hero Section */}
      <section className="from-background via-secondary to-background bg-gradient-to-br pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 border-[#00d9ff]/30 bg-[#00d9ff]/20 text-[#00d9ff]">
              AI-Powered Personalization
            </Badge>
            <h1 className="font-heading mb-6 text-4xl font-bold text-white md:text-6xl">
              Your Interview.
              <span className="text-gradient"> Your Roadmap.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-300">
              Tell us your interview date, target company, and current skill level. Our AI creates a
              personalized day-by-day study plan optimized for{" "}
              <span className="text-[#00d9ff]">maximum retention</span> using spaced repetition.
            </p>

            {/* 3-Step Process */}
            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#00d9ff]/20">
                  <Building2 className="h-6 w-6 text-[#00d9ff]" />
                </div>
                <div className="mb-2 text-lg font-bold text-white">1. Pick Your Company</div>
                <p className="text-sm text-gray-400">
                  Choose from 19 top tech companies. We know their interview patterns.
                </p>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20">
                  <Calendar className="h-6 w-6 text-purple-400" />
                </div>
                <div className="mb-2 text-lg font-bold text-white">2. Set Your Date</div>
                <p className="text-sm text-gray-400">
                  Enter your interview date. We optimize for your timeline.
                </p>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <Brain className="h-6 w-6 text-green-400" />
                </div>
                <div className="mb-2 text-lg font-bold text-white">3. Assess Your Skills</div>
                <p className="text-sm text-gray-400">
                  Quick self-assessment. We focus on your knowledge gaps.
                </p>
              </div>
            </div>

            <Link href="/login?redirect=/roadmap/new">
              <Button
                size="lg"
                className="bg-[#00d9ff] px-8 py-6 text-lg text-white hover:bg-[#00d9ff]/80"
              >
                Create My Roadmap (Free to Start)
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sample Roadmap Preview */}
      <section className="bg-gray-900/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <Badge className="mb-4 border-purple-500/30 bg-purple-500/20 text-purple-400">
                Example Output
              </Badge>
              <h2 className="font-heading mb-4 text-3xl font-bold text-white md:text-4xl">
                Here's What Your Roadmap Looks Like
              </h2>
              <p className="mx-auto max-w-2xl text-gray-400">
                Sample 30-day Google interview prep roadmap for an intermediate candidate
              </p>
            </div>

            {/* Roadmap Header Card */}
            <Card className="mb-8 border-gray-700 bg-gray-900/80">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-[#00d9ff]/20 p-3">
                      <Building2 className="h-8 w-8 text-[#00d9ff]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">Google Interview Prep</div>
                      <div className="text-gray-400">30 days until interview</div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-[#00d9ff]">42</div>
                      <div className="text-sm text-gray-400">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400">15</div>
                      <div className="text-sm text-gray-400">Patterns</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">2h</div>
                      <div className="text-sm text-gray-400">Per Day</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Daily Plans */}
              <div className="space-y-4 lg:col-span-2">
                <h3 className="flex items-center gap-2 text-xl font-bold text-white">
                  <BookOpen className="h-5 w-5 text-[#00d9ff]" />
                  Daily Study Plan
                </h3>
                {sampleRoadmap.dailyPlans.map((day) => (
                  <Card key={day.day} className="border-gray-700 bg-gray-800/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">
                          Day {day.day}: {day.theme}
                        </CardTitle>
                        <Badge className="bg-[#00d9ff]/20 text-[#00d9ff]">
                          {day.questions.reduce((acc, q) => acc + q.time, 0)} min
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {day.questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg bg-gray-900/50 p-2"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-4 w-4 text-gray-600" />
                              <span className="text-gray-300">{q.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  q.difficulty === "Easy"
                                    ? "border-green-500/50 text-green-400"
                                    : q.difficulty === "Medium"
                                      ? "border-yellow-500/50 text-yellow-400"
                                      : "border-red-500/50 text-red-400"
                                }`}
                              >
                                {q.difficulty}
                              </Badge>
                              <span className="text-xs text-gray-500">{q.time}m</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="py-4 text-center">
                  <span className="text-gray-500">... and 27 more days of structured practice</span>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Milestones */}
                <Card className="border-gray-700 bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Target className="h-5 w-5 text-purple-400" />
                      Milestones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sampleRoadmap.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-lg bg-gray-900/50 p-2"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                          {m.day}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.patterns} patterns</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Pattern Coverage */}
                <Card className="border-gray-700 bg-gray-800/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <BarChart3 className="h-5 w-5 text-green-400" />
                      Pattern Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sampleRoadmap.patternCoverage.map((p, idx) => (
                      <div key={idx}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-gray-300">{p.pattern}</span>
                          <span className="text-gray-500">{p.questions} problems</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className="h-full bg-gradient-to-r from-[#00d9ff] to-purple-500"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Spaced Repetition */}
                <Card className="border-[#00d9ff]/30 bg-gradient-to-br from-[#00d9ff]/10 to-purple-500/10">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#00d9ff]" />
                    <h4 className="mb-2 font-bold text-white">Spaced Repetition Built-In</h4>
                    <p className="text-sm text-gray-400">
                      Questions you struggle with get automatically scheduled for review at optimal
                      intervals.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-black py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="font-heading mb-4 text-3xl font-bold text-white">
                The Science Behind Your Roadmap
              </h2>
              <p className="text-gray-400">
                Our algorithm uses proven learning science to maximize retention
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-[#00d9ff]/20 p-2">
                      <TrendingUp className="h-6 w-6 text-[#00d9ff]" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold text-white">Company Pattern Weighting</h3>
                      <p className="text-sm text-gray-400">
                        We prioritize patterns based on how frequently they appear at your target
                        company. Google loves Binary Search (85% frequency), while Meta emphasizes
                        Trees (85%).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-purple-500/20 p-2">
                      <Brain className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold text-white">Knowledge Gap Analysis</h3>
                      <p className="text-sm text-gray-400">
                        Your self-assessment reveals weak areas. We allocate more time to patterns
                        you're unfamiliar with while maintaining coverage of your strengths.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-green-500/20 p-2">
                      <Clock className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold text-white">Timeline Optimization</h3>
                      <p className="text-sm text-gray-400">
                        Whether you have 2 weeks or 3 months, we adjust problem count, difficulty
                        distribution, and review frequency to fit your schedule.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-yellow-500/20 p-2">
                      <Zap className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-bold text-white">Adaptive Difficulty</h3>
                      <p className="text-sm text-gray-400">
                        We ramp difficulty progressively. Interns get more Easy/Medium, senior
                        candidates get more Hard problems and system design focus.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-[#00d9ff]/10 to-purple-500/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading mb-6 text-3xl font-bold text-white md:text-4xl">
            Stop Guessing. Start Preparing Strategically.
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Join thousands of engineers who landed offers at top tech companies with personalized
            prep.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/login?redirect=/roadmap/new">
              <Button
                size="lg"
                className="bg-[#00d9ff] px-8 py-4 text-lg text-white hover:bg-[#00d9ff]/80"
              >
                Create My Free Roadmap
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/interview-prep">
              <Button
                size="lg"
                variant="outline"
                className="border-white bg-transparent px-8 py-4 text-lg text-white hover:bg-white hover:text-black"
              >
                Browse Company Guides
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
