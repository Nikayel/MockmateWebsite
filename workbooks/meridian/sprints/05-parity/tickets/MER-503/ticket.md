---
title: "/healthz returned 200 for the entire incident"
points: 5
labels:
  - parity
  - health-checks
ai_policy: assisted
objectives:
  - liveness-readiness-separation
acceptanceCriteria:
  - "A liveness signal reports healthy as long as the process itself is running correctly, independent of any downstream dependency."
  - "A separate readiness signal reports unready when a required downstream dependency, such as the database, is unavailable."
  - "A replica whose database connection is paused is removed from traffic rotation without being restarted."
  - "Restoring the paused dependency returns the replica to rotation without requiring a restart."
---

During Tuesday's incident, /healthz reported 200 the entire time, even while the database was completely unreachable and every request that touched it was failing.

From the war room:

> The load balancer kept sending traffic to replicas that could not do anything useful, because the one health signal we have doesn't check anything, it just returns 200 if the process is running at all.

There is no distinction today between "the process is alive and should not be restarted" and "this replica can currently do useful work and should receive traffic." Those are different questions with different correct actions.

Ambiguous ask from ops: "can healthz just check the database directly?"
