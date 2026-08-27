---
title: "CI was green on all three. Make it able to say no."
points: 3
labels:
  - "ci"
  - "migrations"
  - "queues"
ai_policy: unassisted
ai_policy_reason: "Deciding which class of unsafe change is worth building a permanent CI gate for, versus which was a one-off mistake, is a judgment call about what has actually burned us. An agent will write a check narrow enough to pass last night's three diffs and nothing else."
objectives:
  - ci-gates-migration-safety-queue-conformance
acceptanceCriteria:
  - "A CI gate fails a migration that is not structured as expand, backfill, then contract."
  - "A CI gate runs a queue consumer under multiple concurrent workers and fails on a correctness or throughput regression that a single-worker run would not catch."
  - "Both gates have a documented, logged override path for a genuinely exceptional change, rather than being either unbypassable or silently skippable."
  - "Replaying last night's three PRs against these gates shows at least two of them would have failed."
---

All three of last night's agent PRs passed CI. Two of them were wrong. That
is the actual problem: CI as it exists today cannot tell a safe schema
change from one that locks a table, and it cannot tell a queue-drain fix
that works under load from one that was only ever tested single-process.
Reviewing this by hand every time an agent opens a PR does not scale, and
it already failed to catch two out of three overnight.

Two gates need to exist and stay alive past their first week: one that
fails a migration that is not written as an expand/backfill/contract step,
and one that runs a queue consumer under multiple concurrent workers and
fails if throughput or correctness degrades. Both need a real baseline and
a documented way to skip loudly when a genuinely exceptional change needs
to bypass them, because a gate nobody can ever override gets deleted the
first time it blocks a real deploy.
