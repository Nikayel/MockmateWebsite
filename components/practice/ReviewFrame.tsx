import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ReviewFrameProps {
  title: string
  heading?: string
  className?: string
  summary?: ReactNode
  actions?: ReactNode
  children: ReactNode
  contained?: boolean
  scrollContent?: boolean
}

/** One persistent header; content owns the scroll, not the entire workspace. */
export function ReviewFrame({
  title,
  heading,
  className,
  summary,
  actions,
  children,
  contained = true,
  scrollContent = true,
}: ReviewFrameProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "bg-background text-foreground mx-auto w-full max-w-7xl",
        contained && "flex min-h-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      <header className="border-border/60 bg-background z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1 basis-48">
          {heading && <p className="text-muted-foreground mb-1 text-sm">{title}</p>}
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">{heading || title}</h1>
          {summary && <div className="text-muted-foreground mt-1 text-sm">{summary}</div>}
        </div>
        {actions && (
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      <div
        className={cn(
          "min-w-0",
          contained && "min-h-0 flex-1",
          contained &&
            (scrollContent ? "overflow-y-auto overscroll-contain" : "flex flex-col overflow-hidden")
        )}
        role={scrollContent ? "region" : undefined}
        aria-label={scrollContent ? `${title} content` : undefined}
        tabIndex={contained && scrollContent ? 0 : undefined}
      >
        {children}
      </div>
    </section>
  )
}
