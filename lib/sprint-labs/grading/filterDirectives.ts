/**
 * Layer C directive filter (docs/sprint-labs/AGENT-CONTEXT.md §3, PLAN.md
 * Task 8). Pure. Given the learner-directive events stored for a run and the
 * hidden-test tags the CURRENT ticket carries, returns only the entries safe
 * to inject into the in-workspace partner's context.
 *
 * Two independent reasons an entry is removed, both DROP (never paraphrase,
 * never summarize — a dropped entry simply does not appear in the result):
 *
 *  1. Tag collision: any overlap between `entry.tags` and
 *     `currentHiddenTopicTags` means the entry could describe (or be one
 *     paraphrase away from describing) the CURRENT ticket's hidden-test
 *     behavior. Meridian reuses topics across sprints by design (the same
 *     `tenant-scoping` tag appears on an S3 hidden test and an S7 one), so
 *     this is the mechanism that stops an S3 escaped-defect directive from
 *     handing the S7 answer to the partner.
 *  2. Sprint-based decay: an entry is valid for sprints
 *     `createdSprint` .. `createdSprint + expiresAfterSprint` inclusive, and
 *     is dropped once `currentSprint` moves past that window. This is the
 *     ONLY decay this function implements. AGENT-CONTEXT.md §3 also says
 *     entries decay "after two clean passes" — that half describes a
 *     STATEFUL decision about whether to keep re-authoring/appending a
 *     directive in the first place, which belongs to the in-workspace
 *     partner that writes the stored list (PLAN.md Task 14). This function
 *     only ever filters the list it is handed; it never tracks a directive's
 *     history across calls, so "two clean passes" cannot live here.
 *
 * Signature note: AGENT-CONTEXT.md and PLAN.md write the shorthand
 * `filterDirectives(entries, currentHiddenTopicTags)`. Sprint-based decay
 * cannot be decided without knowing the current sprint, so this
 * implementation takes a third `currentSprint` argument.
 */

import type { DirectiveEntry } from "@/lib/sprint-labs/types"

function hasExpired(entry: DirectiveEntry, currentSprint: number): boolean {
  return currentSprint > entry.createdSprint + entry.expiresAfterSprint
}

function collidesWithHiddenTags(entry: DirectiveEntry, hiddenTags: ReadonlySet<string>): boolean {
  return entry.tags.some((tag) => hiddenTags.has(tag))
}

export function filterDirectives(
  entries: readonly DirectiveEntry[],
  currentHiddenTopicTags: readonly string[],
  currentSprint: number
): DirectiveEntry[] {
  const hiddenTags = new Set(currentHiddenTopicTags)
  return entries.filter(
    (entry) => !hasExpired(entry, currentSprint) && !collidesWithHiddenTags(entry, hiddenTags)
  )
}
