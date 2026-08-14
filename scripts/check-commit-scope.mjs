#!/usr/bin/env node
/**
 * Reject a commit that stages files outside the scope its author declared.
 *
 * ## The failure this stops, which a prompt did not
 *
 * Fleet runs partition work by file: each agent owns one path and is told, in the prompt, never to
 * run `git add -A` and never to stage a sibling's file. That instruction has now failed on four
 * separate waves. Concretely, in the 2026-08-14 genre sweep the Level 5 agent staged `level7.ts`
 * into its own commit, so Level 7's work is attributed to Level 5's message, and the Level 6 agent's
 * commit landed EMPTY because a sibling had already swept its file. The content survived every time;
 * what did not survive was `git log` telling the truth about which change is where, which is the
 * thing you need on the day something has to be bisected or reverted.
 *
 * `lint-staged` makes it worse rather than better: it runs `git stash` around the hook, which is
 * hostile to concurrency, so a sibling's in-flight staging can be captured and restored into the
 * wrong commit. That is documented in CLAUDE.md and is why commits must be staged precisely.
 *
 * A rule in a prompt is a rule that drifts. This repo's own guidance is to enforce a convention with
 * a check that fails the build rather than a paragraph asking nicely.
 *
 * ## Why the hook runs this twice
 *
 * Running it only BEFORE `lint-staged` is not enough, which we learned the same day it shipped. An
 * agent staged exactly one path, this check passed correctly because at that moment the index held
 * exactly one path, and the commit still went out carrying a sibling's file (`e0a592ce`).
 * `lint-staged` stashes and restores around the commit, and a sibling's in-flight staging was
 * captured by that stash and restored into the index AFTER this ran and BEFORE the commit object was
 * written. A guard positioned before the sweep cannot see what the sweep does, so `.husky/pre-commit`
 * calls this again afterwards.
 *
 * The complete fix is upstream of both runs: commit a PATHSPEC (`git commit -- path`), which bypasses
 * the shared index entirely. This guard is the backstop for when someone forgets.
 *
 * ## Opt-in by design
 *
 * This is INERT unless `CS_COMMIT_SCOPE` is set, so an ordinary human commit is untouched and no
 * existing workflow changes. An agent given a file partition exports the scope it was assigned:
 *
 *     CS_COMMIT_SCOPE="lib/tutorials/system-design/curriculum/level7.ts" \
 *       git -c commit.gpgsign=false commit -m "..."
 *
 * Multiple paths are separated by a colon, and a trailing `/` means "anything under here":
 *
 *     CS_COMMIT_SCOPE="lib/tutorials/curriculum/level4/:docs/"
 *
 * Staging anything outside that set aborts the commit and prints what to unstage. The failure is
 * loud and local: the agent fixes its own commit instead of a reviewer finding it three days later
 * in someone else's history.
 */
import { execSync } from "node:child_process"

const scope = process.env.CS_COMMIT_SCOPE
if (!scope || scope.trim() === "") process.exit(0)

const patterns = scope
  .split(":")
  .map((entry) => entry.trim())
  .filter(Boolean)

/**
 * Every path git is about to commit, INCLUDING both sides of a rename.
 *
 * `--name-only` prints only the DESTINATION of an `R` entry, so `git mv` out of a sibling's
 * directory into your own scope passed this guard while deleting their file. `--name-status` gives
 * `R100\told\tnew`, and both sides have to be in scope for the commit to be honest: moving a file
 * out of a path you do not own is exactly as destructive as editing it.
 */
function stagedPaths() {
  const out = execSync("git diff --cached --name-status --diff-filter=ACMRTD", {
    encoding: "utf8",
  })
  const paths = []
  for (const line of out.split("\n")) {
    if (!line.trim()) continue
    // "M\tpath" or "R100\told\tnew". Take every field after the status.
    const [, ...rest] = line.split("\t")
    for (const path of rest) if (path.trim()) paths.push(path.trim())
  }
  return paths
}

/** A directory pattern ends in "/" and matches anything beneath it; otherwise match exactly. */
function inScope(path) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? path.startsWith(pattern) : path === pattern
  )
}

const staged = stagedPaths()
const strays = staged.filter((path) => !inScope(path))

if (strays.length > 0) {
  const plural = strays.length === 1 ? "path" : "paths"
  console.error("")
  console.error(`  Commit refused: ${strays.length} staged ${plural} outside CS_COMMIT_SCOPE.`)
  console.error("")
  console.error("  Declared scope:")
  for (const pattern of patterns) console.error(`    ${pattern}`)
  console.error("")
  console.error("  Staged but not yours:")
  for (const path of strays) console.error(`    ${path}`)
  console.error("")
  console.error("  Another agent is probably mid-edit on these. Unstage them and commit again:")
  console.error(`    git restore --staged ${strays.map((p) => JSON.stringify(p)).join(" ")}`)
  console.error("")
  console.error("  Do NOT `git checkout` or discard them: that destroys a sibling's work.")
  console.error("")
  process.exit(1)
}

process.exit(0)
