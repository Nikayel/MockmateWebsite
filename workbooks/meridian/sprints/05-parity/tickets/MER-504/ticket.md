---
title: "Two replicas applied 0007 twice and a third died mid-ALTER"
points: 8
labels:
  - parity
  - database
  - migrations
ai_policy: assisted
objectives:
  - concurrent-safe-schema-migrations
acceptanceCriteria:
  - "Two or more replicas booting at the same moment never both apply the same migration; one proceeds and the others wait or skip."
  - "A migration's start and completion are recorded in a durable ledger, not inferred from the schema's current shape."
  - "A replica that crashes mid-migration leaves the ledger in a state a subsequent boot can safely detect and recover from, rather than silently re-running or silently skipping the incomplete migration."
  - "Running migrations is separated from application boot into its own step, so a migration failure prevents traffic from reaching an inconsistent schema rather than crashing an already-serving replica."
---

During Tuesday's deploy, two replicas that started within the same second both ran migration 0007, and a third crashed partway through an ALTER, leaving the schema in an inconsistent state until someone intervened by hand.

From the deploy log:

> Every replica runs pending migrations on boot, independently, with nothing coordinating who goes first or stopping a second replica from starting the same migration a first one is still mid-way through.

There is currently no record of which migrations have actually completed versus which are in progress, and no lock preventing two processes from deciding to run the same one at the same moment.

Ambiguous ask from the platform team: "can we just run migrations from one designated replica?"
