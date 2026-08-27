"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import { InterviewTrackDialog } from "./InterviewTrackPicker"

/**
 * The bare `/interview` landing for the signed-out visitor whose guest trial is already spent:
 * a short pitch for the personalized roadmap, with one way forward. (A fresh-trial guest never
 * sees this; they get the track cards and run their session, scores waiting behind sign-up.)
 *
 * PostHog made the old signed-out landing the site's worst dead-click page, so the rules here
 * are strict. One focal CTA. Plain text is plain text: nothing looks interactive unless it
 * navigates or opens something. The two quiet links under the CTA keep the sample plan and the
 * practice tracks reachable without competing with it; the practice link opens the same track
 * picker window the header uses, so the choice looks the same wherever it is offered.
 *
 * Every sentence is a claim checked against the product: the wizard's steps
 * (`app/roadmap/new/page.tsx`), the company-weighted category mix (`lib/roadmap/
 * category-weights.ts`), roadmap items launching interview sessions (`useSessionReopen`'s
 * roadmap branch), and the "Do later" move (`lib/roadmap/defer-question.ts`). Edit the copy
 * only alongside the behavior it describes.
 */
export function RoadmapPitch() {
  const [isTrackPickerOpen, setIsTrackPickerOpen] = useState(false)

  const quietLinkClass =
    "text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 rounded text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-foreground text-3xl font-semibold text-balance sm:text-4xl">
        Build your interview roadmap
      </h2>

      <div className="text-muted-foreground mt-4 space-y-3 text-base text-pretty">
        <p>
          Tell it the company you are targeting and the date you interview. Then answer a short
          skill check: your experience, the areas you want to focus on, and the hours you can give
          each day.
        </p>
        <p>
          You get a day by day plan that mixes algorithm rounds, debugging, and feature building,
          weighted toward what that company asks. Every item opens as a live session with the AI
          interviewer, so the plan and the practice stay in one place.
        </p>
        <p>
          If a day slips, you can push any item to a later day instead of letting the work pile up.
        </p>
      </div>

      <Button asChild size="lg" className="mt-7">
        <Link href="/roadmap/new">Build your roadmap</Link>
      </Button>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/roadmap/preview" className={quietLinkClass}>
          See a sample plan
        </Link>
        <button
          type="button"
          onClick={() => setIsTrackPickerOpen(true)}
          className={`${quietLinkClass} cursor-pointer`}
        >
          Or jump into a practice round
        </button>
      </div>

      <InterviewTrackDialog open={isTrackPickerOpen} onOpenChange={setIsTrackPickerOpen} />
    </div>
  )
}
