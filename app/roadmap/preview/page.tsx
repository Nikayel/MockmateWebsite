import { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock } from "lucide-react"
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/JsonLd"

export const metadata: Metadata = {
  // No brand here: the root layout's `title.template` appends " | CodeSparring" already. The
  // openGraph title below keeps it, because no template is applied to OG tags.
  title: "Preview Your Interview Roadmap",
  description:
    "See what a personalized coding interview study plan looks like. Day-by-day schedule tailored to your interview date and target company.",
  // This page is in the sitemap, so it needs a canonical of its own; the root layout sets none.
  alternates: {
    canonical: "/roadmap/preview",
  },
  // Stated explicitly because `app/roadmap/layout.tsx` now noindexes the signed-in roadmap, and
  // Next.js merges metadata from the root segment down: a field this page does not name is
  // inherited from its parent. Without this line the preview would inherit `index: false` and drop
  // out of the index while still being submitted in the sitemap, which is a hard `seo:audit`
  // failure (NOINDEX). This is the only public page under `/roadmap`; `PRIVATE_PATHS` in
  // `app/robots.ts` already carves it out the same way, with `/roadmap$` rather than `/roadmap`.
  robots: { index: true, follow: true },
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
            <h1 className="text-foreground mb-3 text-3xl font-semibold md:text-4xl">
              What your roadmap looks like
            </h1>
            <p className="text-muted-foreground text-lg">
              This is a sample 30-day Google prep plan. Yours will be personalized to your interview
              date, company, and skill level.
            </p>
          </div>
        </div>
      </section>

      {/* Sample Roadmap */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            {/* Header bar */}
            <div className="border-border mb-6 flex items-center justify-between border-b pb-4">
              <div>
                <div className="text-muted-foreground text-sm">Sample roadmap</div>
                <div className="text-foreground font-medium">Google · 30 days · Intermediate</div>
              </div>
              <div className="text-right text-sm">
                <div className="text-foreground">42 problems</div>
                <div className="text-muted-foreground">~2 hrs/day</div>
              </div>
            </div>

            {/* Days */}
            <div className="mb-6 space-y-4">
              {sampleDays.map((day) => (
                <div key={day.day} className="border-border bg-card/50 rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-muted-foreground text-sm">Day {day.day}</span>
                      <span className="text-muted-foreground mx-2">·</span>
                      <span className="text-foreground">{day.theme}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">{day.time}</span>
                  </div>
                  <div className="space-y-1.5">
                    {day.problems.map((problem, idx) => (
                      <div
                        key={idx}
                        className="text-muted-foreground flex items-center gap-2 text-sm"
                      >
                        <div className="bg-muted h-1.5 w-1.5 rounded-full" />
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
                  <div key={day} className="border-border bg-card/50 h-24 rounded-lg border p-4" />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
                  <div className="text-muted-foreground text-sm">27 more days</div>
                  <div className="text-muted-foreground text-xs">
                    Create your roadmap to see the full plan
                  </div>
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
            <div className="border-border bg-card/50 rounded-xl border p-8">
              <h2 className="text-foreground mb-2 text-xl font-medium">
                Create your personalized roadmap
              </h2>
              <p className="text-muted-foreground mb-6">
                Tell us your interview date and target company. We'll build a day-by-day schedule
                that prioritizes what matters most.
              </p>

              <div className="mb-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-foreground font-medium">Your date</div>
                  <div className="text-muted-foreground">We work backwards</div>
                </div>
                <div>
                  <div className="text-foreground font-medium">Your company</div>
                  <div className="text-muted-foreground">Pattern priorities</div>
                </div>
                <div>
                  <div className="text-foreground font-medium">Your level</div>
                  <div className="text-muted-foreground">Skip what you know</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login?redirect=/roadmap/new" className="flex-1">
                  <Button className="bg-card text-foreground hover:bg-muted w-full">
                    Create my roadmap
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/interview-prep">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted"
                  >
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
