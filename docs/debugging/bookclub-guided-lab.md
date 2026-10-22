# BookClub guided debugging lab (beta)

Entry: `/interview?track=debugging` → **Guided labs** → BookClub → Start.
The shareable gallery is `/interview?track=debugging&view=guided-labs`.
Guided exercises are identified by `scenario.guidedLab`, not by hand-maintained IDs.
They remain in the same scenario registry and execution engine, with their own gallery.

The lab contains four repairs over one runnable Python repository, 36 checks, and
six sequential phases: investigate, streak, history, calendar, cache, release.
Description text stays short. `task.md` owns the incident, contracts and acceptance
criteria; README owns repository navigation and running instructions. The virtual
files are authored in `lib/scenarios/real-world/bugfix/bookclub/`. Fixed services
stay behind the existing sealed server registry.

## Interaction rules and rationale

- The existing catalog header contains persistent, labelled format links for practice
  rounds and guided labs, with one Beta marker beside labs. A disclosure on each
  lab card previews its numbered phases and explains advancement before starting.
- The rail names every phase and explains exactly what opens it. Status uses text
  and icons, not color alone. One active phase has one clear next action.
- Current instructions are expanded; completed instructions remain reviewable.
  Future phase detail is deferred, while the full product contract stays accessible.
- Passing current visible and additional checks opens just the next phase. A run
  cannot skip the investigation or complete future phases. Earlier regressions
  reopen the earliest affected phase.
- Release requires all suites to be present and green in a separate run. Edits or
  restored progress invalidate the release verification. Old v1 progress resets.
- Run failures in additional checks are visible as results; hidden test source and
  reference solutions remain unavailable in the production file explorer.
- Phase changes announce progress and move focus to the new phase heading.
  Controls have visible keyboard focus and at least 44px interaction targets.
- Progress is device-local, best effort. This is not a cross-device save guarantee.

These decisions apply [NN/g's progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/)
and [W3C's multi-page progress guidance](https://www.w3.org/WAI/tutorials/forms/multi-page/)
to a coding lab: show the current work, retain orientation and allow review.
[GOV.UK's task list guidance](https://design-system.service.gov.uk/components/task-list/)
explicitly distinguishes unordered tasks from work requiring a specific order; this
lab therefore uses sequential phases rather than an unordered checklist of repairs.
These are design decisions informed by guidance, not a claim of usability-study results.

## Verification

- `pnpm exec vitest run lib/bugfix/guided-lab lib/stores/guided-lab-store.test.ts lib/scenarios/real-world/bugfix/bookclub/bookclub.test.ts`
- Existing workspace runner suite verifies every starter/reference pair.
- Browser fixture: `pnpm exec playwright test --config playwright.bookclub.config.ts`
  exercises the real gallery, phase rail, editor, and Python worker with synthetic
  fixtures. Authentication and AI scoring are outside this isolated browser check.
