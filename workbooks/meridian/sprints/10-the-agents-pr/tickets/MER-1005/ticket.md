---
title: "P1 02:14: deliveries to Northwind have stopped"
points: 8
labels:
  - "incident-response"
  - "reliability"
ai_policy: assisted
objectives:
  - incident-response-absolute-retry-deadline
acceptanceCriteria:
  - "Retries are bounded by an absolute deadline measured from the first attempt, not by an attempt count that a lease reclaim can reset."
  - "A message that exceeds its deadline reaches the dead-letter queue and does not requeue again afterward."
  - "A regression test reproduces the lease-reclaim reset and fails against the sprint 4 retry logic, then passes against the fix."
  - "The postmortem states why raising the visibility timeout alone would not have fixed the underlying loop."
---

Paged at 02:14. Every webhook delivery to Northwind has stopped. The
outbox has messages queued, workers are running, and nothing is obviously
down, but nothing is going out.

Mitigation first: deliveries are moving again as of this note, but the
underlying cause is still live and will happen again. The retry policy
written back in sprint 4 bounds retries by a persisted attempt count, and
the lease-reclaim path that runs when a worker fails to finish in time
resets that same attempt count back to zero before requeuing the message.
A message that keeps timing out never accumulates enough attempts to reach
the dead-letter queue; it just keeps resetting itself and retrying
forever, and that loop was eating enough capacity to starve every other
delivery behind it.

Someone suggested just raising the visibility timeout so messages stop
timing out as often. That would have made tonight's page happen less often
without fixing why a message can retry forever in the first place, and it
would have made the actual failure slower to notice next time, not gone.
