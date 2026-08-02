"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { LEARN_TRACKS } from "@/components/learn/learn-tracks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The track grid: one logo card per Learn track. Rendered both inside the
 * header's picker window and on the /learn hub page, so the two stay identical.
 */
export function LearnTrackCards({
  onSelect,
  className,
}: {
  /** Called when a card is followed (the window uses it to close itself). */
  onSelect?: () => void
  className?: string
}) {
  const pathname = usePathname()

  return (
    <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {LEARN_TRACKS.map((track) => {
        const active = pathname.startsWith(track.href)
        return (
          <li key={track.id}>
            <Link
              href={track.href}
              onClick={onSelect}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group focus-visible:ring-accent/50 flex h-full flex-col rounded-xl border p-4 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-accent/50 bg-accent/5"
                  : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
              )}
            >
              <track.Mark className="h-12 w-12 shrink-0" />
              <span className="text-foreground mt-3 flex items-center gap-1.5 text-base font-semibold">
                {track.label}
                <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-70" />
              </span>
              <span className="text-muted-foreground mt-1 text-sm text-pretty">{track.blurb}</span>
              <span className="mt-3 flex flex-wrap items-center gap-1.5">
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

/** The picker window the header's "Learn" button opens. */
export function LearnTrackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(56rem,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Learn</DialogTitle>
          <DialogDescription>
            Pick a track. Every lesson works the same way: read the concept, then write it yourself
            and get graded in the browser.
          </DialogDescription>
        </DialogHeader>
        <LearnTrackCards onSelect={() => onOpenChange(false)} className="mt-1" />
      </DialogContent>
    </Dialog>
  )
}
