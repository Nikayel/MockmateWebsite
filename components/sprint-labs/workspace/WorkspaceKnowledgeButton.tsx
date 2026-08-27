"use client"

/**
 * WorkspaceKnowledgeButton — the top bar's "What the agent knows about you" affordance
 * (UX-SPEC.md §1.3: "the 'what the agent knows about you' button on workspace only"). Mounted by
 * the page into `SprintLabTopBar`'s `rightSlot` (that component's own doc comment names this task
 * as the expected filler), immediately before `<ThemeToggle />`, which `SprintLabTopBar` appends on
 * its own.
 *
 * Presentational only: the page owns the open/close state and passes it straight through to
 * `AgentKnowledgePanel` (`WorkspaceView`'s `knowledgeOpen` prop).
 */
export interface WorkspaceKnowledgeButtonProps {
  onClick: () => void
}

export function WorkspaceKnowledgeButton({ onClick }: WorkspaceKnowledgeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--wb-muted)] hover:text-[var(--wb-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
    >
      What the agent knows
    </button>
  )
}
