"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LessonNotice, LESSON_NOTICE_TEXT } from "./LessonNotice"
import { cn } from "@/lib/utils"

/**
 * Shared progress-state surfaces for the lesson players. Both the Python and SQL players load and
 * autosave the same `user_tutorial_progress` doc, so a failed load/save and the initial hydration
 * flash must look identical in both. Kept as tiny presentational pieces (no store access) so each
 * player owns its own subscription and passes the values down.
 */

/** A non-blocking banner shown when progress fails to load or save, with a retry. */
export function LessonErrorBanner({ error, onReload }: { error: string; onReload?: () => void }) {
  return (
    <LessonNotice
      className="mb-4"
      leading={<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
      trailing={
        onReload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReload}
            className={cn("h-auto px-2 py-0.5", LESSON_NOTICE_TEXT)}
          >
            Retry
          </Button>
        )
      }
    >
      {error}
    </LessonNotice>
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
