---
title: "Reconciliation: 61 processed claims with no delivery, 3 deliveries for claims that 404"
points: 8
labels:
  - delivery
  - outbox
ai_policy: assisted
objectives:
  - transactional-outbox-skip-locked
acceptanceCriteria:
  - "A claim's processed state and its outbound event are committed in the same transaction; a crash between them is impossible by construction, not just unlikely."
  - "An event that has not yet been delivered survives a process restart and is still delivered afterward."
  - "Two replicas draining the same backlog concurrently never both send the same event."
  - "A worker that dies mid-delivery releases its claimed work after a bounded time instead of leaving it stuck forever."
---

This week's reconciliation job found 61 claims marked processed with no corresponding webhook ever sent, and a separate 3 webhook deliveries logged against claim ids that do not exist.

From the reconciliation output:

> The counts don't reconcile in either direction. Some processed claims have no delivery row at all. Some delivery rows point at claims we can't find. It's not consistent enough to be one simple bug.

The current mechanism keeps outbound events in an in-process list and relies on the same process that wrote the claim also being the one that sends the webhook, in the same breath. Any restart between those two steps drops the event on the floor. There is no shared, durable record of "this event still needs to go out," which is also how a claim ends up delivered but for the wrong or missing counterpart.

Ambiguous ask from the on-call engineer who first looked at this: "do we just add a retry loop around the send call?"
