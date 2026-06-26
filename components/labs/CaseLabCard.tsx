/**
 * CaseLabCard — gallery tile for a Case Lab. Links into the play route.
 */

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { CaseLab } from "@/lib/labs/types"

export function CaseLabCard({ lab }: { lab: CaseLab }) {
  return (
    <Link
      href={`/labs/${lab.id}`}
      className="group border-border hover:border-primary/40 hover:bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs tracking-wide capitalize">
            {lab.company} · {lab.role}
          </span>
          <h3 className="text-foreground text-base font-semibold">{lab.title}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
            difficultyColorClass(lab.difficulty, "softBadge")
          )}
        >
          {lab.difficulty}
        </span>
      </div>

      <p className="text-muted-foreground line-clamp-3 text-sm">{lab.whyThisCompany}</p>

      <div className="flex flex-wrap gap-1">
        {lab.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {lab.estimatedMinutes} min
        </span>
        <span className="text-primary flex items-center gap-1 text-sm font-medium">
          Start
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  )
}
