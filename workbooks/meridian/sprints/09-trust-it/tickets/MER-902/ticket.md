---
title: "Review: prompt v2 (+1.3% accuracy), ok to ship?"
points: 5
labels:
  - "ai-engineering"
  - "evals"
  - "code-review"
ai_policy: review-only
objectives:
  - block-regressing-model-change-review
acceptanceCriteria:
  - "The review reports the per-slice breakdown, not just the aggregate accuracy delta."
  - "The review identifies that the new prompt regresses the \"not found\" outcome for a specific, named subpopulation."
  - "The verdict is block, approve, or approve-with-changes, backed by the per-slice evidence rather than the aggregate number alone."
---

The extraction prompt rewrite is up for sign-off. The headline number is
good: aggregate accuracy is up 1.3% against the eval set the last ticket
built. Whoever ran the comparison is treating that as the whole story and
wants to ship today.

Running the per-slice breakdown that now exists turns up something the
aggregate number hides: on 10 of 120 cases, the new prompt's instruction to
"populate every field with your best guess" has replaced what should have
been an honest "not found" outcome with a fabricated value. In at least one
of those cases, a genuinely missing deductible got filled in as $0, which
is not a null value and is not distinguishable downstream from an actual $0
deductible.

An aggregate improvement sitting on top of a newly broken subpopulation is
not a clean ship.
