"use client"

import { ChevronLeft, FileText, NotebookPen } from "lucide-react"
import { ProblemNotesPanel } from "./ProblemNotesPanel"
import { NotesPanel } from "./NotesPanel"
import { VerticalRail } from "./VerticalRail"
import { usePersistentState } from "./usePersistentState"

/**
 * The Python Executor's left region (HANDOFF-UX §2, progressive disclosure). By default only
 * **Problem** is expanded and **Notes** (Understand / Plan) is folded to a slim "NOTES" rail on the
 * inner edge — so the default view is just Problem + Editor + Output, not three blank boxes. Each
 * side can independently fold to its own rail; open/collapsed state persists to localStorage. Section
 * headers use muted icons (clay is reserved for interactive/primary — §5).
 */
export function ExecutorSidePanel() {
  // Persisted as "1"/"0". Notes starts collapsed (the whole point of the progressive disclosure).
  const [problemOpen, setProblemOpen] = usePersistentState("cs_pyexec_problem_open", "1")
  const [notesOpen, setNotesOpen] = usePersistentState("cs_pyexec_notes_open", "0")

  return (
    <div className="flex min-h-0 shrink-0">
      {problemOpen === "1" ? (
        <section className="border-border bg-card flex min-h-0 w-[280px] flex-col border-r">
          <PanelHeader
            icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Problem"
            onCollapse={() => setProblemOpen("0")}
          />
          <div className="min-h-0 flex-1">
            <ProblemNotesPanel />
          </div>
        </section>
      ) : (
        <VerticalRail label="Problem" side="left" onExpand={() => setProblemOpen("1")} />
      )}

      {notesOpen === "1" ? (
        <section className="border-border bg-card flex min-h-0 w-[300px] flex-col border-r">
          <PanelHeader
            icon={<NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />}
            label="Notes"
            onCollapse={() => setNotesOpen("0")}
          />
          <NotesPanel />
        </section>
      ) : (
        <VerticalRail label="Notes" side="left" onExpand={() => setNotesOpen("1")} />
      )}
    </div>
  )
}

function PanelHeader({
  icon,
  label,
  onCollapse,
}: {
  icon: React.ReactNode
  label: string
  onCollapse: () => void
}) {
  return (
    <div className="border-border bg-muted/40 flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </span>
      <button
        type="button"
        onClick={onCollapse}
        aria-label={`Collapse ${label}`}
        title={`Collapse ${label}`}
        className="text-muted-foreground hover:text-foreground hover:bg-background/60 focus-visible:ring-accent/50 ml-auto flex h-6 w-6 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    </div>
  )
}
