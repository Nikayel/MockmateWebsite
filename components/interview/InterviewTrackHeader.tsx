"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { Progress } from "@/components/ui/progress"

import type { InterviewTrack } from "./interview-tracks"

interface InterviewTrackHeaderProps {
  track: InterviewTrack
  /** Every problem the track owns. Computed from the registry by the browser, never hardcoded. */
  total: number
  /** How many of those the user has finished. */
  completed: number
  children?: ReactNode
}

/**
 * The masthead for a single track: what this round is, how much of it is left, and the way out.
 *
 * The old browser answered "which practice am I in?" with a highlighted pill in a two-tab bar,
 * which is easy to miss and easier to forget. A track is a destination now, so it gets a
 * destination's header, and the way back to the choice is a labelled control rather than a tab
 * the user has to notice.
 */
export function InterviewTrackHeader({
  track,
  total,
  completed,
  children,
}: InterviewTrackHeaderProps) {
  const solvedPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <header className="mb-4">
      <Link
        href="/interview"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Change track
      </Link>

      <section
        aria-label={`${track.shortLabel} problem browser`}
        className="border-border bg-card rounded-2xl border p-4"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <track.Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
              <h2 className="text-foreground text-lg font-semibold sm:text-xl">{track.label}</h2>
              {track.id === "debugging" && (
                <span className="border-border bg-muted text-muted-foreground rounded border px-1.5 text-xs leading-5 font-medium">
                  Beta
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
              <span className="tabular-nums">
                {completed}/{total} solved
              </span>
              <Progress
                value={solvedPercent}
                aria-label={`${completed} of ${total} ${track.shortLabel} problems solved`}
                className="bg-muted hidden h-1 w-16 sm:block"
              />
            </div>
          </div>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-5 text-pretty">
            {track.blurb}
          </p>
          {track.id === "debugging" && (
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              We’re working with recruiters to align these interviews with industry standards.
            </p>
          )}
        </div>
        {children && <div className="border-border mt-3 border-t pt-3">{children}</div>}
      </section>
    </header>
  )
}
