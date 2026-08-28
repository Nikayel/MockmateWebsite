# Practice surfaces: light consolidation (navigation, not a merge)

## The decision

Keep the engines and the content **separate**. Connect them by navigation and a
single upsell, not by merging code.

Why: a bug-fix pack is a short, focused, single-bug drill (one sitting). Sprint
Labs / Meridian is a long, cumulative journey on one growing codebase. Different
size, different intent. Merging them would flatten the thing that makes each one
good, and it would add a bigger, riskier refactor to a product whose funnel is
still unproven. So the goal here is only to make the two **discoverable from each
other** and give the Labs nav one clean front door.

**Scope (confirmed):** bug-fix packs + `/interview` Debugging only. Not Case
Labs, not DSA.

**What Meridian is** (for context): the fictional insurance claims-processing
company whose ~60-file codebase Sprint Labs is built on. One repo, ten sprints,
the repo remembers your earlier work. It is the "bigger realistic codebase" the
bug-fix upsell points at.

## Two changes

### 1. The Labs nav opens a chooser panel (mirror the Interview nav)

Today the **Labs** header item routes straight to the Case Labs page. Change it
to open a panel using the **same component pattern as the Interview nav panel**,
listing the lab families:

- **Decomposition (Case Labs)** — one problem, one sitting. The Palantir FDSE /
  Stripe decomposition round: clarify, decompose, design, build, review.
- **Sprint (Meridian workbook)** — a real codebase over ten sprints; the repo
  remembers. The long game on one system.

Each row is one line of positioning plus its destination. The **Sprint row is
gated on `SPRINT_LABS_ENABLED`**: with the flag off the panel shows only
Decomposition and behaves exactly like today's direct link (no new surface leaks
before you flip it).

"Better UX" note: if a two-item panel feels heavier than the payoff, the
fallback is a single Labs page with two clearly-labelled sections (the chooser
the `/labs` page already renders behind the flag). Build the panel first since it
matches the Interview pattern you already have; keep the section layout as the
cheaper fallback.

### 2. An upsell pointer from bug-fix -> Sprints

In the bug-fix / Debugging surface (the pack brief, and/or the end-of-pack
screen), add one quiet pointer:

> Want a bigger, more realistic codebase? Meridian runs ten sprints on one repo.
> -> `/sprint-labs`

Optional reciprocal, from inside a long Sprint: "Short on time? Try a focused
bug-fix drill." -> the packs. Ship the bug-fix -> Sprints direction first; it is
the one that moves someone from a five-minute drill toward the deeper product.

## What we are deliberately NOT doing (yet)

- **Not folding packs into Meridian tickets.** The packs are real companies
  (Palantir, Stripe, Datadog); Meridian is one fictional company. Rewriting them
  into Meridian's fiction throws away the framing that makes them credible.
- **Not migrating the pack runtime onto the Sprint Labs grading engine.** That is
  a genuine DRY win (today there are two "run code against tests and score it"
  systems), but it is a separate, higher-risk effort with no user-visible payoff.
  Track it; do it on its own, later. The nav change does not need it.

## Sequencing

1. Labs chooser panel (small; reuses the Interview nav panel pattern; Sprint row
   flag-gated).
2. Bug-fix -> Sprints upsell pointer.
3. Everything stays behind `SPRINT_LABS_ENABLED` until you flip it.
4. Later, optional and independent: consolidate the two grading engines.

Nothing here is built yet. This is the plan; say go and I will start with the
Labs panel.
