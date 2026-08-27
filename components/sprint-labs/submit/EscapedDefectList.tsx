/**
 * EscapedDefectList — named escaped defects (UX-SPEC.md §1.8). Reused by the
 * submit screen's hidden `GateCard` and by retro's "WHAT ESCAPED" section.
 *
 * Renders `humanName` strings only, each prefixed "Escaped: " (§1.6's numbers
 * rule: "2 escaped" is never shown without the escaped defects' names beside
 * it). No per-defect objective chip: the real `TicketAttempt.escapedDefects`
 * is `string[]` with no objective id on it anywhere in the frozen schema, so
 * attaching one here would be a fabricated mapping, not a rendering of real
 * data (flagged in the Task 13 report against UX-SPEC.md §8's mockup, which
 * shows one).
 */

export interface EscapedDefectListProps {
  escaped: string[]
  className?: string
}

export function EscapedDefectList({ escaped, className }: EscapedDefectListProps) {
  if (escaped.length === 0) {
    return (
      <p className={"text-sm text-[var(--wb-success)]" + (className ? ` ${className}` : "")}>
        Nothing escaped.
      </p>
    )
  }
  return (
    <ul className={"flex flex-col gap-1" + (className ? ` ${className}` : "")}>
      {escaped.map((humanName, index) => (
        // humanName is curated authored content and not guaranteed unique within one gate (two
        // distinct hidden cases can share display text), so the key includes the index.
        <li key={`${index}:${humanName}`} className="text-destructive text-sm leading-relaxed">
          Escaped: {humanName}
        </li>
      ))}
    </ul>
  )
}
