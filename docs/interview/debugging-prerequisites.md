# Debugging prerequisites

The Debugging track's 25 bugfix rounds (including the BookClub guided lab and 26 executable language variants) and
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

Cards show the full title, a compact metadata row, and an action row. Descriptions
and generic codebase labels are omitted; the complete assignment remains inside
the workspace. Remaining session allowance appears once in the catalog header.

**Prerequisites** is a bordered button beside the primary **Start practice**
action. Both stay in the same place when the details expand underneath, and wrap
into full-width controls on narrow cards. The existing Radix Collapsible primitive
owns disclosure state, keyboard operation, and `aria-expanded` / `aria-controls`.
Controls have focus rings and at least 44px targets. Changing questions resets the
disclosure. The same button is available in the workspace problem panel.

The first implementation used a quiet disclosure row among metadata. Owner
feedback showed that this was difficult to find. The revised button affordance
and primary/secondary hierarchy follow [Apple's button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons)
and [NN/g's recognition guidance](https://www.nngroup.com/articles/recognition-and-recall/).
This is a design rationale, not a claim of measured usability improvement.

Titles are headings; Start selects the question and starts it in one action.
Prerequisites never select a question or start a session.

## Engineering judgment

- Store shared topic copy once and reference it by stable IDs. An explicit
  question map plus a catalog coverage check is enough; a new API or authoring
  framework would add maintenance without solving a current problem.
- Reuse the existing disclosure primitive for open/closed state. No synchronized
  React state, effects, persistence, or event propagation workarounds are needed.
- Background knowledge and assessment hints are different contracts. Keeping
  prerequisites independent of sealed answers and hint counters preserves that
  boundary.
