import type { Metadata } from "next"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LabsTrackCards } from "@/components/labs/LabsTrackCards"
import { visibleLabsTracks } from "@/components/labs/labs-tracks"
import { getFlagAsync } from "@/lib/feature-flags"

/** Shareable Labs front door; the existing /labs URL remains the indexable Case Labs catalog. */
export const metadata: Metadata = {
  title: "Choose your lab",
  description: "Choose a Decomposition Case Lab or a longer Sprint Lab on a real codebase.",
  robots: { index: false, follow: true },
}

export const revalidate = 300

export default async function LabsChooserPage() {
  const sprintLabsEnabled = await getFlagAsync("SPRINT_LABS_ENABLED")
  const tracks = visibleLabsTracks(sprintLabsEnabled)

  return (
    <>
      <Header />
      <main className="bg-background text-foreground min-h-[100svh]">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
          <header className="flex max-w-2xl flex-col gap-4">
            <span className="text-accent-strong text-xs font-semibold tracking-[0.14em] uppercase">
              Labs · Beta
            </span>
            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">
              Choose the work you want to practice.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
              {tracks.length > 1
                ? "One problem in a single sitting, or one evolving codebase across ten sprints. Both paths are live in beta, and we’re actively improving them."
                : "Decomposition Case Labs are live in beta, and we’re actively improving them."}
            </p>
          </header>
          <nav aria-label="Choose a lab path">
            <LabsTrackCards tracks={tracks} />
          </nav>
        </div>
      </main>
      <Footer />
    </>
  )
}
