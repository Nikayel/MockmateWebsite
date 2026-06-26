# Interview Page Refactor — Autonomous Loop Prompt

Paste the block below into a `/loop` (or an autonomous agent) to execute the refactor slice by
slice until the Definition of Done is met. It is self-correcting: each iteration picks the next
unfinished slice, implements it, verifies, commits, updates the progress tracker, and repeats.

**How to launch:**
```
/loop  <paste the PROMPT below>
```
Let it self-pace (no interval) — each iteration is one slice and gated by the full test suite.

---

## PROMPT

```
You are executing a behavior-preserving refactor of the CodeSparring interview page. Work
autonomously, one slice per iteration, until DONE. Do not ask for confirmation between slices.

AUTHORITATIVE DOCS (read at the start of EVERY iteration — they are the source of truth):
- docs/refactor/interview-page-refactor.md      ← the plan: hard rules, reuse inventory, target tree, slice table, DoD
- docs/refactor/interview-page-test-plan.md      ← the verification harness per slice
- docs/refactor/interview-page-progress.md        ← the live checklist you update each iteration

GUARDING PRINCIPLES (never violate):
1. BEHAVIOR-PRESERVING. No UX change, no new features, same API calls in the same order. The
   Slice 0 payload snapshots are the contract; if you change one and it is not a provable no-op,
   you broke something — revert, don't update the snapshot.
2. NO FILE OVER 500 LINES after your slice (target <=400). This includes the file you are
   editing AND every file you create. If an extraction would land >500, split further.
3. REUSE > REWRITE > NEW. Before writing a new hook/service, check the reuse inventory in the
   plan. Adopt the existing lib/ hook/service if you can bring it to parity. Inline logic is the
   source of truth when it disagrees with a stale lib/ file — never silently lose inline behavior
   (hint-sync, bugfix evidence, persistence, spaced-rep, vectorization, roadmap, guest updates).
4. ONE SLICE = ONE COMMIT. Never leave two copies of the same logic; delete the inline version
   in the same slice that introduces its replacement.
5. Keep the Zustand interview-store as the state boundary. No parallel global state.

ORIENTATION: graphify-out/graph.json exists. Run `graphify query "<question>"` to orient before
broad reading; read files directly for exact line-level edits.

ITERATION PROTOCOL (do exactly this each loop):
  1. Read the three docs above. Open docs/refactor/interview-page-progress.md and select the
     FIRST slice whose status is not DONE. Respect ordering: slices 10 and 11 (session, feedback)
     come LAST among logic slices; if an earlier slice is unfinished, do that first.
  2. If this is the very first iteration and Slice 0 is not DONE, do Slice 0 first: get a green
     baseline (pnpm typecheck && pnpm lint && pnpm test && pnpm exec playwright test) and add the
     payload-contract snapshot tests described in the test plan. Commit. Mark Slice 0 DONE.
  3. Implement exactly ONE slice from the slice table:
       a. Extract the current inline logic for that slice's concern.
       b. Bring the existing target hook/service to parity (or create the new file per the tree).
       c. Wire app/interview/page.tsx (and components) to consume it.
       d. Delete the now-dead inline copy and any dead lib/ file the slice retires.
       e. Add/extend the unit tests named for that slice in the test plan.
  4. VERIFY (all must pass — this is the gate):
       pnpm typecheck && pnpm lint && pnpm test && pnpm exec playwright test
     Then self-review the diff against the plan's hard rules. Confirm: no file >500 lines
     (run: find app/interview lib/interview lib/hooks -name '*.ts*' | xargs wc -l | sort -rn | head),
     payload snapshots unchanged, no duplicated logic left behind.
  5. If verification FAILS: fix it in this same iteration. Do not advance. If you cannot get green
     after a genuine effort, REVERT this slice's changes (git restore/checkout), write a note in
     the progress file under that slice explaining the blocker, and STOP the loop for human input.
  6. If verification PASSES: commit with message "refactor(interview): slice N - <title>"
     (commit as the user; NO Claude co-author; per repo memory use the gpgsign=false workaround if
     a commit hangs:  git -c commit.gpgsign=false commit ...). Run `graphify update .`.
  7. Update docs/refactor/interview-page-progress.md: mark the slice DONE with the new
     page.tsx line count and the largest remaining file. Note anything the next slice should know.
  8. Check the Definition of Done in the plan. If ALL boxes are satisfiable and every slice is
     DONE, do the Slice 14 final audit, then STOP and report. Otherwise continue to the next
     iteration.

SCOPE DISCIPLINE:
- Touch only the interview feature and the lib/ modules the plan names. Do not refactor unrelated
  files or revert unrelated working-tree changes already present in the repo.
- The disabled proactive-interviewer code stays disabled — isolate it (slice 8), don't revive it.
- Voice mode stays inline this sprint unless it blocks the <=300-line page.tsx target.

REPORT FORMAT each iteration (concise): slice number+title, files added/changed/deleted, new
page.tsx line count, largest remaining file, test result, commit hash.

STOP CONDITIONS:
- All slices DONE and DoD met  -> final audit, summarize, end loop.
- A slice cannot go green after real effort -> revert that slice, record blocker, end loop.
- Any payload-contract snapshot changes in a way you cannot prove is a no-op -> revert, end loop.
```

---

## Notes for the human running this

- **Start small / dry run:** consider running just Slice 0 + Slice 1 first to confirm the loop's
  verify-and-commit cycle works in your environment, then let it run free.
- **Commits may hang on this volume** (GPG signing + AppleDouble files). The prompt already tells
  the agent to use `git -c commit.gpgsign=false commit`; if it still stalls, run commits yourself
  between iterations.
- **High-risk slices (10, 11):** even with green tests, eyeball the diff and run `/security-review`
  before pushing — they touch usage limits, guest migration, and billing-adjacent session writes.
- **If the agent stops with a blocker,** read its note in `interview-page-progress.md`, resolve the
  ambiguity, and relaunch the same loop — it resumes from the first non-DONE slice.
