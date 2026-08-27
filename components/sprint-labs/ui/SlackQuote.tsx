/**
 * SlackQuote — an in-fiction chat message block (UX-SPEC.md §1.8).
 *
 * "Reused in standup and in ticket linked artifacts." Non-interactive, so this is a plain server-safe
 * component (no "use client").
 *
 * Deviation, recorded rather than silently resolved (UX-SPEC.md §15's own convention): §1.7's
 * `SprintView.incitingQuote` is typed `{ channel: string; time: string; body: string }`, but Task 1's
 * shipped `SprintPublic.standupQuote` (lib/sprint-labs/types.ts, frozen) is a plain string with no
 * channel or timestamp field. `channel`/`time` are therefore optional here: the standup screen calls
 * this with only `body` (what the content actually carries), and a caller with the fuller authored
 * shape (a future `LinkedArtifacts` entry, once one exists) can supply both.
 */

export interface SlackQuoteProps {
  body: string
  channel?: string
  time?: string
  className?: string
}

export function SlackQuote({ body, channel, time, className }: SlackQuoteProps) {
  const meta = [channel, time].filter((part): part is string => Boolean(part)).join(" · ")
  return (
    <div
      className={
        "flex flex-col gap-1.5 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-3" +
        (className ? ` ${className}` : "")
      }
    >
      {meta && (
        <p className="text-[11px] font-medium tracking-[0.02em] text-[var(--wb-text-secondary)]">
          {meta}
        </p>
      )}
      <p className="text-sm leading-relaxed text-[var(--wb-text)]">&ldquo;{body}&rdquo;</p>
    </div>
  )
}
