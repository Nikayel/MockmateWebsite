import { ChevronDown, ListTree } from "lucide-react"
import type { GuidedLabConfig } from "@/lib/bugfix/guided-lab/types"

/** A preview of the authored path, without implying that later phases are already open. */
export function GuidedLabPreview({ config }: { config: GuidedLabConfig }) {
  return (
    <details className="border-border mb-4 border-t">
      <summary className="text-foreground focus-visible:ring-ring flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ListTree className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        View phases
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
      </summary>
      <ol
        aria-label="Lab phase preview"
        className="mb-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {config.milestones.map((milestone, index) => (
          <li key={milestone.id} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className="border-border text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums"
            >
              {index + 1}
            </span>
            <span>{milestone.title}</span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground mb-3 max-w-2xl text-sm leading-6">
        Complete the investigation checklist to open the first repair. Then pass each phase’s tests
        to continue. Repairs progress from easy to hard.
      </p>
    </details>
  )
}
