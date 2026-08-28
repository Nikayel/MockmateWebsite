"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { visibleLabsTracks, type LabsTrack } from "@/components/labs/labs-tracks"
import { useSprintLabsEnabled } from "@/components/sprint-labs/useSprintLabsEnabled"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The lab-family grid: one card per family.
 *
 * A sibling of `components/interview/InterviewTrackPicker.tsx` and
 * `components/learn/LearnTrackPicker.tsx` on purpose — Labs, Interview, and Learn are the product's
 * three multi-track hubs, and their pickers read the same so a user learns one idiom. Cards are real
 * `<a href>`s, so middle-click, cmd-click, and "copy link address" all work.
 */
export function LabsTrackCards({
  tracks,
  onSelect,
  className,
}: {
  /** The families to show. The dialog filters this by the flag; kept a prop so the grid stays pure. */
  tracks: LabsTrack[]
  /** Called when a card is followed. The window uses it to close itself. */
  onSelect?: () => void
  className?: string
}) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {tracks.map((track) => (
        <li key={track.id}>
          <Link
            href={track.href}
            onClick={onSelect}
            className={cn(
              "group focus-visible:ring-accent/50 flex h-full flex-col rounded-xl border p-5 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
              "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
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
            <span className="text-muted-foreground mt-1.5 text-sm text-pretty">{track.blurb}</span>
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
      ))}
    </ul>
  )
}

/** The picker window the header's "Labs" button opens. */
export function LabsTrackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sprintLabsEnabled = useSprintLabsEnabled()
  // Fail closed: the Sprint row appears only once the flag is confirmed on. Until then (and whenever
  // it is off) the panel shows exactly the Decomposition catalog that has always been live at /labs.
  const tracks = visibleLabsTracks(sprintLabsEnabled)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(44rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Practice on a real codebase</DialogTitle>
          <DialogDescription>
            {tracks.length > 1
              ? "Two ways in. One problem in a single sitting, or one system across ten sprints."
              : "Scope an underspecified problem, then build it on a real multi-file codebase."}
          </DialogDescription>
        </DialogHeader>
        <LabsTrackCards onSelect={() => onOpenChange(false)} tracks={tracks} className="mt-1" />
      </DialogContent>
    </Dialog>
  )
}
