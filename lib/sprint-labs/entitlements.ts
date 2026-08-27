/**
 * Sprint Labs — sprint-level entitlement rule.
 *
 * Owner decision 2 (docs/sprint-labs/EXECUTION-STATE.md): sprint 1 of a workbook is free for
 * signed-in users; sprints 2-10 need Pro. This is a fixed content rule about sprint NUMBER, not
 * workbook identity, so it lives in exactly one place rather than being reimplemented per screen.
 * `SprintMap` (components/sprint-labs/catalog/SprintMap.tsx) imports this for its Free/Pro pill;
 * the run-surface tasks that enforce the actual paywall (the sprint 2 standup wall, §12.6) are
 * expected to import the same helper, so the catalog's marketing and the run surface's real gate
 * can never quietly drift apart.
 */

export function sprintRequiresPro(sprintNumber: number): boolean {
  return sprintNumber > 1
}
