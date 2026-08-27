---
title: "Outbox drain is 40 minutes behind the delivery SLO"
points: 5
labels:
  - "concurrency"
  - "queues"
ai_policy: assisted
objectives:
  - multi-process-concurrency-bug-repro
acceptanceCriteria:
  - "The defect is reproduced with more than one drain worker running concurrently against the same outbox table."
  - "A CI harness reproduces the defect deterministically, without depending on real wall-clock timing or flaky sleeps."
  - "The fix keeps drain throughput correct under concurrent workers without introducing a new single point of contention."
  - "Drain lag returns to within the delivery SLO under the same concurrent-worker test."
---

The outbox drain is running 40 minutes behind where the delivery SLO says
it should be, and it has been getting worse for two days, not staying flat.
This only shows up with more than one drain worker running, which is
exactly the setup we scaled up to last week to handle load. A single worker
never shows the problem.

One of last night's three overnight PRs already claims to fix this, the one
under review as part of this sprint's PR triage, but it was only ever
tested against a single process. Whatever ships here needs to actually
reproduce the defect with multiple workers running concurrently, in CI,
deterministically, not rely on someone noticing it again in production two
days from now.
