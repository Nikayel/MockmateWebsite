---
title: "We cannot answer \"did the extractor get better\""
points: 5
labels:
  - "ai-engineering"
  - "evals"
ai_policy: unassisted
ai_policy_reason: "Deciding what 'better' means for this model, which slice of claims actually matters, and what ground truth to trust is a judgment call about the business, not a coding task. An agent will optimize whatever single number you hand it and never ask if it's the right number."
objectives:
  - golden-eval-set-per-slice-scoring
acceptanceCriteria:
  - "A golden evaluation set exists with human-labelled ground truth, versioned as a dataset revision that a run can be pinned against."
  - "Scoring is reported per field and per slice, not as one aggregate accuracy number."
  - "A prompt or model change can be replayed offline against the pinned dataset revision without calling the live provider."
  - "The report states explicitly why a single accuracy number is not sufficient to approve a release on its own."
---

Priya asked a simple question in standup: did the new extraction prompt
actually make things better? Nobody could answer it with anything more
solid than "the dashboard says 99.2%, which seems fine." Northwind's ops
lead says deductibles have been wrong more often since the prompt shipped,
and there is no dataset anyone can point to that would settle which of
those is true.

There is no golden set. There is no per-field or per-slice breakdown, only
one aggregate accuracy number that could stay flat while a small but
important subpopulation gets meaningfully worse. And there is no way to
replay last month's extraction run against this month's prompt offline, so
every claim of "improved" is really just a feeling.
