/**
 * Shared "meter row" formatter for a workbook: `WorkbookCard` and the workbook overview page both
 * render the same `N sprints - M tickets - ~H h - Level` line (UX-SPEC.md §2/§3), so the format
 * lives once here rather than being retyped at each call site.
 *
 * The hyphen separator is deliberate and literal, matching every meter-row example in UX-SPEC.md
 * (screens 1, 2 and the Pro-wall copy in §12.6) — topics lists use a middot instead (`· `), which is
 * the other demoted-keywords convention `CaseLabCard` already uses. The two are visually distinct on
 * purpose so a meter fact never reads like a keyword.
 */

export interface WorkbookMeterFacts {
  sprintCount: number
  ticketCount: number
  estimatedHours: number
  level: string
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

export function formatWorkbookMeterLine(facts: WorkbookMeterFacts): string {
  const hours = Number.isInteger(facts.estimatedHours)
    ? String(facts.estimatedHours)
    : facts.estimatedHours.toFixed(1)
  return [
    pluralize(facts.sprintCount, "sprint"),
    pluralize(facts.ticketCount, "ticket"),
    `~${hours} h`,
    facts.level,
  ].join(" - ")
}
