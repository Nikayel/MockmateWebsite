"use client"

import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WorkspaceTaskBriefProps {
  summary: string
  onOpenTask: () => void
}

/** Orient the candidate; the repository document owns the complete assignment. */
export function WorkspaceTaskBrief({ summary, onOpenTask }: WorkspaceTaskBriefProps) {
  return (
    <section aria-label="Task overview" className="space-y-4" data-bugfix-tour="incident-report">
      <p className="text-foreground text-base leading-relaxed">{summary}</p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Run once before editing, then explain what the output shows.
      </p>
      <Button
        type="button"
        variant="outline"
        className="border-border bg-card text-foreground hover:bg-muted hover:text-foreground dark:border-border dark:bg-card dark:hover:bg-muted h-11 gap-2 shadow-none"
        onClick={onOpenTask}
      >
        <BookOpen aria-hidden="true" className="size-4" />
        Open task.md
      </Button>
    </section>
  )
}
