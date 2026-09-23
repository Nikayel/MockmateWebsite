/**
 * Meter row formatter for the workbook overview's
 * `N sprints - M tickets - ~H h - Level` line.
 *
 * The hyphen separator distinguishes meter facts from topic lists, which use middots.
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
