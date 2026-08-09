"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import {
  INTERVIEW_TRACKS,
  type InterviewTrackId,
  interviewTrackPath,
} from "@/components/interview/interview-tracks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The track grid: one card per interview track.
 *
 * Rendered in three places (the header's picker window, the `/interview` landing when no track is
 * chosen, and the "change track" affordance inside a track) so the choice looks the same wherever
 * it is offered. Mirrors `components/learn/LearnTrackPicker.tsx`, because Learn and Interview are
 * the two multi-track hubs in the product and a user should not have to learn two idioms.
 *
 * Cards are real `<a href>`s rather than buttons: middle-click, cmd-click, and "copy link address"
 * all work, and a track is a linkable address precisely so that they can.
 */
export function InterviewTrackCards({
  onSelect,
  activeTrackId,
  className,
}: {
  /** Called when a card is followed. The window uses it to close itself. */
  onSelect?: () => void
  /** The track the user is already in, if any, so it reads as current. */
  activeTrackId?: InterviewTrackId | null
  className?: string
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {INTERVIEW_TRACKS.map((track) => {
        const active = activeTrackId === track.id
        return (
          <li key={track.id}>
            <Link
              href={interviewTrackPath(track.id)}
              onClick={onSelect}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group focus-visible:ring-accent/50 flex h-full flex-col rounded-xl border p-5 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
              )}
            >
              <span className="border-accent/25 bg-accent/10 text-accent-strong flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border">
                <track.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-foreground mt-3.5 flex items-center gap-1.5 text-base font-semibold">
                {track.label}
                <ArrowRight
                  className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-70"
                  aria-hidden="true"
                />
              </span>
              <span className="text-muted-foreground mt-1.5 text-sm text-pretty">
                {track.blurb}
              </span>
              <span className="mt-3.5 flex flex-wrap items-center gap-1.5">
                {track.loop.map((phase) => (
                  <span
                    key={phase}
                    className="border-accent/30 bg-accent/10 text-accent-strong rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  >
                    {phase}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** The picker window the header's "Interview" button opens. */
export function InterviewTrackDialog({
  open,
  onOpenChange,
  activeTrackId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTrackId?: InterviewTrackId | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(44rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Practice an interview</DialogTitle>
          <DialogDescription>
            Pick a round. Each one is a different interview with a different bar, so a session is
            one or the other and never a mix of both.
          </DialogDescription>
        </DialogHeader>
        <InterviewTrackCards
          onSelect={() => onOpenChange(false)}
          activeTrackId={activeTrackId}
          className="mt-1"
        />
      </DialogContent>
    </Dialog>
  )
}
