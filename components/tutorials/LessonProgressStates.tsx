"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Shared progress-state surfaces for the lesson players. Both the Python and SQL players load and
 * autosave the same `user_tutorial_progress` doc, so a failed load/save and the initial hydration
 * flash must look identical in both. Kept as tiny presentational pieces (no store access) so each
 * player owns its own subscription and passes the values down.
 */

/** A non-blocking banner shown when progress fails to load or save, with a retry. */
export function LessonErrorBanner({ error, onReload }: { error: string; onReload?: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{error}</span>
      {onReload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReload}
          className="h-auto px-2 py-0.5 text-amber-700 dark:text-amber-300"
        >
          Retry
        </Button>
      )}
    </div>
  )
}

/**
 * Placeholder shown in the center column while saved progress hydrates, so a returning learner never
 * sees the lesson briefly reset to the Read phase at 0% before their saved position snaps in.
 */
export function LessonLoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Restoring your progress">
      <div className="bg-muted/50 h-6 w-2/3 animate-pulse rounded" />
      <div className="bg-muted/40 h-4 w-full animate-pulse rounded" />
      <div className="bg-muted/40 h-4 w-5/6 animate-pulse rounded" />
      <div className="bg-muted/30 h-40 w-full animate-pulse rounded-lg" />
      <p className="text-muted-foreground text-sm">Restoring your progress…</p>
    </div>
  )
}
