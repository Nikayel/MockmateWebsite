import type { Metadata } from "next"
import Link from "next/link"

import { Header } from "@/components/header"
import { LabsAssignmentCards } from "@/components/labs/LabsAssignmentCards"
import { visibleLabsTracks } from "@/components/labs/labs-tracks"
import { getFlagAsync } from "@/lib/feature-flags"

/** Shareable Labs front door; the existing /labs URL remains the indexable Case Labs catalog. */
export const metadata: Metadata = {
  title: "Choose your next round",
  description: "Solve an ambiguous Case Lab or join Meridian for ten engineering sprints.",
  robots: { index: false, follow: true },
}

export const revalidate = 300

export default async function LabsChooserPage() {
  const sprintLabsEnabled = await getFlagAsync("SPRINT_LABS_ENABLED")
  const tracks = visibleLabsTracks(sprintLabsEnabled)

  return (
    <>
      <Header />
      <main className="relative min-h-[100svh] overflow-hidden bg-[#171613] text-[#f6f2ea]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[45rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(138,92,64,0.22),transparent_65%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-24 pb-16 sm:px-6 sm:pt-32 lg:px-8">
          <header className="flex max-w-3xl flex-col gap-4">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[#e7bca0] uppercase">
              CodeSparring Labs <span className="mx-2 text-[#746e64]">/</span> Coming soon
            </span>
            <h1 className="font-serif text-[42px] leading-[1.02] tracking-[-0.045em] sm:text-[58px] lg:text-[68px]">
              Choose your next round.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#c9c1b5] sm:text-lg">
              {tracks.length > 1
                ? "One case to solve today, or one codebase to grow into. Pick the work that matches your next interview."
                : "Take on one real-world case. Scope the ambiguity, then build until the tests pass."}
            </p>
          </header>
          <nav aria-label="Choose a lab path">
            <LabsAssignmentCards tracks={tracks} />
          </nav>
          <Link
            href="/labs"
            className="w-fit rounded-sm text-sm text-[#c9c1b5] underline underline-offset-4 hover:text-[#f6f2ea] focus-visible:ring-2 focus-visible:ring-[#dca47b] focus-visible:outline-none"
          >
            Browse all Case Labs
          </Link>
          <p className="text-[12px] leading-relaxed text-[#aaa397]">
            Try the available labs now. More are coming soon.
          </p>
        </div>
      </main>
    </>
  )
}
