# Debugging prerequisites

The Debugging track's 24 bugfix questions (including the BookClub guided lab) and
4 feature-building questions have reviewed, high-level prerequisites. Users can
expand **Prerequisites** in both catalog layouts and the workspace problem panel,
which stays available in focus mode for these multi-file questions. Basic language
knowledge comes from the existing scenario language contract; topic descriptions
come from one shared catalog.

## Authoring and maintenance

Edit `lib/scenarios/prerequisites.ts`:

1. Reuse IDs from `PREREQUISITE_TOPICS` in the question's
   `DEBUGGING_PREREQUISITES` entry. Keep the list to 2–6 foundations.
2. If a foundation is missing, add a short label and one general description to
   the topic catalog. Editing a description updates every question that uses it.
3. Read the public assignment and starter code when choosing topics. Avoid
   inferring prerequisites from tags or generating them on demand with AI.
4. State background knowledge, not the diagnosis, fix, target algorithm, or code
   to change. For example, the adjustment matcher needs arrays and maps; its
   prerequisites do not describe the pair-search algorithm or eligibility bug.
5. Run `pnpm exec vitest run lib/scenarios/__tests__/prerequisites.test.ts`.
   Coverage compares against the published eager and lazy catalogs, including
   packs and feature-building questions. New or retired question IDs require a
   corresponding metadata update.

Pack metadata is generated, so prerequisite assignments deliberately live outside
the generated files. They survive pack recompilation. There is no database
migration, extra fetch, AI request, learning gate, or effect on scoring or hints.
Opening this preparation guidance does not reveal a hint or spend a session.
Existing saved sessions resolve topics from their scenario ID.

## Interaction decision

A single native `details` / `summary` disclosure matches the existing guided-lab
preview. It starts collapsed and resets when the question changes. The visible
label, topic count, chevron, keyboard operation, focus ring, and minimum 44px
target make the action discoverable. The list stays inline so long descriptions
can wrap on phones without an overlay or focus trap. Topic content remains
optional; the assignment and Start action stay directly available.

This choice follows [GOV.UK's guidance for one optional details section](https://design-system.service.gov.uk/components/details/)
and the [WAI disclosure keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
Catalog selection belongs to a real title button, separate from the disclosure
and Start action. Wrapping all three in a simulated button would let keyboard
events from one control activate another and obscure their semantics.

## Engineering judgment

- Store shared topic copy once and reference it by stable IDs. An explicit
  question map plus a catalog coverage check is enough; a new API or authoring
  framework would add maintenance without solving a current problem.
- Let the native element own open/closed state. No synchronized React state,
  effects, persistence, or event propagation workarounds are needed.
- Background knowledge and assessment hints are different contracts. Keeping
  prerequisites independent of sealed answers and hint counters preserves that
  boundary.
