import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import type { LabsTrack } from "@/components/labs/labs-tracks"
import { palantir911Dispatch } from "@/lib/labs/case-labs/palantir-911-dispatch"
import { meridianSprint01 } from "@/lib/sprint-labs/content/meridian/sprints/sprint-01"
import { mer101Ticket } from "@/lib/sprint-labs/content/meridian/tickets/MER-101"
import { mer103Ticket } from "@/lib/sprint-labs/content/meridian/tickets/MER-103"
import { cn } from "@/lib/utils"

function DecompositionArtifact() {
  return (
    <div className="rounded-xl border border-white/12 bg-[#f5f2eb] p-5 text-[#282722] shadow-[0_22px_60px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-[#d8d2c6] pb-3 text-[11px] font-medium tracking-[0.12em] uppercase">
        <span>Case brief · Palantir FDSE</span>
        <span>01 / 05</span>
      </div>
      <p className="mt-5 font-serif text-[21px] leading-snug tracking-[-0.02em] sm:text-[25px]">
        “Best responder” is exactly what nobody has pinned down.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[#656259]">{palantir911Dispatch.hook}</p>
      <div className="mt-6 flex items-center justify-between gap-2 border-t border-[#d8d2c6] pt-3 text-[11px] text-[#656259]">
        <span>{palantir911Dispatch.title}</span>
        <span>Python · real repo</span>
      </div>
    </div>
  )
}

function SprintArtifact() {
  return (
    <div className="rounded-xl border border-white/12 bg-[#262b29] p-5 text-[#f4f0e8] shadow-[0_22px_60px_rgba(0,0,0,0.25)] sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3 text-[11px] font-medium tracking-[0.12em] uppercase">
        <span>Meridian · Sprint 01</span>
        <span>{meridianSprint01.title}</span>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-[#c9c6bc]">
        #support-escalations, 08:41 · Northwind got a 500 posting a claim their engineer swears is
        valid.
      </p>
      <div className="mt-5 space-y-2">
        <div className="flex items-start gap-3 rounded-lg border border-white/12 bg-white/6 px-3 py-3">
          <span className="shrink-0 text-[11px] font-semibold text-[#e4ad83]">MER-101</span>
          <span className="text-[12px] leading-snug">{mer101Ticket.ticket.title}</span>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-white/12 bg-white/6 px-3 py-3">
          <span className="shrink-0 text-[11px] font-semibold text-[#e4ad83]">MER-103</span>
          <span className="text-[12px] leading-snug">{mer103Ticket.ticket.title}</span>
        </div>
      </div>
    </div>
  )
}

/** Public, server-rendered assignment scene. Real authored content, no autoplay or client JS. */
export function LabsAssignmentCards({ tracks }: { tracks: LabsTrack[] }) {
  return (
    <ul className={cn("group grid gap-4 lg:gap-5", tracks.length > 1 && "md:grid-cols-2")}>
      {tracks.map((track) => {
        const isSprint = track.id === "sprint"
        return (
          <li key={track.id} className="min-w-0">
            <Link
              href={track.href}
              className={cn(
                "group/card relative flex h-full min-h-[460px] flex-col overflow-hidden rounded-[1.5rem] border border-white/18 p-5 text-[#f6f2ea] transition-[transform,opacity,border-color,box-shadow] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[#dca47b] focus-visible:ring-offset-4 focus-visible:ring-offset-[#171613] focus-visible:outline-none sm:p-7",
                "hover:-translate-y-1 hover:border-[#e1b18d]/60 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)] focus-visible:-translate-y-1",
                "motion-reduce:transform-none motion-reduce:transition-none",
                "md:group-focus-within:opacity-70 md:group-hover:opacity-70 md:hover:!opacity-100 md:focus-visible:!opacity-100",
                isSprint
                  ? "bg-[radial-gradient(circle_at_80%_0%,#36443d_0%,#222b27_42%,#1e2220_100%)]"
                  : "bg-[radial-gradient(circle_at_0%_0%,#6a4638_0%,#302720_45%,#211d19_100%)]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-medium tracking-[0.16em] text-[#e7bca0] uppercase">
                  {isSprint ? "The long game" : "The single round"}
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[#f6f2ea]" aria-hidden="true" />
              </div>
              <div className="mt-8 max-w-sm">
                <h2 className="font-serif text-[30px] leading-[1.08] tracking-[-0.035em] sm:text-[36px]">
                  {isSprint ? "Join a codebase for ten sprints." : "Solve one ambiguous case."}
                </h2>
                <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[#d5d0c5] sm:text-base">
                  {isSprint
                    ? "Inherit decisions. Fix what breaks. See the consequences."
                    : "Scope the problem. Make a call. Ship a working fix."}
                </p>
              </div>
              <div className="mt-7 transition-transform duration-300 ease-out group-hover/card:-translate-y-1 group-focus-visible/card:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
                {isSprint ? <SprintArtifact /> : <DecompositionArtifact />}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm font-medium">
                <span>{isSprint ? "Enter Meridian" : "Explore Case Labs"}</span>
                <span className="text-[11px] tracking-[0.08em] text-[#c9c1b5] uppercase">
                  {isSprint ? "10 sprints" : "One sitting"}
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
