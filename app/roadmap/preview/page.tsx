import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock } from "lucide-react"
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  title: "Preview Your Interview Roadmap | CodeSparring",
  description:
    "See what a personalized coding interview study plan looks like. Day-by-day schedule tailored to your interview date and target company.",
  openGraph: {
    title: "Preview Your Interview Roadmap | CodeSparring",
    description: "See what a personalized day-by-day study plan looks like.",
    type: "website",
  },
}

// Sample roadmap - just enough to show the idea
const sampleDays = [
  {
    day: 1,
    theme: "Arrays & Hashing",
    problems: ["Two Sum", "Valid Anagram", "Group Anagrams"],
    time: "50 min",
  },
  {
    day: 2,
    theme: "Binary Search",
    problems: ["Binary Search", "Search in Rotated Array"],
    time: "45 min",
  },
  {
    day: 3,
    theme: "Sliding Window",
    problems: ["Best Time to Buy Stock", "Longest Substring Without Repeat"],
    time: "55 min",
  },
]

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
        title="Preview Your Interview Roadmap"
        description="See what a personalized day-by-day study plan looks like."
        url="/roadmap/preview"
      />

      <Header />

      {/* Hero - Simple */}
      <section className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl font-semibold text-white md:text-4xl mb-3">
              What your roadmap looks like
            </h1>
            <p className="text-zinc-400 text-lg">
              This is a sample 30-day Google prep plan. Yours will be personalized to your
              interview date, company, and skill level.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Roadmap */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            {/* Header bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div>
                <div className="text-sm text-zinc-500">Sample roadmap</div>
                <div className="text-white font-medium">Google · 30 days · Intermediate</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-white">42 problems</div>
                <div className="text-zinc-500">~2 hrs/day</div>
              </div>
            </div>

            {/* Days */}
            <div className="space-y-4 mb-6">
              {sampleDays.map((day) => (
                <div
                  key={day.day}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-zinc-500 text-sm">Day {day.day}</span>
                      <span className="text-zinc-700 mx-2">·</span>
                      <span className="text-white">{day.theme}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{day.time}</span>
                  </div>
                  <div className="space-y-1.5">
                    {day.problems.map((problem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-zinc-400"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        {problem}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Locked days indicator */}
            <div className="relative">
              <div className="space-y-3 opacity-40 blur-[2px]">
                {[4, 5, 6].map((day) => (
                  <div
                    key={day}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 h-24"
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                  <div className="text-zinc-400 text-sm">27 more days</div>
                  <div className="text-zinc-600 text-xs">Create your roadmap to see the full plan</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
              <h2 className="text-xl font-medium text-white mb-2">
                Create your personalized roadmap
              </h2>
              <p className="text-zinc-400 mb-6">
                Tell us your interview date and target company. We'll build a day-by-day
                schedule that prioritizes what matters most.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <div className="text-white font-medium">Your date</div>
                  <div className="text-zinc-500">We work backwards</div>
                </div>
                <div>
                  <div className="text-white font-medium">Your company</div>
                  <div className="text-zinc-500">Pattern priorities</div>
                </div>
                <div>
                  <div className="text-white font-medium">Your level</div>
                  <div className="text-zinc-500">Skip what you know</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login?redirect=/roadmap/new" className="flex-1">
                  <Button className="w-full bg-white text-black hover:bg-zinc-200">
                    Create my roadmap
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/interview-prep">
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    Browse companies first
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
