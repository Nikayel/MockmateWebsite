import Link from "next/link"
import { ArrowRight } from "lucide-react"

import type { LabsTrack } from "@/components/labs/labs-tracks"

/** A short, comparable choice that links directly to each track's next action. */
export function LabsAssignmentCards({ tracks }: { tracks: LabsTrack[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {tracks.map((track) => (
        <li key={track.id}>
          <Link
            href={track.href}
            className="group flex h-full flex-col rounded-2xl border border-white/20 bg-white/[0.04] p-5 text-[#f6f2ea] transition-colors hover:border-[#dca47b] hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-[#dca47b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#171613] focus-visible:outline-none sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[#e7bca0] uppercase">
                {track.label} · {track.statusLabel}
              </span>
              <track.Icon className="h-5 w-5 shrink-0 text-[#e7bca0]" aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-serif text-[27px] leading-[1.12] tracking-[-0.03em] sm:text-[32px]">
              {track.assignmentTitle}
            </h2>
            <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[#d5d0c5]">
              {track.blurb}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#c9c1b5]">
              <span>{track.commitment}</span>
              <span>{track.accessNote}</span>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-[#f6f2ea] group-hover:text-[#e7bca0]">
              {track.actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
