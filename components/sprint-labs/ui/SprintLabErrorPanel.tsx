/**
 * SprintLabErrorPanel — the run surface's one error shape (UX-SPEC.md §13):
 * "One `--wb-panel` panel with a border, a one-line human cause, and exactly one retry action. Never
 * a toast for a screen-blocking failure; never a partially-populated screen."
 *
 * Shared across standup/board/ticket's several failure states (entitlement check failed, sprint or
 * ticket content failed to load, run creation failed) so every screen renders the same shape rather
 * than each hand-rolling its own.
 */

export interface SprintLabErrorPanelProps {
  message: string
  onRetry: () => void
  retryLabel?: string
}

export function SprintLabErrorPanel({
  message,
  onRetry,
  retryLabel = "Retry",
}: SprintLabErrorPanelProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-6"
    >
      <p className="text-sm text-[var(--wb-text)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-[var(--wb-border)] px-3 py-1.5 text-xs font-medium text-[var(--wb-text)] hover:border-[var(--wb-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
      >
        {retryLabel}
      </button>
    </div>
  )
}
