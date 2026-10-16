"use client"

import { Code, MessageSquare, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InterviewPanel } from "../_hooks/useInterviewModes"

const PANELS = [
  { panel: "problem", label: "Problem", name: "Show problem", Icon: FileText },
  { panel: "editor", label: "Code", name: "Show code editor", Icon: Code },
  { panel: "chat", label: "Interview", name: "Show interview chat", Icon: MessageSquare },
] as const

export function MobileWorkspaceNav({
  activePanel,
  onPanelChange,
}: {
  activePanel: InterviewPanel
  onPanelChange: (panel: InterviewPanel) => void
}) {
  return (
    <nav
      aria-label="Workspace panels"
      className="border-border bg-card flex w-full rounded-md border lg:hidden"
    >
      {PANELS.map(({ panel, label, name, Icon }) => (
        <button
          key={panel}
          type="button"
          onClick={() => onPanelChange(panel)}
          aria-label={name}
          aria-pressed={activePanel === panel}
          className={cn(
            "text-muted-foreground hover:text-foreground flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded px-2 text-sm transition-colors",
            activePanel === panel && "bg-muted text-foreground font-medium"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  )
}
