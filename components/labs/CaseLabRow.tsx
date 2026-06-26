/**
 * CaseLabRow — compact list row for a Case Lab in the `/labs` gallery. Built for
 * scanning a catalog: the title and company anchor the left, and the decision
 * attributes (skills, difficulty, duration) sit in aligned right-hand columns so
 * the eye can compare straight down the list. The longer "why this company"
 * pitch lives on the detail page, not here.
 */

import Link from "next/link"
import { ChevronRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { CaseLabProgressBadge } from "@/components/labs/CaseLabProgressBadge"
import type { CaseLab } from "@/lib/labs/types"

export function CaseLabRow({ lab }: { lab: CaseLab }) {
  return (
    <Link
      href={`/labs/${lab.id}`}
      className="group hover:bg-muted/40 flex items-center gap-4 px-3 py-3.5 transition-colors sm:px-4"
    >
      {/* Identity — title + company/role + any resume hint. Grows to fill. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground truncate text-sm font-semibold sm:text-base">
            {lab.title}
          </h3>
          {/* Difficulty rides next to the title only where the right-hand
              column is hidden (small screens), so it's never lost. */}
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize sm:hidden",
              difficultyColorClass(lab.difficulty, "softBadge")
            )}
          >
            {lab.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground truncate text-xs tracking-wide capitalize">
            {lab.company} · {lab.role}
          </span>
          <CaseLabProgressBadge labId={lab.id} />
        </div>
      </div>

      {/* Skills — secondary signal, drops first when space is tight. */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {lab.skills.slice(0, 2).map((skill) => (
          <span key={skill} className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
            {skill}
          </span>
        ))}
      </div>

      {/* Decision columns — fixed widths so difficulty/time line up row to row. */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <span
          className={cn(
            "hidden rounded-md px-2 py-0.5 text-center text-xs font-medium capitalize sm:inline-block sm:w-[68px]",
            difficultyColorClass(lab.difficulty, "softBadge")
          )}
        >
          {lab.difficulty}
        </span>
        <span className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex sm:w-[52px]">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {lab.estimatedMinutes} min
        </span>
        <ChevronRight
          className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  )
}
