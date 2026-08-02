import type { Metadata } from "next"

import { Header } from "@/components/header"
import { LearnTrackCards } from "@/components/learn/LearnTrackPicker"

export const metadata: Metadata = {
  title: "Learn — CodeSparring",
  description:
    "Pick a track: Python, SQL, or System Design. Every lesson works the same way: read the concept, then write it yourself and get graded in the browser.",
}

/**
 * The Learn hub. The header's Learn button opens the same track cards in a
 * window; this page is the addressable version of it, for direct links, deep
 * links from search, and anyone who lands on /learn without the header.
 */
export default function LearnHubPage() {
  return (
    <>
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-12 pt-28 sm:py-16 sm:pt-32">
        <header className="mb-10 text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Pick a track
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
            Every lesson works the same way: read the concept, then write it yourself and get graded
            in the browser.
          </p>
        </header>

        <LearnTrackCards />
      </div>
    </>
  )
}
