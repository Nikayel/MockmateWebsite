import type { LabEvent } from "./schema"

/** Focus excerpts on the actual change, so long context lines cannot hide the repair. */
function changedExcerpt(before: string, after: string, budget: number) {
  let start = 0
  while (start < Math.min(before.length, after.length) && before[start] === after[start]) start++
  const from = Math.max(0, start - Math.floor(budget / 4))
  return {
    before: before.slice(from, from + budget),
    after: after.slice(from, from + budget),
    excerpt: true,
  }
}
export function renderPromptEvent(event: LabEvent, budget: number) {
  const base = { id: event.id, phaseId: event.phaseId, revision: event.revision, kind: event.kind }
  switch (event.kind) {
    case "checkpoint":
      return {
        ...base,
        patches: event.patches.slice(0, 3).map((p) => ({
          path: p.path,
          startLine: p.startLine,
          ...changedExcerpt(
            p.before,
            p.after,
            Math.max(60, Math.floor(budget / Math.min(3, event.patches.length) / 2))
          ),
        })),
      }
    case "message":
      return {
        ...base,
        role: event.role,
        lane: event.lane,
        text: event.text.slice(0, budget),
        excerpt: event.text.length > budget,
      }
    case "hint":
      return { ...base, text: event.text.slice(0, budget) }
    case "test_run":
      return {
        ...base,
        stale: event.stale,
        suites: [...new Set(event.results.map((r) => r.suite))].map((suite) => ({
          suite,
          passed: event.results.filter((r) => r.suite === suite && r.passed && !r.harnessError)
            .length,
          total: event.results.filter((r) => r.suite === suite && !r.harnessError).length,
        })),
      }
    case "transition":
      return { ...base, toPhaseId: event.toPhaseId, reason: event.reason }
  }
}
