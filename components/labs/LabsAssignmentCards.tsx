import { LockKeyhole } from "lucide-react"

import type { LabsTrack } from "@/components/labs/labs-tracks"

/** A short, comparable view of each track; unavailable paths remain visible but cannot be opened. */
export function LabsAssignmentCards({ tracks }: { tracks: LabsTrack[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {tracks.map((track) => (
        <li key={track.id}>
          <article className="flex h-full flex-col rounded-2xl border border-white/15 bg-white/[0.025] p-5 text-[#f6f2ea] opacity-75 sm:p-6">
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
            </div>
            <button
              type="button"
              disabled
              className="mt-auto inline-flex w-fit cursor-not-allowed items-center gap-2 pt-6 text-sm font-semibold text-[#c9c1b5] disabled:opacity-100"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Coming soon
            </button>
          </article>
        </li>
      ))}
    </ul>
  )
}
