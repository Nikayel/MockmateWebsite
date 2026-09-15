import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { type LabsTrack } from "@/components/labs/labs-tracks"
import { cn } from "@/lib/utils"

/** Shareable lab-family choices, used by both the header dialog and the public chooser. */
export function LabsTrackCards({
  tracks,
  onSelect,
  className,
}: {
  tracks: LabsTrack[]
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
            <span className="text-muted-foreground mt-3.5 text-[11px] font-medium tracking-[0.1em] uppercase">
              {track.label} · {track.statusLabel}
            </span>
            <span className="text-foreground mt-1.5 flex items-center gap-1.5 text-base font-semibold">
              {track.assignmentTitle}
              <ArrowRight
                className="h-4 w-4 opacity-60 transition-all duration-200 sm:-translate-x-1 sm:opacity-0 sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-70 sm:group-hover:translate-x-0 sm:group-hover:opacity-70"
                aria-hidden="true"
              />
            </span>
            <span className="text-muted-foreground mt-1.5 text-sm text-pretty">{track.blurb}</span>
            <span className="text-muted-foreground border-border mt-auto border-t pt-3 text-xs leading-relaxed">
              {track.accessNote}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
