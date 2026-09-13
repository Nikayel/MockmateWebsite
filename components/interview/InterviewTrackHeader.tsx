"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Progress } from "@/components/ui/progress"

import type { InterviewTrack } from "./interview-tracks"

interface InterviewTrackHeaderProps {
  track: InterviewTrack
  /** Every problem the track owns. Computed from the registry by the browser, never hardcoded. */
  total: number
  /** How many of those the user has finished. */
  completed: number
}

/**
 * The masthead for a single track: what this round is, how much of it is left, and the way out.
 *
 * The old browser answered "which practice am I in?" with a highlighted pill in a two-tab bar,
 * which is easy to miss and easier to forget. A track is a destination now, so it gets a
 * destination's header, and the way back to the choice is a labelled control rather than a tab
 * the user has to notice.
 */
export function InterviewTrackHeader({ track, total, completed }: InterviewTrackHeaderProps) {
  const solvedPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <header className="mb-5">
      <Link
        href="/interview"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Change track
      </Link>

      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="border-accent/25 bg-accent/10 text-accent-strong flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
            <track.Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-foreground text-lg font-semibold text-balance sm:text-xl">
              {track.label}
            </h2>
            <p className="text-muted-foreground mt-0.5 max-w-3xl text-sm leading-5 text-pretty">
              {track.blurb}
            </p>
          </div>
        </div>

        <div className="border-border/70 bg-muted/30 min-w-40 rounded-xl border px-3 py-2.5 sm:shrink-0">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground text-xs font-medium">Progress</span>
            <span className="text-foreground text-sm font-semibold tabular-nums">
              {completed}/{total}
            </span>
          </p>
          <Progress
            value={solvedPercent}
            aria-label={`${completed} of ${total} ${track.shortLabel} problems solved`}
            className="bg-muted mt-2 h-1"
          />
        </div>
      </div>
    </header>
  )
}
