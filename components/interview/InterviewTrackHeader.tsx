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
    <header className="mb-8">
      <Link
        href="/interview"
        className="border-border bg-card text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-accent/5 focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Change track
      </Link>

      {/* Same border + card surface the picker cards use, so arriving in a track reads as the
          card the user just clicked, opened up. */}
      <div className="border-border bg-card mt-4 flex flex-col gap-6 rounded-2xl border p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10 sm:p-6">
        <div className="flex gap-4">
          <span className="border-accent/25 bg-accent/10 text-accent-strong flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
            <track.Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-foreground text-2xl font-semibold text-balance">{track.label}</h2>
            <p className="text-muted-foreground mt-1.5 max-w-xl text-sm text-pretty">
              {track.blurb}
            </p>
            <ul className="mt-3.5 flex flex-wrap items-center gap-1.5">
              {track.loop.map((phase) => (
                <li
                  key={phase}
                  className="border-accent/30 bg-accent/10 text-accent-strong rounded-full border px-2 py-0.5 text-[11px] font-medium"
                >
                  {phase}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sm:w-48 sm:shrink-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Your progress
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-foreground text-2xl font-semibold tabular-nums">{completed}</span>
            <span className="text-muted-foreground text-sm">of {total} solved</span>
          </p>
          <Progress
            value={solvedPercent}
            aria-label={`${completed} of ${total} ${track.shortLabel} problems solved`}
            className="bg-muted mt-2.5 h-1.5"
          />
        </div>
      </div>
    </header>
  )
}
