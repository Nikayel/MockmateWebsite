/**
 * Display-facing roadmap progress percentage.
 *
 * Shared so every surface (header, banner, cards, progress bars) renders the
 * same completion figure and never divides by a zero question count. A brand
 * new or empty roadmap has 0 total questions, which would otherwise produce
 * NaN% in the UI (CLAUDE.md: no duplicated business logic).
 *
 * @returns Whole-number percentage 0-100, and 0 when there are no questions.
 */
export function roadmapProgressPercent(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}
