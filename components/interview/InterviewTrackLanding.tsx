"use client"

import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"

import { InterviewTrackCards } from "./InterviewTrackPicker"

/**
 * `/interview` with no track in the address: the choice, made the whole page.
 *
 * Renders the same `InterviewTrackCards` the header's picker window does, on purpose. The choice
 * a user makes here and the choice they make from the header are the same choice, so they are the
 * same component and cannot drift into two different-looking answers to one question.
 */
export function InterviewTrackLanding() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-accent-strong text-xs font-semibold tracking-[0.14em] uppercase">
        Interview practice
      </p>
      <h2 className="text-foreground mt-2.5 text-3xl font-semibold text-balance sm:text-4xl">
        Pick the round you want to practice
      </h2>
      <p className="text-muted-foreground mt-3.5 text-base text-pretty">
        Each one is a different interview with a different bar, so a session is one or the other and
        never a mix of both. Your choice lives in the link, which means you can bookmark a track and
        land straight back in it.
      </p>

      <InterviewTrackCards className="mt-8" />
    </div>
  )
}

/**
 * The holding state for a deep link that is still resolving.
 *
 * `/interview` keeps the browser mounted while `useSessionReopen` loads a session, so something
 * has to fill that window. Showing the picker there would flash a question at a user who already
 * answered it by clicking a link. The escape hatch is here because a deep link can also fail (a
 * scenario id that no longer exists, say), and a spinner with no way out is worse than a picker.
 */
export function InterviewResumeNotice() {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" aria-hidden="true" />
      <p className="text-muted-foreground text-sm" role="status">
        Opening your session
      </p>
      <Link
        href="/interview"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Browse tracks instead
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  )
}
