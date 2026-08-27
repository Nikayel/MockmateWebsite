/**
 * AcceptanceCriteria — the ticket's acceptance criteria (UX-SPEC.md §1.8): "An ordered,
 * checkable-looking list of criteria; read-only, no checkboxes the learner can tick."
 *
 * "Read-only; there are no checkboxes, because the gates decide whether a criterion is met" (§6
 * Interactions). Plain numbered list, no interaction, no server-safe restriction needed.
 */

export interface AcceptanceCriteriaProps {
  criteria: string[]
}

export function AcceptanceCriteria({ criteria }: AcceptanceCriteriaProps) {
  if (criteria.length === 0) {
    return <p className="text-sm text-[var(--wb-faint)]">No acceptance criteria published yet.</p>
  }

  return (
    <ol className="flex list-none flex-col gap-2">
      {criteria.map((criterion, index) => (
        <li
          key={index}
          className="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--wb-text)]"
        >
          <span
            aria-hidden
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--wb-border)] text-[11px] font-medium text-[var(--wb-text-secondary)]"
          >
            {index + 1}
          </span>
          <span>{criterion}</span>
        </li>
      ))}
    </ol>
  )
}
