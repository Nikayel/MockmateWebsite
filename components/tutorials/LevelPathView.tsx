"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ThemeToggle"
import { LevelSummaryRail } from "./LevelSummaryRail"
import { LessonPathCard } from "./LessonPathCard"
import { useCompletedLessons } from "./useCompletedLessons"
import { rememberLevel } from "@/lib/tutorials/level-preference"
import { computeLevelPath, type LevelListModel } from "@/lib/tutorials/level-path"
import type { PythonLevelId } from "@/lib/tutorials/types"

/**
 * The level's lesson list, rebuilt as a guided path (not a catalog). Shared by both courses — only
 * `basePath` / `courseLabel` differ. A slim breadcrumb bar, a sticky resume-first summary rail, and a
 * right column of sections whose lessons pack into an auto-fill grid. Per-lesson status, progress,
 * minutes-left, and the Continue target are all computed from the (best-effort) completion overlay.
 */
export function LevelPathView({
  model,
  basePath,
  courseLabel,
}: {
  model: LevelListModel
  basePath: string
  courseLabel: string
}) {
  const completed = useCompletedLessons()
  const isPython = basePath.endsWith("/python")

  // Keep the Python resume pointer (cs_py_level) in sync when a level page is opened directly.
  useEffect(() => {
    if (isPython) rememberLevel(model.id as PythonLevelId)
  }, [isPython, model.id])

  const path = useMemo(
    () => computeLevelPath(model, completed, basePath),
    [model, completed, basePath]
  )

  return (
    <div className="min-h-screen">
      {/* Slim breadcrumb bar — no full site nav */}
      <header className="border-border bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground hidden shrink-0 transition-colors sm:inline"
            >
              CodeSparring
            </Link>
            <ChevronRight className="text-muted-foreground/50 hidden h-3.5 w-3.5 shrink-0 sm:inline" aria-hidden="true" />
            <Link
              href={basePath}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            >
              {courseLabel}
            </Link>
            <ChevronRight className="text-muted-foreground/50 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="text-foreground truncate font-medium" aria-current="page">
              Level {model.id}
            </span>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href={basePath}
              className="text-muted-foreground hover:text-foreground hidden text-sm transition-colors sm:inline"
            >
              All levels
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:gap-11">
          <LevelSummaryRail
            eyebrow={`Level ${model.id}`}
            title={model.title}
            tagline={model.tagline}
            path={path}
          />

          <main className="min-w-0">
            {path.isEmpty ? (
              <p className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                Lessons for this level are coming soon.
              </p>
            ) : (
              <div className="flex flex-col gap-10">
                {path.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <div className="border-border flex items-start justify-between gap-3 border-b pb-3">
                      <div className="min-w-0">
                        <h2 className="text-foreground text-lg font-semibold">{section.title}</h2>
                        {section.description && (
                          <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
                            {section.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums",
                          section.status === "complete"
                            ? "border-accent/40 bg-accent/10 text-accent"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {section.status === "complete" && (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {section.done}/{section.total}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(236px,1fr))] gap-3">
                      {section.lessons.map((node) => (
                        <LessonPathCard key={node.item.id} node={node} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
