import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

/**
 * Slim breadcrumb bar for the Learn track landing pages (`/learn/python`, `/learn/data-engineering`).
 * Mirrors the bar in `LevelPathView` — no full site nav, just a link back home and the theme
 * toggle — so the two path screens give learners a way back into the app instead of dead-ending.
 * `containerClass` aligns the bar's inner width with each page's content column.
 */
export function LearnPathTopBar({
  label,
  containerClass = "max-w-6xl",
}: {
  label: string
  containerClass?: string
}) {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
      <div
        className={`mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6 ${containerClass}`}
      >
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          >
            CodeSparring
          </Link>
          <ChevronRight
            className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="text-foreground truncate font-medium" aria-current="page">
            {label}
          </span>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
