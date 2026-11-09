# Roadmap composition

Audited and updated November 9, 2026. Release status is tracked by the commits and deployment checks.

## Audit findings

Creation already accepted debugging and feature-building scenarios. The free
first-roadmap path and the optional RAG path both use
`generatePersonalizedRoadmap` in `lib/roadmap/prioritization-algorithm.ts`; RAG
enriches the resulting plan without replacing its scheduled questions.

The old default was the company/role-weighted `full` mix. Limited non-DSA
inventory was redistributed into other included categories, usually DSA.
For a Google intermediate assessment with two hours per day, the inspected
generator produced:

| Horizon | DSA | Debugging | Feature Build |
| --- | ---: | ---: | ---: |
| 7 days | 3 | 3 | 1 |
| 30 days | 51 | 14 | 2 |
| 90 days | 197 | 26 | 4 |

These are local generation checks with the current catalog, not production
customer outcomes or measured company interview proportions.

## Creation choices

- **Debugging + algorithms** (`balanced`) is now recommended and selected by
  default: 50% debugging and 50% DSA by question count. This is a product practice
  recommendation, not a claim about any company's actual interview mix.
- **Company mix** (`full`) retains the existing company/role-weighted blend of
  DSA, debugging, and feature-building.
- **Algorithms only** (`dsa-only`) retains the existing DSA-only choice.
- **Custom** includes exactly the selected categories, weighted using the
  existing company/role recommendation. Debugging-only and feature-building-only
  choices skip the DSA problem-count and pattern-familiarity assessment steps.

System design remains unavailable in roadmap scheduling under the existing
completion-policy restriction. This change does not enable it.

`ROADMAP_MIX_MODES` and `DEFAULT_ROADMAP_MIX_MODE` in the existing company-question
types module are shared by the API validator, wizard state, and pending-wizard
validator. Explicit older choices still parse. Saved pending assessments survive
the sign-in/upgrade round trip. Reading an existing roadmap does not change it.

## How the recommendation stays balanced

`allocateBalancedCategoryCounts` in `lib/roadmap/category-mix.ts` allocates paired
debugging and DSA entries, capped by the smaller available pool. An odd slot
favors debugging. The mixed scheduler starts with debugging and interleaves the
categories, so a time-limited prefix still contains at least as many debugging
entries as DSA entries.

The recommendation uses fewer questions when the debugging inventory is
exhausted. It does not fill the remainder with extra DSA or repeat scenario IDs.
The schedule length and question count still depend on daily time and difficulty. This does not promise
new questions on every calendar day or equal minutes in each category.

Custom allocation also stops redistributing into an excluded DSA category. A
debugging-only choice therefore stays debugging-only when its inventory is thin.

The public preview illustrates debugging and DSA together and identifies the
50/50 recommendation. It is a sample, not a generated personal plan.

## Company selection and evidence

Debugging candidates must either match the target company's reviewed alignment
profile or be Generic. Matching-company practice is ranked before Generic
practice, including when a generic exercise has a higher numeric priority score.
Questions attributed only to other companies are excluded from that company's
debugging pool. Companies without an aligned exercise receive clearly labeled
Generic debugging practice.

The current catalog contains 10 aligned debugging entries: Google 3, Palantir 5,
Meta 1, and Stripe 1. The other 18 entries are Generic. Payment or monitoring
domains do not establish company interview provenance.

Public candidate reports of [Meta's maze exercise](https://www.hellointerview.com/community/questions/maze-solver-path/cmjlp495e05fs08adwrayjwbr)
describe path rendering, traversal, directional cells, and key/gate state. The
[Stripe library-debugging account](https://www.reddit.com/r/leetcode/comments/1mgcc99/stripe_integration_and_bug_bash_rounds_interview/)
describes investigating failing tests in an unfamiliar library and explicitly
does not permit AI in that candidate's round. Google remains a reported
code-comprehension format, without a verified exact prompt. Palantir evidence is
role-dependent codebase-debugging practice. See the source and confidence notes in
[the research report](./company-ai-debugging-research-2026-11-04.md); these exercises
are original practice, not company-provided repositories or exact questions.

Language variants count as one task, using the first surviving catalog variant.
Recalculation excludes the whole variant family when one version was completed
or skipped. This reuses the same variant-group contract as scenario discovery.

With 90 days and two hours per day, current generated examples are:

| Target | Company-aligned debugging | Generic debugging | DSA |
| --- | ---: | ---: | ---: |
| Google | 3 | 17 | 20 |
| Palantir | 5 | 17 | 22 |
| Meta | 1 | 17 | 18 |
| Stripe | 1 | 17 | 18 |
| Amazon | 0 | 17 | 17 |

Saved question nodes carry the typed alignment key. Roadmap cards reuse the
existing provenance display, including the confidence description and source
link. Older saved nodes without that key remain readable without inventing an
attribution or rewriting their data.

## Verification

Checks cover API defaults, shared enum validation, company and algorithms-only
compatibility, saved assessment recovery, custom category selection, inventory
caps, short time budgets, actual scheduled category counts, and unique scenario
IDs. Browser tests exercise the real assessment and scheduler at desktop and
mobile widths and verify debugging-only creation without a DSA assessment.

Browser fixtures perform no Firebase writes or paid AI calls. Authenticated
production creation and live AI advice were not exercised. The optional RAG
pipeline uses DSA-pattern insights, so plans with no scheduled DSA now return the
deterministic plan without requesting that advice. Enrichment failure preserves
the base plan's company selection and category balance.

## Engineering judgment

An inventory cap is a composition policy, not merely a catalog-count detail.
Changing the displayed percentage alone would have left long roadmaps dominated
by DSA. Keep the recommendation at the allocation boundary, reuse the existing
generator and wizard, and test the final scheduled questions as well as weights.
